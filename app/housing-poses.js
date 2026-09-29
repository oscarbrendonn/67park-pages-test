import {Vector3,Quaternion,Euler,Matrix4} from 'three';
import {canonicalPoseBoneName} from './character-pose-bones.js';
import {alignVehicleHip} from './vehicle-pose.js';

// Reuse the avatar's actual skeleton, including all clothing copies. No new
// model, animation loop, texture, skeleton reparenting or limb scaling.
const rigs=new WeakMap(),scenes=new WeakMap(),failed=new WeakSet();
const offset=new Quaternion(),rotation=new Euler(),matrix=new Matrix4();
const pos=new Vector3(),scale=new Vector3(),quat=new Quaternion();
const joint=new Vector3(),child=new Vector3(),from=new Vector3(),to=new Vector3();
const worldRotation=new Quaternion(),parentRotation=new Quaternion();
const seated={
 ThighL:['ShinL',.04,-.06,1],ThighR:['ShinR',-.04,-.06,1],
 ShinL:['ToeL',0,-1,.03],ShinR:['ToeR',0,-1,.03],
 BiscepL:['ArmL',.18,-1,.25],BiscepR:['ArmR',-.18,-1,.25],
 ArmL:['HandL',0,-.35,1],ArmR:['HandR',0,-.35,1],
};
function build(root){
 const bind=new Map();
 root.traverse(n=>{const s=n.skeleton;if(!s)return;for(let i=0;i<s.bones.length;i++)if(!bind.has(s.bones[i]))bind.set(s.bones[i],s.boneInverses[i].clone().invert());});
 const bones=[];
 root.traverse(o=>{
  const name=canonicalPoseBoneName(o);if(!o.isBone||!name||!(/^(Root$|Spine|Head|Biscep|Arm|Hand|Thigh|Shin|Toe)/.test(name)))return;
  const rest=o.quaternion.clone();
  if(bind.has(o)&&bind.has(o.parent)){matrix.copy(bind.get(o.parent)).invert().multiply(bind.get(o));matrix.decompose(pos,rest,scale);}
  bones.push({o,name,rest,base:o.quaternion.clone(),last:rest.clone(),sit:rest.clone(),applied:false});
 });
 if(!bones.length)return null;
 // Bone axes differ between authored rigs. A local X rotation made the
 // gorilla's knees point sideways. Cache a bind-aware sitting pose once:
 // thighs forward, shins down, forearms on the lap. Each costume rig keeps
 // its own rest twist and limb lengths; no per-frame IK or mesh changes.
 for(const b of bones)b.o.quaternion.copy(b.rest);
 root.updateWorldMatrix(true,true);
 for(const b of bones){
  const aim=seated[b.name],next=aim&&b.o.children.find(o=>o.isBone&&canonicalPoseBoneName(o)===aim[0]);
  if(!next)continue;
  b.o.getWorldPosition(joint);next.getWorldPosition(child);from.copy(child).sub(joint).normalize();
  to.set(aim[1],aim[2],aim[3]).transformDirection(root.matrixWorld);
  offset.setFromUnitVectors(from,to);b.o.getWorldQuaternion(worldRotation);b.o.parent.getWorldQuaternion(parentRotation).invert();
  b.o.quaternion.copy(parentRotation).multiply(offset).multiply(worldRotation);b.o.updateWorldMatrix(false,true);
 }
 for(const b of bones){b.sit.copy(b.o.quaternion);b.o.quaternion.copy(b.base);}
 root.updateWorldMatrix(true,true);
 const r={bones,weight:0,basePosition:root.position.clone(),lastPosition:root.position.clone(),baseRotation:root.quaternion.clone(),lastRotation:root.quaternion.clone(),applied:false};
 rigs.set(root,r);return r;
}
function apply(root,spot,house,dt){
 const r=rigs.get(root)||(spot&&build(root));if(!r)return;
 if(r.applied){
  if(root.position.distanceToSquared(r.lastPosition)<1e-12)root.position.copy(r.basePosition);
  if(root.quaternion.angleTo(r.lastRotation)<1e-6)root.quaternion.copy(r.baseRotation);
 }
 r.applied=false;
 for(const b of r.bones)if(b.applied){if(b.o.quaternion.angleTo(b.last)<1e-6)b.o.quaternion.copy(b.base);b.applied=false;}
 if(!spot||!house){r.weight=0;root.userData.homePose={active:false};return;}
 r.weight=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,r.weight+Math.min(.05,Math.max(0,dt||0))/.18);
 const w=r.weight*r.weight*(3-2*r.weight);
 for(const b of r.bones){
  b.base.copy(b.o.quaternion);
  b.o.quaternion.copy(b.base).slerp(spot.pose==='sit'?b.sit:b.rest,w);b.last.copy(b.o.quaternion);b.applied=true;
 }
 r.basePosition.copy(root.position);r.baseRotation.copy(root.quaternion);
 quat.setFromEuler(rotation.set(spot.pose==='lie'?-Math.PI/2:0,0,0));root.quaternion.slerp(quat,w);
 alignVehicleHip(root,{x:house.room.x+spot.x,y:house.room.y+spot.surface+(spot.pose==='lie'?.08:0),z:house.room.z+spot.z});
 root.position.lerpVectors(r.basePosition,root.position,w);
 r.lastPosition.copy(root.position);r.lastRotation.copy(root.quaternion);r.applied=true;
 root.updateMatrixWorld(true);root.userData.homePose={active:true,pose:spot.pose,spot:spot.id,weight:r.weight,bones:r.bones.length};
}
export function queueHomePose(root,spot,house,dt){
 if(!root||failed.has(root)||(!spot&&!rigs.has(root)))return;
 let scene=root;while(scene.parent)scene=scene.parent;if(!scene.isScene)return;
 let pending=scenes.get(scene);
 if(!pending){
  pending=new Map();scenes.set(scene,pending);const before=scene.onBeforeRender;
  scene.onBeforeRender=function(...args){
   before?.apply(this,args);
   for(const [avatar,sample]of pending)try{apply(avatar,...sample);}catch(e){failed.add(avatar);avatar.userData.homePose={active:false,error:String(e?.message||e)};}
   pending.clear();
  };
 }
 pending.set(root,[spot,house,dt]);
}
