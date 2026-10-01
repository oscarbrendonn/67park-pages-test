import { Box3, Matrix4, Ray, Vector3 } from 'three';

// The camera boom only consults the authored blocker list. Each unique static
// BufferGeometry gets a local-space triangle BVH; instances retain their exact
// transforms, so gaps between houses never become camera colliders.
const indexes = new WeakMap();
const geometryTrees = new WeakMap();
const geometryBounds = new WeakMap();
const LEAF_TRIANGLES = 32;
const finite = (...values) => values.every(Number.isFinite);

function geometryToken(geometry) {
 const position = geometry?.getAttribute?.('position'), index = geometry?.getIndex?.(), range = geometry?.drawRange || {};
 return { position, positionVersion: position?.version, index, indexVersion: index?.version, start: range.start, count: range.count };
}
function sameToken(a, b) { return a && a.position === b.position && a.positionVersion === b.positionVersion && a.index === b.index && a.indexVersion === b.indexVersion && a.start === b.start && a.count === b.count; }

function boundsFor(geometry) {
 const token = geometryToken(geometry), cached = geometryBounds.get(geometry);
 if (cached && sameToken(cached.token, token)) return cached;
 geometry?.computeBoundingBox?.();
 const bounds = { token, box: geometry?.boundingBox?.clone?.() || new Box3().makeEmpty() };
 geometryBounds.set(geometry, bounds); return bounds;
}

