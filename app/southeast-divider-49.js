import * as THREE from 'three';

// The final divider beside the southeast house must stop inside its lawn.
// Keep its road-side cap fixed and shorten only this one connected strip.
export function shortenSoutheastDivider49(root){
 const mesh=root.getObjectByName('8_REF_AYIRICI');
 if(!mesh?.isMesh)return {skipped:'divider missing'};
 if(mesh.userData.southeastDivider49)return mesh.userData.southeastDivider49;
 root.updateMatrixWorld(true);
 const position=mesh.geometry.attributes.position;
 const inverse=mesh.matrixWorld.clone().invert();
 const world=new THREE.Vector3();
 const selected=[];
 for(let i=0;i<position.count;i++){
  world.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
  if(world.x>224.2&&world.x<225.4&&world.z>130.2&&world.z<151.7)selected.push([i,world.clone()]);
 }
 if(selected.length<1000)return {skipped:'target divider changed',selected:selected.length};
 const oldStart=Math.min(...selected.map(([,p])=>p.z));
 const oldEnd=Math.max(...selected.map(([,p])=>p.z));
 if(Math.abs(oldStart-130.400677)>.08||Math.abs(oldEnd-151.441966)>.08)return {skipped:'target bounds changed',oldStart,oldEnd};
 // The authored grass continues below the visible diagonal shore walk. Stop
 // against the visible lawn edge, not the hidden grass under that walk.
 const newEnd=142.55;
 const ratio=(newEnd-oldStart)/(oldEnd-oldStart);
 for(const [i,p] of selected){
  p.z=oldStart+(p.z-oldStart)*ratio;
  p.applyMatrix4(inverse);
  position.setXYZ(i,p.x,p.y,p.z);
 }
 position.needsUpdate=true;
 mesh.geometry.computeBoundingBox();
 mesh.geometry.computeBoundingSphere();
 return mesh.userData.southeastDivider49={version:49,selected:selected.length,oldStart,oldEnd,newEnd,roadCapFixed:true,otherDividersUnchanged:true};
}
