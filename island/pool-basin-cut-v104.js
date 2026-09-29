import * as T from 'three';

// Subtract only the convex basin footprint. Keep the original geometry alive
// so the cut is reversible; attributes outside the hole remain interpolated
// from the source, including its UVs and normals. No road is in this footprint.
export function cutPoolBasin104(root,polygon,floorY){
 const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
 const bounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)],cuts=[];
 let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a[0]*b[1]-b[0]*a[1];}
 const orientation=Math.sign(area),allowed=/^(3_CIMEN|5_KB_SPOR_ZEMIN|7_KALDIRIM_TABANI|7_KB_SPOR_CIM_TASIYICI|4_ANA_KUMTABAN|4_KURU_IC_ZEMIN_KIYI_EGIMI)$/;
 function split(poly,a,b){
  const inside=[],outside=[],dist=v=>orientation*((b[0]-a[0])*(v.z-a[1])-(b[1]-a[1])*(v.x-a[0]));
  for(let i=0;i<poly.length;i++){
   const u=poly[i],v=poly[(i+1)%poly.length],du=dist(u),dv=dist(v),ui=du>=-1e-8,vi=dv>=-1e-8;
   (ui?inside:outside).push(u);
   if(ui!==vi){const t=du/(du-dv),w={x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t,z:u.z+(v.z-u.z)*t,a:u.a.map((n,j)=>n+(v.a[j]-n)*t)};inside.push(w);outside.push(w);}
  }
  return [inside,outside];
 }
 root.updateMatrixWorld(true);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible)return;
  const box=new T.Box3().setFromObject(mesh);
  if(box.max.x<bounds[0]||box.min.x>bounds[2]||box.max.z<bounds[1]||box.min.z>bounds[3]||box.max.y<floorY-.05)return;
  // Broad meshes can have an AABB over the pool even when their triangles do
  // not. Only demand the allow-list if a real face enters the hole.
  const original=mesh.geometry,attrs=Object.entries(original.attributes),stride=attrs.reduce((n,[,a])=>n+a.itemSize,0),p=original.attributes.position,index=original.index,count=index?.count??p.count;
  const result=[],groups=[];let removed=0,changed=false,activeMat=-1,start=0;
  function emit(poly,materialIndex){
   if(poly.length<3)return;
   if(activeMat!==materialIndex){if(result.length/stride>start)groups.push({start,count:result.length/stride-start,materialIndex:activeMat});activeMat=materialIndex;start=result.length/stride;}
   for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]])result.push(...v.a);
  }
  for(let k=0;k<count;k+=3){
   const mat=original.groups.find(g=>k>=g.start&&k<g.start+g.count)?.materialIndex??0;
   const tri=[0,1,2].map(j=>{const id=index?index.getX(k+j):k+j,w=new T.Vector3().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld),values=[];for(const [,a]of attrs)for(let n=0;n<a.itemSize;n++)values.push(a.getComponent(id,n));return {x:w.x,z:w.z,y:w.y,a:values};});
   if(Math.max(...tri.map(v=>v.x))<bounds[0]||Math.min(...tri.map(v=>v.x))>bounds[2]||Math.max(...tri.map(v=>v.z))<bounds[1]||Math.min(...tri.map(v=>v.z))>bounds[3]||Math.max(...tri.map(v=>v.y))<floorY-.05){emit(tri,mat);continue;}
   let remain=tri;const keep=[];
   for(let edge=0;edge<polygon.length&&remain.length>=3;edge++){const [inside,outside]=split(remain,polygon[edge],polygon[(edge+1)%polygon.length]);if(outside.length>=3)keep.push(outside);remain=inside;}
   if(remain.length<3){emit(tri,mat);continue;}
   // Vertical buried lawn edges have zero XZ area but must be removed too:
   // otherwise an old retaining face slices straight across the clear water.
   let area3=0;for(let j=1;j<remain.length-1;j++){const a=remain[0],b=remain[j],c=remain[j+1],u=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),v=new T.Vector3(c.x-a.x,c.y-a.y,c.z-a.z);area3+=u.cross(v).length();}
   if(area3<1e-8){emit(tri,mat);continue;}
   if(!allowed.test(mesh.name))throw Error('Pool basin encountered protected terrain: '+mesh.name);
   changed=true;removed++;for(const poly of keep)emit(poly,mat);
  }
  if(!changed)return;
  if(result.length/stride>start)groups.push({start,count:result.length/stride-start,materialIndex:activeMat});
  const geometry=new T.BufferGeometry();let offset=0;
  for(const [name,a]of attrs){const values=new Float32Array(result.length/stride*a.itemSize);for(let i=0;i<result.length/stride;i++)for(let j=0;j<a.itemSize;j++)values[i*a.itemSize+j]=result[i*stride+offset+j];geometry.setAttribute(name,new T.BufferAttribute(values,a.itemSize));offset+=a.itemSize;}
  // The existing island diagnostics expect indexed terrain geometry.
  const vertexCount=geometry.attributes.position.count,indices=new Uint32Array(vertexCount);for(let i=0;i<vertexCount;i++)indices[i]=i;
  geometry.setIndex(new T.BufferAttribute(indices,1));
  for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.name=original.name+'_POOL104_RECESS';
  cuts.push({mesh,original,geometry,removedFaces:removed});
 });
 // Commit only after every candidate passed the protected-terrain check.
 for(const c of cuts)c.mesh.geometry=c.geometry;
 return {cuts,stats:cuts.map(c=>({name:c.mesh.name,removedFaces:c.removedFaces,originalVertices:c.original.attributes.position.count,resultVertices:c.geometry.attributes.position.count})),restore(){for(const c of cuts){c.mesh.geometry=c.original;c.geometry.dispose();}}};
}
