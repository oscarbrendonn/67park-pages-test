import {Quaternion,Vector3} from 'three';
// Restore exact clip-space rotation before the next mixer sample. Never undo
// additive Euler angles after a mixer has already replaced the bone pose.
export function createWeaponPose(arm){
 const saved=new Quaternion(),offset=new Quaternion(),axis=new Vector3(1,0,0);let applied=false;
 return {restore(){if(applied&&arm)arm.quaternion.copy(saved);applied=false;},
  apply(weapon){if(!arm||weapon==='bat')return;saved.copy(arm.quaternion);offset.setFromAxisAngle(axis,-.35);arm.quaternion.multiply(offset);applied=true;}
 };
}
