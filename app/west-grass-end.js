import * as T from 'three';
import {createGrassUnderfill} from './grass-underfill.js?v=approved-coast-20261004-1';
import {trimCoastalSkirt} from './coastal-grass-finish.js?v=approved-coast-20261004-1';

export const WEST_GRASS_END=Object.freeze({x:-154.438073,z0:-162,z1:-149,at:[-155,-164],bottom:8.79});

// Blend the retained soil ring below the existing sand over two metres.
// A vertical cap here creates a new visible line across the beach in WebKit.
function buryEarthTransition(mesh,g){
 const {x,z0,bottom}=WEST_GRASS_END,lo=z0-2,p=g.attributes.position,n=g.attributes.normal,ix=g.index;
 const pos=Array.from(p.array),norm=Array.from(n.array),indices=[],inverse=mesh.matrixWorld.clone().invert(),v=new T.Vector3();
 const world=Array.from({length:p.count},(_,i)=>v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray());
 const clip=(poly,d)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=d(a),db=d(b);if(da>=0)out.push(a);if((da>=0)!==(db>=0))out.push(a.map((v,k)=>v+(b[k]-v)*da/(da-db)));}return out;};
 const emit=(poly,fade)=>{for(let j=1;j<poly.length-1;j++){const vs=[poly[0],poly[j],poly[j+1]].map(a=>{v.fromArray(a);if(fade)v.y-=Math.max(0,v.y-bottom)*Math.max(0,Math.min(1,(v.z-lo)/(z0-lo)));return v.clone().applyMatrix4(inverse);});const normal=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));if(normal.lengthSq()<1e-16)continue;normal.normalize();for(const q of vs){indices.push(pos.length/3);pos.push(q.x,q.y,q.z);norm.push(normal.x,normal.y,normal.z);}}};
 for(let i=0;i<ix.count;i+=3){const ids=[0,1,2].map(j=>ix.getX(i+j)),vs=ids.map(j=>world[j]);if(vs.every(a=>a[2]<=lo)||vs.every(a=>a[2]>=z0)||vs.every(a=>a[0]>=x)){indices.push(...ids);continue;}emit(clip(vs,a=>lo-a[2]),false);emit(clip(vs,a=>a[2]-z0),false);const band=clip(clip(vs,a=>a[2]-lo),a=>z0-a[2]);emit(clip(band,a=>a[0]-x),false);emit(clip(band,a=>x-a[0]),true);}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setIndex(indices);g.setDrawRange(0,indices.length);g.computeBoundingBox();g.computeBoundingSphere();
}

