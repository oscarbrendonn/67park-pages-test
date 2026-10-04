// Park mounting camera: retain user orbit instead of overwriting it each frame.
// Relative yaw follows the car through turns, without snapping behind it when
// a drag ends. One record, reset for every new mount; no event listeners/timers.
import {createCameraBoom} from './feel-camera.js';
import {cameraMeshCast} from './feel-camera-meshes.js';
export function createVehicleOrbit(){
  let current=null,startYaw=0,startPitch=0;const boom=createCameraBoom();
  return function pose(mount,at,heading,yaw,pitch,world=null,dt=1/60){
    if(!mount||![at?.x,at?.y,at?.z,heading,yaw,pitch].every(Number.isFinite))return null;
    if(current!==mount){current=mount;startYaw=yaw;startPitch=pitch;boom.reset();}
    const distance=mount.kind==='car'?Math.hypot(11,5):Math.hypot(10,5);
    const initialPitch=Math.atan2(5,mount.kind==='car'?11:10);
    const elevation=Math.max(.08,Math.min(1.1,initialPitch+pitch-startPitch));
    const angle=heading+yaw-startYaw,horizontal=Math.cos(elevation)*distance;
    const target={x:at.x,y:at.y+1,z:at.z},desired={x:at.x-Math.sin(angle)*horizontal,y:at.y+1+Math.sin(elevation)*distance,z:at.z-Math.cos(angle)*horizontal};
    if(mount.kind!=='car'||!world?.blockers?.length)return {...desired,target};
    const safe=boom.step(target,desired,dt,(origin,direction,length)=>cameraMeshCast(world,origin,direction,length));
    return {...(safe??desired),target};
  };
}
