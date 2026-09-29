import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

// Park-only geometry. Run after final scaling/lowering and v50/v56/v55, before
// the terrain sampler or Kimi relief-mask bake. No paths, water, bowl, props,
// material, transforms, or draw calls are changed.
export function applyParkTerrain57(root,meta,buffer){
 if(meta?.version!==57||!(buffer instanceof ArrayBuffer)||buffer.byteLength!==meta.byteLength||!['codex','kimi'].includes(meta.variant))throw Error('park57: manifest');
 if(!root.getObjectByName('6_BORDUR')?.userData.coastalRoad56||root.getObjectByName('8_REF_AYIRICI')?.userData.dividerMatch55?.version!==55)throw Error('park57: requires road56 and divider55');
 const names=['3_CIMEN','3_CIMEN_KOYU'];
 if(!Array.isArray(meta.meshes)||meta.meshes.length!==2||names.some(n=>meta.meshes.filter(m=>m.name===n).length!==1))throw Error('park57: target scope');
 const read=(d,C)=>{if(!d||!Number.isSafeInteger(d.byteOffset)||!Number.isSafeInteger(d.count)||d.byteOffset<0||d.count<0||d.byteOffset%4||d.byteOffset+d.count*4>buffer.byteLength)throw Error('park57: binary range');return new C(buffer,d.byteOffset,d.count);};
 const prepared=[];root.updateMatrixWorld(true);
 for(const item of meta.meshes){
  const matches=[];root.traverse(m=>{if(m.isMesh&&m.name===item.name)matches.push(m);});if(matches.length!==1)throw Error('park57: missing/duplicate '+item.name);
  const mesh=matches[0],old=mesh.geometry;
  if(mesh.userData.parkTerrain57){if(mesh.userData.parkTerrain57!==meta.patchId)throw Error('park57: another patch applied');continue;}
  if(!mesh.userData.sideContinuity50||old.attributes.position.count!==item.sourceVertices||old.index?.count!==item.sourceIndexCount||sideSourceHash50(old)!==item.sourceHash)throw Error('park57: source '+item.name);
  if(!Array.isArray(item.matrixWorld)||item.matrixWorld.length!==16||item.matrixWorld.some((v,i)=>!Number.isFinite(v)||Math.abs(v-mesh.matrixWorld.elements[i])>1e-8))throw Error('park57: world transform '+item.name);
  const p=read(item.positions,Float32Array),n=read(item.normals,Float32Array);
  if(p.length!==n.length||p.length%3||!p.every(Number.isFinite))throw Error('park57: attribute shape');
  for(let i=0;i<n.length;i+=3){const length=Math.hypot(n[i],n[i+1],n[i+2]);if(!Number.isFinite(length)||Math.abs(length-1)>.002)throw Error('park57: normal');}
  let next;
  if(item.name==='3_CIMEN'&&item.mode==='sparse'){
   const ids=read(item.vertexIds,Uint32Array);if(p.length!==ids.length*3)throw Error('park57: sparse shape');
   next=ids.length?old.clone():old;
   for(let j=0;j<ids.length;j++){
    const id=ids[j];if(id>=item.sourceVertices||(j&&id<=ids[j-1]))throw Error('park57: sparse index');
    const prior=old.attributes.position,offset=id*3;
    const world=new THREE.Vector3().fromBufferAttribute(prior,id).applyMatrix4(mesh.matrixWorld);
    if(world.x<174||world.x>189||world.z<51||world.z>68)throw Error('park57: sparse normal scope');
    if(p[j*3]!==prior.array[offset]||p[j*3+2]!==prior.array[offset+2]||p[j*3+1]>prior.array[offset+1])throw Error('park57: light grass may only lower');
    if(p[j*3+1]!==prior.array[offset+1]){
     const v=new THREE.Vector3().fromBufferAttribute(prior,id).applyMatrix4(mesh.matrixWorld);
     if(meta.variant!=='codex'||v.x<177||v.x>186||v.z<54||v.z>65)throw Error('park57: light grass edit scope');
    }
    next.attributes.position.array.set(p.subarray(j*3,j*3+3),offset);next.attributes.normal.array.set(n.subarray(j*3,j*3+3),offset);
   }
  }else if(item.name==='3_CIMEN_KOYU'&&item.mode==='replace'){
   const ix=read(item.index,Uint32Array);if(p.length!==item.vertices*3||ix.length%3||!ix.every(i=>i<item.vertices))throw Error('park57: index');
   // Every old vertex (including all attributes outside the park) is retained
   // as an unchanged prefix. Only the east-park component's faces are replaced.
   for(let i=0;i<old.attributes.position.array.length;i++)if(p[i]!==old.attributes.position.array[i]||n[i]!==old.attributes.normal.array[i])throw Error('park57: original vertex prefix changed');
   let retained=0;const v=new THREE.Vector3();
   for(let k=0;k<old.index.count;k+=3){
    const ids=[old.index.getX(k),old.index.getX(k+1),old.index.getX(k+2)];
    const park=ids.map(i=>{v.fromBufferAttribute(old.attributes.position,i).applyMatrix4(mesh.matrixWorld);return v.x>=192.887&&v.x<=255.711&&v.z>=25.799&&v.z<=113.555;});
    if(park.every(Boolean))continue;
    if(park.some(Boolean))throw Error('park57: crossing park boundary');
    for(const id of ids)if(ix[retained++]!==id)throw Error('park57: outside park face changed');
   }
   if(retained!==item.stats.retainedOutsideIndices)throw Error('park57: retained face count');
   for(let k=retained;k<ix.length;k++)if(ix[k]<item.sourceVertices)throw Error('park57: replacement uses old vertex');
   for(let i=item.sourceVertices;i<item.vertices;i++){
    v.fromArray(p,i*3).applyMatrix4(mesh.matrixWorld);
    if(v.x<192.887||v.x>255.711||v.z<25.799||v.z>113.555||v.y<9.379||v.y>10.2)throw Error('park57: new crown bounds');
   }
   next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(p.slice(),3));next.setAttribute('normal',new THREE.Float32BufferAttribute(n.slice(),3));next.setIndex(new THREE.BufferAttribute(ix.slice(),1));
  }else throw Error('park57: mode');
  if(next!==old){next.computeBoundingBox();next.computeBoundingSphere();}
  prepared.push({mesh,next,old,item});
 }
 // Validate all targets before committing any mutation.
 for(const {mesh,next,item}of prepared){mesh.geometry=next;mesh.userData.parkTerrain57=meta.patchId;if(item.name==='3_CIMEN_KOYU')mesh.userData.parkTerrainSampler57={indexStart:item.stats.retainedOutsideIndices};}
 return {version:57,patchId:meta.patchId,targets:prepared.length,meshes:prepared.filter(p=>p.next!==p.old).length,raisedHeight:.8,shoulderWidth:4.5,addedDrawCalls:0};
}

