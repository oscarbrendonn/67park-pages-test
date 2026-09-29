// Park mounting camera: retain user orbit instead of overwriting it each frame.
// Relative yaw follows the car through turns, without snapping behind it when
// a drag ends. One record, reset for every new mount; no event listeners/timers.
export function createVehicleOrbit(){
  let current=null,startYaw=0,startPitch=0;
  return function pose(mount,at,heading,yaw,pitch){
    if(!mount||![at?.x,at?.y,at?.z,heading,yaw,pitch].every(Number.isFinite))return null;
    if(current!==mount){current=mount;startYaw=yaw;startPitch=pitch;}
    const distance=mount.kind==='car'?Math.hypot(11,5):Math.hypot(10,5);
    const initialPitch=Math.atan2(5,mount.kind==='car'?11:10);
    const elevation=Math.max(.08,Math.min(1.1,initialPitch+pitch-startPitch));
    const angle=heading+yaw-startYaw,horizontal=Math.cos(elevation)*distance;
    return {x:at.x-Math.sin(angle)*horizontal,y:at.y+1+Math.sin(elevation)*distance,z:at.z-Math.cos(angle)*horizontal,target:{x:at.x,y:at.y+1,z:at.z}};
  };
}
