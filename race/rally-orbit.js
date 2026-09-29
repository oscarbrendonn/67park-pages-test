import {bindMinigameLook} from '../app/minigame-input.js?v=controls-37';
export function bindRallyOrbit(canvas,enabled){
  const input=bindMinigameLook(canvas,enabled);
  let yaw=0,pitch=0;
  return {reset(){yaw=pitch=0;input.reset();},apply(target,position){
    const delta=input.poll();yaw+=delta.lookYaw;pitch=Math.max(-.2,Math.min(.65,pitch-delta.lookPitch));
    const x=position.x-target.x,z=position.z-target.z,r=Math.hypot(x,z);
    const angle=Math.atan2(x,z)+yaw;
    position.x=target.x+Math.sin(angle)*r;position.z=target.z+Math.cos(angle)*r;
    position.y+=pitch*r;
    return delta.looking;
  }};
}