// A packed tree keeps the exact Float64 bounds and original triangle offsets.
// No triangle vertices are copied or simplified. In-place partitioning avoids
// a JS object and a separate typed array for every leaf (hundreds of thousands
// of allocations in the park). Scratch bounds are dropped before publication.
function* buildTriangleTree(geometry, token) {
 const started=performance.now(),position=token.position,source=token.index;
 const available=position?.itemSize>=3?(source?source.count:position.count):0;
 const start=Math.max(0,token.start||0),end=Math.min(available,start+(Number.isFinite(token.count)?token.count:Infinity));
 const capacity=Math.max(0,Math.floor((end-start)/3)),order=new Uint32Array(capacity),bounds=new Float64Array(capacity*6);
 const localBox=new Box3().makeEmpty();let count=0,operations=0;
 for(let id=0;id<capacity;id++){
  const offset=start+id*3,ia=source?source.getX(offset):offset,ib=source?source.getX(offset+1):offset+1,ic=source?source.getX(offset+2):offset+2;
  if(ia<position.count&&ib<position.count&&ic<position.count){
   const ax=position.getX(ia),ay=position.getY(ia),az=position.getZ(ia),bx=position.getX(ib),by=position.getY(ib),bz=position.getZ(ib),cx=position.getX(ic),cy=position.getY(ic),cz=position.getZ(ic);
   if(finite(ax,ay,az,bx,by,bz,cx,cy,cz)){
    const at=id*6,minX=Math.min(ax,bx,cx),minY=Math.min(ay,by,cy),minZ=Math.min(az,bz,cz),maxX=Math.max(ax,bx,cx),maxY=Math.max(ay,by,cy),maxZ=Math.max(az,bz,cz);
    bounds[at]=minX;bounds[at+1]=minY;bounds[at+2]=minZ;bounds[at+3]=maxX;bounds[at+4]=maxY;bounds[at+5]=maxZ;order[count++]=id;
    localBox.expandByPoint({x:minX,y:minY,z:minZ});localBox.expandByPoint({x:maxX,y:maxY,z:maxZ});
   }
  }
  if(++operations%512===0)yield;
 }
 const chunkSize=Math.min(256,Math.max(1,2*Math.ceil(count/LEAF_TRIANGLES)-1)),chunks=[];
 let nodes=0;
 const allocate=()=>{
  const id=nodes++;
  if(id%chunkSize===0)chunks.push({bounds:new Float64Array(chunkSize*6),links:new Uint32Array(chunkSize*4)});
  return id;
 };
 const root=count?allocate():-1,stack=count?[{node:root,from:0,to:count}]:[];
 while(stack.length){
  const task=stack.pop(),{node,from,to}=task,chunk=chunks[Math.floor(node/chunkSize)],at=node%chunkSize*6,link=node%chunkSize*4;
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=from;i<to;i++){
   const b=order[i]*6;minX=Math.min(minX,bounds[b]);minY=Math.min(minY,bounds[b+1]);minZ=Math.min(minZ,bounds[b+2]);maxX=Math.max(maxX,bounds[b+3]);maxY=Math.max(maxY,bounds[b+4]);maxZ=Math.max(maxZ,bounds[b+5]);
   if(++operations%512===0)yield;
  }
  chunk.bounds[at]=minX;chunk.bounds[at+1]=minY;chunk.bounds[at+2]=minZ;chunk.bounds[at+3]=maxX;chunk.bounds[at+4]=maxY;chunk.bounds[at+5]=maxZ;
  if(to-from<=LEAF_TRIANGLES){chunk.links[link+2]=from;chunk.links[link+3]=to-from;continue;}
  const sx=maxX-minX,sy=maxY-minY,sz=maxZ-minZ,axis=sy>sx&&sy>=sz?1:sz>sx?2:0,span=axis===0?sx:axis===1?sy:sz,midpoint=(axis===0?minX:axis===1?minY:minZ)+span*.5;
  let middle=from;
  for(let i=from;i<to;i++){
   const b=order[i]*6+axis;
   if((bounds[b]+bounds[b+3])*.5<midpoint){const value=order[middle];order[middle++]=order[i];order[i]=value;}
   if(++operations%512===0)yield;
  }
  if(middle===from||middle===to)middle=from+((to-from)>>1);
  const left=allocate(),right=allocate();chunk.links[link]=left;chunk.links[link+1]=right;
  stack.push({node:right,from:middle,to},{node:left,from,to:middle});
 }
 for(let i=0;i<count;i++){order[i]=start+order[i]*3;if(++operations%512===0)yield;}
 return {token,position,source,data:null,root,localBox,order,chunks,chunkSize,triangleCount:count,nodeCount:nodes,
  referenceBytes:order.byteLength,nodeBytes:chunks.reduce((n,c)=>n+c.bounds.byteLength+c.links.byteLength,0),
  transientBuildBytes:bounds.byteLength,buildMs:+(performance.now()-started).toFixed(3)};
}
function triangleTree(geometry) {
 const token=geometryToken(geometry),cached=geometryTrees.get(geometry);
 if(cached&&sameToken(cached.token,token))return cached;
 const builder=buildTriangleTree(geometry,token);let step;
 do{step=builder.next();}while(!step.done);
 geometryTrees.set(geometry,step.value);return step.value;
}
async function stagedTriangleTree(geometry,yieldTask,limits) {
 const token=geometryToken(geometry),cached=geometryTrees.get(geometry);
 if(cached&&sameToken(cached.token,token))return cached;
 const builder=buildTriangleTree(geometry,token);let step;
 do{
  step=builder.next();const now=performance.now();
  limits.maxChunkMs=Math.max(limits.maxChunkMs,now-limits.lastYield);
  if(!step.done&&now-limits.lastYield>=limits.budgetMs){await yieldTask();limits.lastYield=performance.now();}
 }while(!step.done);
 if(sameToken(token,geometryToken(geometry)))geometryTrees.set(geometry,step.value);
 return step.value;
}

