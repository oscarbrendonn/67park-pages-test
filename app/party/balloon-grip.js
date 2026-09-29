import {Vector3,Quaternion} from 'three';
import {canonicalPoseBoneName} from '../character-pose-bones.js';
const rigs=new WeakMap(),a=new Vector3(),b=new Vector3(),c=new Vector3(),axis=new Vector3(),pole=new Vector3(),elbow=new Vector3(),q=new Quaternion(),parent=new Quaternion(),world=new Quaternion();
function aim(bone,child,target){bone.getWorldPosition(a);child.getWorldPosition(b);b.sub(a).normalize();c.copy(target).sub(a).normalize();if(b.lengthSq()<.5||c.lengthSq()<.5)return;bone.getWorldQuaternion(world);bone.parent.getWorldQuaternion(parent).invert();q.setFromUnitVectors(b,c).multiply(world).premultiply(parent);bone.quaternion.copy(q).normalize();bone.updateWorldMatrix(false,true);}
export function applyBalloonGrip(root,target,heading){
 if(!root)return;let rig=rigs.get(root);
 if(!rig&&target){rig=[];root.traverse(n=>{const name=canonicalPoseBoneName(n);if(!n.isBone||!/^Biscep[LR]$/.test(name))return;const side=name.endsWith('L')?1:-1,suffix=side===1?'L':'R',lower=n.children.find(c=>canonicalPoseBoneName(c)==='Arm'+suffix),hand=lower?.children.find(c=>canonicalPoseBoneName(c)==='Hand'+suffix);if(hand)rig.push({upper:n,lower,hand,side,baseU:new Quaternion(),baseL:new Quaternion(),lastU:new Quaternion(),lastL:new Quaternion(),target:new Vector3(),applied:false});});if(rig.length)rigs.set(root,rig);}
 if(!rig)return;let gap=0;
 for(const r of rig){if(r.applied){if(r.upper.quaternion.angleTo(r.lastU)<1e-6)r.upper.quaternion.copy(r.baseU);if(r.lower.quaternion.angleTo(r.lastL)<1e-6)r.lower.quaternion.copy(r.baseL);}r.applied=false;if(!target)continue;
  root.updateWorldMatrix(true,true);r.baseU.copy(r.upper.quaternion);r.baseL.copy(r.lower.quaternion);r.upper.getWorldPosition(a);r.lower.getWorldPosition(b);r.hand.getWorldPosition(c);const l1=a.distanceTo(b),l2=b.distanceTo(c);if(l1<.001||l2<.001)continue;
  r.target.set(target.x+Math.cos(heading)*r.side*.09,target.y,target.z-Math.sin(heading)*r.side*.09);axis.copy(r.target).sub(a);const d=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,axis.length()));axis.normalize();pole.set(Math.cos(heading)*r.side,-.4,-Math.sin(heading)*r.side);pole.addScaledVector(axis,-pole.dot(axis)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d);elbow.copy(a).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));aim(r.upper,r.lower,elbow);aim(r.lower,r.hand,r.target);r.lastU.copy(r.upper.quaternion);r.lastL.copy(r.lower.quaternion);r.applied=true;root.updateWorldMatrix(true,true);gap=Math.max(gap,r.hand.getWorldPosition(a).distanceTo(r.target));
 }
 root.userData.balloonGrip={active:!!target,chains:rig.length,maxGap:gap};
}
