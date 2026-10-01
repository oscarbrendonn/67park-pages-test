import {PARK_DRIVING} from '../park-driving-tuning.js?v=beach-drive-1';

// Audio only. The real car/bus speed cap and all driving physics stay intact.
// Thresholds are fractions of that cap, NOT a timer cycling through gears.
export const AUDIO_GEARS=Object.freeze({
 up:Object.freeze([.20,.385,.59,.805]),
 down:Object.freeze([.12,.29,.49,.70]),
 ratios:Object.freeze([.245,.445,.66,.91,1.22]),
 shiftSeconds:.22,holdSeconds:.42,confirmSeconds:.085
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
export function createVehiclePowertrain(){
 let gear=1,rpm=840,load=0,speed=0,elapsed=0,lastShift=-10,shiftAge=10;
 let candidate=0,candidateAge=0,initialized=false,shifts=0;
 function reset(){gear=1;rpm=840;load=speed=elapsed=0;lastShift=-10;shiftAge=10;candidate=candidateAge=shifts=0;initialized=false;}
 function update(rawSpeed=0,{throttle=0,brake=false,kind='car',dt=1/60}={}){
  dt=clamp(dt,0,.1);rawSpeed=Number.isFinite(rawSpeed)?rawSpeed:0;
  const magnitude=Math.abs(rawSpeed),fraction=clamp(magnitude/PARK_DRIVING.maxSpeed);
  const reverse=rawSpeed<-.15||(magnitude<.15&&throttle<-.06);
  const idle=kind==='bus'?740:840;
  // Joining a moving car or resuming audio must not replay 1 -> 5 shifts.
  if(!initialized){
   speed=magnitude;rpm=idle;gear=reverse?-1:1;
   if(!reverse)while(gear<5&&fraction>AUDIO_GEARS.up[gear-1])gear++;
   initialized=true;
  }
  elapsed+=dt;shiftAge+=dt;
  speed+=(magnitude-speed)*(1-Math.exp(-dt/.085));
  const signedLoad=clamp(Math.abs(throttle));
  const opposing=magnitude>.25&&rawSpeed*throttle<0;
  const targetLoad=brake||opposing?0:signedLoad;
  load+=(targetLoad-load)*(1-Math.exp(-dt/(targetLoad>load?.09:.14)));
  const normal=clamp(speed/PARK_DRIVING.maxSpeed);
  if(reverse){gear=-1;candidate=0;candidateAge=0;shiftAge=10;}
  else if(magnitude<.15){gear=1;candidate=0;candidateAge=0;shiftAge=10;}
  else{
   if(gear<1)gear=1;
   const next=gear<5&&normal>AUDIO_GEARS.up[gear-1]?gear+1:
    gear>1&&normal<AUDIO_GEARS.down[gear-2]?gear-1:0;
   if(next!==candidate){candidate=next;candidateAge=0;}
   if(candidate)candidateAge+=dt;
   if(candidate&&candidateAge>=AUDIO_GEARS.confirmSeconds&&elapsed-lastShift>=AUDIO_GEARS.holdSeconds){
    gear=candidate;candidate=0;candidateAge=0;lastShift=elapsed;shiftAge=0;shifts++;
   }
  }
  // A clutch/load dip is audible without adding a click, beep or shift clip.
  // At the limiter it is constant: no artificial repeating rev-cut pulses.
  const shift=Math.max(0,1-shiftAge/AUDIO_GEARS.shiftSeconds);
  const ratio=gear<0?.50:AUDIO_GEARS.ratios[gear-1];
  // Disconnect the wheel-driven revs at a standstill. A hard collision or
  // position correction must not put the lagging speed into first gear and
  // briefly scream at redline while the actual car is already stopped.
  const wheelRev=magnitude<.15?0:clamp(normal/ratio);
  const moving=clamp(magnitude/.65);
  const rev=wheelRev*.84+load*.10*(.3+.7*moving);
  const targetRpm=idle+(kind==='bus'?2350:2800)*clamp(rev);
  rpm+=(targetRpm-rpm)*(1-Math.exp(-dt/(shift>.1?.055:.09)));
  return {gear,rpm,load,speed,shift,shifts,limit:PARK_DRIVING.maxSpeed,
   mode:brake?'braking':magnitude<.15?'idle':load>.06?'pulling':'coasting'};
 }
 return {update,reset};
}

// Measured firing fundamentals of the four same-engine recordings (4 cyl):
// 28, 49.2, 67 and 85 Hz. Adjacent loops must share one target RPM so
// crossfading never sounds like two engines beating against each other.
export const RECORDED_RPM=Object.freeze([840,1476,2010,2550]);
export function powertrainMix({rpm=840,load=0,speed=0,shift=0}={},kind='car'){
 const audibleRpm=clamp(rpm,700,3900),moving=clamp(speed/PARK_DRIVING.maxSpeed);
 let lower=0;while(lower<RECORDED_RPM.length-2&&audibleRpm>RECORDED_RPM[lower+1])lower++;
 const blend=clamp((audibleRpm-RECORDED_RPM[lower])/(RECORDED_RPM[lower+1]-RECORDED_RPM[lower]));
 const w=blend*blend*(3-2*blend),gains=[0,0,0,0];
 const level=(.175+moving*.028+clamp(load)*.042)*(1-clamp(shift)*.32);
 gains[lower]=Math.sqrt(1-w)*level;gains[lower+1]=Math.sqrt(w)*level;
 return {gains,rates:RECORDED_RPM.map(base=>audibleRpm/base),
  cutoff:(kind==='bus'?1300:1650)+clamp(load)*1500+moving*250};
}