// Call while constructing the unpublished world. It builds every exact triangle
// index in time-bounded chunks; cameraMeshCast still has its synchronous exact
// fallback for later geometry mutation rather than returning an unsafe no-hit.
export async function prepareCameraMeshes(world, { yieldTask = () => new Promise(resolve => setTimeout(resolve, 0)), budgetMs = 6 } = {}) {
 const limits = { budgetMs: Math.max(1, Math.min(12, budgetMs)), maxChunkMs: 0, lastYield: performance.now() }, geometries = [...new Set((world?.blockers || []).filter(mesh => mesh?.isMesh && !mesh.isSkinnedMesh).map(mesh => mesh.geometry))];
 for (const geometry of geometries) { boundsFor(geometry); const now = performance.now(); limits.maxChunkMs = Math.max(limits.maxChunkMs, now - limits.lastYield); if (now - limits.lastYield >= limits.budgetMs) { await yieldTask(); limits.lastYield = performance.now(); } await stagedTriangleTree(geometry, yieldTask, limits); }
 limits.maxChunkMs = +Math.max(limits.maxChunkMs, 0).toFixed(3); return { geometries: geometries.length, ...cameraMeshCastStats(world), maxChunkMs: limits.maxChunkMs };
}

function refresh(record) {
 const { mesh } = record, count = mesh.isInstancedMesh ? mesh.count : 1, bounds = boundsFor(mesh.geometry); mesh.updateWorldMatrix(true, false);
 const version = mesh.isInstancedMesh ? mesh.instanceMatrix.version : 0;
 if (record.geometry === mesh.geometry && record.count === count && record.version === version && record.world.equals(mesh.matrixWorld) && record.bounds === bounds) return;
 if (record.geometry !== mesh.geometry || record.count !== count) record.rows = Array.from({ length: count }, () => ({ world: new Matrix4(), inverse: new Matrix4(), box: new Box3() }));
 for (let instance = 0; instance < count; instance++) { const row = record.rows[instance]; if (mesh.isInstancedMesh) { mesh.getMatrixAt(instance, record.instance); row.world.multiplyMatrices(mesh.matrixWorld, record.instance); } else row.world.copy(mesh.matrixWorld); row.inverse.copy(row.world).invert(); row.box.copy(bounds.box).applyMatrix4(row.world); }
 record.geometry = mesh.geometry; record.count = count; record.version = version; record.world.copy(mesh.matrixWorld); record.bounds = bounds;
}

function intersects(bounds,at,ray) {
 let minimum=-Infinity,maximum=Infinity;
 for(let axis=0;axis<3;axis++){
  const origin=axis===0?ray.origin.x:axis===1?ray.origin.y:ray.origin.z,direction=axis===0?ray.direction.x:axis===1?ray.direction.y:ray.direction.z,min=bounds[at+axis],max=bounds[at+axis+3];
  if(Math.abs(direction)<1e-12){if(origin<min||origin>max)return false;continue;}
  const first=(min-origin)/direction,last=(max-origin)/direction;
  minimum=Math.max(minimum,Math.min(first,last));maximum=Math.min(maximum,Math.max(first,last));
  if(maximum<minimum)return false;
 }
 return maximum>=0;
}

function nearestHit(tree,ray,origin,near,far,scratch) {
 if(tree.root<0)return null;
 let closest=far,found=null;scratch.stack.length=0;scratch.stack.push(tree.root);
 while(scratch.stack.length){
  const node=scratch.stack.pop(),chunk=tree.chunks[Math.floor(node/tree.chunkSize)],local=node%tree.chunkSize,link=local*4;
  if(!intersects(chunk.bounds,local*6,ray))continue;
  const count=chunk.links[link+3];
  if(!count){scratch.stack.push(chunk.links[link],chunk.links[link+1]);continue;}
  const start=chunk.links[link+2];
  for(let i=start;i<start+count;i++){
   const offset=tree.order[i];
   scratch.triangles++; const ia = tree.source ? tree.source.getX(offset) : offset, ib = tree.source ? tree.source.getX(offset + 1) : offset + 1, ic = tree.source ? tree.source.getX(offset + 2) : offset + 2, position = tree.position;
   scratch.a.set(position.getX(ia), position.getY(ia), position.getZ(ia)); scratch.b.set(position.getX(ib), position.getY(ib), position.getZ(ib)); scratch.c.set(position.getX(ic), position.getY(ic), position.getZ(ic));
   if (!ray.intersectTriangle(scratch.a, scratch.b, scratch.c, false, scratch.localHit)) continue;
   scratch.worldHit.copy(scratch.localHit).applyMatrix4(scratch.world); const distance = scratch.worldHit.distanceTo(origin);
   if (distance >= near && distance <= closest) { closest = distance; found = distance; }
  }
 }
 return found;
}
function sameBlockers(index, blockers) { return index.source === blockers && index.meshes.length === blockers.length && index.meshes.every((mesh, i) => mesh === blockers[i]); }

