// Keep the walking-style thumb pad, but use it ONLY for steering.
// Gas/reverse are independent pedals; ordinary releases coast, interruptions stop.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const finite=v=>Number.isFinite(v)?v:0;
export function setDrivingStick(state,x,z){
 const length=Math.hypot(finite(x),finite(z)),scale=Math.max(1,length);
 state.driveX=finite(x)/scale;state.driveZ=finite(z)/scale;
 state.touchDriving=true;state.driveStickActive=true;
}
export function releaseDrivingStick(state){
 state.driveX=state.driveZ=0;state.driveStickActive=false;
}
export function drivingStickInput(x,z){
 x=finite(x);z=finite(z);
 return {throttle:0,steer:Math.hypot(x,z)>.12?clamp(x/.85,-1,1):0,brake:false};
}
export function resetDrivingInput(state){
 releaseDrivingStick(state);
 Object.assign(state,{gas:false,reverse:false,brake:false,steer:0,touchSteering:false,driveInterrupted:true,drivePedalOwners:Object.create(null)});
}
// Pointer ownership survives React renders. Releasing another finger cannot
// cancel a held pedal, and cancelled/hidden controls cannot re-arm on a move.
export function createDrivingPedalHandlers(state,key,blocked=()=>false){
 if(!['gas','reverse','brake'].includes(key))throw Error('Unknown driving pedal');
 const owners=()=>state.drivePedalOwners??=Object.create(null);
 const press=(event,owner)=>{
  if(blocked()||owners()[key]!=null)return;
  event.preventDefault();
  if(owner!=='keyboard')try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
  owners()[key]=owner;state[key]=true;state.touchDriving=true;state.driveInterrupted=false;
 };
 const release=(event,owner,cancelled=false)=>{
  if(owners()[key]!==owner)return;
  delete owners()[key];state[key]=false;
  if(cancelled)state.driveInterrupted=true;
 };
 const keyEvent=(event,down)=>{
  if(!['Space','Enter'].includes(event.code))return;
  event.preventDefault();event.stopPropagation();
  if(down){if(!event.repeat)press(event,'keyboard');}else release(event,'keyboard');
 };
 return {
  onPointerDown:event=>{if(event.pointerType==='mouse'&&event.button!==0)return;press(event,event.pointerId);},
  onPointerUp:event=>release(event,event.pointerId),
  onPointerCancel:event=>release(event,event.pointerId,true),
  onLostPointerCapture:event=>release(event,event.pointerId,true),
  onKeyDown:event=>keyEvent(event,true),onKeyUp:event=>keyEvent(event,false),
  onBlur:event=>release(event,'keyboard',true),
 };
}
export function readVehicleInput(keys,state,enabled=true,brake=false){
 if(!enabled)return {throttle:0,steer:0,brake:true};
 const x=clamp(finite(keys.x),-1,1),z=clamp(finite(keys.z),-1,1),keyboard=!!(x||z);
 const gas=!!state.gas,reverse=!!state.reverse;
 const steer=x||(state.driveStickActive?drivingStickInput(state.driveX,state.driveZ).steer:state.touchSteering?clamp(finite(state.steer),-1,1):0);
 const input={throttle:gas||reverse?Number(gas)-Number(reverse):z,steer,brake:false};
 if(state.brake||brake||(state.driveInterrupted&&!keyboard)||(gas&&reverse))return {...input,throttle:0,brake:true};
 return input;
}
