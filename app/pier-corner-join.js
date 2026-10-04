import * as T from 'three';

// Only the photographed amusement-pier notch. World-space values measured
// from the current imported mesh, not from an older map/bundle.
export const PIER_JOIN=Object.freeze({
 ax:208.22574474756874,az:-189.921244,
 bx:213.51073032357854,bz:-184.636258,
 cutX:207.7,cutZ:-184.1,outerZ:-191.0635,outerX:214.65298239141046,
 top:9.380085642765648,road:9.227547471411993,bottom:8.79685173
});

function clip(poly,d){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=d(a),db=d(b);
  if(da>=0)out.push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}
 }return out;
}

function writer(mesh){
 const old=mesh.geometry,p=Array.from(old.attributes.position.array),n=Array.from(old.attributes.normal.array),ix=[],inv=mesh.matrixWorld.clone().invert(),nm=new T.Matrix3().getNormalMatrix(inv),q=new T.Vector3();
 function tri(vs,normal,vertexNormals){
  const a=new T.Vector3(...vs[0]),b=new T.Vector3(...vs[1]),c=new T.Vector3(...vs[2]);
  const face=b.sub(a).cross(c.sub(a));if(face.lengthSq()<1e-16)return;
  if(normal&&face.dot(new T.Vector3(...normal))<0){[vs[1],vs[2]]=[vs[2],vs[1]];if(vertexNormals)[vertexNormals[1],vertexNormals[2]]=[vertexNormals[2],vertexNormals[1]];}
  const nn=new T.Vector3(...(normal||face.normalize().toArray())).applyMatrix3(nm).normalize();
  for(let j=0;j<vs.length;j++){ix.push(p.length/3);q.fromArray(vs[j]).applyMatrix4(inv);p.push(q.x,q.y,q.z);const vn=vertexNormals?new T.Vector3(...vertexNormals[j]).applyMatrix3(nm).normalize():nn;n.push(vn.x,vn.y,vn.z);}
 }
 function finish(){const g=old.clone();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setIndex(ix);g.setDrawRange(0,ix.length);g.computeBoundingBox();g.computeBoundingSphere();return g;}
 return {p,n,ix,tri,finish};
}

// Round the two outer 45-degree bends without changing either mating cut.
function roundedCorner(a,b,c,r=.2){
 const u=new T.Vector2(...a).sub(new T.Vector2(...b)).normalize(),v=new T.Vector2(...c).sub(new T.Vector2(...b)).normalize();
 const angle=Math.acos(u.dot(v)),d=r/Math.tan(angle/2),center=new T.Vector2(...b).add(u.clone().add(v).normalize().multiplyScalar(r/Math.sin(angle/2)));
 const start=new T.Vector2(...b).add(u.multiplyScalar(d)),end=new T.Vector2(...b).add(v.multiplyScalar(d));
 let t0=Math.atan2(start.y-center.y,start.x-center.x),dt=Math.atan2(end.y-center.y,end.x-center.x)-t0;
 while(dt>Math.PI)dt-=Math.PI*2;while(dt< -Math.PI)dt+=Math.PI*2;
 return Array.from({length:9},(_,i)=>[center.x+r*Math.cos(t0+dt*i/8),center.y+r*Math.sin(t0+dt*i/8)]);
}

