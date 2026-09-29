import * as T from 'three';

// Beach-facing boundary of the live 6_BORDUR top, identical in both Islands.
// The south curb's rounded terminal is traced too: do not cut the separate
// beach terminal off at an invented infinite z=12.01497 line.
const curb=[
 [214.65298,-53],[214.65298,12.00497],[214.65591,12.01204],[214.66298,12.01497],
 [238.12938,12.01497],[238.19137,12.02477],[238.24731,12.05336],
 [238.29135,12.09742],[238.31965,12.15294],[238.32959,12.21517],
 [238.32958,12.95720],[238.27762,12.95316],[238.27218,12.95489],
 [238.26898,12.95844],[238.26194,12.99089],[238.26178,12.99379],
 [238.26246,12.99661],[238.26457,12.99985],[238.26774,13.00205],
 [238.29122,13.00975],[238.28487,13.06981],[238.26909,13.09049],
];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const xz=v=>[v.x,v.z];
const area=p=>p.reduce((sum,a,i)=>sum+cross(a,p[(i+1)%p.length]),0)/2;
const normalKey=(x,y,z)=>[x,y,z].map(v=>v.toFixed(6)).join(',');
function geometryFromSections(sections,approvedNormals){
 const positions=[],indices=[],vertices=new Map();
 const vertex=v=>{const key=v.toArray().map(n=>n.toFixed(8)).join(',');if(!vertices.has(key)){vertices.set(key,positions.length/3);positions.push(v.x,v.y,v.z);}return vertices.get(key);};
 function triangle(a,b,c,outward){
  const normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-16)return;
  if(normal.dot(outward)<0)[b,c]=[c,b];indices.push(vertex(a),vertex(b),vertex(c));
 }
 for(const [key,sign]of [['top',1],['bottom',-1]]){
  const points=sections.map(s=>s[key]);
  const faces=T.ShapeUtils.triangulateShape(points.map(v=>new T.Vector2(v.x,-v.z)),[]);
  // Earcut may drop a collinear contour point at the shoulder's inflection.
  // Split the corresponding cap edge so the side wall has no T-junction.
  while(faces.length){
   const face=faces.pop();let split=false;
   for(let edge=0;edge<3&&!split;edge++){
    const ai=face[edge],bi=face[(edge+1)%3],ci=face[(edge+2)%3],a=points[ai],b=points[bi],dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
    if(length2<1e-14)continue;
    for(let j=0;j<points.length;j++){
     if(face.includes(j))continue;const q=points[j],t=((q.x-a.x)*dx+(q.z-a.z)*dz)/length2;
     if(t<=1e-7||t>=1-1e-7)continue;
     const distance2=(q.x-a.x-t*dx)**2+(q.z-a.z-t*dz)**2;
     if(distance2>1e-16)continue;
     faces.push([ai,j,ci],[j,bi,ci]);split=true;break;
    }
   }
   if(!split){const [a,b,c]=face;triangle(points[a],points[b],points[c],new T.Vector3(0,sign,0));}
  }
 }
 const winding=Math.sign(area(sections.map(s=>xz(s.bottom))));
 for(let i=0;i<sections.length;i++){
  const a=sections[i],b=sections[(i+1)%sections.length],dx=b.bottom.x-a.bottom.x,dz=b.bottom.z-a.bottom.z;
  const outward=new T.Vector3(dz*winding,0,-dx*winding);
  for(const [lo,hi]of [['bottom','bevel'],['bevel','top']]){
   triangle(a[lo],b[lo],b[hi],outward);triangle(a[lo],b[hi],a[hi],outward);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 geometry.computeVertexNormals();
 // Separate cap normals from the vertical road-facing edge. Restore approved
 // side/bevel normals explicitly: the new cap's very large triangles must not
 // reweight the unchanged shoreline normals and cause scalloped shading.
 const creased=geometry.toNonIndexed();geometry.dispose();
 const pos=creased.attributes.position,norm=creased.attributes.normal,top=sections[0].top.y,bottom=sections[0].bottom.y;
 for(let i=0;i<pos.count;i+=3){
  const ys=[pos.getY(i),pos.getY(i+1),pos.getY(i+2)];
  const sign=ys.every(y=>Math.abs(y-top)<1e-6)?1:ys.every(y=>Math.abs(y-bottom)<1e-6)?-1:0;
  if(sign){for(let j=0;j<3;j++)norm.setXYZ(i+j,0,sign,0);continue;}
  const a=new T.Vector3().fromBufferAttribute(pos,i),b=new T.Vector3().fromBufferAttribute(pos,i+1),c=new T.Vector3().fromBufferAttribute(pos,i+2),face=b.sub(a).cross(c.sub(a)).normalize();
  for(let j=0;j<3;j++){
   const k=i+j,original=approvedNormals.get(normalKey(pos.getX(k),pos.getY(k),pos.getZ(k)));
   if(original)norm.setXYZ(k,...original);
   else norm.setXYZ(k,face.x,face.y,face.z);
  }
 }
 creased.setIndex(Array.from({length:pos.count},(_,i)=>i));creased.computeBoundingBox();creased.computeBoundingSphere();return creased;
}
function firstExit(point,direction,polygon){
 let nearest=Infinity;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],edge=[b[0]-a[0],b[1]-a[1]],den=cross(direction,edge);
  if(Math.abs(den)<1e-10)continue;
  const offset=[a[0]-point[0],a[1]-point[1]],t=cross(offset,edge)/den,u=cross(offset,direction)/den;
  if(t>1e-6&&u>=-1e-6&&u<=1+1e-6)nearest=Math.min(nearest,t);
 }
 return nearest;
}
function distanceToLine(p,line){
 let best=Infinity;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],d=b.clone().sub(a),t=T.MathUtils.clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);
  best=Math.min(best,p.distanceTo(a.clone().addScaledVector(d,t)));
 }
 return best;
}

