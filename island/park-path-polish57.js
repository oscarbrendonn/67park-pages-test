import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

const TARGETS=['8_PARK_PATIKA_UST','6_BORDUR','3_CIMEN','67D_REF_MAIN_WATER_CAP','67D_REF_MAIN_WATER_NECK_CAP'];
const SCOPES=[[190,78.4,199,99],[145,99.5,190,105.3201]];
const inScope=(x,z,e=0)=>SCOPES.some(b=>x>=b[0]-e&&z>=b[1]-e&&x<=b[2]+e&&z<=b[3]+e);
const intersects=(b,e=.0002)=>SCOPES.some(s=>b[0]<=s[2]+e&&b[2]>=s[0]-e&&b[1]<=s[3]+e&&b[3]>=s[1]-e);
const hashBuffer=buffer=>{let h=2166136261;for(const v of new Uint8Array(buffer)){h^=v;h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');};

// Closed-solid replacements of two bounded shoreline segments. Apply after
// final scale/sink, road56, divider55 and terrain57; before masks or samplers.
// Every original attribute remains an unchanged prefix. Unaffected source
// triangles remain verbatim, and no object/material/transform is replaced.
export function applyParkPathPolish57(root,meta,buffer){
 if(meta?.version!==57||meta.revision!=='C1-r2'||!['codex','kimi'].includes(meta.variant)||!(buffer instanceof ArrayBuffer)||buffer.byteLength!==meta.byteLength||hashBuffer(buffer)!==meta.bufferHash)throw Error('park path57: manifest/binary');
 if(!root.getObjectByName('6_BORDUR')?.userData.coastalRoad56||root.getObjectByName('8_REF_AYIRICI')?.userData.dividerMatch55?.version!==55||!root.getObjectByName('3_CIMEN')?.userData.parkTerrain57)throw Error('park path57: prerequisite order');
 if(!Array.isArray(meta.meshes)||meta.meshes.length!==TARGETS.length||TARGETS.some(n=>meta.meshes.filter(m=>m.name===n).length!==1))throw Error('park path57: target scope');
 const read=(d,C)=>{if(!d||!Number.isSafeInteger(d.byteOffset)||!Number.isSafeInteger(d.count)||d.byteOffset<0||d.count<0||d.byteOffset%4||d.byteOffset+d.count*4>buffer.byteLength)throw Error('park path57: binary range');return new C(buffer,d.byteOffset,d.count);};
 const prepared=[],v=new THREE.Vector3();root.updateMatrixWorld(true);
 for(const item of meta.meshes){
  const matches=[];root.traverse(m=>{if(m.isMesh&&m.name===item.name)matches.push(m);});if(matches.length!==1)throw Error('park path57: missing/duplicate '+item.name);
  const mesh=matches[0],old=mesh.geometry;
  if(mesh.userData.parkPathPolish57){if(mesh.userData.parkPathPolish57!==meta.patchId)throw Error('park path57: different patch');continue;}
  if(old.attributes.position.count!==item.sourceVertices||old.index?.count!==item.sourceIndexCount||sideSourceHash50(old)!==item.sourceHash)throw Error('park path57: source '+item.name);
  if(!Array.isArray(item.matrixWorld)||item.matrixWorld.length!==16||item.matrixWorld.some((n,i)=>!Number.isFinite(n)||Math.abs(n-mesh.matrixWorld.elements[i])>1e-8))throw Error('park path57: world transform '+item.name);
  const p=read(item.positions,Float32Array),n=read(item.normals,Float32Array),ix=read(item.index,Uint32Array),removed=read(item.removedFaceStarts,Uint32Array);
  if(p.length!==item.vertices*3||n.length!==p.length||ix.length%3||!p.every(Number.isFinite)||!ix.every(i=>i<item.vertices))throw Error('park path57: attribute/index shape');
  for(let i=0;i<n.length;i+=3)if(!Number.isFinite(n[i]+n[i+1]+n[i+2])||Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.002)throw Error('park path57: normal');
  for(let i=0;i<old.attributes.position.array.length;i++)if(p[i]!==old.attributes.position.array[i]||n[i]!==old.attributes.normal.array[i])throw Error('park path57: original prefix changed');
  const removedSet=new Set(),sourcePoints=new Set();for(let i=0;i<old.attributes.position.array.length;i+=3)sourcePoints.add(old.attributes.position.array.slice(i,i+3).join(','));
  for(let j=0;j<removed.length;j++){
   const k=removed[j];if(k%3||k>=old.index.count||(j&&k<=removed[j-1]))throw Error('park path57: removed index');removedSet.add(k);
   const b=[Infinity,Infinity,-Infinity,-Infinity];
   for(let l=0;l<3;l++){v.fromBufferAttribute(old.attributes.position,old.index.getX(k+l)).applyMatrix4(mesh.matrixWorld);b[0]=Math.min(b[0],v.x);b[1]=Math.min(b[1],v.z);b[2]=Math.max(b[2],v.x);b[3]=Math.max(b[3],v.z);}
   if(!intersects(b))throw Error('park path57: removed face outside scope');
  }
  let kept=0;for(let k=0;k<old.index.count;k+=3)if(!removedSet.has(k))for(let j=0;j<3;j++)if(ix[kept++]!==old.index.getX(k+j))throw Error('park path57: retained face changed');
  if(kept!==item.retainedIndexCount)throw Error('park path57: retained count');
  for(let k=kept;k<ix.length;k+=3){
   const b=[Infinity,Infinity,-Infinity,-Infinity];
   for(let j=0;j<3;j++){if(ix[k+j]<item.sourceVertices)throw Error('park path57: new face uses source prefix');v.fromArray(p,ix[k+j]*3).applyMatrix4(mesh.matrixWorld);b[0]=Math.min(b[0],v.x);b[1]=Math.min(b[1],v.z);b[2]=Math.max(b[2],v.x);b[3]=Math.max(b[3],v.z);if(v.y<8.79||v.y>9.65)throw Error('park path57: new height');if(!inScope(v.x,v.z,.0002)&&!sourcePoints.has(p.slice(ix[k+j]*3,ix[k+j]*3+3).join(',')))throw Error('park path57: outside source vertex moved');}
   // A source triangle crossing the clip boundary can be subdivided on its
   // retained side too. Every outside vertex must be an exact original source
   // point (checked above); independent contour QA proves identical coverage.
  }
  const next=old.clone();next.setAttribute('position',new THREE.Float32BufferAttribute(p.slice(),3));next.setAttribute('normal',new THREE.Float32BufferAttribute(n.slice(),3));next.setIndex(new THREE.BufferAttribute(ix.slice(),1));
  // These source solids have position/normal only. Reject rather than silently
  // corrupt future UV/color attributes if the source asset ever changes.
  if(Object.keys(old.attributes).some(a=>a!=='position'&&a!=='normal')||old.groups.length)throw Error('park path57: unexpected attributes/groups');
  next.computeBoundingBox();next.computeBoundingSphere();prepared.push({mesh,next,item});
 }
 for(const {mesh,next,item}of prepared){mesh.geometry=next;mesh.userData.parkPathPolish57=meta.patchId;mesh.userData.parkPathSampler57={indexStart:item.retainedIndexCount};}
 const copiedShadowSource=meta.variant==='codex'?'3_CIMEN':'8_PARK_PATIKA_UST';
 return {version:57,revision:'C1-r2',patchId:meta.patchId,targets:prepared.length,addedDrawCalls:0,helperRefresh:prepared.some(p=>p.mesh.name===copiedShadowSource)?[copiedShadowSource]:[],scope:SCOPES.map(b=>b.slice())};
}

// Scoped Float64 walk triangles avoid microscopic misses along dense curved
// triangulation edges in v27's Float32 anchor/delta representation. Optional
// meshNames makes this safe for grass-only or path-only diagnostic samplers.
export function wrapParkPathSampler57(baseSampler,root,meshNames=['8_PARK_PATIKA_UST','6_BORDUR','3_CIMEN']){
 const selected=meshNames.map(n=>root.getObjectByName(n)).filter(m=>m?.userData.parkPathPolish57),values=[],owners=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 if(!selected.length)return baseSampler;
 for(let owner=0;owner<selected.length;owner++){
  const mesh=selected[owner];mesh.updateWorldMatrix(true,false);const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
  for(let k=0;k<ix.count;k+=3){
   a.fromBufferAttribute(p,ix.getX(k)).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,ix.getX(k+1)).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(p,ix.getX(k+2)).applyMatrix4(mesh.matrixWorld);
   const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
   const crossX=(b.y-a.y)*cz-bz*(c.y-a.y),crossZ=bx*(c.y-a.y)-(b.y-a.y)*cx;
   if(det>=-1e-12||-det<.05*Math.hypot(crossX,det,crossZ)||!intersects([Math.min(a.x,b.x,c.x),Math.min(a.z,b.z,c.z),Math.max(a.x,b.x,c.x),Math.max(a.z,b.z,c.z)]))continue;
   owners.push(owner);values.push(a.x,a.z,a.y,bx,bz,cx,cz,b.y-a.y,c.y-a.y,1/det);
  }
 }
 const data=new Float64Array(values),ownerIds=Uint8Array.from(owners),x0=144.9998,z0=78.3998,cols=14,rows=7,cell=4,bins=Array.from({length:cols*rows},()=>[]),gx=x=>Math.max(0,Math.min(cols-1,Math.floor((x-x0)/cell))),gz=z=>Math.max(0,Math.min(rows-1,Math.floor((z-z0)/cell)));
 for(let k=0;k<data.length;k+=10){const xs=[data[k],data[k]+data[k+3],data[k]+data[k+5]],zs=[data[k+1],data[k+1]+data[k+4],data[k+1]+data[k+6]];for(let z=gz(Math.min(...zs));z<=gz(Math.max(...zs));z++)for(let x=gx(Math.min(...xs));x<=gx(Math.max(...xs));x++)bins[z*cols+x].push(k);}
 const cells=bins.map(v=>Uint32Array.from(v));let lastX=NaN,lastZ=NaN,last=null;
 return {stats:{...baseSampler.stats,parkPathPrecision57:{triangles:owners.length,bytes:data.byteLength+ownerIds.byteLength+cells.reduce((s,c)=>s+c.byteLength,0),cells:cells.length}},sample(x,z){
  if(x===lastX&&z===lastZ)return last;lastX=x;lastZ=z;last=baseSampler.sample(x,z);if(!inScope(x,z,.0002))return last;
  let y=last?.point.y??-Infinity;
  for(const k of cells[gz(z)*cols+gx(x)]){const dx=x-data[k],dz=z-data[k+1],u=(dx*data[k+6]-dz*data[k+5])*data[k+9],v=(data[k+3]*dz-data[k+4]*dx)*data[k+9];if(u< -1e-8||v< -1e-8||u+v>1.00000001)continue;const height=data[k+2]+u*data[k+7]+v*data[k+8];if(height>y&&height<=80){y=height;last={object:selected[ownerIds[k/10]],point:{x,y,z}};}}
  return last;
 }};
}
