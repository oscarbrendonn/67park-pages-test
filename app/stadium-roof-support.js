import * as T from 'three';
import {createRideSolidSampler} from '../island/ride-solid-sampler.js?v=ride-contacts-1';

const FOOT=.555,HEAD=1.45,SKIN=.012;
// Only the stadium's existing concrete overhead batches. Do not include beach
// umbrellas, seating, pitch, plants or turn the open portals into solid columns.
export function createStadiumRoofSupports(scene){
 const group=scene.getObjectByName('STADIUM_AND_COAST_V99');if(!group)return null;
 const meshes=group.children.filter(m=>m.isMesh&&m.userData.kind99==='overhead'&&['STADIUM99_edge','STADIUM99_shell'].includes(m.material?.name));
 if(meshes.length!==2)throw Error('Stadium roof batches changed');
 const bounds=new T.Box3();for(const m of meshes)bounds.expandByObject(m);
 const sampler=createRideSolidSampler(meshes,{cellSize:2});
 if(sampler.stats.skippedOversized)throw Error('Stadium roof contact budget exceeded');
 let disposed=false;const bodies=new WeakMap();
 const contains=(x,z)=>!disposed&&x>=bounds.min.x&&x<=bounds.max.x&&z>=bounds.min.z&&z<=bounds.max.z;
 const sample=(x,z)=>contains(x,z)?sampler.sample(x,z):{surfaces:[],intervals:[]};
 function ground(x,z,feet,step,base){
  if(!Number.isFinite(feet))return base;
  const hit=sample(x,z);let top=base;
  for(const y of hit.surfaces)if(y<=feet+step+1e-5)top=Math.max(top??-Infinity,y);
  // Recover an avatar already standing inside a formerly non-solid cap.
  // A person below the underside (e.g. in the entry tunnel) is never lifted.
  for(const [lo,hi]of hit.intervals)if(feet>=lo-SKIN&&feet<hi)top=Math.max(top??-Infinity,hi);
  return top;
 }
 function obstacle(x,z,feet,step,base){
  let top=ground(x,z,feet,step,base);if(!Number.isFinite(feet))return top;
  for(const [lo,hi]of sample(x,z).intervals)if(hi>feet+Math.max(step,SKIN)&&lo<feet+HEAD-SKIN)top=Math.max(top??-Infinity,hi);
  return top;
 }
 function prepareBody(body,{skip=false}={}){
  if(!body)return;
  const p=body.translation(),v=body.linvel(),previous=bodies.get(body);
  if(skip||!contains(p.x,p.z)||![p.x,p.y,p.z,v.y].every(Number.isFinite)){bodies.delete(body);return;}
  if(previous&&v.y>0&&Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<8){
   let cap=Infinity;
   for(const [dx,dz]of [[0,0],[.35,0],[-.35,0],[0,.35],[0,-.35]])for(const [lo]of sample(p.x+dx,p.z+dz).intervals)
    if(lo>=previous.y-FOOT+HEAD-SKIN)cap=Math.min(cap,lo);
   const limit=cap-HEAD+FOOT-SKIN;
   if(p.y>limit){p.y=limit;body.setTranslation(p,true);body.setLinvel({x:v.x,y:0,z:v.z},true);}
  }
  bodies.set(body,{x:p.x,y:p.y,z:p.z});
 }
 const stats={revision:'stadium-roof-contact-1',triangles:sampler.stats.triangles,bytes:sampler.stats.bytes,closedComponents:sampler.stats.closedComponents,addedDrawCalls:0,newAssetDownloads:0};
 return {contains,sample,ground,obstacle,prepareBody,stats,dispose(){disposed=true;sampler.dispose();}};
}