// Close the newly cut end with its ORIGINAL cross-section. The profile is a
// convex, bevelled pavement slab, not an invented rectangular vertical wall.
function sealEnd(mesh,geometry,scope=WEST_GRASS_END){
 const {x,z0,z1}=scope,old=mesh.geometry,p=old.attributes.position,ix=old.index;
 const points=[],v=new T.Vector3(),world=Array.from({length:p.count},(_,i)=>v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).clone());
 if(scope.axis==='z')for(const q of world)[q.x,q.z]=[q.z,q.x];
 // The authored endpoint contains duplicated, nearly coincident cap vertices.
 // Include their exact YZ profile rather than losing it to a micron-scale X
 // comparison; the resulting cap is still placed exactly on the road end.
 for(const q of world)if(Math.abs(q.x-x)<.001&&q.z>=z0&&q.z<=z1)points.push([q.z,q.y]);
 for(let i=0;i<ix.count;i+=3){
  const t=[0,1,2].map(j=>world[ix.getX(i+j)]),hits=[];
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if((a.x<x)!==(b.x<x))hits.push(a.clone().lerp(b,(x-a.x)/(b.x-a.x)));}
  if(hits.length!==2)continue;
  const [a,b]=hits;if(Math.max(a.z,b.z)<z0||Math.min(a.z,b.z)>z1)continue;
  for(const q of hits){if(q.z>=z0&&q.z<=z1)points.push([q.z,q.y]);}
  for(const z of [z0,z1])if((a.z<z)!==(b.z<z))points.push([z,a.y+(b.y-a.y)*(z-a.z)/(b.z-a.z)]);
 }
 if(points.length){points.push([Math.min(...points.map(p=>p[0])),WEST_GRASS_END.bottom],[Math.max(...points.map(p=>p[0])),WEST_GRASS_END.bottom]);}
 const unique=[...new Map(points.map(p=>[p.map(v=>v.toFixed(6)).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(unique.length<3)throw Error('Western pavement end profile missing');
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=values=>{const h=[];for(const p of values){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=1e-10)h.pop();h.push(p);}return h;};
 const lo=half(unique),hi=half(unique.toReversed()),hull=[...lo.slice(0,-1),...hi.slice(0,-1)];
 const positions=Array.from(geometry.attributes.position.array),normals=Array.from(geometry.attributes.normal.array),indices=Array.from(geometry.index.array),inverse=mesh.matrixWorld.clone().invert();
 const normal=(scope.axis==='z'?new T.Vector3(0,0,1):new T.Vector3(-1,0,0)).applyMatrix3(new T.Matrix3().getNormalMatrix(inverse)).normalize(),base=positions.length/3;
 for(const [z,y]of hull){if(scope.axis==='z')v.set(z,y,x);else v.set(x,y,z);v.applyMatrix4(inverse);positions.push(v.x,v.y,v.z);normals.push(normal.x,normal.y,normal.z);}
 // CCW in (z,y) points toward -X.
 for(let i=1;i<hull.length-1;i++)indices.push(base,base+i,base+i+1);
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);geometry.setDrawRange(0,indices.length);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return hull.length-2;
}

export function applyWestGrassEnd(root){
 if(root.userData.westGrassEnd1)return root.userData.westGrassEnd1;
 root.updateMatrixWorld(true);const {x,z0,z1,at,bottom}=WEST_GRASS_END;
 const grass=root.getObjectByName('3_CIMEN_KOYU'),road=root.getObjectByName('5_YOL');
 if(!grass?.isMesh||!road?.isMesh)throw Error('Western grass/road missing');
 const q=new T.Vector3(),rp=road.geometry.attributes.position;let anchor=0;
 for(let i=0;i<rp.count;i++){q.fromBufferAttribute(rp,i).applyMatrix4(road.matrixWorld);if(Math.abs(q.x-x)<.0001&&Math.abs(q.z+150.25595)<.0001)anchor++;}
 if(!anchor)throw Error('Western road endpoint changed');
 const fill=createGrassUnderfill(grass,grass.material,{at,bottom}),box=fill.geometry.boundingBox;
 if(Math.abs(box.min.x+164.6848)>.001||Math.abs(box.max.z+153.478027)>.001){fill.geometry.dispose();throw Error('Western grass component changed');}
 fill.name='67PARK_WESTERN_GRASS_UNDERFILL';const prepared=[];
 try{
  for(const name of ['7_KALDIRIM_TABANI','6_BORDUR','4_KIYI_TOPRAK_TABANI']){
   const mesh=root.getObjectByName(name);if(!mesh?.isMesh)throw Error('Western pavement missing');
   const proxy=new T.Mesh(mesh.geometry,mesh.material);proxy.matrixAutoUpdate=false;proxy.matrix.copy(new T.Matrix4().makeScale(-1,1,1).multiply(mesh.matrixWorld));proxy.updateMatrixWorld(true);
   const result=trimCoastalSkirt(proxy,[{lo:z0,hi:z1,x0:-x+.03,x1:-x+.03}]);
   if(!result.affected)throw Error('Western pavement scope empty');
   // The old earth skirt is a separate outer ring, not a slab crossing the
   // road endpoint. Its removed part is replaced by the closed grass fill.
   const earth=name==='4_KIYI_TOPRAK_TABANI';
   if(earth)buryEarthTransition(mesh,result.next);
   const caps=earth?0:sealEnd(mesh,result.next);prepared.push({mesh,...result,caps});
  }
 }catch(e){fill.geometry.dispose();for(const r of prepared)r.next.dispose();throw e;}
 for(const r of prepared)r.mesh.geometry=r.next;
 // createGrassUnderfill returns world coordinates; attach to the terrain
 // without moving it, before collision/shadow samplers are constructed.
 fill.geometry.applyMatrix4(root.matrixWorld.clone().invert());root.add(fill);fill.updateMatrixWorld(true);
 return root.userData.westGrassEnd1={version:1,x,z0,z1,grassTopUnchanged:true,grassMaterialPreserved:true,addedDrawCalls:1,underfill:fill.userData.grassUnderfill,meshes:prepared.map(({mesh,affected,caps})=>({name:mesh.name,affected,caps}))};
}
