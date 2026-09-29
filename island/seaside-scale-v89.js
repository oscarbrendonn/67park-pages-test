import * as T from 'three';

// World-sized landmarks, not a uniform enlargement of the whole map. The
// already full-size 28 m Ferris wheel, roads, piers and retained benches stay
// at their approved dimensions. Scale before batching so ride seats, poles,
// lift, boarding points and collision use the SAME authored world matrices.
const profile=v=>Object.freeze(v);
export const seasideScale89=Object.freeze({
 ferris:profile([1,1,1]),
 carousel:profile([1.4,1.5,1.4]),
 carouselSmall:profile([1.65,1.45,1.65]),
 coaster:profile([1.5,1.7,1.5]),
 // v91: 10% wider; the tower-band calculation keeps total height unchanged.
 lighthouse:profile([1.87,2.55,1.87]),
 kiosk:profile([1.6,1.3,1.6]),
 van:profile([1.4,1.25,1.4]),
 umbrellaYellow:profile([1.6,1.2,1.6]),
 umbrellaBlue:profile([1.6,1.2,1.6]),
 umbrellaRose:profile([1.6,1.2,1.6]),
 boatYellow:profile([1.6,1.4,1.6]),
 boatRose:profile([1.6,1.4,1.6]),
 boatBlue:profile([1.6,1.4,1.6]),
 sailRose:profile([1.65,1.8,1.65]),
 sailCream:profile([1.65,1.8,1.65])
});

export function prepareSeasideAsset89(original,asset){
 const scale=seasideScale89[asset];
 if(!scale)throw Error('Missing seaside scale: '+asset);
 // Geometry/material buffers remain the original v88 assets. Clone only the
 // hierarchy, otherwise reusing a coloured umbrella could compound its scale.
 const source=original.clone(true);
 if(asset==='lighthouse'){
  // Lengthen the six tower bands, not the door, round windows or lantern.
  // The latter keep uniform proportions instead of becoming stretched ovals.
  source.updateMatrixWorld(true);
  const height=new T.Box3().setFromObject(source).getSize(new T.Vector3()).y;
  const extra=height*(scale[1]/scale[0]-1),stretch=1+extra/7.8;
  let bands=0;
  source.traverse(o=>{
   if(!o.isMesh)return;
   const y=o.position.y;
   o.geometry.computeBoundingBox();
   const h=o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y;
   if(Math.abs(o.position.x)<1e-6&&Math.abs(o.position.z)<1e-6&&y>.58&&y<8.38&&Math.abs(h-1.3)<1e-5){
    o.position.y=.58+(y-.58)*stretch;o.scale.y*=stretch;bands++;
   }else if(y>=8.38)o.position.y+=extra;
   else if(o.position.z>1&&y>2.9)o.position.y=.58+(y-.58)*stretch;
  });
  if(bands!==6)throw Error('Lighthouse tower bands changed');
  source.scale.multiplyScalar(scale[0]);
 }else source.scale.multiply(new T.Vector3(...scale));
 // Raise the skating route about its existing low entry pad, not about zero.
 // Its first point stays 0.267 m above the plaza; the 0.25 m pad remains flush
 // with it instead of growing an unwalkable step at the entrance.
 if(asset==='coaster')source.position.y-=.25*(scale[1]-1);
 source.updateMatrixWorld(true);
 return source;
}

export const obstructingBench89=Object.freeze({
 name:'8_DOGU_SAHIL_BANKLAR',
 min:profile([202.44,9.20,-140.49]),
 max:profile([204.34,9.81,-134.06])
});

// The seven curved benches are one mesh. Remove only the independently
// connected east bench over the road, never the whole mesh/material. This is
// called BEFORE building the terrain sampler, so it cannot leave ghost ground.
export function applySeasideBenchFix89(root){
 let mesh;root.traverse(o=>{if(o.isMesh&&o.name===obstructingBench89.name)mesh=o;});
 if(!mesh)throw Error('Seaside bench mesh missing');
 if(mesh.userData.seasideBench89)return mesh.userData.seasideBench89;
 root.updateMatrixWorld(true);
 const original=mesh.geometry,positions=original.attributes.position,index=original.index;
 const box=new T.Box3(new T.Vector3(...obstructingBench89.min),new T.Vector3(...obstructingBench89.max));
 const keep=[],removedBounds=new T.Box3();let removed=0;
 for(let i=0;i<(index?.count??positions.count);i+=3){
  const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
  const points=ids.map(id=>new T.Vector3().fromBufferAttribute(positions,id).applyMatrix4(mesh.matrixWorld));
  const inside=points.map(p=>box.containsPoint(p));
  if(inside.some(Boolean)&&!inside.every(Boolean))throw Error('Bench removal would cut a connected surface');
  if(inside.every(Boolean)){removed++;points.forEach(p=>removedBounds.expandByPoint(p));}
  else keep.push(...ids);
 }
 if(!removed||removed*3>=(index?.count??positions.count)/3)throw Error('Unexpected road bench extent');
 const remap=new Map(),oldIds=[],indices=keep.map(id=>{if(!remap.has(id)){remap.set(id,oldIds.length);oldIds.push(id);}return remap.get(id);});
 const geometry=new T.BufferGeometry();
 for(const [name,a] of Object.entries(original.attributes)){
  if(a.isInterleavedBufferAttribute)throw Error('Unexpected interleaved bench attribute');
  const values=new a.array.constructor(oldIds.length*a.itemSize);
  oldIds.forEach((id,i)=>values.set(a.array.subarray(id*a.itemSize,(id+1)*a.itemSize),i*a.itemSize));
  geometry.setAttribute(name,new T.BufferAttribute(values,a.itemSize,a.normalized));
 }
 if(original.groups.length)throw Error('Unexpected multi-material bench groups');
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 mesh.geometry=geometry;
 const report={version:89,removedBenches:1,remainingBenches:6,removedTriangles:removed,
  removedBounds:[removedBounds.min.toArray(),removedBounds.max.toArray()],roadUnchanged:true};
 mesh.userData.seasideBench89=report;
 return report;
}
