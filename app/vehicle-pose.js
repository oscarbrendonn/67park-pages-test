import * as T from 'three';
import {canonicalPoseBoneName} from './character-pose-bones.js';
// Absolute offsets from the authored rest pose: no cumulative deformation,
// scaling of limbs or reparenting equipment. Both local and remote use this.
export function vehicleBones(bones,driver=false,steer=0){
 for(const entries of bones.values())for(const b of entries)b.o.rotation.set(b.rx,b.ry,b.rz);
 const set=(name,x=0,y=0,z=0)=>{for(const b of bones.get(name)??[])b.o.rotation.set(b.rx+x,b.ry+y,b.rz+z);};
 set('ThighL',-1.2,0,-.06);set('ThighR',-1.2,0,.06);
 set('ShinL',1.22);set('ShinR',1.22);set('Spine1',.04);
 set('BiscepL',driver?-.65:-.28,0,-.10);set('BiscepR',driver?-.65:-.28,0,.10);
 set('ArmL',driver?.65:.8,0,.12);set('ArmR',driver?.65:.8,0,-.12);
 if(driver){set('HandL',0,0,-steer*.55);set('HandR',0,0,-steer*.55);}
 return {};
}
const cache=new WeakMap(),a=new T.Vector3(),b=new T.Vector3(),delta=new T.Vector3();
function belongsTo(root,node){for(let current=node;current;current=current.parent)if(current===root)return true;return false;}
export function alignVehicleHip(root,seat){
 let hips=cache.get(root);if(!hips||!belongsTo(root,hips[0])){hips=[];root.traverse(o=>{if(o.isBone&&/^(ThighL|ThighR|LeftUpLeg|RightUpLeg|mixamorigLeftUpLeg|mixamorigRightUpLeg)$/.test(o.name))hips.push(o);});if(!hips.length)return;cache.set(root,hips.slice(0,2));hips=cache.get(root);}
 root.updateWorldMatrix(true,true);hips[0].getWorldPosition(a);if(hips[1])a.add(hips[1].getWorldPosition(b)).multiplyScalar(.5);
 delta.set(seat.x,seat.y+.12,seat.z);
 if(root.parent){root.parent.worldToLocal(a);root.parent.worldToLocal(delta);}
 root.position.add(delta.sub(a));root.updateMatrixWorld(true);
}
const armCache=new WeakMap(),jointP=new T.Vector3(),handP=new T.Vector3(),goal=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),worldQ=new T.Quaternion();
// A small bounded reach correction, not a full-body IK solver. The initial
// seated pose defines the elbow direction; the wheel only adjusts the reach.
export function holdVehicleWheel(root,car){
 if(car.kind==='boat')return;
 let arms=armCache.get(root);if(!arms||!belongsTo(root,arms[0]?.hand)){
  arms=['L','R'].map(side=>({side,hand:root.getObjectByName('Hand'+side),joints:['Arm','Biscep'].map(n=>root.getObjectByName(n+side)),copies:[]}));
  for(const arm of arms)for(const joint of arm.joints){if(!joint)continue;const copies=[];
   root.traverse(o=>{if(o.isBone&&o!==joint&&canonicalPoseBoneName(o)===joint.name)copies.push({bone:o,before:new T.Quaternion()});});
   if(copies.length)arm.copies.push({joint,before:new T.Quaternion(),delta:new T.Quaternion(),copies});
  }
  armCache.set(root,arms);
 }
 car.steering.updateWorldMatrix(true,true);
 for(const arm of arms){if(!arm.hand||arm.joints.some(j=>!j))continue;
  for(const row of arm.copies){row.before.copy(row.joint.quaternion);for(const copy of row.copies)copy.before.copy(copy.bone.quaternion);}
  goal.set(arm.side==='L'?.18:-.18,.06,.015).applyMatrix4(car.steering.matrixWorld);
  for(let pass=0;pass<3;pass++)for(const joint of arm.joints){
   joint.getWorldPosition(jointP);arm.hand.getWorldPosition(handP);
   from.copy(handP).sub(jointP).normalize();to.copy(goal).sub(jointP).normalize();
   q.setFromUnitVectors(from,to);const angle=2*Math.acos(Math.min(1,Math.abs(q.w)));if(angle>.28)q.identity().slerp(new T.Quaternion().setFromUnitVectors(from,to),.28/angle);
   joint.getWorldQuaternion(worldQ);joint.parent.getWorldQuaternion(parentQ).invert();
   joint.quaternion.copy(parentQ.multiply(q.multiply(worldQ)));joint.updateWorldMatrix(false,true);
  }
  // Apply only the additional wheel-reach delta to every duplicate rig, not
  // the master's absolute pose: small authored rest differences stay intact.
  for(const row of arm.copies){row.delta.copy(row.before).invert().multiply(row.joint.quaternion);for(const copy of row.copies)copy.bone.quaternion.copy(copy.before).multiply(row.delta);}
 }
}