/** Run after the original boardwalk AND its quiet boardwalk joints exist,
 * before umbrellas, batching and walking/collision sampler construction. */
export function repairCoastBoardwalk(source){
 if(source.userData.coastBoardwalkBoundary)return source.userData.coastBoardwalkBoundary;
 const mesh=source.getObjectByName('continuous rounded coastal boardwalk'),old=mesh?.geometry,p=old?.attributes.position;
 if(!mesh?.isMesh||mesh.parent!==source||p?.count!==421*6||mesh.userData.kind99!=='floor'||mesh.position.lengthSq()||mesh.quaternion.angleTo(new T.Quaternion())>1e-8||!mesh.scale.equals(new T.Vector3(1,1,1)))throw Error('Coast boardwalk source changed');
 const read=i=>new T.Vector3().fromBufferAttribute(p,i),left=[],right=[],approvedNormals=new Map(),oldNormals=old.attributes.normal;
 if(!oldNormals||oldNormals.count!==p.count)throw Error('Coast boardwalk normals changed');
 for(let i=0;i<p.count;i++)approvedNormals.set(normalKey(p.getX(i),p.getY(i),p.getZ(i)),[oldNormals.getX(i),oldNormals.getY(i),oldNormals.getZ(i)]);
 for(let i=0;i<421;i++){
  left.push({bottom:read(i*6),bevel:read(i*6+1),top:read(i*6+2)});
  right.push({bottom:read(i*6+5),bevel:read(i*6+4),top:read(i*6+3)});
 }
 const start=left.findIndex(s=>s.bottom.z>=-60&&s.bottom.x<220);
 const end=left.findIndex(s=>s.bottom.x>238.32960&&s.bottom.z>0);
 if(start<0||end<start||end>419)throw Error('Coast boardwalk contour changed');
 const top=left[start].top.y,bottom=left[start].bottom.y;
 if(Math.abs(top-9.365)>.00001||Math.abs(bottom-8.90)>.00001)throw Error('Coast boardwalk height changed');
 const repaired=left.slice(0,start+1),from=left[start];
 // Only a short, smooth shoulder on the traced western straight changes.
 // Everything north of this original cross-section remains byte-position exact.
 for(let i=1;i<12;i++){
  const t=i/12,s=t*t*(3-2*t),section={};
  for(const key of ['bottom','bevel','top']){
   const target=new T.Vector3(curb[0][0],key==='bottom'?bottom:top,curb[0][1]);
   section[key]=from[key].clone().lerp(target,s);section[key].z=T.MathUtils.lerp(from[key].z,target.z,t);
  }
  repaired.push(section);
 }
 for(const [x,z]of curb)repaired.push({bottom:new T.Vector3(x,bottom,z),bevel:new T.Vector3(x,top,z),top:new T.Vector3(x,top,z)});
 repaired.push(...left.slice(end));
 const sections=[...repaired,...right.toReversed()],geometry=geometryFromSections(sections,approvedNormals);
 const polygon=sections.map(s=>xz(s.top)),oldLeft=left.map(s=>s.top);
 // Extend the same transverse plank marks into the wider landing, and shorten
 // southern marks before the curb. No original seam may remain on the road.
 const seams=[];
 source.updateMatrixWorld(true);
 for(const line of source.children.filter(m=>m.name==='quiet boardwalk joint')){
  const g=line.geometry,box=new T.Box3().setFromBufferAttribute(g.attributes.position),size=box.getSize(new T.Vector3());
  const center=box.getCenter(new T.Vector3()).applyMatrix4(line.matrixWorld),axis=new T.Vector3(0,1,0).transformDirection(line.matrixWorld);
  const a=center.clone().addScaledVector(axis,size.y/2),b=center.clone().addScaledVector(axis,-size.y/2);
  const outer=distanceToLine(a,oldLeft)<distanceToLine(b,oldLeft)?a:b,inner=outer===a?b:a,direction=outer.clone().sub(inner).normalize();
  const length=firstExit(xz(inner),xz(direction),polygon)-.095;
  if(!Number.isFinite(length)||length<=.1)throw Error('Coast boardwalk plank lost support');
  if(Math.abs(length-size.y)<.01)continue;
  const nextOuter=inner.clone().addScaledVector(direction,length),side=new T.Vector3(direction.z,0,-direction.x).multiplyScalar(size.x/2);
  const verts=[inner.clone().sub(side),inner.clone().add(side),nextOuter.clone().add(side),nextOuter.clone().sub(side)];
  const next=new T.BufferGeometry();next.setAttribute('position',new T.Float32BufferAttribute(verts.flatMap(v=>v.toArray()),3));
  const n=verts[1].clone().sub(verts[0]).cross(verts[2].clone().sub(verts[0]));next.setIndex(n.y>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);next.computeVertexNormals();next.computeBoundingBox();next.computeBoundingSphere();seams.push({line,geometry:next});
 }
 const stats={revision:2,northUnchangedThroughZ:from.bottom.z,westCurb:214.65298,southCurb:12.01497,top,bottom,replacedMeshes:1,adjustedPlankJoints:seams.length,addedDrawCalls:0,triangleDelta:(geometry.index.count-old.index.count)/3,originalShoreNormals:true};
 mesh.geometry=geometry;old.dispose();
 for(const {line,geometry}of seams){line.geometry.dispose();line.geometry=geometry;line.position.set(0,0,0);line.quaternion.identity();line.scale.set(1,1,1);}
 return source.userData.coastBoardwalkBoundary=stats;
}
