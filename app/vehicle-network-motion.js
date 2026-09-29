// Visual prediction only. Authoritative positions/ownership stay on the
// server; bounded extrapolation must obey the same oriented bumper clearance.
import {slideParkVehicle,sweepParkVehiclePath} from './park-driving-tuning.js?v=corner-slide-2';
const finite=p=>p&&[p.x,p.z,p.yaw].every(Number.isFinite);
const yawDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function vehicleFootprintsOverlap(a,b){
 for(const angle of [a.yaw,b.yaw,a.yaw+Math.PI/2,b.yaw+Math.PI/2]){
  const ax=Math.sin(angle),az=Math.cos(angle);
  const radius=p=>p.spec.halfWidth*Math.abs(Math.cos(p.yaw)*ax-Math.sin(p.yaw)*az)+p.spec.halfLength*Math.abs(Math.sin(p.yaw)*ax+Math.cos(p.yaw)*az);
  if(Math.abs((a.x-b.x)*ax+(a.z-b.z)*az)>=radius(a)+radius(b)+.08)return false;
 }
 return true;
}
export function vehiclePredictionArea(area,car,snapshots,cars){
 const obstacles=[];
 let movingNeighbour=false;
 const self=snapshots?.find(state=>state.id===car.id);
 for(const state of snapshots??[]){
  if(state.id===car.id||!finite(state))continue;
  const spec=cars.find(c=>c.id===state.id)?.spec;
  if(spec){
   obstacles.push({...state,spec});
   // Two approaching cars must not each advance into the other's OLD pose.
   // Near moving traffic, use interpolation of authoritative poses only.
   const envelope=Math.hypot(car.spec.halfWidth,car.spec.halfLength)+Math.hypot(spec.halfWidth,spec.halfLength)+.08+(Math.abs(self?.speed??0)+Math.abs(state.speed??0))*.16;
   if(self&&Math.abs(state.speed)>.001&&Math.hypot(state.x-self.x,state.z-self.z)<envelope)movingNeighbour=true;
  }
 }
 return {predictionTime:movingNeighbour?0:.16,check(x,z,yaw,spec){
  const hit=area.check(x,z,yaw,spec);
  if(!hit.ok)return hit;
  return obstacles.some(other=>vehicleFootprintsOverlap({x,z,yaw,spec},other))?{ok:false,reason:'car'}:hit;
 }};
}
export function sweepVehicle(from,to,area,spec,fromValidated=false){
 if(!finite(from)||(!fromValidated&&!area.check(from.x,from.z,from.yaw,spec).ok))return null;
 const angle=yawDelta(from.yaw,to.yaw);
 const travel=Math.hypot(to.x-from.x,to.z-from.z)+Math.hypot(spec.halfWidth??0,spec.halfLength??0)*Math.abs(angle);
 if(!Number.isFinite(travel)||travel>3.84)return null;
 return sweepParkVehiclePath({...from,area,spec},to.x,to.z,from.yaw+angle);
}
export function predictVehicle(state,age,area,spec){
 if(!finite(state)||![state.speed,state.steer,age].every(Number.isFinite)||Math.abs(state.speed)<.001||age<=0)return state;
 const time=Math.min(.16,area.predictionTime??.16,age);
 if(time<=0)return state;
 const steps=Math.max(1,Math.ceil(time*120)),dt=time/steps;
 let pose={...state},speed=state.speed;
 for(let i=0;i<steps;i++){
  // A braking snapshot must not continue at its old constant velocity.
  if(state.brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-(spec.marine?5:16)*dt);
  const turn=speed/spec.wheelbase*Math.tan(state.steer)*dt,heading=pose.yaw+turn/2;
  const target={x:pose.x+Math.sin(heading)*speed*dt,z:pose.z+Math.cos(heading)*speed*dt,yaw:pose.yaw+turn};
  // The preceding substep already checked its endpoint against this exact
  // frame's terrain and snapshot obstacles. Keep every new sweep sample,
  // without resampling that same endpoint at the start of the next substep.
  const next=sweepVehicle(pose,target,area,spec,i>0);
  if(!next)return pose;
  if(next.clipped){
   // The authority continues along glancing walls. Stopping prediction here
   // used to make each received snapshot look like another tiny stop/jump.
   // Reuse the identical bounded, fully swept clearance solver, including
   // the area's other-vehicle checks. Boats and head-on impacts still stop.
   const sliding={...pose,area,spec,distance:0,blocked:()=>false};
   const hit=next.contact;
   if(slideParkVehicle(sliding,hit,target.x-pose.x,target.z-pose.z,target.yaw,speed*dt)){
    pose={...pose,x:sliding.x,y:sliding.y,z:sliding.z,yaw:sliding.yaw,clipped:false};continue;
   }
  }
  pose={...pose,...next};
  if(next.clipped)break;
 }
 return pose;
}
