// Display only server-approved poses. Never extrapolate beyond the newest
// collision-tested pose, and never rewind playback when packets bunch up.
export function vehicleRollDistance(distance,speed){
 // Below the parked threshold, tiny reconciliation/stop-tail displacements
 // are presentation settling, not another turn of the tyres.
 return Number.isFinite(distance)&&Number.isFinite(speed)&&Math.abs(speed)>=.08?distance*Math.sign(speed):0;
}
export function createVehicleSnapshotBuffer({delay=120,maxSamples=32}={}){
 let frames=[],last=null,clock=null,elapsed=0,reserve=delay,rate=1;const cuts=new Map();
 function sample(snapshot,dt){
  const seconds=Number.isFinite(dt)?Math.max(0,dt):0;
  elapsed+=seconds*1000;
  const stamp=Number(snapshot.now);
  if(!Number.isFinite(stamp))return snapshot.cars;
  if(snapshot!==last){
   if(last&&(stamp<frames.at(-1).stamp||snapshot.received-last.received>1800)){frames=[];clock=null;reserve=delay;rate=1;cuts.clear();}
   // Entry prewarm can advance the game with synthetic short steps while
   // real time passes. Only skip that UNRENDERED time; a delayed packet
   // during continuous rendering must never teleport playback forwards.
   if(last&&clock!==null&&snapshot.received-last.received-elapsed>250)clock=Math.max(clock,stamp-reserve);
   const previous=frames.at(-1)?.cars,ids=new Set(snapshot.cars.map(c=>c.id));
   for(const id of cuts.keys())if(!ids.has(id))cuts.delete(id);
   for(const car of snapshot.cars){const p=previous?.get(car.id);if(p&&((p.recoverySerial??0)!==(car.recoverySerial??0)||JSON.stringify(p.seats)!==JSON.stringify(car.seats)||Math.hypot(car.x-p.x,car.z-p.z)>20))cuts.set(car.id,{stamp,pose:car});}
   if(!frames.length||stamp>frames.at(-1).stamp)frames.push({stamp,cars:new Map(snapshot.cars.map(c=>[c.id,c]))});
   if(frames.length>maxSamples)frames.splice(0,frames.length-maxSamples);
   last=snapshot;
   elapsed=0;
  }
  const newest=frames.at(-1);if(!newest)return snapshot.cars;
  if(clock===null)clock=newest.stamp-delay;
  // Learn a small, bounded jitter cushion from actual gaps. Do not increase
  // baseline input latency on healthy links or extrapolate through obstacles.
  reserve=Math.max(delay,reserve-seconds*20,Math.min(360,delay+Math.max(0,elapsed-80)));
  if(seconds>=1)clock=Math.max(clock,newest.stamp-reserve);
  const lag=Math.max(0,newest.stamp-clock);
  const wanted=lag<60?lag/60:lag<reserve-40?.85:lag>reserve+60?1.1:1;
  rate+=(wanted-rate)*(1-Math.exp(-seconds*10));
  // This is a presentation clock, not a physics integrator. A 50 ms physics
  // cap here made 5–15 FPS devices accumulate seconds of visual/input lag.
  // Physics still keeps its own bounded, swept substeps on the server.
  clock=Math.min(newest.stamp,clock+Math.min(.25,seconds)*1000*rate);
  while(frames.length>2&&frames[1].stamp<=clock)frames.shift();
  const left=frames[0],right=frames[1]||left;
  const alpha=right.stamp===left.stamp?0:Math.max(0,Math.min(1,(clock-left.stamp)/(right.stamp-left.stamp)));
  return snapshot.cars.map(latest=>{
   const a=left.cars.get(latest.id),b=right.cars.get(latest.id);
   if(!a||!b)return latest;
   // Hold the discontinuity's first pose until playback catches up, not each
   // newest pose (which would rewind when the buffered segment resumes).
   const cut=cuts.get(latest.id);
   if(cut&&clock<cut.stamp)return {...latest,...cut.pose,seats:latest.seats};
   if(cut)cuts.delete(latest.id);
   const pose={...latest};for(const key of ['x','y','z','speed','steer'])pose[key]=a[key]+(b[key]-a[key])*alpha;
   pose.yaw=a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*alpha;
   return pose;
  });
 }
 // A collision correction must also advance this vehicle's presentation
 // boundary; otherwise the following frame would replay pre-correction poses.
 sample.correct=id=>{const newest=frames.at(-1),pose=newest?.cars.get(id);if(pose)cuts.set(id,{stamp:newest.stamp,pose});};
 return sample;
}
