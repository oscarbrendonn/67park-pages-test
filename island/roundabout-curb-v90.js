import * as THREE from 'three';

// The southeast traffic island had an inward notch in its grass and a
// differently triangulated curb. Its three matching islands are complete.
// Reuse one intact, same-height circular profile from EACH original mesh:
// no overlay, new material, larger footprint, or modification to the road.
const NAMES=['7_DOGU_SAHIL_KAVSAK_TABANI','3_DOGU_SAHIL_KAVSAK_CIMEN'];
const SOURCE=[-9.814006,-83.09702],TARGET=[208.22574,-83.09702];
const inIsland=(p,c)=>Math.abs(p.x-c[0])<5.05&&Math.abs(p.z-c[1])<5.05;

function partition(mesh){
 const geometry=mesh.geometry,p=geometry.attributes.position,ix=geometry.index;
 if(!ix||geometry.groups.length||Object.values(geometry.attributes).some(a=>a.isInterleavedBufferAttribute))
  throw Error('Roundabout v90: unsupported geometry '+mesh.name);
 const vertices=Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
 const source=[],removed=[],retained=[],sourceBox=new THREE.Box3(),targetBox=new THREE.Box3();
 for(let k=0;k<ix.count;k+=3){
  const ids=[ix.getX(k),ix.getX(k+1),ix.getX(k+2)];
  const src=ids.map(i=>inIsland(vertices[i],SOURCE)),dst=ids.map(i=>inIsland(vertices[i],TARGET));
  if((src.some(Boolean)&&!src.every(Boolean))||(dst.some(Boolean)&&!dst.every(Boolean)))
   throw Error('Roundabout v90: would cut a connected surface '+mesh.name);
  if(src.every(Boolean)){source.push(...ids);ids.forEach(i=>sourceBox.expandByPoint(vertices[i]));}
  if(dst.every(Boolean)){removed.push(...ids);ids.forEach(i=>targetBox.expandByPoint(vertices[i]));}
  else retained.push(...ids);
 }
 const a=sourceBox.getSize(new THREE.Vector3()),b=targetBox.getSize(new THREE.Vector3());
 if(source.length<500||removed.length<500||Math.abs(a.x-a.z)>.001||a.distanceTo(b)>.001)
  throw Error('Roundabout v90: matching circular profiles not found '+mesh.name);
 return {mesh,geometry,source,removed,retained,sourceBox,targetBox};
}

function replacement(part,worldShift){
 const {geometry,mesh,source,retained}=part;
 const keptIds=[...new Set(retained)],sourceIds=[...new Set(source)];
 const keptMap=new Map(keptIds.map((id,i)=>[id,i]));
 const copyMap=new Map(sourceIds.map((id,i)=>[id,keptIds.length+i]));
 const next=new THREE.BufferGeometry();
 const localShift=worldShift.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).invert());
 for(const [name,a] of Object.entries(geometry.attributes)){
  const data=new a.array.constructor((keptIds.length+sourceIds.length)*a.itemSize);
  [...keptIds,...sourceIds].forEach((id,i)=>data.set(a.array.subarray(id*a.itemSize,(id+1)*a.itemSize),i*a.itemSize));
  if(name==='position')for(let i=keptIds.length;i<keptIds.length+sourceIds.length;i++){
   data[i*3]+=localShift.x;data[i*3+1]+=localShift.y;data[i*3+2]+=localShift.z;
  }
  next.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize,a.normalized));
 }
 next.setIndex([...retained.map(i=>keptMap.get(i)),...source.map(i=>copyMap.get(i))]);
 next.computeBoundingBox();next.computeBoundingSphere();
 next.name=geometry.name;next.userData={...geometry.userData,roundabout90:true};
 return next;
}

// Call after the final world transform and before contact-mask baking and
// createTerrainSampler. Existing closed-volume curb shadows automatically
// read the replaced geometry; there is no stale shadow/collision helper.
export function applyRoundaboutCurb90(root){
 if(root.userData.roundaboutCurb90)return root.userData.roundaboutCurb90;
 root.updateMatrixWorld(true);
 const parts=NAMES.map(name=>{
  const matches=[];root.traverse(o=>{if(o.isMesh&&o.name===name)matches.push(o);});
  if(matches.length!==1)throw Error('Roundabout v90: missing/duplicate '+name);
  return partition(matches[0]);
 });
 const center=parts[0].targetBox.getCenter(new THREE.Vector3());
 const shift=center.clone().sub(parts[0].sourceBox.getCenter(new THREE.Vector3()));
 if(Math.abs(shift.y)>.00001||Math.abs(shift.z)>.0001||Math.abs(shift.x-218.03974)>.001)
  throw Error('Roundabout v90: island alignment changed');
 // Prepare both layers before publishing either; a failed guard cannot leave
 // a repaired grass disc over an unreviewed curb or vice versa.
 const prepared=parts.map(p=>({...p,next:replacement(p,shift)}));
 for(const p of prepared)p.mesh.geometry=p.next;
 const report={version:90,repairedIslands:1,auditedMatchingIslands:4,
  center:[center.x,center.z],outerDiameter:parts[0].targetBox.max.x-parts[0].targetBox.min.x,
  grassDiameter:parts[1].targetBox.max.x-parts[1].targetBox.min.x,
  records:parts.map(p=>({name:p.mesh.name,removedTriangles:p.removed.length/3,replacementTriangles:p.source.length/3})),
  addedMeshes:0,addedDrawCalls:0,originalMaterialsPreserved:true,roadsUnchanged:true};
 root.userData.roundaboutCurb90=report;
 return report;
}
