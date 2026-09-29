import * as THREE from 'three';
import {PARK,applyParkInput,parkClip,SWIM_VISUAL,swimEnter,swimStep,swimExit,restoreBasePose} from './six-seven-movement-v26.js';
import {JumpFeedback} from './jump-feedback-v26.js';
export {installGameButtons} from './apple-controls-v26.js';
const damp=(rate,dt)=>1-Math.exp(-rate*dt),clamp=THREE.MathUtils.clamp;
export const MOVEMENT=Object.freeze({walk:PARK.speed,run:PARK.speed*PARK.sprint,
  swim:PARK.speed*PARK.swim,gravity:PARK.gravity,jump:PARK.jumpImpulse/PARK.mass,
  step:.62,cameraRate:10,fade:PARK.fade});
export class IslandCharacterController{
  constructor(body,clips,camera,env){
    this.body=body;this.camera=camera;this.env=env;body.rotation.order='YXZ';
    this.mixer=new THREE.AnimationMixer(body);this.actions={};
    for(const name of ['idle','walk','run','jump','fall','land']){
      const clip=clips.find(c=>c.name.toLowerCase()===name);if(!clip)continue;
      const a=this.mixer.clipAction(clip);
      if(name==='jump'||name==='land'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
      this.actions[name]=a;
    }
    const box=new THREE.Box3().setFromObject(body);this.height=box.max.y-box.min.y;
    this.toes=['ToeL','ToeR'].map(n=>body.getObjectByName(n)).filter(Boolean);
    this.toePoint=new THREE.Vector3();
    this.solePad=this.toes.length?Math.min(...this.toes.map(b=>b.getWorldPosition(this.toePoint).y))-box.min.y:0;
    // Source HeroPlayer aligns actual soles, not the rig's root. Keep two
    // authored sole vertices so baked animation offsets cannot make it float.
    this.soleMesh=body.getObjectByName('FS_Body');this.soleIndices=[];
    if(this.soleMesh?.isSkinnedMesh){
      this.soleMesh.skeleton.update();const min=[Infinity,Infinity],indices=[-1,-1];
      const mid=(box.min.x+box.max.x)/2;
      for(let i=0;i<this.soleMesh.geometry.attributes.position.count;i++){
        this.soleMesh.getVertexPosition(i,this.toePoint).applyMatrix4(this.soleMesh.matrixWorld);
        const half=this.toePoint.x<mid?0:1;
        if(this.toePoint.y<min[half]){min[half]=this.toePoint.y;indices[half]=i;}
      }
      this.soleIndices=indices.filter(i=>i>=0);
    }
    this.bones=new Map();body.traverse(o=>{if(o.isBone){const a=this.bones.get(o.name)||[];
      a.push({o,rx:o.rotation.x,ry:o.rotation.y,rz:o.rotation.z});this.bones.set(o.name,a);}});
    this.swimCycle={wasSwim:false,phase:0};this.swimTime=0;
    this.swimPoint=new THREE.Vector3();this.swimHead=body.getObjectByName('Head');
    this.distance=Math.max(3.6,this.height*5.4);
    this.velocity=new THREE.Vector3();this.anchor=new THREE.Vector3();this.pivot=new THREE.Vector3();
    this.cameraTarget=new THREE.Vector3();this.arm=new THREE.Vector3();
    this.ray=new THREE.Raycaster();this.cameraProbe=0;this.armLimit=Infinity;
    this.ready=false;this.grounded=true;this.vertical=0;this.jumpQueue=false;
    this.jumpHeld=false;this.landTime=0;this.swimming=false;this.accumulator=0;
    this.probeX=NaN;this.probeZ=NaN;this.probeY=null;
    this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.effects=env.scene?new JumpFeedback(env.scene,{reduced:this.reduced}):null;
    // Source BallCollider(.55) mass converts impulses to velocity. Terrain
    // collision is adapted, without adding Rapier/React or a second scene.
    this.physicsBody={linvel:()=>this.velocity,applyImpulse:j=>{
      this.velocity.x+=j.x/PARK.mass;this.velocity.y+=j.y/PARK.mass;this.velocity.z+=j.z/PARK.mass;}};
    this.setState('idle');
  }
  ground(x,z){
    if(x!==this.probeX||z!==this.probeZ){this.probeX=x;this.probeZ=z;this.probeY=this.env.ground(x,z);}
    return this.probeY;
  }
  setState(name){
    if(this.state===name)return;
    const next=this.actions[name]||this.actions.idle,old=this.active;this.state=name;
    if(next&&next!==old){next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      if(old)old.crossFadeTo(next,PARK.fade,false);this.active=next;}
    this.env.data.characterAnimation=name;
  }
  reset(x,z,heading){
    swimExit(this.swimCycle,this.bones);restoreBasePose(this.bones);
    this.body.rotation.x=0;this.body.position.x=x;this.body.position.z=z;
    this.foot=this.ground(x,z)??this.env.sea();this.body.position.y=this.foot+this.env.footOffset();
    if(Number.isFinite(heading))this.body.rotation.y=heading;
    this.velocity.set(0,0,0);this.vertical=0;this.grounded=true;this.swimming=false;
    this.anchor.copy(this.body.position);this.jumpQueue=false;this.jumpHeld=false;
    this.accumulator=0;this.landTime=0;this.ready=true;this.active=null;this.state=null;
    this.mixer.stopAllAction();this.setState('idle');this.effects?.clear();
  }
  queueJump(){this.jumpQueue=true;}
  zoom(delta){this.distance=clamp(this.distance+delta,2.8,8);}
  physicsStep(dt,{forward=0,right=0,sprint=false,yaw=0}){
    const b=this.body,sea=this.env.sea();
    if(this.swimming){this.velocity.x*=.96;this.velocity.z*=.96;}
    this.velocity.y=this.vertical;
    if(Math.hypot(right,forward)<.08)right=forward=0;
    const jumped=applyParkInput(this.physicsBody,{x:right,z:forward,run:sprint,jumpQueued:this.jumpQueue},
      {yaw:yaw+Math.PI,grounded:this.grounded,swimming:this.swimming});
    this.jumpQueue=false;this.vertical=this.velocity.y;
    if(jumped){this.grounded=false;this.landTime=0;this.effects?.trigger('jump',b.position.x,this.foot,b.position.z);
      this.env.data.jumpCount=String(Number(this.env.data.jumpCount||0)+1);}
    const damping=1/(1+PARK.damping*dt);
    this.velocity.x*=damping;this.velocity.z*=damping;
    if(Math.hypot(this.velocity.x,this.velocity.z)<.01){this.velocity.x=0;this.velocity.z=0;}
    const x=b.position.x,z=b.position.z;
    let nx=x+this.velocity.x*dt,nz=z+this.velocity.z*dt,surface=this.ground(nx,nz);
    if(surface!==null&&surface>this.foot+MOVEMENT.step){
      const sideX=this.env.ground(nx,z),sideZ=this.env.ground(x,nz);
      if(sideX!==null&&sideX>this.foot+MOVEMENT.step){nx=x;this.velocity.x=0;}
      if(sideZ!==null&&sideZ>this.foot+MOVEMENT.step){nz=z;this.velocity.z=0;}
      surface=this.ground(nx,nz);
      if(surface!==null&&surface>this.foot+MOVEMENT.step){nx=x;nz=z;surface=this.ground(x,z);this.velocity.x=this.velocity.z=0;}
    }
    b.position.x=nx;b.position.z=nz;
    const wet=this.env.water(nx,nz);
    if(wet&&this.vertical<=0&&this.foot<=sea+.04){
      this.swimming=true;this.grounded=false;this.vertical=0;this.foot=sea-.12;
    }else{
      this.swimming=false;
      if(!wet&&surface!==null&&this.grounded&&surface>=this.foot-MOVEMENT.step){this.foot=surface;this.vertical=0;}
      else{
        this.grounded=false;this.vertical=(this.vertical-PARK.gravity*dt)*damping;
        this.foot+=this.vertical*dt;
        if(!wet&&surface!==null&&this.vertical<=0&&this.foot<=surface){
          if(this.vertical< -2){this.landTime=.16;this.effects?.trigger('land',nx,surface,nz);}
          this.foot=surface;this.vertical=0;this.grounded=true;
        }
      }
    }
    this.velocity.y=this.vertical;this.landTime=Math.max(0,this.landTime-dt);
  }
  update(dt,input={}){
    dt=Math.min(.1,Math.max(0,dt));if(!dt)return;
    const {yaw=0,pitch=-.28,jump=false}=input;
    if(!this.ready)this.reset(this.body.position.x,this.body.position.z,yaw+Math.PI);
    if(jump&&!this.jumpHeld)this.queueJump();this.jumpHeld=jump;
    // Fixed 60Hz source impulses: consistent on 30/60/120Hz mobile displays.
    this.accumulator+=dt;
    while(this.accumulator+1e-9>=PARK.step){this.physicsStep(PARK.step,input);this.accumulator-=PARK.step;}
    const b=this.body,sea=this.env.sea(),footOffset=this.env.footOffset();
    b.position.y=this.foot+footOffset;
    const actualSpeed=Math.hypot(this.velocity.x,this.velocity.z);
    if(actualSpeed>(this.swimming?.4:.6)){
      const heading=Math.atan2(this.velocity.x,this.velocity.z);
      const delta=Math.atan2(Math.sin(heading-b.rotation.y),Math.cos(heading-b.rotation.y));
      b.rotation.y+=delta*(1-Math.pow(1-(this.swimming?.1:.12),dt*60));
    }
    b.rotation.x+=((this.swimming?SWIM_VISUAL.rotX:0)-b.rotation.x)*(1-Math.pow(1-(this.swimming?.16:.2),dt*60));
    if(this.swimming){
      swimEnter(this.swimCycle,()=>{this.mixer.stopAllAction();this.active=null;this.state=null;});
      swimStep(this.swimCycle,this.bones,dt,actualSpeed>.5,{spine:true});
      this.state='swim';this.env.data.characterAnimation='swim';
    }else{
      if(swimExit(this.swimCycle,this.bones)){this.state=null;this.active=null;}
      let state=parkClip(this.vertical,actualSpeed);
      // Additive polish: keep an airborne clip through apex instead of idle.
      if(!this.grounded)state=this.vertical>0?'jump':'fall';
      else if(this.landTime>0)state='land';
      this.setState(state);this.mixer.update(dt);
    }
    this.swimTime+=dt;
    if(this.swimming&&this.swimHead){
      b.updateMatrixWorld(true);this.swimHead.getWorldPosition(this.swimPoint);
      const bob=this.reduced?0:Math.sin(this.swimTime*SWIM_VISUAL.bobHz)*.009;
      b.position.y+=sea+this.height*.18+bob-this.swimPoint.y;
      this.env.data.swimHeadHeight=(this.height*.18+bob).toFixed(3);
    }
    if(this.grounded&&this.soleIndices.length){
      b.updateMatrixWorld(true);this.soleMesh.skeleton.update();let lowest=Infinity;
      for(const index of this.soleIndices){
        this.soleMesh.getVertexPosition(index,this.toePoint).applyMatrix4(this.soleMesh.matrixWorld);
        lowest=Math.min(lowest,this.toePoint.y);
      }
      b.position.y+=this.foot+.003-lowest;
      this.env.data.characterSoleGap='0.003';
    }else if(this.grounded&&this.toes.length){
      b.updateMatrixWorld(true);let lowest=Infinity;
      for(const toe of this.toes)lowest=Math.min(lowest,toe.getWorldPosition(this.toePoint).y);
      b.position.y+=clamp(this.foot+this.solePad-lowest,-this.height*.25,this.height*.25);
    }
    this.effects?.update(dt,{x:b.position.x,z:b.position.z,foot:this.foot,swimming:this.swimming});
    // Approved v22 camera retained: pitch, close distance, obstruction and FOV.
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
    const fov=this.reduced?58:58+4*clamp(actualSpeed/7.2,0,1);
    this.camera.fov+=(fov-this.camera.fov)*damp(5,dt);this.camera.updateProjectionMatrix();
    Object.assign(this.env.data,{characterController:'kimi-six-seven-v26',characterSpeed:actualSpeed.toFixed(2),
      characterGrounded:String(this.grounded),swimming:String(this.swimming),
      characterFeet:this.foot.toFixed(3),characterHeading:b.rotation.y.toFixed(3),
      characterCameraDistance:distance.toFixed(2),playerCharacter:'eggy-goril',
      jumpFeedback:this.effects?.group.visible?this.effects.kind:'none'});
    return {swimming:this.swimming,x:b.position.x,z:b.position.z,state:this.state,speed:actualSpeed};
  }
}
