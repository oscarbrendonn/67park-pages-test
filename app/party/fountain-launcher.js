import * as T from 'three';
import {launchPlayer} from './park-launchers.js?v=fountain-1';
import {createFountainFlow} from './fountain-flow.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const valid=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
export const FOUNTAIN_MESHES=Object.freeze(['67D_CENTER_FOUNTAIN_PLINTH','67D_CENTER_FOUNTAIN_RIM','67D_CENTER_FOUNTAIN_BASIN']);

// Read the FINAL fitted model, not the old sculpture metadata or a guessed
// world coordinate. No writes to geometry, materials, collision or the plaza.
export function fountainSite(scene){
 const meshes=FOUNTAIN_MESHES.map(n=>scene?.getObjectByName(n));
 if(meshes.some(m=>!m?.isMesh))return null;
 const boxes=meshes.map(m=>new T.Box3().setFromObject(m)),rim=boxes[1];
 const site={x:(rim.min.x+rim.max.x)/2,z:(rim.min.z+rim.max.z)/2,
  radius:Math.min(rim.max.x-rim.min.x,rim.max.z-rim.min.z)*.5*.84,
  bottom:boxes[0].max.y,top:Math.max(...boxes.map(b=>b.max.y)),waterY:rim.max.y-.27};
 return Object.values(site).every(Number.isFinite)&&site.radius>.2?site:null;
}
export function fountainContact(site,p,support){
 return !!site&&valid(p)&&Number.isFinite(support)&&
  (p.x-site.x)**2+(p.z-site.z)**2<site.radius**2&&
  p.y>=site.bottom+.15&&p.y<=site.top+1.22&&p.y-support>=.15&&p.y-support<=1.22;
}

