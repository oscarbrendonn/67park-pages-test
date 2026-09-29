import * as T from 'three';

const ALLOWED=new Set(['5_YOL','3_CIMEN','8_PARK_PATIKA_UST','5_PARSEL_ZEMIN','6_BORDUR','7_DOGU_SAHIL_MEYDAN_APRON',
 'CENTER_WHITE71_-1_-1','CENTER_WHITE71_-1_1','CENTER_WHITE71_1_-1','CENTER_WHITE71_1_1']);
const FOUNTAIN=['67D_CENTER_FOUNTAIN_PLINTH','67D_CENTER_FOUNTAIN_RIM','67D_CENTER_FOUNTAIN_BASIN'];
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function boundaryPositionCRC(a){let c=0xffffffff;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))c=table[(c^b)&255]^(c>>>8);return((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}

// Baked exact gap volumes/shared boundaries. No per-frame work, new materials,
// draw calls or source-model replacement. Run before the final terrain sampler.
export function applyTerrainBoundaries(root,patch){
 if(root.userData.terrainBoundaries2)return root.userData.terrainBoundaries2;
 if(patch?.version!==2||!Array.isArray(patch.meshes)||patch.meshes.length!==10||
  !Array.isArray(patch.transforms)||patch.transforms.length!==3||
  !Number.isFinite(patch.metrics?.pathPondOverlap)||patch.metrics.pathPondOverlap>1e-6||
  !Number.isFinite(patch.metrics.pathBowlAddedOverlap)||patch.metrics.pathBowlAddedOverlap>1e-6||
  !Number.isFinite(patch.metrics.pathGrassOverlap)||patch.metrics.pathGrassOverlap>1e-5)throw Error('Invalid terrain boundary patch');
 root.updateMatrixWorld(true);
 const prepared=[],allocated=[],seen=new Set();
 function source(row,allowed){
  if(!allowed.has(row.name)||seen.has(row.name))throw Error('Invalid boundary target '+row.name);seen.add(row.name);
  const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
  if(!mesh?.isMesh||Array.isArray(mesh.material)||!g?.index||g.attributes.position?.count!==e?.vertices||
   g.index.count!==e.indices||boundaryPositionCRC(g.attributes.position.array)!==e.positionCRC)throw Error('Terrain boundary source changed: '+row.name);
  if(Object.keys(g.morphAttributes).length||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.count!==e.vertices))throw Error('Unsupported boundary attributes: '+row.name);
  return {mesh,g};
 }
 try{
  for(const row of patch.meshes){
   const {mesh,g}=source(row,ALLOWED),removed=new Set(row.remove),count=row.p.length/3;
   if(removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count)||
    !count||!Number.isInteger(count)||row.n.length!==row.p.length||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||
    row.ix.length%3||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('Invalid boundary geometry: '+row.name);
   const added=new T.BufferGeometry();allocated.push(added);
   added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));
   added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=g.clone();allocated.push(next);
   for(const [key,previous]of Object.entries(g.attributes)){
    const values=new previous.array.constructor((previous.count+count)*previous.itemSize);values.set(previous.array);
    if(key==='position'||key==='normal')values.set(added.attributes[key].array,previous.array.length);
    else for(let i=0;i<count;i++)for(let j=0;j<previous.itemSize;j++)values[(previous.count+i)*previous.itemSize+j]=
     key==='uv'&&previous.itemSize===2?(j===0?row.p[i*3]:-row.p[i*3+2]):previous.array[j];
    next.setAttribute(key,new T.BufferAttribute(values,previous.itemSize,previous.normalized));
   }
   const index=[];for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))index.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
   for(const i of row.ix)index.push(g.attributes.position.count+i);
   next.setIndex(index);next.clearGroups();next.setDrawRange(0,index.length);
   if(row.lowerBaseTo!==undefined){
    if(!row.name.startsWith('CENTER_WHITE71_')||row.lowerBaseTo!==8.79)throw Error('Invalid slab base');
    // The original slab bottom was 7.45 mm above the road. Extend only its
    // buried base, preserving the walking surface and all horizontal edges.
    const p=next.attributes.position,v=new T.Vector3(),inverse=mesh.matrixWorld.clone().invert();
    for(let i=0;i<g.attributes.position.count;i++){
     v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
     if(v.y<9.25){v.y=row.lowerBaseTo;v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);}
    }
   }
   next.computeBoundingBox();next.computeBoundingSphere();added.dispose();
   prepared.push({mesh,next,old:g});
  }
  for(const row of patch.transforms){
   const {mesh,g}=source(row,new Set(FOUNTAIN));
   if(row.scaleXZ!==1.06||row.center.length!==2||!row.center.every(Number.isFinite)||!Number.isFinite(row.dy)||row.dy<-.2||row.dy>0)throw Error('Invalid fountain fit');
   const next=g.clone();allocated.push(next);
   const [x,z]=row.center,fit=new T.Matrix4().makeScale(row.scaleXZ,1,row.scaleXZ);
   fit.setPosition(x*(1-row.scaleXZ),row.dy,z*(1-row.scaleXZ));
   next.applyMatrix4(mesh.matrixWorld.clone().invert().multiply(fit).multiply(mesh.matrixWorld));
   next.computeBoundingBox();next.computeBoundingSphere();prepared.push({mesh,next,old:g});
  }
 }catch(error){for(const g of allocated)g.dispose();throw error;}
 const triangleDelta=prepared.reduce((n,r)=>n+(r.next.index.count-r.old.index.count)/3,0);
 for(const {mesh,next}of prepared)mesh.geometry=next;
 // This helper was copied before the fountain was resized. Remove its stale
 // shadow-only copy; native shadow casting on the updated model remains on.
 const rim=root.getObjectByName(FOUNTAIN[1]);
 for(const child of [...rim.children])if(child.name==='67D_DIK_YAN_GOLGE_'+FOUNTAIN[1]){rim.remove(child);child.geometry?.dispose();}
 return root.userData.terrainBoundaries2={...patch.metrics,version:2,triangleDelta,meshes:prepared.map(r=>r.mesh.name),materialsPreserved:true,perFrameWork:0};
}