export function cameraMeshCast(world, origin, direction, length) {
 if (!world?.blockers?.length) return null;
 let index = indexes.get(world);
 if (!index || !sameBlockers(index, world.blockers)) { const records = world.blockers.filter(mesh => mesh.isMesh && !mesh.isSkinnedMesh).map(mesh => ({ mesh, rows: [], world: new Matrix4(), instance: new Matrix4(), count: -1, bounds: null })); index = { source: world.blockers, meshes: [...world.blockers], records, ray: new Ray(), localRay: new Ray(), point: new Vector3(), scratch: { a: new Vector3(), b: new Vector3(), c: new Vector3(), localHit: new Vector3(), worldHit: new Vector3(), world: new Matrix4(), stack: [], triangles: 0 }, lastTriangleTests: 0 }; indexes.set(world, index); }
 const { ray, localRay, point, scratch } = index; ray.origin.set(origin.x, origin.y, origin.z); ray.direction.set(direction.x, direction.y, direction.z).normalize(); let closest = length, found = false; scratch.triangles = 0;
 for (const record of index.records) {
  let visible = true; for (let node = record.mesh; node; node = node.parent) if (!node.visible) { visible = false; break; }
  if (!visible || record.mesh.userData?.cameraIgnore) continue;
  refresh(record);
  for (const row of record.rows) {
   if (row.box.isEmpty() || (!row.box.containsPoint(ray.origin) && (!ray.intersectBox(row.box, point) || point.distanceTo(ray.origin) > closest))) continue;
   localRay.origin.copy(ray.origin).applyMatrix4(row.inverse); localRay.direction.copy(ray.direction).transformDirection(row.inverse); scratch.world.copy(row.world);
   const hit = nearestHit(triangleTree(record.mesh.geometry), localRay, ray.origin, .02, closest, scratch); if (hit !== null) { closest = hit; found = true; }
  }
 }
 index.lastTriangleTests = scratch.triangles; return found ? closest : null;
}

// Test-only observability for a complexity bound; it cannot affect casting.
export function cameraMeshCastStats(world) {
 const index = indexes.get(world), meshes = index?.records.map(record => record.mesh) || (world?.blockers || []), trees = new Set(meshes.map(mesh => geometryTrees.get(mesh.geometry)).filter(Boolean));
 let triangles = 0, nodes = 0, referenceBytes = 0, nodeBytes = 0, transientBuildPeakBytes = 0, buildMs = 0;
 for (const tree of trees) { triangles += tree.triangleCount; nodes += tree.nodeCount; referenceBytes += tree.referenceBytes; nodeBytes += tree.nodeBytes; transientBuildPeakBytes = Math.max(transientBuildPeakBytes, tree.transientBuildBytes); buildMs += tree.buildMs; }
 // Packed bounds/links and source references are measured, not JS-object estimates.
 // Vertex positions stay in the original geometry and are never duplicated.
 return { triangleTests: index?.lastTriangleTests || 0, trees: trees.size, triangles, nodes, minimumRetainedBytes: referenceBytes + nodeBytes, referenceBytes, nodeBytes, transientBuildPeakBytes, buildMs: +buildMs.toFixed(3) };
}