// Optional scoped collision wrapper. Existing v27 samples keep their original
// precision and behavior. Only the newly built crown receives double-precision
// triangle arithmetic, which avoids micron-wide misses at exact grid diagonals
// caused by independently rounded float32 world anchors and edge vectors.
export function wrapParkTerrainSampler57(baseSampler,root){
 const mesh=root.getObjectByName('3_CIMEN_KOYU'),spec=mesh?.userData.parkTerrainSampler57;
 if(!spec)return baseSampler;
 mesh.updateWorldMatrix(true,false);
 const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,values=[],bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity},a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let k=spec.indexStart;k<ix.count;k+=3){
  a.fromBufferAttribute(p,ix.getX(k)).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,ix.getX(k+1)).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(p,ix.getX(k+2)).applyMatrix4(mesh.matrixWorld);
  const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
  if(Math.abs(det)<1e-12||det>=0)continue; // Crown upward cap only.
  values.push(a.x,a.z,a.y,bx,bz,cx,cz,b.y-a.y,c.y-a.y,1/det);
  for(const v of [a,b,c]){bounds.minX=Math.min(bounds.minX,v.x);bounds.maxX=Math.max(bounds.maxX,v.x);bounds.minZ=Math.min(bounds.minZ,v.z);bounds.maxZ=Math.max(bounds.maxZ,v.z);}
 }
 const data=new Float64Array(values),cellSize=4,cols=Math.ceil((bounds.maxX-bounds.minX)/cellSize),rows=Math.ceil((bounds.maxZ-bounds.minZ)/cellSize),cells=Array.from({length:cols*rows},()=>[]),gridX=x=>Math.max(0,Math.min(cols-1,Math.floor((x-bounds.minX)/cellSize))),gridZ=z=>Math.max(0,Math.min(rows-1,Math.floor((z-bounds.minZ)/cellSize)));
 for(let k=0;k<data.length;k+=10){
  const xs=[data[k],data[k]+data[k+3],data[k]+data[k+5]],zs=[data[k+1],data[k+1]+data[k+4],data[k+1]+data[k+6]];
  for(let z=gridZ(Math.min(...zs));z<=gridZ(Math.max(...zs));z++)for(let x=gridX(Math.min(...xs));x<=gridX(Math.max(...xs));x++)cells[z*cols+x].push(k);
 }
 const bins=cells.map(a=>Uint32Array.from(a));let lastX=NaN,lastZ=NaN,last=null;
 return {
  stats:{...baseSampler.stats,parkPrecision57:{triangles:data.length/10,cells:bins.length,bytes:data.byteLength+bins.reduce((n,b)=>n+b.byteLength,0)}},
  sample(x,z){
   if(x===lastX&&z===lastZ)return last;lastX=x;lastZ=z;last=baseSampler.sample(x,z);
   if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return last;
   let y=last?.point.y??-Infinity;
   for(const k of bins[gridZ(z)*cols+gridX(x)]){
    const dx=x-data[k],dz=z-data[k+1],u=(dx*data[k+6]-dz*data[k+5])*data[k+9],v=(data[k+3]*dz-data[k+4]*dx)*data[k+9];
    if(u< -1e-8||v< -1e-8||u+v>1.00000001)continue;
    const height=data[k+2]+u*data[k+7]+v*data[k+8];if(height>y&&height<=80){y=height;last={object:mesh,point:{x,y,z}};}
   }
   return last;
  }
 };
}
