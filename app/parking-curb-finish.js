import * as T from 'three';
import {boundaryPositionCRC as crc} from './terrain-boundaries.js?v=ground-2';

const TARGETS=['6_BORDUR','7_KALDIRIM_TABANI'];
const WINDOW=[-154.60,-140.0,-151.9,-137.7];

// Bounded startup repair, after map-joint-finish and before floor/shadow
// indexing. No overlays, new materials, scene objects or per-frame work.
export function applyParkingCurbFinish(root,patch){
 if(root.userData.parkingCurbFinish1)return root.userData.parkingCurbFinish1;
 if(patch?.version!==1||patch.top!==9.38008564||patch.bottom!==8.79685173||JSON.stringify(patch.window)!==JSON.stringify(WINDOW)||patch.meshes?.length!==2)throw Error('Invalid parking curb patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[],seen=new Set();
 try{
  for(const row of patch.meshes){
   if(!TARGETS.includes(row.name)||seen.has(row.name))throw Error('Invalid parking curb target');seen.add(row.name);
   const mesh=root.getObjectByName(row.name),old=mesh?.geometry,e=row.expected;
   if(!mesh?.isMesh||Array.isArray(mesh.material)||!old?.index||old.attributes.position?.count!==e?.vertices||old.index.count!==e.indices||crc(old.attributes.position.array)!==e.positionCRC||crc(Uint32Array.from(old.index.array))!==e.indexCRC)throw Error('Parking curb source changed: '+row.name);
   if(Object.keys(old.morphAttributes).length||Object.values(old.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported parking curb attributes');
   const count=row.p?.length/3,remove=new Set(row.remove);
   if(!Number.isInteger(count)||count<1||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||!Array.isArray(row.ix)||row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid parking curb geometry');
   if(!Array.isArray(row.remove)||!remove.size||remove.size!==row.remove.length||[...remove].some(i=>!Number.isInteger(i)||i%3||i<0||i>=old.index.count))throw Error('Invalid parking curb clipping');
   for(let i=0;i<row.n.length;i+=3)if(Math.abs(Math.hypot(...row.n.slice(i,i+3))-1)>.001)throw Error('Invalid parking curb normal');
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=old.clone();allocated.push(next);const kept=[],used=new Map();
   for(let i=0;i<old.index.count;i+=3)if(!remove.has(i))for(let j=0;j<3;j++){
    const id=old.index.getX(i+j);if(!used.has(id))used.set(id,used.size);kept.push(used.get(id));
   }
   for(const [key,a]of Object.entries(old.attributes)){
    const values=new a.array.constructor((used.size+count)*a.itemSize);
    for(const [oldId,id]of used)for(let j=0;j<a.itemSize;j++)values[id*a.itemSize+j]=a.array[oldId*a.itemSize+j];
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,used.size*a.itemSize);
    else for(let i=0;i<count;i++)for(let j=0;j<a.itemSize;j++)values[(used.size+i)*a.itemSize+j]=key==='uv'&&a.itemSize===2?(j===0?row.p[i*3]:-row.p[i*3+2]):a.array[j];
    next.setAttribute(key,new T.BufferAttribute(values,a.itemSize,a.normalized));
   }
   for(const i of row.ix)kept.push(used.size+i);
   next.setIndex(kept);next.clearGroups();next.setDrawRange(0,kept.length);next.computeBoundingBox();next.computeBoundingSphere();
   prepared.push({mesh,next,old});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((s,r)=>s+(r.next.index.count-r.old.index.count)/3,0);
 for(const {mesh,next,old}of prepared){mesh.geometry=next;old.dispose();}
 for(const g of allocated)if(!prepared.some(r=>r.next===g))g.dispose();
 return root.userData.parkingCurbFinish1={...patch.metrics,version:1,triangleDelta,materialsPreserved:true,addedDrawCalls:0,perFrameWork:0};
}
