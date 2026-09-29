import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

const TARGETS=['8_PARK_PATIKA_UST','3_CIMEN'];
const SCOPE=[137.5,69.5,207.0,114.10];
const inScope=(x,z,e=0)=>x>=SCOPE[0]-e&&z>=SCOPE[1]-e&&x<=SCOPE[2]+e&&z<=SCOPE[3]+e;
const intersects=(bounds,e=.0002)=>bounds[0]<=SCOPE[2]+e&&bounds[2]>=SCOPE[0]-e&&bounds[1]<=SCOPE[3]+e&&bounds[3]>=SCOPE[1]-e;
const hashBuffer=buffer=>{
  let hash=2166136261;
  for(const value of new Uint8Array(buffer)){
    hash^=value;
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
};

// Rebuild only the two smooth 4.5 m gray routes around the main pond. The
// post-v57 objects, materials and transforms stay in place; all native source
// attributes remain an unchanged prefix and no render object is added.
export function applyParkRing63(root,meta,buffer){
  if(meta?.version!==63||meta.revision!=='L1'||!['codex','kimi'].includes(meta.variant)||
     !(buffer instanceof ArrayBuffer)||buffer.byteLength!==meta.byteLength||hashBuffer(buffer)!==meta.bufferHash){
    throw Error('park ring63: manifest/binary');
  }
  if(meta.policy?.walkWidth!==4.5||meta.policy?.lowerBridgeHasNoPathUnderDeck!==true||
     meta.policy?.southGrayStemPreserved!==true){
    throw Error('park ring63: policy');
  }
  if(!Array.isArray(meta.meshes)||meta.meshes.length!==TARGETS.length||
     TARGETS.some(name=>meta.meshes.filter(item=>item.name===name).length!==1)){
    throw Error('park ring63: target scope');
  }
  const read=(descriptor,Type)=>{
    if(!descriptor||!Number.isSafeInteger(descriptor.byteOffset)||!Number.isSafeInteger(descriptor.count)||
       descriptor.byteOffset<0||descriptor.count<0||descriptor.byteOffset%4||
       descriptor.byteOffset+descriptor.count*4>buffer.byteLength){
      throw Error('park ring63: binary range');
    }
    return new Type(buffer,descriptor.byteOffset,descriptor.count);
  };
  const prepared=[];
  const worldPoint=new THREE.Vector3();
  root.updateMatrixWorld(true);
  for(const item of meta.meshes){
    const matches=[];
    root.traverse(object=>{
      if(object.isMesh&&object.name===item.name)matches.push(object);
    });
    if(matches.length!==1)throw Error('park ring63: missing/duplicate '+item.name);
    const mesh=matches[0];
    const old=mesh.geometry;
    if(mesh.userData.parkRing63){
      if(mesh.userData.parkRing63!==meta.patchId)throw Error('park ring63: different patch');
      continue;
    }
    if(!mesh.userData.parkPathPolish57||old.attributes.position.count!==item.sourceVertices||
       old.index?.count!==item.sourceIndexCount||sideSourceHash50(old)!==item.sourceHash){
      throw Error('park ring63: source '+item.name);
    }
    if(!Array.isArray(item.matrixWorld)||item.matrixWorld.length!==16||
       item.matrixWorld.some((number,index)=>!Number.isFinite(number)||Math.abs(number-mesh.matrixWorld.elements[index])>1e-8)){
      throw Error('park ring63: world transform '+item.name);
    }
    const positions=read(item.positions,Float32Array);
    const normals=read(item.normals,Float32Array);
    const index=read(item.index,Uint32Array);
    const removed=read(item.removedFaceStarts,Uint32Array);
    if(positions.length!==item.vertices*3||normals.length!==positions.length||index.length%3||
       !positions.every(Number.isFinite)||!index.every(id=>id<item.vertices)){
      throw Error('park ring63: attribute/index shape');
    }
    for(let offset=0;offset<normals.length;offset+=3){
      if(Math.abs(Math.hypot(normals[offset],normals[offset+1],normals[offset+2])-1)>.002){
        throw Error('park ring63: normal');
      }
    }
    for(let offset=0;offset<old.attributes.position.array.length;offset++){
      if(positions[offset]!==old.attributes.position.array[offset]||normals[offset]!==old.attributes.normal.array[offset]){
        throw Error('park ring63: original prefix changed');
      }
    }
    const removedSet=new Set();
    const sourcePoints=new Set();
    for(let offset=0;offset<old.attributes.position.array.length;offset+=3){
      sourcePoints.add(old.attributes.position.array.slice(offset,offset+3).join(','));
    }
    for(let removedOffset=0;removedOffset<removed.length;removedOffset++){
      const faceStart=removed[removedOffset];
      if(faceStart%3||faceStart>=old.index.count||(removedOffset&&faceStart<=removed[removedOffset-1])){
        throw Error('park ring63: removed index');
      }
      removedSet.add(faceStart);
      const bounds=[Infinity,Infinity,-Infinity,-Infinity];
      for(let corner=0;corner<3;corner++){
        worldPoint.fromBufferAttribute(old.attributes.position,old.index.getX(faceStart+corner)).applyMatrix4(mesh.matrixWorld);
        bounds[0]=Math.min(bounds[0],worldPoint.x);
        bounds[1]=Math.min(bounds[1],worldPoint.z);
        bounds[2]=Math.max(bounds[2],worldPoint.x);
        bounds[3]=Math.max(bounds[3],worldPoint.z);
      }
      if(!intersects(bounds))throw Error('park ring63: removed face outside scope');
    }
    let retainedOffset=0;
    for(let faceStart=0;faceStart<old.index.count;faceStart+=3){
      if(removedSet.has(faceStart))continue;
      for(let corner=0;corner<3;corner++){
        if(index[retainedOffset++]!==old.index.getX(faceStart+corner))throw Error('park ring63: retained face changed');
      }
    }
    if(retainedOffset!==item.retainedIndexCount)throw Error('park ring63: retained count');
    for(let faceStart=retainedOffset;faceStart<index.length;faceStart+=3){
      for(let corner=0;corner<3;corner++){
        const id=index[faceStart+corner];
        if(id<item.sourceVertices)throw Error('park ring63: new face uses source prefix');
        worldPoint.fromArray(positions,id*3).applyMatrix4(mesh.matrixWorld);
        if(worldPoint.y<8.79||worldPoint.y>9.65)throw Error('park ring63: new height');
        if(!inScope(worldPoint.x,worldPoint.z,.0002)&&
           !sourcePoints.has(positions.slice(id*3,id*3+3).join(','))){
          throw Error('park ring63: outside source vertex moved');
        }
      }
    }
    if(Object.keys(old.attributes).some(name=>name!=='position'&&name!=='normal')||old.groups.length){
      throw Error('park ring63: unexpected attributes/groups');
    }
    const next=old.clone();
    next.setAttribute('position',new THREE.Float32BufferAttribute(positions.slice(),3));
    next.setAttribute('normal',new THREE.Float32BufferAttribute(normals.slice(),3));
    next.setIndex(new THREE.BufferAttribute(index.slice(),1));
    next.computeBoundingBox();
    next.computeBoundingSphere();
    prepared.push({mesh,next,item});
  }
  for(const {mesh,next,item} of prepared){
    mesh.geometry=next;
    mesh.userData.parkRing63=meta.patchId;
    mesh.userData.parkRingSampler63={indexStart:item.retainedIndexCount};
  }
  const copiedShadowSource=meta.variant==='codex'?'3_CIMEN':'8_PARK_PATIKA_UST';
  return {
    version:63,revision:'L1',patchId:meta.patchId,targets:prepared.length,addedDrawCalls:0,
    helperRefresh:prepared.some(entry=>entry.mesh.name===copiedShadowSource)?[copiedShadowSource]:[],
    scope:SCOPE.slice(),
  };
}

// Preserve the regular sampler everywhere else and use double-precision rays
// only inside the authored ring corridor, including exact new triangle seams.
export function wrapParkRingSampler63(baseSampler,root,meshNames=TARGETS){
  const selected=meshNames.map(name=>root.getObjectByName(name)).filter(mesh=>mesh?.userData.parkRing63);
  if(!selected.length)return baseSampler;
  const values=[];
  const owners=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let owner=0;owner<selected.length;owner++){
    const mesh=selected[owner];
    mesh.updateWorldMatrix(true,false);
    const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let faceStart=0;faceStart<index.count;faceStart+=3){
      a.fromBufferAttribute(position,index.getX(faceStart)).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position,index.getX(faceStart+1)).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position,index.getX(faceStart+2)).applyMatrix4(mesh.matrixWorld);
      const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
      const crossX=(b.y-a.y)*cz-bz*(c.y-a.y),crossZ=bx*(c.y-a.y)-(b.y-a.y)*cx;
      const bounds=[Math.min(a.x,b.x,c.x),Math.min(a.z,b.z,c.z),Math.max(a.x,b.x,c.x),Math.max(a.z,b.z,c.z)];
      if(det>=-1e-12||-det<.05*Math.hypot(crossX,det,crossZ)||!intersects(bounds))continue;
      owners.push(owner);
      values.push(a.x,a.z,a.y,bx,bz,cx,cz,b.y-a.y,c.y-a.y,1/det);
    }
  }
  const data=new Float64Array(values);
  const ownerIds=Uint8Array.from(owners);
  const cellSize=4,x0=SCOPE[0]-.0002,z0=SCOPE[1]-.0002;
  const columns=Math.ceil((SCOPE[2]-SCOPE[0]+.0004)/cellSize);
  const rows=Math.ceil((SCOPE[3]-SCOPE[1]+.0004)/cellSize);
  const bins=Array.from({length:columns*rows},()=>[]);
  const gridX=x=>Math.max(0,Math.min(columns-1,Math.floor((x-x0)/cellSize)));
  const gridZ=z=>Math.max(0,Math.min(rows-1,Math.floor((z-z0)/cellSize)));
  for(let offset=0;offset<data.length;offset+=10){
    const xValues=[data[offset],data[offset]+data[offset+3],data[offset]+data[offset+5]];
    const zValues=[data[offset+1],data[offset+1]+data[offset+4],data[offset+1]+data[offset+6]];
    for(let row=gridZ(Math.min(...zValues));row<=gridZ(Math.max(...zValues));row++){
      for(let column=gridX(Math.min(...xValues));column<=gridX(Math.max(...xValues));column++){
        bins[row*columns+column].push(offset);
      }
    }
  }
  const cells=bins.map(offsets=>Uint32Array.from(offsets));
  let lastX=NaN,lastZ=NaN,last=null;
  return {
    stats:{...baseSampler.stats,parkRingPrecision63:{
      triangles:owners.length,
      bytes:data.byteLength+ownerIds.byteLength+cells.reduce((sum,cell)=>sum+cell.byteLength,0),
      cells:cells.length,
    }},
    sample(x,z){
      if(x===lastX&&z===lastZ)return last;
      lastX=x;lastZ=z;last=baseSampler.sample(x,z);
      if(!inScope(x,z,.0002))return last;
      let height=last?.point.y??-Infinity;
      for(const offset of cells[gridZ(z)*columns+gridX(x)]){
        const dx=x-data[offset],dz=z-data[offset+1];
        const u=(dx*data[offset+6]-dz*data[offset+5])*data[offset+9];
        const v=(data[offset+3]*dz-data[offset+4]*dx)*data[offset+9];
        if(u< -1e-8||v< -1e-8||u+v>1.00000001)continue;
        const candidate=data[offset+2]+u*data[offset+7]+v*data[offset+8];
        if(candidate>height&&candidate<=80){
          height=candidate;
          last={object:selected[ownerIds[offset/10]],point:{x,y:candidate,z}};
        }
      }
      return last;
    },
  };
}
