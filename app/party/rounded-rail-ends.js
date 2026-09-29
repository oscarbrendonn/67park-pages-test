import * as T from 'three';

// Replace only tiny, flat circular end faces. Longitudinal tube paths stay exact.
// Colour-section boundaries are intentionally NOT capped: they meet the next colour.
export function roundRailEnds(mesh, endExtension = () => 0) {
 const src=mesh.geometry,p=src?.attributes.position,n=src?.attributes.normal,ix=src?.index;
 if(!p||!n||!ix)return null;
 mesh.updateWorldMatrix(true,false);
 const normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
 const inverse=mesh.matrixWorld.clone().invert(),localNormal=new T.Matrix3().getNormalMatrix(inverse);
 const positions=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
 const normals=Array.from({length:n.count},(_,i)=>new T.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix));
 const clusters=[];
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],normal=normals[ids[0]];
  if(normal.dot(normals[ids[1]])<.999999||normal.dot(normals[ids[2]])<.999999)continue;
  const distance=normal.dot(positions[ids[0]]);
  let group=clusters.find(g=>g.normal.dot(normal)>.999999&&Math.abs(g.distance-distance)<.0001);
  if(!group){group={normal:normal.clone(),distance,triangles:[],ids:new Set()};clusters.push(group);}
  group.triangles.push(i);ids.forEach(id=>group.ids.add(id));
 }
 const caps=[];
 for(const group of clusters){
  if(group.triangles.length<6)continue;
  const unique=new Map();for(const id of group.ids){const v=positions[id],key=v.toArray().map(x=>Math.round(x*1e5)).join(',');unique.set(key,v);}
  const verts=[...unique.values()],center=new T.Vector3();verts.forEach(v=>center.add(v));center.divideScalar(verts.length);
  const radii=verts.map(v=>v.distanceTo(center)),radius=Math.max(...radii);
  // Authored end fans may include a centre vertex, which is not part of the rim.
  const rim=verts.filter((v,i)=>radii[i]>radius*.9);
  if(rim.length<8||radius<.045||radius>.18||rim.length<verts.length-1)continue;
  if(rim.some(v=>Math.abs(v.distanceTo(center)-radius)>.001||Math.abs(v.clone().sub(center).dot(group.normal))>.0002))continue;
  caps.push({...group,center,radius,radial:rim.length,rim});
 }
 if(!caps.length)return null;
 const extensions=caps.map(cap=>Math.max(0,endExtension(cap,mesh)||0));
 const remove=new Set(caps.flatMap(c=>c.triangles)),attributes={};
 for(const [key,attr]of Object.entries(src.attributes))attributes[key]=Array.from(attr.array);
 const indices=[];for(let i=0;i<ix.count;i+=3)if(!remove.has(i))indices.push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));
 const vertex=(worldPos,worldNormal,u,v)=>{
  const id=attributes.position.length/3,local=worldPos.clone().applyMatrix4(inverse),normal=worldNormal.clone().applyNormalMatrix(localNormal);
  for(const [key,attr]of Object.entries(src.attributes)){
   const values=key==='position'?local.toArray():key==='normal'?normal.toArray():key==='uv'?[u,v]:Array(attr.itemSize).fill(key==='color'?1:0);
   attributes[key].push(...values);
  }
  return id;
 };
 for(const [capIndex,cap] of caps.entries()){
  const {normal,radius,radial}=cap,extension=extensions[capIndex],center=cap.center.clone().addScaledVector(normal,extension),helper=Math.abs(normal.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0);
  const u=helper.cross(normal).normalize(),v=normal.clone().cross(u).normalize(),rings=[];
  const rim=cap.rim.map(p=>({p,angle:Math.atan2(p.clone().sub(cap.center).dot(v),p.clone().sub(cap.center).dot(u))})).sort((a,b)=>a.angle-b.angle);
  if(extension>0){
   const base=rim.map(({p,angle},j)=>vertex(p,u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle)),j/radial,0));
   rings.push(base);
  }
  for(let latitude=0;latitude<6;latitude++){
   const phi=latitude/6*Math.PI/2,ring=[];
   for(let j=0;j<radial;j++){
    const theta=rim[j].angle,direction=u.clone().multiplyScalar(Math.cos(theta)*Math.cos(phi)).addScaledVector(v,Math.sin(theta)*Math.cos(phi)).addScaledVector(normal,Math.sin(phi));
    ring.push(vertex(latitude?center.clone().addScaledVector(direction,radius):rim[j].p.clone().addScaledVector(normal,extension),direction,j/radial,latitude/6));
   }
   if(rings.length)for(let j=0;j<radial;j++){const k=(j+1)%radial,a=rings.at(-1)[j],b=rings.at(-1)[k],c=ring[j],d=ring[k];indices.push(a,b,c,b,d,c);}
   rings.push(ring);
  }
  const tip=vertex(center.clone().addScaledVector(normal,radius),normal,.5,1),last=rings.at(-1);
  for(let j=0;j<radial;j++)indices.push(last[j],last[(j+1)%radial],tip);
 }
 const geometry=new T.BufferGeometry();
 for(const [key,attr]of Object.entries(src.attributes))geometry.setAttribute(key,new T.BufferAttribute(new attr.array.constructor(attributes[key]),attr.itemSize,attr.normalized));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return {geometry,caps:caps.length,extendedEnds:extensions.filter(x=>x>0).length,addedTriangles:(indices.length-ix.count)/3,maxExtension:Math.max(...caps.map((c,i)=>c.radius+extensions[i]))};
}
