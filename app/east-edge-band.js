import * as T from 'three';
export const EAST_EDGE_BAND=Object.freeze({x0:248.9,x1:250.399,z0:114,z1:116.35,edge:116.344745,radius:.06});
function clip(poly,distance){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=0)out.push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}
 }return out;
}
// Subdivide the EXISTING top triangles, without moving the surface. A large
// triangle at the terminal previously interpolated the bevel normal far back
// into the flat top. Real profile rows prevent that dark fan, including at
// the last millimetre. Keep the original vertices and untouched faces exact.
export function resampleEastEdgeBand(mesh,g){
 if(g===mesh.geometry)throw Error('Edge band needs a prepared clone');
 if(g.userData.eastEdgeBand)return g.userData.eastEdgeBand;
 const S=EAST_EDGE_BAND,p=g.attributes.position,n=g.attributes.normal,ix=g.index;
 if(!ix||Object.keys(g.attributes).some(k=>!['position','normal'].includes(k)))throw Error('Unexpected east edge attributes');
 const positions=Array.from(p.array),normals=Array.from(n.array),indices=[],q=new T.Vector3(),world=[];
 const localNormal=new T.Matrix3().getNormalMatrix(mesh.matrixWorld.clone().invert());
 for(let i=0;i<p.count;i++){q.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);world.push([q.x,q.y,q.z,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)]);}
 const levels=[S.z0,S.edge-S.radius,S.edge-S.radius/2,S.edge-S.radius*(1-Math.sqrt(3)/2),S.edge,S.z1];
 let replaced=0,added=0;
 function emit(poly,profile=false){
  for(let k=1;k<poly.length-1;k++){
   const vs=[poly[0],poly[k],poly[k+1]],a=new T.Vector3(...vs[0].slice(0,3)),b=new T.Vector3(...vs[1].slice(0,3)),c=new T.Vector3(...vs[2].slice(0,3));
   if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-18)continue;
   for(const v of vs){
    indices.push(positions.length/3);positions.push(...v.slice(3,6));
    if(profile){const t=T.MathUtils.clamp((v[2]-S.edge+S.radius)/S.radius,0,1);q.set(0,Math.sqrt(1-t*t),t).applyMatrix3(localNormal).normalize();normals.push(q.x,q.y,q.z);}
    else normals.push(...v.slice(6,9));
   }added++;
  }
 }
 const boundaries=[v=>v[0]-S.x0,v=>S.x1-v[0],v=>v[2]-S.z0,v=>S.z1-v[2]];
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],vs=ids.map(j=>world[j]);
  if(vs.every(v=>v[0]<S.x0)||vs.every(v=>v[0]>S.x1)||vs.every(v=>v[2]<S.z0)||vs.every(v=>v[2]>S.z1)){indices.push(...ids);continue;}
  const a=new T.Vector3(...vs[0].slice(0,3)),b=new T.Vector3(...vs[1].slice(0,3)),c=new T.Vector3(...vs[2].slice(0,3)),face=b.sub(a).cross(c.sub(a)).normalize();
  if(face.y<.999||vs.some(v=>v[1]<9.36||v[1]>9.381)){indices.push(...ids);continue;}
  let poly=vs;
  // A disjoint partition, not overlapping overlay polygons.
  for(const d of boundaries){emit(clip(poly,v=>-d(v)));poly=clip(poly,d);if(poly.length<3)break;}
  for(let j=0;j<levels.length-1&&poly.length>=3;j++)emit(clip(clip(poly,v=>v[2]-levels[j]),v=>levels[j+1]-v[2]),true);
  replaced++;
 }
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();
 return g.userData.eastEdgeBand={replaced,added,originalVertices:p.count,originalIndices:ix.count,geometrySurfacePreserved:true};
}
