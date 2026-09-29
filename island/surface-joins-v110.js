import * as T from 'three';

// Measured against the existing curb's outside edge, not the asphalt carrier
// (the latter also extends under these two park entrances). Keep the public
// road, every grey/cream slab, the grass and the bridge byte-for-byte intact.
const CUTS=[
 {id:'west-park-entry',axis:'x',edge:113.84192,keep:1,other:[57.8,63.4]},
 {id:'south-park-entry',axis:'z',edge:116.34574,keep:-1,other:[168.0,176.2]},
];
const coord=(v,axis)=>axis==='x'?v.x:v.z;
function hull(points){
 const p=[...new Map(points.map(v=>[v.map(x=>Math.round(x*1e5)).join(','),v])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];for(const v of p){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),v)<=1e-9)lower.pop();lower.push(v);}for(const v of [...p].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),v)<=1e-9)upper.pop();upper.push(v);}lower.pop();upper.pop();return lower.concat(upper);
}
function clippedGeometry(mesh,cut){
 const old=mesh.geometry,position=old.attributes.position,ix=old.index,attributes=Object.entries(old.attributes),appended=Object.fromEntries(attributes.map(([k])=>[k,[]])),indices=[],crossings=[];
 const inverse=mesh.matrixWorld.clone().invert(),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld).invert();
 let touched=0,removedArea=0,newCount=position.count;
 const outside=v=>cut.keep*(coord(v.world,cut.axis)-cut.edge)<-1e-9;
 const relevant=v=>{const u=coord(v.world,cut.axis==='x'?'z':'x');return u>=cut.other[0]&&u<=cut.other[1];};
 const vertex=i=>({source:i,world:new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld),attrs:Object.fromEntries(attributes.map(([k,a])=>[k,Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))]))});
 const intersection=(a,b)=>{
  const t=(cut.edge-coord(a.world,cut.axis))/(coord(b.world,cut.axis)-coord(a.world,cut.axis));
  const world=a.world.clone().lerp(b.world,t),attrs={};
  for(const[k,ar]of attributes)attrs[k]=a.attrs[k].map((v,i)=>T.MathUtils.lerp(v,b.attrs[k][i],t));
  const n=new T.Vector3(...attrs.normal).normalize();attrs.normal=n.toArray();return {world,attrs};
 };
 const index=v=>{if(v.source!=null)return v.source;const i=newCount++;for(const[k]of attributes)appended[k].push(...v.attrs[k]);return i;};
 const projected=(a,b,c)=>Math.abs((b.world.x-a.world.x)*(c.world.z-a.world.z)-(b.world.z-a.world.z)*(c.world.x-a.world.x))*.5;
 for(let i=0;i<ix.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],tri=ids.map(vertex);
  const outs=tri.filter(outside);
  if(!outs.length||!outs.some(relevant)){indices.push(...ids);continue;}
  if(!outs.every(relevant))throw Error('Surface110 would cut outside entrance '+cut.id);
  touched++;const polygon=[],edge=[];
  for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],ia=!outside(a),ib=!outside(b);if(ia)polygon.push(a);if(ia!==ib){const v=intersection(a,b);polygon.push(v);edge.push(v.world);}}
  if(edge.length===2)crossings.push(...edge);
  let after=0;for(let j=1;j<polygon.length-1;j++){indices.push(index(polygon[0]),index(polygon[j]),index(polygon[j+1]));after+=projected(polygon[0],polygon[j],polygon[j+1]);}
  // Both top and bottom are counted in the raw projection; report only tops.
  const n=new T.Vector3().crossVectors(tri[1].world.clone().sub(tri[0].world),tri[2].world.clone().sub(tri[0].world));
  if(n.y>0)removedArea+=projected(...tri)-after;
 }
 if(touched<2||touched>250||crossings.length<4)throw Error('Surface110 unexpected entrance topology '+cut.id);
 const other=cut.axis==='x'?'z':'x',outline=hull(crossings.map(p=>[coord(p,other),p.y]));
 const lo=Math.min(...outline.map(v=>v[0])),hi=Math.max(...outline.map(v=>v[0])),bottom=Math.min(...outline.map(v=>v[1])),top=Math.max(...outline.map(v=>v[1]));
 if(outline.length<3||hi-lo<4||hi-lo>8||bottom<9.20||top>9.50||top-bottom>.30)throw Error('Surface110 cap escaped original solid '+cut.id);
 const normal=new T.Vector3(cut.axis==='x'?-cut.keep:0,0,cut.axis==='z'?-cut.keep:0),localNormal=normal.clone().applyMatrix3(normalMatrix).normalize();
 const cap=outline.map(([u,y])=>cut.axis==='x'?new T.Vector3(cut.edge,y,u):new T.Vector3(u,y,cut.edge));
 for(let j=1;j<cap.length-1;j++){
  const verts=[cap[0],cap[j],cap[j+1]];if(new T.Vector3().crossVectors(verts[1].clone().sub(verts[0]),verts[2].clone().sub(verts[0])).dot(normal)<0)[verts[1],verts[2]]=[verts[2],verts[1]];
  for(const world of verts){const attrs={position:world.clone().applyMatrix4(inverse).toArray(),normal:localNormal.toArray()};for(const[k,a]of attributes)attrs[k]??=Array(a.itemSize).fill(0);indices.push(index({attrs}));}
 }
 const geometry=new T.BufferGeometry();
 for(const[k,a]of attributes){const next=new a.array.constructor(a.array.length+appended[k].length);next.set(a.array);next.set(appended[k],a.array.length);geometry.setAttribute(k,new T.BufferAttribute(next,a.itemSize,a.normalized));}
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 if(!geometry.attributes.position.array.every(Number.isFinite)||removedArea<=0||removedArea>46)throw Error('Surface110 invalid output '+cut.id);
 return {geometry,report:{id:cut.id,axis:cut.axis,edge:cut.edge,touchedTriangles:touched,capTriangles:cap.length-2,removedRoadOverlayArea:+removedArea.toFixed(4),closedCutFace:true}};
}
export function applySurfaceJoins110(root){
 if(root.userData.surfaceJoins110)return root.userData.surfaceJoins110;
 const mesh=root.getObjectByName('8_PARK_PATIKA_UST');
 if(!mesh?.isMesh||!mesh.geometry.index||mesh.geometry.groups.length||Object.keys(mesh.geometry.attributes).some(k=>!['position','normal'].includes(k)))throw Error('Surface110 unsupported source');
 root.updateMatrixWorld(true);const original=mesh.geometry,candidate=mesh.clone(false);candidate.matrixWorld.copy(mesh.matrixWorld);const records=[];
 try{for(const cut of CUTS){const result=clippedGeometry(candidate,cut);if(candidate.geometry!==original)candidate.geometry.dispose();candidate.geometry=result.geometry;records.push(result.report);}}
 catch(e){if(candidate.geometry!==original)candidate.geometry.dispose();throw e;}
 mesh.geometry=candidate.geometry;
 return root.userData.surfaceJoins110={version:110,records,roadGeometryUnchanged:true,curbAndGreySlabsUnchanged:true,grassAndBridgeUnchanged:true,addedDrawCalls:0};
}
