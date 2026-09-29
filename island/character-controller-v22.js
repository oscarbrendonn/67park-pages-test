import * as THREE from 'three';

// Essential gameplay motion, not decorative UI animation. One existing rig/mixer;
// no new textures, models or per-frame geometry. Rates are seconds, not frames.
const damp=(rate,dt)=>1-Math.exp(-rate*dt);
const clamp=THREE.MathUtils.clamp;
export const MOVEMENT=Object.freeze({walk:3.4,run:7.2,swim:2.8,gravity:16,jump:5.2,
  step:.62,groundRate:16,airRate:5,turnRate:12,cameraRate:10,fade:.13});

export class IslandCharacterController{
  constructor(body,clips,camera,env){
    this.body=body;this.camera=camera;this.env=env;
    // Local forward lean must follow heading, not pitch around a fixed world axis.
    body.rotation.order='YXZ';
    this.mixer=new THREE.AnimationMixer(body);this.actions={};
    for(const name of ['idle','walk','run','jump','fall','land']){
      const clip=clips.find(c=>c.name.toLowerCase()===name);
      if(!clip)continue;
      const a=this.mixer.clipAction(clip);
      if(name==='jump'||name==='land'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
      this.actions[name]=a;
    }
    const box=new THREE.Box3().setFromObject(body);
    this.height=box.max.y-box.min.y;
    this.toes=['ToeL','ToeR'].map(n=>body.getObjectByName(n)).filter(Boolean);
    this.toePoint=new THREE.Vector3();
    this.solePad=this.toes.length?Math.min(...this.toes.map(b=>b.getWorldPosition(this.toePoint).y))-box.min.y:0;
    this.swimTime=0;this.swimBlend=0;this.swimPoint=new THREE.Vector3();
    this.swimHead=body.getObjectByName('Head');this.swimRotation=new THREE.Quaternion();
    const bodyQ=body.getWorldQuaternion(new THREE.Quaternion());
    this.swimBones=['BiscepL','BiscepR','ArmL','ArmR','ThighL','ThighR','ShinL','ShinR'].map((name,i)=>{
      const bone=body.getObjectByName(name);if(!bone)return null;
      const parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      return {bone,i,base:bone.quaternion.clone(),applied:false,
        axis:new THREE.Vector3(1,0,0).applyQuaternion(bodyQ).applyQuaternion(parentQ).normalize()};
    }).filter(Boolean);
    this.distance=Math.max(3.6,this.height*5.4);
    this.velocity=new THREE.Vector3();this.targetVelocity=new THREE.Vector3();
    this.anchor=new THREE.Vector3();this.pivot=new THREE.Vector3();
    this.cameraTarget=new THREE.Vector3();this.arm=new THREE.Vector3();
    this.ray=new THREE.Raycaster();this.cameraProbe=0;this.armLimit=Infinity;
    this.ready=false;this.grounded=true;this.vertical=0;this.jumpQueue=0;
    this.coyote=.1;this.jumpHeld=false;this.landTime=0;this.swimming=false;
    this.probeX=NaN;this.probeZ=NaN;this.probeY=null;
    this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setState('idle');
  }
  ground(x,z){
    if(x!==this.probeX||z!==this.probeZ){this.probeX=x;this.probeZ=z;this.probeY=this.env.ground(x,z);}
    return this.probeY;
  }
  setState(name){
    if(this.state===name)return;
    const next=this.actions[name]||this.actions.idle,old=this.active;
    this.state=name;
    if(next&&next!==old){next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      if(old)old.crossFadeTo(next,MOVEMENT.fade,false);this.active=next;}
    this.env.data.characterAnimation=name;
  }
  reset(x,z,heading){
    this.body.position.x=x;this.body.position.z=z;
    const y=this.ground(x,z);this.foot=y??this.env.sea();
    this.body.position.y=this.foot+this.env.footOffset();
    if(Number.isFinite(heading))this.body.rotation.y=heading;
    this.velocity.set(0,0,0);this.vertical=0;this.grounded=true;
    this.anchor.copy(this.body.position);this.jumpQueue=0;this.ready=true;
    this.setState('idle');
  }
  queueJump(){this.jumpQueue=.14;}
  zoom(delta){this.distance=clamp(this.distance+delta,2.8,8);}
  update(dt,{forward=0,right=0,sprint=false,jump=false,yaw=0,pitch=-.28}={}){
    dt=Math.min(.05,Math.max(0,dt));if(!dt)return;
    if(!this.ready)this.reset(this.body.position.x,this.body.position.z,yaw+Math.PI);
    if(jump&&!this.jumpHeld)this.queueJump();this.jumpHeld=jump;
    this.jumpQueue=Math.max(0,this.jumpQueue-dt);
    const magnitude=Math.min(1,Math.hypot(forward,right));
    if(magnitude<.08){forward=right=0;}
    else {const n=Math.hypot(forward,right);forward/=n;right/=n;}
    const topSpeed=this.swimming?MOVEMENT.swim:(sprint?MOVEMENT.run:MOVEMENT.walk);
    const speed=topSpeed*(magnitude<.08?0:magnitude);
    this.targetVelocity.set((-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,0,
      (-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed);
    const blend=damp(this.grounded||this.swimming?MOVEMENT.groundRate:MOVEMENT.airRate,dt);
    this.velocity.lerp(this.targetVelocity,blend);
    if(this.velocity.lengthSq()<.0001)this.velocity.set(0,0,0);
    const b=this.body, x=b.position.x,z=b.position.z;
    let nx=x+this.velocity.x*dt,nz=z+this.velocity.z*dt;
    let surface=this.ground(nx,nz);
    // Steps can be climbed; a high platform is a wall, not a teleport.
    if(surface!==null&&surface>this.foot+MOVEMENT.step){
      const sideX=this.env.ground(nx,z),sideZ=this.env.ground(x,nz);
      if(sideX!==null&&sideX>this.foot+MOVEMENT.step){nx=x;this.velocity.x=0;}
      if(sideZ!==null&&sideZ>this.foot+MOVEMENT.step){nz=z;this.velocity.z=0;}
      surface=this.ground(nx,nz);
      if(surface!==null&&surface>this.foot+MOVEMENT.step){nx=x;nz=z;surface=this.ground(x,z);this.velocity.set(0,0,0);}
    }
    b.position.x=nx;b.position.z=nz;
    const wet=this.env.water(nx,nz),sea=this.env.sea();
    const footOffset=this.env.footOffset();
    // Physics foot is submerged on both islands; visible head height is aligned
    // from the existing rig below, not two incompatible root offsets.
    const swimRoot=sea+footOffset-.12;
    this.coyote=this.grounded?.1:Math.max(0,this.coyote-dt);
    if(this.jumpQueue>0&&(this.coyote>0||this.swimming)){
      this.vertical=MOVEMENT.jump;this.grounded=false;this.swimming=false;
      this.coyote=0;this.jumpQueue=0;this.landTime=0;
    }
    if(wet&&this.vertical<=0&&this.foot<=sea+.04){
      this.swimming=true;this.grounded=false;this.vertical=0;
      this.foot=swimRoot-footOffset;
    }else{
      this.swimming=false;
      if(!wet&&surface!==null&&this.grounded&&surface>=this.foot-MOVEMENT.step){
        this.foot=surface;this.vertical=0;
      }else{
        this.grounded=false;this.vertical=Math.max(-24,this.vertical-MOVEMENT.gravity*dt);
        this.foot+=this.vertical*dt;
        if(!wet&&surface!==null&&this.vertical<=0&&this.foot<=surface){
          if(this.vertical< -2)this.landTime=.16;
          this.foot=surface;this.vertical=0;this.grounded=true;
        }
      }
    }
    b.position.y=this.foot+footOffset;
    const actualSpeed=this.velocity.length();
    // Face travel direction, independently of the orbit camera. S/A/D no longer
    // make a forward-facing character moonwalk or slide sideways.
    if(actualSpeed>.08){
      const heading=Math.atan2(this.velocity.x,this.velocity.z);
      const delta=Math.atan2(Math.sin(heading-b.rotation.y),Math.cos(heading-b.rotation.y));
      b.rotation.y+=delta*damp(MOVEMENT.turnRate,dt);
    }
    b.rotation.x+=( (this.swimming?.92:0)-b.rotation.x)*damp(8,dt);
    this.landTime=Math.max(0,this.landTime-dt);
    let state=this.swimming?'swim':(!this.grounded?(this.vertical>0?'jump':'fall'):
      this.landTime>0?'land':actualSpeed<.12?'idle':actualSpeed>4.15?'run':'walk');
    // The asset has no swim clip. A small reversible procedural paddle overlays
    // idle on its own rig; no downloaded model, new mixer or geometry.
    this.setState(state);
    if(this.active&&(state==='walk'||state==='run'))this.active.setEffectiveTimeScale(clamp(actualSpeed/(state==='run'?MOVEMENT.run:MOVEMENT.walk),.35,1.3));
    for(const part of this.swimBones)if(part.applied){part.bone.quaternion.copy(part.base);part.applied=false;}
    this.mixer.update(dt);
    this.swimBlend+=((this.swimming?1:0)-this.swimBlend)*damp(7,dt);
    this.swimTime+=dt*(2.4+Math.min(1,actualSpeed/MOVEMENT.swim)*2.2);
    if(this.swimBlend>.001){
      for(const part of this.swimBones){
        part.base.copy(part.bone.quaternion);
        const opposite=part.i%2?Math.PI:0,phase=this.swimTime+opposite;
        const angle=part.i<2?(.18+.42*Math.sin(phase)):
          part.i<4?(.16+.20*Math.sin(phase-.6)):
          part.i<6?.19*Math.sin(phase*1.6):.12*Math.sin(phase*1.6-.7);
        this.swimRotation.setFromAxisAngle(part.axis,angle*this.swimBlend);
        part.bone.quaternion.premultiply(this.swimRotation);part.applied=true;
      }
    }
    if(this.swimming&&this.swimHead){
      b.updateMatrixWorld(true);this.swimHead.getWorldPosition(this.swimPoint);
      const bob=this.reduced?0:Math.sin(this.swimTime*.75)*.009;
      b.position.y+=sea+this.height*.18+bob-this.swimPoint.y;
      this.env.data.swimHeadHeight=(this.height*.18+bob).toFixed(3);
    }
    // Two bone positions, not CPU-skinned mesh bounds: keep the planted foot
    // on the ground despite vertical offsets in the authored idle/run clips.
    if(this.grounded&&this.toes.length){
      b.updateMatrixWorld(true);
      const lowest=Math.min(...this.toes.map(toe=>toe.getWorldPosition(this.toePoint).y));
      b.position.y+=clamp(this.foot+this.solePad-lowest,-this.height*.25,this.height*.25);
    }
    this.cameraTarget.set(b.position.x,this.swimming?sea:this.foot+footOffset,b.position.z);
    this.anchor.lerp(this.cameraTarget,damp(MOVEMENT.cameraRate,dt));
    this.pivot.copy(this.anchor);this.pivot.y+=this.height*.95;
    const elevation=-clamp(pitch,-1.08,.18),distance=this.distance;
    this.arm.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
    this.cameraProbe-=dt;
    if(this.cameraProbe<=0){
      this.cameraProbe=.10;this.ray.set(this.pivot,this.arm);this.ray.far=distance;
      const hit=this.ray.intersectObjects(this.env.cameraBlockers(),false).find(h=>h.object.visible&&h.distance>.15);
      this.armLimit=hit?Math.max(.65,hit.distance-.20):distance;
    }
    this.cameraTarget.copy(this.pivot).addScaledVector(this.arm,Math.min(distance,this.armLimit));
    this.cameraTarget.y=Math.max(sea+.22,this.cameraTarget.y);
    this.camera.position.copy(this.cameraTarget);this.camera.lookAt(this.pivot);
    const fov=this.reduced?58:58+4*clamp(actualSpeed/MOVEMENT.run,0,1);
    this.camera.fov+=(fov-this.camera.fov)*damp(5,dt);this.camera.updateProjectionMatrix();
    Object.assign(this.env.data,{characterController:'reference-v22',characterSpeed:actualSpeed.toFixed(2),
      characterGrounded:String(this.grounded),swimming:String(this.swimming),
      characterFeet:this.foot.toFixed(3),characterHeading:b.rotation.y.toFixed(3),
      characterCameraDistance:distance.toFixed(2),playerCharacter:'eggy-goril'});
    return {swimming:this.swimming,x:nx,z:nz,state,speed:actualSpeed};
  }
}

export function installGameButtons({jump,sprint,isGame}){
  const host=document.createElement('div');host.id='hareketKontrolleri';
  const run=document.createElement('button'),hop=document.createElement('button');
  run.type=hop.type='button';run.textContent='Koş';hop.textContent='Zıpla';
  run.setAttribute('aria-label','Basılı tutarak koş');hop.setAttribute('aria-label','Zıpla');
  host.append(run,hop);document.body.append(host);
  for(const button of [run,hop]){
    button.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
    button.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
    button.addEventListener('touchend',e=>e.stopPropagation(),{passive:true});
    button.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(!isGame())return;
      button.setPointerCapture(e.pointerId);if(button===run){sprint(true);run.setAttribute('aria-pressed','true');}else jump();});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{if(button===run){sprint(false);run.setAttribute('aria-pressed','false');}});
  }
  addEventListener('blur',()=>sprint(false));
  return host;
}