// Up to three bursts, three draw calls each. Reused instanced drops, no timers,
// physics bodies, extra render loop or network packets. Reduced motion is a
// stationary fading ring; there is deliberately no screen shake or camera cut.
export function createFountainSpray(scene){
 const pool=[],ringGeo=new T.RingGeometry(.8,1,40),dropGeo=new T.SphereGeometry(1,6,4),jetGeo=new T.CylinderGeometry(.08,.14,1,8);
 const dummy=new T.Object3D();
 function trigger(point,reduced=false){
  let fx=pool.find(f=>!f.active);
  if(!fx){if(pool.length===3)return false;
   const root=new T.Group();root.name='PARTY_fountain-spray';
   const ringMat=new T.MeshBasicMaterial({color:'#e5ffff',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
   const dropMat=new T.MeshBasicMaterial({color:'#bce9ef',transparent:true,opacity:0,depthWrite:false});
   const ring=new T.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.03;
   const drops=new T.InstancedMesh(dropGeo,dropMat,24);drops.frustumCulled=false;
   const jets=new T.InstancedMesh(jetGeo,dropMat,8);jets.frustumCulled=false;
   root.add(ring,drops,jets);scene.add(root);fx={root,ring,drops,jets,ringMat,dropMat};pool.push(fx);
  }
  Object.assign(fx,{active:true,age:0,reduced});fx.root.position.set(point.x,point.y,point.z);fx.root.visible=true;stepInstance(fx,0);return true;
 }
 function stepInstance(f,dt){
  f.age+=dt;const t=f.age,fade=Math.max(0,1-t/(f.reduced?.95:1.15));
  if(!fade){f.active=false;f.root.visible=false;return;}
  f.ringMat.opacity=.55*fade;f.ring.scale.setScalar(f.reduced?.7:.35+t*1.9);
  f.drops.visible=f.jets.visible=!f.reduced;f.dropMat.opacity=.8*fade;
  if(!f.reduced){for(let i=0;i<24;i++){
   // Same initial ascent and gravity as the park avatar, not the old low splash.
   const a=i*Math.PI/12,r=.25+t*(.35+(i%3)*.08),y=.08+(12.5-(i%4)*.25)*t-12*t*t;
   dummy.position.set(Math.cos(a)*r,Math.max(.02,y),Math.sin(a)*r);
   dummy.scale.set(.06,y>0?.12:.001,.06);dummy.updateMatrix();f.drops.setMatrixAt(i,dummy.matrix);
  }f.drops.instanceMatrix.needsUpdate=true;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,height=Math.max(.02,.08+(12.5-(i%3)*.2)*t-12*t*t),r=.3+t*.12;
   dummy.position.set(Math.cos(a)*r,height/2,Math.sin(a)*r);
   dummy.scale.set(1,height,1);dummy.updateMatrix();f.jets.setMatrixAt(i,dummy.matrix);
  }f.jets.instanceMatrix.needsUpdate=true;}
 }
 return {trigger,step(dt){for(const f of pool)if(f.active)stepInstance(f,dt);},
  clear(){for(const f of pool){f.active=false;f.root.visible=false;}},
  stats:()=>({pool:pool.length,active:pool.filter(f=>f.active).length,maxInstances:3}),
  dispose(){for(const f of pool){f.root.removeFromParent();f.ringMat.dispose();f.dropMat.dispose();f.drops.dispose();f.jets.dispose();}ringGeo.dispose();dropGeo.dispose();jetGeo.dispose();pool.length=0;}};
}

export function createFountainLauncher({world,scene,state,enabled=()=>true,blocked=()=>false,carried=()=>false,remotes=()=>null,reducedMotion=()=>false,onLaunch=()=>{},onWarning=()=>{},now=()=>Date.now()/1000}){
 let owner=null,site=null,spray=null,cooldown=0,launches=0,remoteBursts=0;
 let launchedCycle=null,warnedCycle=null,phase=null;
 const peers=new Map();
 function dispose(){spray?.dispose();spray=null;owner=null;site=null;cooldown=0;launchedCycle=warnedCycle=null;peers.clear();}
 function support(w,p){return w.characterGround?.(p.x,p.z,p.y-.555)??w.ground?.(p.x,p.z);}
 function contact(w,p){
  // Do not ray-query the map for every park player on every frame.
  return valid(p)&&(p.x-site.x)**2+(p.z-site.z)**2<site.radius**2&&p.y>=site.bottom+.15&&p.y<=site.top+1.22&&fountainContact(site,p,support(w,p));
 }
 function step(body,dt){
  const w=world(),s=scene();if(w!==owner){dispose();owner=w;}
  if(!w?.ready||!s)return;
  if(!site){site=fountainSite(s);if(!site)return;spray=createFountainFlow(s,site);
   if(w.dispose){const previous=w.dispose;w.dispose=function(...args){if(owner===w)dispose();return previous.apply(this,args);};}
  }
  dt=clamp(Number(dt)||0,0,.05);cooldown=Math.max(0,cooldown-dt);
  if(!enabled()){spray.clear();peers.clear();return;}
  phase=spray.step(now(),reducedMotion());
  const p=body?.translation?.(),v=body?.linvel?.(),st=state();
  if(phase.warning&&warnedCycle!==phase.cycle&&valid(p)&&Math.hypot(p.x-site.x,p.z-site.z)<15){warnedCycle=phase.cycle;onWarning();}
  if(phase.high&&phase.pressure>=.5&&launchedCycle!==phase.cycle&&valid(p)&&valid(v)&&st?.enabled&&!blocked()&&!carried()&&cooldown===0&&v.y<=.8&&contact(w,p)&&launchPlayer(body,st,v)){
   launchedCycle=phase.cycle;cooldown=.8;launches++;onLaunch();
  }
  // Observe the normal replicated upward departure. Never change another
  // player's body; a held passenger follows their carrier through normal carry.
  const rem=remotes();if(!rem){peers.clear();return;}
  for(const id of peers.keys())if(!rem.has(id))peers.delete(id);
  for(const [id,r]of rem){
   const q=r.targetP||r.p;if(!q)continue;const p={x:q[0],y:q[1],z:q[2]},previous=peers.get(id);
   if(!valid(p)){peers.delete(id);continue;}
   const touching=contact(w,p),wait=Math.max(0,(previous?.wait||0)-dt);
   if(phase.high&&previous?.contact&&wait===0&&p.y>previous.y+.04&&Math.hypot(p.x-previous.x,p.z-previous.z)<1){
    remoteBursts++;peers.set(id,{...p,contact:touching,wait:.8});
   }else peers.set(id,{...p,contact:touching,wait});
  }
 }
 return {step,dispose,debug:()=>({site,launches,remoteBursts,cooldown,phase,fx:spray?.stats()||null})};
}
