import * as THREE from 'three';
import {IslandCharacterController as ParkCore} from './park-controller-core-v28.js';
import {GroundSlam,ParkImpact} from './park-power-v28.js';
import {applyEmote} from './park-emotes-v28.js';
import {disposeParkObject} from './park-assets-v28.js';
import {matchGorillaNeck} from './park-neck-v30.js';
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class IslandCharacterController extends ParkCore{
  constructor(body,clips,camera,env){
    super(body,clips,camera,env);
    matchGorillaNeck(body);
    this.slam=new GroundSlam();this.impact=env.scene?new ParkImpact(env.scene,{reduced:this.reduced}):null;
    this.boardOn=true;this.board=null;this.boardKind='logo';this.boardBlend=0;
    this.visual=body.userData.visual||body;this.visualHome=this.visual.position.clone();
    this.poseQ=new THREE.Quaternion();this.poseEuler=new THREE.Euler();
    this.poseTime=0;this.lean=0;this.lastHeading=body.rotation.y;this.emote=null;
    this.footPoint=new THREE.Vector3();
    this.restPositions=new Map();this.restScales=new Map();body.traverse(o=>{if(o.isBone){
      this.restPositions.set(o,o.position.clone());this.restScales.set(o,o.scale.clone());}});
    this.footBones=['ToeL','ToeR'].map(n=>body.getObjectByName(n)).filter(Boolean);
    body.updateMatrixWorld(true);
    this.footSoles=this.footBones.map(b=>b.getWorldPosition(new THREE.Vector3()).y-new THREE.Box3().setFromObject(body).min.y);
  }
  setBoard(model){if(this.board)disposeParkObject(this.board);this.board=model;this.boardKind=model.userData.kind;
    // Measure the actual central standing surface for each board, rather than
    // applying the same guessed .16m lift to four different deck geometries.
    model.updateWorldMatrix(true,true);
    const origin=new THREE.Vector3(0,2,0).applyMatrix4(model.matrixWorld);
    const down=new THREE.Vector3(0,-1,0).transformDirection(model.matrixWorld);
    const hit=new THREE.Raycaster(origin,down,0,4).intersectObject(model,true)[0];
    if(hit){const y=model.worldToLocal(hit.point.clone()).y;if(y>0&&y<.5)model.userData.deck=y;}
    this.env.scene.add(model);model.visible=false;}
  toggleBoard(){if(this.swimming||this.slam.active||!this.grounded)return false;
    this.boardOn=!this.boardOn;this.emote=null;return true;}
  queuePower(){if(this.slam.start(this)){this.jumpQueue=false;this.emote=null;return true;}return false;}
  playEmote(id){if(this.swimming||!this.grounded||this.slam.active)return;this.boardOn=false;this.emote=this.emote===id?null:id;this.poseTime=0;}
  queueJump(){if(!this.slam?.active){this.emote=null;super.queueJump();}}
  reset(x,z,heading){super.reset(x,z,heading);this.slam?.cancel();if(this.slam)this.slam.cooldown=0;
    this.impact?.clear();this.emote=null;this.boardBlend=0;this.lastHeading=heading||0;
    if(this.visual&&this.visual!==this.body){this.visual.rotation.set(0,0,0);this.visual.position.copy(this.visualHome);}}
  setState(name){
    // The source's boarding idle is replaced by a procedural skating pose below.
    if((this.boardOn||this.slam?.active||this.emote)&&name!=='swim')name='idle';
    super.setState(name);
  }
  physicsStep(dt,input){
    this.slam.before(dt,this);
    const wasGround=this.grounded;
    if(this.slam.active)this.jumpQueue=false;
    if(this.emote&&Math.hypot(input.forward||0,input.right||0)>.08)this.emote=null;
    super.physicsStep(dt,input);
    if(this.swimming){this.boardOn=false;this.emote=null;}
    if(this.slam.after(this)){
      this.impact?.hit(this.sim.position.x,this.foot,this.sim.position.z);
      this.effects?.clear();this.env.data.slamImpacts=String(this.slam.impacts);
      this.env.data.slamImpactHeight=this.foot.toFixed(3);
    }
    if(!wasGround&&this.grounded)this.landingCompression=.24;
    this.landingCompression=Math.max(0,(this.landingCompression||0)-dt);
  }
  pose(name,x=0,y=0,z=0,weight=1){
    for(const bo of this.bones.get(name)||[]){
      this.poseEuler.set(bo.rx+x,bo.ry+y,bo.rz+z,bo.o.rotation.order);
      this.poseQ.setFromEuler(this.poseEuler);bo.o.quaternion.slerp(this.poseQ,weight);
    }
  }
  update(dt,input){
    const result=super.update(dt,input);if(!result)return result;
    this.poseTime+=dt;this.impact?.update(dt);
    const riding=!!(this.boardOn&&this.board&&!this.swimming&&!this.slam.active);
    this.boardBlend=lerp(this.boardBlend,riding?1:0,1-Math.exp(-18*dt));
    const turn=clamp(angle(this.body.rotation.y,this.lastHeading)/Math.max(dt,.001),-3,3);
    this.lastHeading=this.body.rotation.y;
    this.lean=lerp(this.lean,clamp(-turn*.11,-.24,.24)*clamp(result.speed/6,0,1),1-Math.exp(-10*dt));
    // Source buddies have several rig copies: keep hats, body and shoes driven.
    if(!this.swimming)for(const arr of this.bones.values())for(let i=1;i<arr.length;i++)arr[i].o.quaternion.copy(arr[0].o.quaternion);
    const w=this.swimming?0:this.boardBlend;
    if(this.visual!==this.body){this.visual.position.copy(this.visualHome);this.visual.rotation.set(0,Math.PI/2*w,0);}
    if(w>.001){
      const compression=(this.landingCompression||0)/.24;
      // Feet keep their original flat, standing orientation. These mirrored
      // leg rigs do not bend around ordinary local X: the old additive knee /
      // ankle rotations rolled the soles upward. Lock BOTH lower chains and
      // Root to bind pose (including authored idle position/scale channels).
      // Spine1 is a sibling of the thighs, so only the waist/upper body bends.
      for(const name of ['Root','ThighL','ThighR','ShinL','ShinR','ToeL','ToeR']){
        this.pose(name,0,0,0,w);
        for(const bo of this.bones.get(name)||[]){
          bo.o.position.lerp(this.restPositions.get(bo.o),w);
          bo.o.scale.lerp(this.restScales.get(bo.o),w);
        }
      }
      this.body.rotation.x=0;this.body.rotation.z=0;
      const waist=.20+clamp(result.speed/11,0,1)*.06+compression*.08;
      this.pose('Spine1',waist,0,this.lean*.5,w);this.pose('Spine2',.05,-.36,this.lean,w);
      this.pose('Spine3',0,-.25,0,w);this.pose('Head',-.04,-.53,0,w);
      // Keep the relaxed shoulders from v30. The small outward opening comes
      // from the mirrored elbow joints, with a gentle forward forearm bend;
      // do not lift the whole arm sideways into the old rigid A-pose.
      const balance=this.lean*.07;
      this.pose('BiscepL',-.12,0,-.20+balance,w);this.pose('BiscepR',-.12,0,.20+balance,w);
      this.pose('ArmL',-.28,0,.28,w);this.pose('ArmR',-.28,0,-.28,w);
      this.pose('HandL',0,0,0,w);this.pose('HandR',0,0,0,w);
      // Only the planted skating pose is foot-anchored. Authored running/jump
      // root motion is NOT pinned; that would erase the source's natural stride.
      this.body.updateMatrixWorld(true);
      if(this.visual!==this.body&&this.footBones.length){
        let sole=Infinity;
        this.footBones.forEach((b,i)=>{b.getWorldPosition(this.footPoint);sole=Math.min(sole,this.footPoint.y-this.footSoles[i]);});
        const foot=this.previousFoot+(this.foot-this.previousFoot)*clamp(this.accumulator/(1/60),0,1);
        this.visual.position.y+=(foot+.008+(this.board?.userData.deck||.16)-sole)*w;
      }
    }
    if(this.slam.active&&!this.swimming){
      const p=this.slam.phase,t=this.slam.time;
      const fold=p==='anticipate'?.6:p==='tuck'?1:p==='dive'?.25:p==='recover'?1-t/.24:.32;
      this.pose('ThighL',-.7*fold);this.pose('ThighR',-.7*fold);
      this.pose('ShinL',1.1*fold);this.pose('ShinR',1.1*fold);
      this.pose('Spine2',.3*fold);this.pose('Head',-.15*fold);
      const arms=p==='dive'?-.35:p==='recover'?-.55:-2.1;
      this.pose('BiscepL',arms,0,.16);this.pose('BiscepR',arms,0,-.16);
      this.pose('ArmL',-.85);this.pose('ArmR',-.85);
      if(this.visual!==this.body)this.visual.position.y-=fold*.07;
      result.state='slam-'+p;
    }else if(this.emote&&!this.swimming){
      const fx=applyEmote(this.bones,this.emote,this.poseTime*5.4);
      if(this.visual!==this.body){this.visual.position.y+=fx.rootBobY||0;this.visual.rotation.y=fx.rootYaw||0;}
      result.state='emote-'+this.emote;
    }else if(riding)result.state=this.grounded?(result.speed>.6?'skate':'skate-idle'):'ollie';
    if(this.board){
      this.board.visible=riding&&this.body.visible;
      this.board.position.set(this.body.position.x,this.previousFoot+(this.foot-this.previousFoot)*clamp(this.accumulator/(1/60),0,1)+.008,this.body.position.z);
      // Balance belongs to the waist, not an independently tilted board that
      // separates the heels from the deck. Feet and deck stay parallel in air too.
      this.board.rotation.set(0,this.body.rotation.y,0,'YXZ');
      for(const wheel of this.board.userData.wheels)wheel.rotation.x-=result.speed*dt*3.2;
    }
    Object.assign(this.env.data,{characterController:'six-seven-park-v31',characterAnimation:result.state,playerCharacter:this.body.userData.characterId||'goril',
      skateMode:riding?'on':'off',skateKind:this.boardKind,skatePose:riding?'flat-feet-waist-only':'none',
      skateDeckHeight:(this.board?.userData.deck||0).toFixed(4),
      skateArms:riding?'soft-open-elbows':'authored',neckFinish:this.body.userData.neckFinish?'body-matched-v30':'original',
      skateLean:this.lean.toFixed(3),powerPhase:this.slam.phase,powerCooldown:this.slam.cooldown.toFixed(2),
      slamImpacts:String(this.slam.impacts),impactVisible:String(!!this.impact?.group.visible)});
    return result;
  }
  hideExtras(){if(this.board)this.board.visible=false;this.impact?.clear();this.effects?.clear();}
  dispose(){this.hideExtras();this.impact?.dispose();this.effects?.dispose();
    if(this.board)disposeParkObject(this.board);this.mixer.stopAllAction();this.mixer.uncacheRoot(this.body);}
}
