import * as THREE from 'three';

const TARGETS=new Set(['6_BORDUR','7_KALDIRIM_TABANI','7_MERKEZ_KALDIRIM_TABANI',
  '7_DOGU_SAHIL_KAVSAK_TABANI','7_DOGU_SAHIL_MEYDAN_APRON']);
// Same fixed native-to-game scale as both islands; the live loader applies
// root.scale only AFTER this hook, whereas offline QA already has it applied.
const METRES_PER_NATIVE_UNIT=320/1.7831611037254333;

// Geometry-only upgrade: roads, material references, layout and transforms stay.
// Invoke after the source apron/road join repairs, before shadow helpers/samplers.
export function applyCurbPolish49(root,meta,buffer){
  if(meta?.version!==49||!Array.isArray(meta.meshes)||meta.meshes.length!==TARGETS.size)
    throw new Error('Invalid curb polish v49 manifest');
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength===0)throw new Error('Invalid curb binary buffer');
  const names=new Set(meta.meshes.map(item=>item?.name));
  if(names.size!==TARGETS.size||[...names].some(name=>!TARGETS.has(name)))throw new Error('Invalid curb target list');
  const targets=meta.meshes.map(item=>{
    const mesh=root?.getObjectByName?.(item.name);
    if(!mesh?.isMesh)throw new Error('Missing curb mesh '+item.name);
    return {item,mesh};
  });
  const applied=targets.filter(({mesh})=>mesh.userData.curbPolish49?.version===49);
  if(applied.length===TARGETS.size)return targets.map(({mesh})=>mesh.userData.curbPolish49);
  if(applied.length)throw new Error('Partial curb polish state; reload the source map');

  const prepared=[],ranges=[];
  const read=(description,Type,label)=>{
    const offset=description?.byteOffset,count=description?.count;
    if(!Number.isSafeInteger(offset)||offset<0||offset%4||!Number.isSafeInteger(count)||count<=0||
      !Number.isSafeInteger(count*4)||offset+count*4>buffer.byteLength)
      throw new Error('Invalid curb buffer range '+label);
    const end=offset+count*4;
    if(ranges.some(([a,b])=>offset<b&&end>a))throw new Error('Overlapping curb buffer ranges '+label);
    ranges.push([offset,end]);return new Type(buffer,offset,count);
  };
  try{
    // Validate and prepare the entire release before mutating even one mesh.
    for(const {item,mesh} of targets){
      if(!Number.isSafeInteger(item.sourceVertexCount)||item.sourceVertexCount<=0||
        !Number.isSafeInteger(item.sourceIndexCount)||item.sourceIndexCount<=0||item.sourceIndexCount%3||
        mesh.geometry.attributes.position.count!==item.sourceVertexCount||mesh.geometry.index?.count!==item.sourceIndexCount)
        throw new Error('Curb baseline mismatch '+item.name);
      const positions=read(item.positions,Float32Array,item.name+' positions');
      const normals=read(item.normals,Float32Array,item.name+' normals');
      const indices=read(item.index,Uint32Array,item.name+' indices');
      if(positions.length%3||normals.length!==positions.length||indices.length%3)
        throw new Error('Invalid curb attribute lengths '+item.name);
      for(let i=0;i<positions.length;i++)if(!Number.isFinite(positions[i])||!Number.isFinite(normals[i]))
        throw new Error('Non-finite curb attribute '+item.name);
      for(let i=0;i<normals.length;i+=3)if(Math.abs(Math.hypot(normals[i],normals[i+1],normals[i+2])-1)>.001)
        throw new Error('Invalid curb normal '+item.name);
      for(const index of indices)if(index>=positions.length/3)throw new Error('Curb index out of bounds '+item.name);
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      geometry.setIndex(new THREE.BufferAttribute(indices,1));
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      // Finite is not sufficient: a failed miter can still export enormous,
      // finite coordinates and exhaust the terrain sampler's spatial grid.
      // Check against the actual source envelope, in world metres, before
      // changing any mesh or building a sampler. A 6cm inward lip has at most
      // 6cm envelope shrink; allow only 2cm additional numeric headroom.
      const sourceBox=new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
      const candidateBox=geometry.boundingBox;
      let maxEnvelopeDelta=0;
      for(const side of ['min','max'])for(const axis of ['x','y','z']){
        maxEnvelopeDelta=Math.max(maxEnvelopeDelta,Math.abs(candidateBox[side][axis]-sourceBox[side][axis])*METRES_PER_NATIVE_UNIT);
      }
      if(!Number.isFinite(maxEnvelopeDelta)||maxEnvelopeDelta>.08){
        geometry.dispose();
        throw new Error('Curb geometry escaped source envelope '+item.name);
      }
      prepared.push({mesh,geometry,report:{version:49,name:item.name,
        sourceTriangles:item.sourceIndexCount/3,triangles:indices.length/3,bevelWidth:.06,maxEnvelopeDelta}});
    }
  }catch(error){
    for(const entry of prepared)entry.geometry.dispose();
    throw error;
  }
  for(const {mesh,geometry,report} of prepared){
    mesh.geometry=geometry;mesh.userData.curbPolish49=report;
  }
  return prepared.map(entry=>entry.report);
}
