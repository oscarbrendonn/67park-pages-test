import {createTerrainSampler} from '../../island/terrain-sampler-v27.js?v=1';
import {BufferAttribute,BufferGeometry,Mesh} from 'three';

// The island's height index predates the rounded coping ends. Index just the
// added end triangles, using the same exact sampling as the island floor.
// No new visible geometry, global rebuild, per-frame raycast or physics mesh.
export function installSkateRailSupport(world, entries) {
 if (!entries.length || typeof world.ground !== 'function') return null;
 const owners=new WeakMap(),temporary=[];
 const meshes=entries.map(entry=>{
  if(!entry.mesh)return entry;
  const {mesh,startVertex}=entry,p=mesh.geometry.attributes.position,ix=mesh.geometry.index,indices=[];
  for(let i=0;i<ix.count;i+=3)if([0,1,2].every(j=>ix.getX(i+j)>=startVertex))
   indices.push(ix.getX(i)-startVertex,ix.getX(i+1)-startVertex,ix.getX(i+2)-startVertex);
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(p.array.subarray(startVertex*p.itemSize),p.itemSize));
  geometry.setIndex(indices);
  const proxy=new Mesh(geometry,mesh.material);proxy.name=mesh.name;proxy.matrixAutoUpdate=false;
  mesh.updateWorldMatrix(true,false);proxy.matrix.copy(mesh.matrixWorld);
  proxy.matrixWorld.copy(mesh.matrixWorld);proxy.matrixWorldAutoUpdate=false;
  owners.set(proxy,mesh);temporary.push(geometry);return proxy;
 });
 const sampler=createTerrainSampler(meshes,4),ground=world.ground,sample=world.sample;
 let active=true;
 const supportAt=(x,z)=>{
  const hit=active&&Number.isFinite(x)&&Number.isFinite(z)?sampler.sample(x,z):null;
  if(hit&&owners.has(hit.object))hit.object=owners.get(hit.object);
  return hit;
 };
 function supportedGround(x,z,...args) {
  const base=ground.call(this,x,z,...args),hit=supportAt(x,z);
  return hit && (base==null || hit.point.y>base) ? hit.point.y : base;
 }
 function supportedSample(x,z,...args) {
  const base=sample?.call(this,x,z,...args),hit=supportAt(x,z);
  return hit && (!base || hit.point.y>base.point.y) ? hit : base;
 }
 world.ground=supportedGround;
 if(sample)world.sample=supportedSample;
 return {
  stats:{revision:'skate-solid-1',meshes:meshes.length,triangles:sampler.stats.triangles,
   cells:sampler.stats.cells,addedDrawCalls:0,perFrameRaycasts:0},
  dispose(){
   active=false;
   for(const geometry of temporary)geometry.dispose();
   if(world.ground===supportedGround)world.ground=ground;
   if(world.sample===supportedSample)world.sample=sample;
  }
 };
}
