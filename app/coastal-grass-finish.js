import * as T from 'three';
import {createGrassUnderfill} from './grass-underfill.js?v=approved-coast-20261004-1';

// Derive the sea-facing outline from the SAME authored grass underside.
// Never approximate or regenerate the grass top or the park's path contour.
export function coastalGrassSections(fill){
 const p=fill.geometry.attributes.position,top=fill.userData.grassUnderfill.top,edges=[];
 for(let i=0;i<p.count;i+=3){
  const upper=[0,1,2].map(j=>i+j).filter(j=>Math.abs(p.getY(j)-top)<1e-4);
  if(upper.length!==2)continue;
  const [a,b]=upper.map(j=>({x:p.getX(j),z:p.getZ(j)}));
  if(Math.abs(a.z-b.z)>1e-6)edges.push([a,b]);
 }
 const zs=[...new Set(edges.flatMap(e=>e.map(v=>v.z)))].sort((a,b)=>a-b),sections=[];let previousEdge=null;
 for(let i=0;i<zs.length-1;i++){
  const lo=zs[i],hi=zs[i+1],mid=(lo+hi)/2;
  if(hi-lo<1e-6)continue;
  const at=(e,z)=>e[0].x+(e[1].x-e[0].x)*(z-e[0].z)/(e[1].z-e[0].z);
  const crossing=edges.filter(([a,b])=>mid>Math.min(a.z,b.z)&&mid<Math.max(a.z,b.z));
  crossing.sort((a,b)=>at(b,mid)-at(a,mid));
  if(!crossing.length)throw Error('Coastal grass boundary has a gap');
  const edge=crossing[0];
  // Inland vertex heights must not unnecessarily subdivide coastal faces.
  if(edge===previousEdge){sections.at(-1).hi=hi;sections.at(-1).x1=at(edge,hi);}
  else sections.push({lo,hi,x0:at(edge,lo),x1:at(edge,hi)});
  previousEdge=edge;
 }
 if(!sections.length)throw Error('Coastal grass outline missing');
 return sections;
}

// Sutherland-Hodgman on full vertex attributes, preserving face orientation.
function clip(poly,distance){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);
  if(da>=0)out.push(a);
  if((da>=0)!==(db>=0)){
   const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));
  }
 }
 return out;
}

export function trimCoastalSkirt(mesh,sections){
 mesh.updateWorldMatrix(true,false);
 const old=mesh.geometry,p=old.attributes.position,ix=old.index;
 if(!ix||Object.keys(old.attributes).some(k=>!['position','normal'].includes(k)))throw Error('Unsupported coastal skirt attributes');
 const n=old.attributes.normal,low=sections[0].lo,high=sections.at(-1).hi;
 const minX=Math.min(...sections.flatMap(s=>[s.x0,s.x1]))-.03;
 const q=new T.Vector3(),world=[];
 for(let i=0;i<p.count;i++){q.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);world.push([q.x,q.y,q.z,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)]);}
 const positions=Array.from(p.array),normals=Array.from(n.array),indices=[];
 let affected=0,removed=0,added=0;
 const emit=poly=>{
  for(let k=1;k<poly.length-1;k++){
   const vs=[poly[0],poly[k],poly[k+1]],a=new T.Vector3(...vs[0].slice(0,3)),b=new T.Vector3(...vs[1].slice(0,3)),c=new T.Vector3(...vs[2].slice(0,3));
   if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)continue;
   for(const v of vs){indices.push(positions.length/3);positions.push(...v.slice(3,6));const normal=new T.Vector3(...v.slice(6,9)).normalize();normals.push(normal.x,normal.y,normal.z);}added++;
  }
 };
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],vs=ids.map(j=>world[j]);
  const z0=Math.min(...vs.map(v=>v[2])),z1=Math.max(...vs.map(v=>v[2]));
  if(z1<=low||z0>=high||vs.every(v=>v[0]<minX)){indices.push(...ids);continue;}
  const overlapping=sections.filter(s=>s.hi>=z0&&s.lo<=z1);
  // Whole faces strictly inside the grass remain byte-for-byte unchanged.
  if(overlapping.length&&vs.every(v=>v[0]<Math.min(...overlapping.flatMap(s=>[s.x0,s.x1]))-.03)){indices.push(...ids);continue;}
  affected++;
  emit(clip(vs,v=>low-v[2]));emit(clip(vs,v=>v[2]-high));
  for(const s of overlapping){
   let poly=clip(clip(vs,v=>v[2]-s.lo),v=>s.hi-v[2]);
   // Put cut surfaces 3 cm inside the closed grass fill, never exposed.
   poly=clip(poly,v=>s.x0+(s.x1-s.x0)*(v[2]-s.lo)/(s.hi-s.lo)-.03-v[0]);
   emit(poly);
  }
  removed++;
 }
 if(!affected)return {next:old,affected,added,removed};
 const next=old.clone();next.setAttribute('position',new T.Float32BufferAttribute(positions,3));next.setAttribute('normal',new T.Float32BufferAttribute(normals,3));next.setIndex(indices);next.clearGroups();next.setDrawRange(0,indices.length);next.computeBoundingBox();next.computeBoundingSphere();
 return {next,affected,added,removed};
}

export function applyCoastalGrassFinish(root){
 if(root.userData.coastalGrassFinish1)return root.userData.coastalGrassFinish1;
 root.updateMatrixWorld(true);
 const grass=root.getObjectByName('3_CIMEN_KOYU');
 if(!grass?.isMesh)throw Error('Dark coastal grass missing');
 const fill=createGrassUnderfill(grass,grass.material),sections=coastalGrassSections(fill);
 // These are the exact bounds of the connected photographed grass patch.
 const box=fill.geometry.boundingBox;
 if(Math.abs(box.min.z-25.7999268)>.001||Math.abs(box.max.z-113.554192)>.001||Math.abs(box.max.x-255.70935)>.001){fill.geometry.dispose();throw Error('Coastal grass source changed');}
 const prepared=[];
 try{
  for(const name of ['7_KALDIRIM_TABANI','6_BORDUR']){
   const mesh=root.getObjectByName(name);if(!mesh?.isMesh)throw Error('Coastal skirt missing: '+name);
   prepared.push({mesh,...trimCoastalSkirt(mesh,sections)});
  }
 }catch(e){for(const row of prepared)if(row.next!==row.mesh.geometry)row.next.dispose();throw e;}
 finally{fill.geometry.dispose();}
 for(const row of prepared)row.mesh.geometry=row.next;
 return root.userData.coastalGrassFinish1={version:1,sections:sections.length,grassTopUnchanged:true,parkPathsUnchanged:true,addedDrawCalls:0,meshes:prepared.map(({mesh,affected,added,removed})=>({name:mesh.name,affected,added,removed}))};
}
