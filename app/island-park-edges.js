import * as THREE from 'three';
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let b=0;b<8;b++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function positionCRC(a){let c=0xffffffff;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))c=crcTable[(c^b)&255]^(c>>>8);return ((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}

// Offline-baked contours: no triangulation, curve fitting or per-frame work on
// phones. Existing objects/materials are retained for collision and shadows.
export function applyParkEdges(root,patch){
 if(root.userData.parkEdges)return root.userData.parkEdges;
 if(![1,2,3].includes(patch?.version)||patch.metrics.waterOverlap>1e-8||patch.metrics.bridgeOverlap>1e-8)throw Error('Park edge repair: invalid patch');
 const path=root.getObjectByName('8_PARK_PATIKA_UST'),grass=root.getObjectByName('3_CIMEN'),curb=patch.curbLip?root.getObjectByName('6_BORDUR'):null,road=patch.roadFill?root.getObjectByName('5_YOL'):null;
 if((patch.curbLip&&!curb)||(patch.roadFill&&!road))throw Error('Park edge repair: missing pond source');
 const water=patch.water?root.getObjectByName(patch.waterName):null;
 if(patch.water&&(!water||patch.waterName!=='67D_PARK_WATER_UNIFIED_V65'||water.userData.parkPond65?.renderOnly!==true||water.userData.excludeFromTerrainSampler!==true))throw Error('Park edge repair: missing render-only pond water');
 const bowl=patch.bowlMesh?root.getObjectByName(patch.bowlMesh.name):null;
 if(patch.bowlMesh&&(!bowl||patch.bowlMesh.name!=='67D_REF_MINI_SKATE_BOWL'))throw Error('Park edge repair: missing mini bowl');
 for(const mesh of [path,grass,...(curb?[curb]:[]),...(road?[road]:[]),...(water?[water]:[]),...(bowl?[bowl]:[])]){
  const e=patch.expected[mesh?.name],g=mesh?.geometry;
  if(!e||g.attributes.position.count!==e.vertices||g.index?.count!==e.indices||Object.keys(g.attributes).some(a=>!['position','normal'].includes(a)))throw Error('Park edge repair: source mismatch '+mesh?.name);
  if(e.positionCRC&&positionCRC(g.attributes.position.array)!==e.positionCRC)throw Error('Park edge repair: geometry identity '+mesh.name);
 }
 root.updateMatrixWorld(true);
 const decode=(data,mesh)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));
  g.applyMatrix4(mesh.matrixWorld.clone().invert());g.setIndex(data.ix||Array.from({length:g.attributes.position.count},(_,i)=>i));g.computeBoundingBox();g.computeBoundingSphere();return g;
 };
 const nextPath=decode(patch.path,path),bank=decode(patch.bank,grass),old=grass.geometry,nextGrass=old.clone();
 const positions=new Float32Array(old.attributes.position.array.length+bank.attributes.position.array.length),normals=new Float32Array(positions.length);
 positions.set(old.attributes.position.array);positions.set(bank.attributes.position.array,old.attributes.position.array.length);
 normals.set(old.attributes.normal.array);normals.set(bank.attributes.normal.array,old.attributes.normal.array.length);
 const inverse=grass.matrixWorld.clone().invert(),offset=new THREE.Vector3(),origin=new THREE.Vector3().applyMatrix4(inverse);
 for(const [id,dx,dz] of patch.grassDeltas){offset.set(dx,0,dz).applyMatrix4(inverse).sub(origin);positions[id*3]+=offset.x;positions[id*3+2]+=offset.z;}
 const removed=new Set(patch.grassRemoveFaces||[]);
 for(const id of removed)if(!Number.isInteger(id)||id%3||id<0||id>=old.index.count)throw Error('Park edge repair: invalid face');
 const retained=old.index.count-removed.size*3,indices=new Uint32Array(retained+bank.index.count);let cursor=0;
 for(let i=0;i<old.index.count;i+=3)if(!removed.has(i)){indices.set(old.index.array.subarray(i,i+3),cursor);cursor+=3;}
 const base=old.attributes.position.count;
 for(let i=0;i<bank.index.count;i++)indices[retained+i]=base+bank.index.getX(i);
 nextGrass.setAttribute('position',new THREE.BufferAttribute(positions,3));nextGrass.setAttribute('normal',new THREE.BufferAttribute(normals,3));nextGrass.setIndex(new THREE.BufferAttribute(indices,1));nextGrass.computeBoundingBox();nextGrass.computeBoundingSphere();
 const before=(path.geometry.index.count+old.index.count)/3;
 path.geometry=nextPath;grass.geometry=nextGrass;bank.dispose();
 let curbDelta=0;
 for(const [mesh,addition,removedFaces] of [[curb,patch.curbLip,patch.curbRemoveFaces],[road,patch.roadFill,patch.roadRemoveFaces]]){
  if(!mesh)continue;
  const old=mesh.geometry,lip=decode(addition,mesh),remove=new Set(removedFaces),next=old.clone();
  for(const id of remove)if(!Number.isInteger(id)||id%3||id<0||id>=old.index.count)throw Error('Park edge repair: invalid curb face');
  for(const name of ['position','normal']){const values=new Float32Array(old.attributes[name].array.length+lip.attributes[name].array.length);values.set(old.attributes[name].array);values.set(lip.attributes[name].array,old.attributes[name].array.length);next.setAttribute(name,new THREE.BufferAttribute(values,3));}
  const ix=new Uint32Array(old.index.count-remove.size*3+lip.index.count);let j=0;
  for(let i=0;i<old.index.count;i+=3)if(!remove.has(i)){ix.set(old.index.array.subarray(i,i+3),j);j+=3;}
  for(let i=0;i<lip.index.count;i++)ix[j++]=old.attributes.position.count+lip.index.getX(i);
  next.setIndex(new THREE.BufferAttribute(ix,1));next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;curbDelta+=(ix.length-old.index.count)/3;lip.dispose();
 }
 let waterDelta=0;
 if(water){const previous=water.geometry;water.geometry=decode(patch.water,water);waterDelta=(water.geometry.index.count-previous.index.count)/3;}
 if(bowl){
  const data=patch.bowlMesh,next=bowl.geometry.clone(),pos=next.attributes.position,norm=next.attributes.normal,inv=bowl.matrixWorld.clone().invert(),zero=new THREE.Vector3().applyMatrix4(inv),delta=new THREE.Vector3();
  if(data.normalIds.length*3!==data.normals.length)throw Error('Park edge repair: bowl normal mismatch');
  for(const [id,dx,dz] of data.deltas){
   if(!Number.isInteger(id)||id<0||id>=pos.count||!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)>.121)throw Error('Park edge repair: invalid bowl delta');
   delta.set(dx,0,dz).applyMatrix4(inv).sub(zero);pos.setXYZ(id,pos.getX(id)+delta.x,pos.getY(id),pos.getZ(id)+delta.z);
  }
  for(let i=0;i<data.normalIds.length;i++){const id=data.normalIds[i],n=data.normals.slice(i*3,i*3+3);if(!Number.isInteger(id)||id<0||id>=norm.count||!n.every(Number.isFinite))throw Error('Park edge repair: invalid bowl normal');norm.setXYZ(id,...n);}
  next.computeBoundingBox();next.computeBoundingSphere();bowl.geometry=next;
 }
 return root.userData.parkEdges={...patch.metrics,version:patch.version,triangleDelta:(nextPath.index.count+nextGrass.index.count)/3-before+curbDelta+waterDelta,originalMaterials:true,waterSurfaceUpdated:!!water,bowlRimUpdated:!!bowl};
}
