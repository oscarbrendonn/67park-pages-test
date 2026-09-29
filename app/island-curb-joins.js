import * as T from 'three';
// Baked shared-edge retopology. Existing meshes/materials are reused; nothing
// is layered over the old top faces, so no coplanar paint flicker is introduced.
export function applyCurbJoins(root,patch){
 if(root.userData.curbJoins)return root.userData.curbJoins;
 if(patch?.version!==1||patch.metrics.maxJoinDistance>.24)throw Error('Invalid curb joins');
 root.updateMatrixWorld(true);
 const prepared=[];
 for(const row of patch.meshes){
  const mesh=root.getObjectByName(row.name),old=mesh?.geometry;
  if(!old||old.attributes.position.count!==row.expected.vertices||old.index?.count!==row.expected.indices)throw Error('Curb join source changed: '+row.name);
  const remove=new Set(row.remove);
  if(remove.size!==row.remove.length||row.remove.some(i=>i%3||i<0||i>=old.index.count)||row.p.length!==row.n.length||row.p.length%3||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=row.p.length/3))throw Error('Invalid curb join geometry');
  const added=new T.BufferGeometry();added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
  const next=old.clone();
  for(const name of ['position','normal']){const a=old.attributes[name].array,b=added.attributes[name].array,values=new Float32Array(a.length+b.length);values.set(a);values.set(b,a.length);next.setAttribute(name,new T.BufferAttribute(values,3));}
  const ix=[];for(let i=0;i<old.index.count;i+=3)if(!remove.has(i))ix.push(old.index.getX(i),old.index.getX(i+1),old.index.getX(i+2));
  const offset=old.attributes.position.count;for(const i of row.ix)ix.push(offset+i);
  next.setIndex(ix);next.computeBoundingBox();next.computeBoundingSphere();added.dispose();prepared.push({mesh,next});
 }
 for(const {mesh,next}of prepared)mesh.geometry=next;
 return root.userData.curbJoins={...patch.metrics,materialsPreserved:true};
}
