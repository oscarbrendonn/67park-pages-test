import * as T from 'three';
import {boundaryPositionCRC} from './terrain-boundaries.js?v=ground-2';

// One offline-baked shared contour, applied before collision/shadow sampling.
// No color, shader, texture, light, draw-call or per-frame changes.
export function applyGrassBoundary(root,patch){
 if(root.userData.grassBoundary1)return root.userData.grassBoundary1;
 const names=new Set(['3_CIMEN','7_KALDIRIM_TABANI']),seen=new Set(),prepared=[];
 if(patch?.version!==1||patch.meshes?.length!==2||patch.metrics?.repairedSteps!==2||
  !Array.isArray(patch.sites)||patch.sites.length!==2||patch.sites.some(s=>!Array.isArray(s.at)||s.at.length!==2||!s.at.every(Number.isFinite))||
  !Number.isFinite(patch.metrics?.uncoveredArea)||patch.metrics.uncoveredArea>1e-8||
  !Number.isFinite(patch.metrics?.grassPavementOverlap)||patch.metrics.grassPavementOverlap>1e-8)throw Error('Invalid grass boundary patch');
 root.updateMatrixWorld(true);
 try{
  for(const row of patch.meshes){
   if(!names.has(row.name)||seen.has(row.name))throw Error('Invalid grass boundary target');
   seen.add(row.name);
   const mesh=root.getObjectByName(row.name),old=mesh?.geometry,e=row.expected;
   if(!mesh?.isMesh||Array.isArray(mesh.material)||!old?.index||old.attributes.position.count!==e?.vertices||
    old.attributes.normal?.count!==e.vertices||
    old.index.count!==e.indices||boundaryPositionCRC(old.attributes.position.array)!==e.positionCRC||
    Object.keys(old.attributes).some(k=>!['position','normal'].includes(k))||
    Object.keys(old.morphAttributes).length)throw Error('Grass boundary source changed: '+row.name);
   const count=row.p?.length/3,removed=new Set(row.remove);
   if(!Number.isInteger(count)||count<3||row.n?.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||
    !Array.isArray(row.ix)||row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count)||
    removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=old.index.count))throw Error('Invalid grass boundary geometry');
   const addition=new T.BufferGeometry();
   addition.setAttribute('position',new T.Float32BufferAttribute(row.p,3));
   addition.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));
   addition.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=old.clone();prepared.push({mesh,old,next});
   for(const key of ['position','normal']){
    const a=old.attributes[key],b=addition.attributes[key],values=new Float32Array(a.array.length+b.array.length);
    values.set(a.array);values.set(b.array,a.array.length);next.setAttribute(key,new T.BufferAttribute(values,3));
   }
   addition.dispose();
   const indices=[];
   for(let i=0;i<old.index.count;i+=3)if(!removed.has(i))indices.push(old.index.getX(i),old.index.getX(i+1),old.index.getX(i+2));
   for(const i of row.ix)indices.push(old.attributes.position.count+i);
   next.setIndex(indices);next.clearGroups();next.setDrawRange(0,indices.length);
   next.computeBoundingBox();next.computeBoundingSphere();
  }
 }catch(error){for(const {next}of prepared)next.dispose();throw error;}
 for(const {mesh,next}of prepared)mesh.geometry=next;
 return root.userData.grassBoundary1={version:1,...patch.metrics,materialsPreserved:true,sites:patch.sites.map(r=>r.at)};
}
