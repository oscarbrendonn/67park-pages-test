import * as T from 'three';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const valid=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);

// Water CONTACT, not just the X/Z water polygon. Re-arm above the surface so
// a swim jump splashes on return. Spawn/teleport/boat travel are not impacts.
export function createWaterEntryTracker(){
 let previous=null,wet=false,clock=0,last=-10;
 return {reset(){previous=null;wet=false;},step({position:p,surface,overWater,dt,enabled=true,velocityY=0}){
  dt=clamp(Number(dt)||0,0,.05);clock+=dt;
  if(!enabled||!valid(p)||!Number.isFinite(surface)){previous=null;wet=false;return null;}
  const contact=!!overWater&&p.y<=surface+.72;
  const teleported=previous&&Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)>5;
  const impact=Math.max(0,-velocityY,previous&&dt?(previous.y-p.y)/dt:0);
  let result=null;
  if(previous&&!teleported&&contact&&!wet&&clock-last>.45&&(impact>.1||!previous.overWater)){
   result={x:p.x,y:surface,z:p.z,strength:clamp(.18+impact/14,.18,1),speed:impact};last=clock;
  }
  if(contact)wet=true;else if(!overWater||p.y>surface+.88)wet=false;
  previous={x:p.x,y:p.y,z:p.z,overWater:!!overWater};return result;
 }};
}

// Uses the existing game frame. Three tiny reusable instances, shared geometry,
// no physics objects or map edits. Reduced motion keeps only a fading ripple.
export function createWaterEntryFeedback({world,scene,sound,reducedMotion=()=>false}){
 const tracker=createWaterEntryTracker(),pool=[];
 let owner=null,ringGeometry=null,dropGeometry=null,entries=0,lastEntry=null,poseAge=1;
 const lastPose={y:0,x:0,z:0,tilt:0},blend={height:0,tilt:0};let hasPose=false;
 function clear(){
  for(const fx of pool){fx.group.removeFromParent();fx.ringMaterial.dispose();fx.dropMaterial.dispose();}
  pool.length=0;ringGeometry?.dispose();dropGeometry?.dispose();ringGeometry=dropGeometry=null;
  tracker.reset();owner=null;hasPose=false;poseAge=1;
 }
 function instance(){
  let fx=pool.find(v=>!v.active);if(fx)return fx;if(pool.length>=3)return null;
  ringGeometry ||= new T.RingGeometry(.90,1,40);
  dropGeometry ||= new T.SphereGeometry(1,7,5);
  const group=new T.Group();group.name='PARTY_water-contact';group.visible=false;
  const ringMaterial=new T.MeshBasicMaterial({color:'#e1ffff',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
  const dropMaterial=new T.MeshBasicMaterial({color:'#c9f4f1',transparent:true,opacity:0,depthWrite:false});
  const rings=Array.from({length:2},()=>{const m=new T.Mesh(ringGeometry,ringMaterial);m.rotation.x=-Math.PI/2;m.position.y=.025;group.add(m);return m;});
  const drops=Array.from({length:10},(_,i)=>{const m=new T.Mesh(dropGeometry,dropMaterial);m.scale.set(.045,.085,.045);group.add(m);return {mesh:m,angle:i*Math.PI*.2,speed:1+(i%3)*.16};});
  fx={group,ringMaterial,dropMaterial,rings,drops,active:false,age:0};pool.push(fx);scene()?.add(group);return fx;
 }
 function step({position,velocityY=0,dt,enabled=true}){
  dt=clamp(Number(dt)||0,0,.05);const w=world();if(w!==owner){
   clear();owner=w;
   if(w?.dispose){const dispose=w.dispose;w.dispose=function(...args){if(owner===w)clear();return dispose.apply(this,args);};}
  }
  const surface=valid(position)?w?.sea?.(position.x,position.z):NaN;
  const hit=tracker.step({position,velocityY,dt,surface,overWater:valid(position)&&!!w?.water?.(position.x,position.z),enabled:enabled&&!!w&&!w.homeScene?.active});
  poseAge+=dt;
  if(hit){
   entries++;lastEntry={...hit};sound('water-splash',hit.strength);poseAge=0;
   const fx=instance();if(fx){Object.assign(fx,{active:true,age:0,strength:hit.strength,reduced:reducedMotion()});fx.group.visible=true;fx.group.position.set(hit.x,hit.y,hit.z);}
   blend.height=hasPose?clamp(lastPose.y-(surface+.02),0,.8):0;blend.tilt=hasPose?lastPose.tilt:0;
  }
  for(const fx of pool){
   if(!fx.active)continue;fx.age+=dt;const t=fx.age,life=1.05;
   if(t>=life||!enabled){fx.active=false;fx.group.visible=false;continue;}
   const fade=Math.max(0,1-t/life);fx.ringMaterial.opacity=.65*fade;fx.dropMaterial.opacity=.9*Math.min(1,t/.025)*fade;
   fx.rings.forEach((r,i)=>{const age=Math.max(0,t-i*.12);r.visible=i===0||t>.12;r.scale.setScalar(fx.reduced?.4+i*.16:.22+age*(1.2+fx.strength*.8));});
   fx.drops.forEach((d,i)=>{
    const v=(1.35+fx.strength*2.15)*d.speed,y=.03+v*t-4.9*t*t,radial=.16+t*(.55+fx.strength)*d.speed;
    d.mesh.visible=!fx.reduced&&y>0&&(fx.strength>.35||i%2===0);
    d.mesh.position.set(Math.cos(d.angle)*radial,y,Math.sin(d.angle)*radial);
    d.mesh.scale.y=.055+.045*Math.min(2,Math.abs(v-9.8*t));
   });
  }
 }
 function visual(root,position){
  if(!root||!valid(position))return;
  // Only the rebuilt local swimming pose; never alter a camera, capsule,
  // non-swimmer, swim jump or remote avatar. Finite entry blend, no drift.
  if(poseAge<.22&&!reducedMotion()&&root.rotation.x>.5&&owner?.water?.(position.x,position.z)&&Math.abs(position.y-owner.sea(position.x,position.z)-.58)<.12){
   const remaining=(1-poseAge/.22)**2;
   root.position.y+=blend.height*remaining;
   root.rotation.x+=(blend.tilt-root.rotation.x)*remaining;
  }
  lastPose.y=root.position.y;lastPose.tilt=root.rotation.x;hasPose=true;
 }
 return {step,visual,dispose:clear,stats:()=>({entries,lastEntry,pool:pool.length,active:pool.filter(f=>f.active).length,maxInstances:3,poseAge})};
}