export function applyPierCornerJoin(root){
 if(root.userData.pierCornerJoin1)return root.userData.pierCornerJoin1;
 root.updateMatrixWorld(true);const road=root.getObjectByName('5_YOL'),curb=root.getObjectByName('6_BORDUR'),S=PIER_JOIN;
 if(!road?.isMesh||!curb?.isMesh)throw Error('Pier join sources missing');
 for(const m of [road,curb])if(!m.geometry.index||Object.keys(m.geometry.attributes).some(k=>!['position','normal'].includes(k)))throw Error('Unexpected pier attributes');
 const anchors=[[S.ax,S.az],[S.ax,S.bz],[S.bx,S.bz]],found=new Set(),check=new T.Vector3();
 for(let i=0;i<road.geometry.attributes.position.count;i++){
  check.fromBufferAttribute(road.geometry.attributes.position,i).applyMatrix4(road.matrixWorld);
  if(Math.abs(check.y-S.road)>.00002)continue;
  anchors.forEach(([x,z],j)=>{if(Math.abs(check.x-x)<.00002&&Math.abs(check.z-z)<.00002)found.add(j);});
 }
 if(found.size!==3)throw Error('Pier road anchors changed; do not reapply old geometry');
 const rw=writer(road),cw=writer(curb),q=new T.Vector3(),world=[],g=curb.geometry;
 for(let i=0;i<g.attributes.position.count;i++){
  q.fromBufferAttribute(g.attributes.position,i).applyMatrix4(curb.matrixWorld);
  world.push([...q.toArray(),...Array.from(g.attributes.position.array.slice(i*3,i*3+3)),...Array.from(g.attributes.normal.array.slice(i*3,i*3+3))]);
 }
 const bounds=[v=>v[0]-S.cutX,v=>215-v[0],v=>v[2]+192,v=>S.cutZ-v[2]];let removed=0;
 const emit=poly=>{for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){cw.ix.push(cw.p.length/3);cw.p.push(...v.slice(3,6));cw.n.push(...v.slice(6,9));}};
 for(let i=0;i<g.index.count;i+=3){
  const ids=[0,1,2].map(j=>g.index.getX(i+j)),vs=ids.map(j=>world[j]);
  if(bounds.some(d=>vs.every(v=>d(v)<=0))){cw.ix.push(...ids);continue;}
  let poly=vs;for(const d of bounds){emit(clip(poly,v=>-d(v)));poly=clip(poly,d);if(poly.length<3)break;}removed++;
 }
 if(removed<20)throw Error('Pier terminal scope no longer matches');
 // Original road vertices/faces stay exact. This disjoint triangle fills
 // the notch; the former exposed wall is now safely inside the solid fill.
 for(const id of road.geometry.index.array)rw.ix.push(id);
 const A=[S.ax,S.az],B=[S.bx,S.bz],C=[S.ax,S.bz];
 rw.tri([A,B,C].map(([x,z])=>[x,S.road,z]),[0,1,0]);
 rw.tri([A,C,B].map(([x,z])=>[x,S.bottom,z]),[0,-1,0]);
 // Close the fill down to the same imported base level (not a floating skin).
 for(const [a,b]of [[A,B],[B,C],[C,A]]){
  const vs=[[a[0],S.bottom,a[1]],[a[0],S.road,a[1]],[b[0],S.road,b[1]],[b[0],S.bottom,b[1]]];
  rw.tri([vs[0],vs[1],vs[2]]);rw.tri([vs[0],vs[2],vs[3]]);
 }
 // Constant-width diagonal curb joins the two existing straight strips.
 const width=S.outerX-S.bx,k=S.az-S.ax-width*Math.SQRT2;
 const oa=[S.outerZ-k,S.outerZ],ob=[S.outerX,S.outerX+k];
 const poly=[[S.cutX,S.az],A,B,[S.bx,S.cutZ],[S.outerX,S.cutZ],
  ...roundedCorner([S.outerX,S.cutZ],ob,oa),...roundedCorner(ob,oa,[S.cutX,S.outerZ]),[S.cutX,S.outerZ]];
 const triangles=T.ShapeUtils.triangulateShape(poly.map(p=>new T.Vector2(...p)),[]);
 for(const ids of triangles)cw.tri(ids.map(i=>[poly[i][0],S.bottom,poly[i][1]]),[0,-1,0]);
 // Recover the exact two cut profiles. Their authored bevel widths differ;
 // interpolate those profiles rather than introducing a step at either cut.
 const nm=new T.Matrix3().getNormalMatrix(curb.matrixWorld);
 const profile=(axis,cut,coord,lo,hi,outward)=>{
  const segments=[],fractions=[0,1];
  for(let i=0;i<g.index.count;i+=3){
   const ids=[0,1,2].map(j=>g.index.getX(i+j)),vs=ids.map(j=>world[j]);if(vs.every(v=>v[axis]<cut)||vs.every(v=>v[axis]>cut)||vs.every(v=>v[1]<S.top-.15))continue;
   const hits=[];
   for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3];if((a[axis]<=cut&&b[axis]>=cut)||(b[axis]<=cut&&a[axis]>=cut)){
    if(Math.abs(b[axis]-a[axis])<1e-10)continue;const t=(cut-a[axis])/(b[axis]-a[axis]),v=a.map((x,k)=>x+(b[k]-x)*t),f=(v[coord]-lo)/(hi-lo);
    if(f<-.0001||f>1.0001||v[1]<S.top-.15)continue;
    const n=new T.Vector3(...v.slice(6,9)).applyMatrix3(nm).normalize();hits.push({f:T.MathUtils.clamp(f,0,1),y:v[1],h:n.x*outward[0]+n.z*outward[1],up:n.y});
   }}
   if(hits.length===2&&Math.abs(hits[1].f-hits[0].f)>1e-9){segments.push(hits);fractions.push(...hits.map(h=>h.f));}
  }
  const at=f=>{let best;for(const [a,b]of segments){const t=(f-a.f)/(b.f-a.f);if(t<-.0001||t>1.0001)continue;const v={y:a.y+(b.y-a.y)*t,h:a.h+(b.h-a.h)*t,up:a.up+(b.up-a.up)*t};if(!best||v.y>best.y)best=v;}if(!best)throw Error('Pier cut profile uncovered: '+f);return best;};
  return {fractions,at};
 };
 const pa=profile(0,S.cutX,2,S.az,S.outerZ,[0,-1]),pb=profile(2,S.cutZ,0,S.bx,S.outerX,[1,0]);
 const fs=[...new Set([...pa.fractions,...pb.fractions].map(f=>+f.toFixed(8)))].sort((a,b)=>a-b);
 const sections=[[[S.cutX,S.az],[S.cutX,S.outerZ],0],...roundedCorner([S.cutX,S.outerZ],oa,ob).map(o=>[A,o,.08]),...roundedCorner(oa,ob,[S.outerX,S.cutZ]).map(o=>[B,o,.92]),[[S.bx,S.cutZ],[S.outerX,S.cutZ],1]];
 const rows=sections.map(([a,b,t])=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);return fs.map(f=>{const u=pa.at(f),v=pb.at(f),h=u.h*(1-t)+v.h*t,up=u.up*(1-t)+v.up*t;
   return {p:[a[0]+dx*f,u.y*(1-t)+v.y*t,a[1]+dz*f],n:[dx/len*h,up,dz/len*h]};});
 });
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<fs.length-1;j++){
  const vs=[rows[i][j],rows[i+1][j],rows[i+1][j+1],rows[i][j+1]];for(const ids of [[0,1,2],[0,2,3]])cw.tri(ids.map(k=>vs[k].p),[0,1,0],ids.map(k=>vs[k].n));
 }
 // Do not add internal end walls at the two mating cuts.
 for(let i=0;i<rows.length-1;i++)for(const j of [0,fs.length-1]){
  const a=rows[i][j].p,b=rows[i+1][j].p,dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);if(len<1e-9)continue;
  const s=j===0?-1:1,normal=[dz/len*s,0,-dx/len*s],vs=[[a[0],S.bottom,a[2]],a,b,[b[0],S.bottom,b[2]]];cw.tri([vs[0],vs[1],vs[2]],normal);cw.tri([vs[0],vs[2],vs[3]],normal);
 }
 const rg=rw.finish(),cg=cw.finish();road.geometry=rg;curb.geometry=cg;
 return root.userData.pierCornerJoin1={removedTerminalTriangles:removed,roadFillArea:(S.bx-S.ax)*(S.bz-S.az)/2,addedDrawCalls:0,solidTo:S.bottom,previousRepairsPreserved:true};
}
