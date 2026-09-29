// Three SkeletonUtils.clone's parallel-tree rebinding algorithm, isolated for
// this existing r160 renderer. Geometry/material ownership is handled later.
export function cloneSkinnedScene(source){
 const sourceLookup=new Map(),cloneLookup=new Map(),clone=source.clone(true);
 function pair(a,b){sourceLookup.set(b,a);cloneLookup.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);}
 pair(source,clone);
 clone.traverse(node=>{
  if(!node.isSkinnedMesh)return;
  const original=sourceLookup.get(node);
  node.skeleton=original.skeleton.clone();
  node.bindMatrix.copy(original.bindMatrix);
  node.skeleton.bones=original.skeleton.bones.map(b=>{
   const mapped=cloneLookup.get(b);if(!mapped)throw Error('Skeleton bone outside cloned source');return mapped;
  });
  node.bind(node.skeleton,node.bindMatrix);
 });
 return clone;
}
