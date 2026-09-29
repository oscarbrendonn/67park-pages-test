// Search only when a land vehicle actually enters water. Normal driving does
// not build or scan a sidewalk grid. The sampler is the rendered pavement,
// not a guessed island rectangle or the vehicle's original parking spot.
export function createSidewalkFinder(getSampler){
 let sampler;
 function* search(x,z,accept){
  if(![x,z].every(Number.isFinite))return null;
  sampler??=getSampler();if(!sampler)return null;
  const [minX,minZ,maxX,maxZ]=sampler.stats.bounds,size=sampler.stats.cellSize;
  const columns=Math.max(1,Math.ceil((maxX-minX)/size)),rows=Math.max(1,Math.ceil((maxZ-minZ)/size)),heap=[],seen=new Set();
  // Expand nearby cells in distance order. Never allocate/sort the entire
  // island on a driving frame, including the first or a failed recovery.
  const push=(column,row)=>{
   if(column<0||row<0||column>=columns||row>=rows)return;
   const id=row*columns+column;if(seen.has(id))return;seen.add(id);
   const left=minX+column*size,top=minZ+row*size,right=Math.min(maxX,left+size),bottom=Math.min(maxZ,top+size);
   const cell={column,row,left,top,right,bottom,distance:Math.max(left-x,0,x-right)**2+Math.max(top-z,0,z-bottom)**2};
   let i=heap.length;heap.push(cell);
   while(i){const parent=(i-1)>>1;if(heap[parent].distance<=cell.distance)break;heap[i]=heap[parent];i=parent;}heap[i]=cell;
  };
  const pop=()=>{
   const first=heap[0],last=heap.pop();if(!heap.length)return first;
   let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].distance<heap[child].distance)child++;
    if(heap[child].distance>=last.distance)break;heap[i]=heap[child];i=child;
   }heap[i]=last;return first;
  };
  push(Math.max(0,Math.min(columns-1,Math.floor((x-minX)/size))),Math.max(0,Math.min(rows-1,Math.floor((z-minZ)/size))));
  let best=null,distance=Infinity;
  const probe=(px,pz)=>{
   const d=(px-x)**2+(pz-z)**2;if(d>=distance-1e-10)return;
   const y=sampler.height(px,pz);if(!Number.isFinite(y))return;
   const pose=accept(px,y,pz);if(!pose)return;
   best={...pose,x:px,z:pz};distance=d;
  };
  while(heap.length){
   const cell=pop();
   if(cell.distance>distance)break;
   push(cell.column-1,cell.row);push(cell.column+1,cell.row);push(cell.column,cell.row-1);push(cell.column,cell.row+1);
   probe(Math.max(cell.left,Math.min(cell.right,x)),Math.max(cell.top,Math.min(cell.bottom,z)));yield;
   for(let px=cell.left;px<=cell.right+1e-8;px+=.5)for(let pz=cell.top;pz<=cell.bottom+1e-8;pz+=.5){probe(px,pz);yield;}
  }
  // Refine the nearest safe half-metre sample without scanning distant land.
  for(const step of [.25,.125])if(best){
   const {x:bx,z:bz}=best;
   for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){probe(bx+dx*step,bz+dz*step);yield;}
  }
  return best;
 }
 // The synchronous form is for offline geometry checks. Gameplay always
 // consumes begin() with a bounded slice so a blocked coast cannot freeze it.
 const find=(x,z,accept)=>{const iterator=search(x,z,accept);let result;do{result=iterator.next();}while(!result.done);return result.value;};
 find.begin=search;return find;
}

const searches=new WeakMap();
export const WATER_RECOVERY_PROBES_PER_TICK=2048,WATER_RECOVERY_BUDGET_MS=1.5;
export function recoverVehicleFromWater(car,dt,waterContact=null){
 if(car.spec?.marine||!car.area?.waterLevel||!car.area?.nearestSidewalk)return false;
 if(![car.x,car.z].every(Number.isFinite))return false;
 let task=searches.get(car);
 // An authoritative relocation cancels an obsolete local search.
 if(task&&(Math.hypot(car.x-task.x,car.z-task.z)>.01||(car.recoverySerial??0)!==task.serial)){searches.delete(car);task=null;car.waterRecoveryPending=false;}
 if(!task&&!waterContact){
  const height=car.area.supportHeight(car.x,car.z),water=car.area.waterLevel(car.x,car.z);
  if(!Number.isFinite(water)||(Number.isFinite(height)&&height>water+.006&&car.y>=water-.25)){car.waterRecoveryPending=false;return false;}
 }
 car.stop();car.distance=0;car.steer=0;
 car.waterRecoveryRetry=Math.max(0,(car.waterRecoveryRetry??0)-dt);
 if(car.waterRecoveryRetry>0)return true;
 if(!task){
  const heading=Number.isFinite(car.yaw)?car.yaw:0;
  // A rectangular footprint repeats after PI. Preserve the current heading
  // first, then try each distinct orientation once rather than its duplicates.
  const headings=[heading,0,Math.PI/2,...Array.from({length:8},(_,i)=>i*Math.PI/8)].filter((yaw,i,all)=>!all.slice(0,i).some(a=>Math.abs(Math.sin(a-yaw))<1e-8));
  const {halfLength:l}=car.spec,points=car.area.footprint?.(car.spec);
  // Sidewalks are narrower than a bus. Align the vehicle along the visible
  // pavement, allowing safe road-side overhang rather than sending it to a
  // distant island just to fit the entire bus inside a narrow pavement strip.
  const lane=[[-.45,-l],[.45,-l],[-.45,0],[.45,0],[-.45,l],[.45,l]];
  const accept=(x,y,z)=>{
   const support=car.area.supportHeight(x,z);
   if(!Number.isFinite(support)||Math.abs(support-y)>.12)return null;
   if(car.area.sidewalkHeight&&!Number.isFinite(car.area.sidewalkHeight(x,z)))return null;
   for(const yaw of headings){
    if(car.area.sidewalkHeight){
     const sin=Math.sin(yaw),cos=Math.cos(yaw);
     // Keep the length of the vehicle centred on the visible sidewalk.
     const onPavement=([u,v])=>{
      const px=x+cos*u+sin*v,pz=z-sin*u+cos*v,h=car.area.sidewalkHeight(px,pz);
      return Number.isFinite(h)&&Math.abs(h-y)<.22;
     };
     if(!lane.every(onPavement))continue;
    }
    const check=car.area.check(x,z,yaw,car.spec);
    if(!check.ok||car.blocked?.(x,z,yaw))continue;
    if(car.area.sidewalkHeight){
     const sin=Math.sin(yaw),cos=Math.cos(yaw);
     // The whole car, including mirrors/bumpers, must remain supported on a
     // level dry patch. Never leave its outside wheels hanging down to sand
     // or water, even though adjoining road/grass can support an overhang.
     if(!points?.every(([u,v])=>{const px=x+cos*u+sin*v,pz=z-sin*u+cos*v,h=car.area.supportHeight(px,pz);return Number.isFinite(h)&&Math.abs(h-y)<.25;}))continue;
    }
    return {y:check.y,yaw};
   }
   return null;
  };
  task={x:car.x,z:car.z,serial:car.recoverySerial??0,accept,iterator:car.area.beginSidewalkSearch?.(car.x,car.z,accept)};
  searches.set(car,task);
 }
 car.waterRecoveryPending=true;car.reason='water-recovery-search';
 let result;
 if(task.iterator){
  const start=performance.now();
  for(let n=0;n<WATER_RECOVERY_PROBES_PER_TICK;n++){
   result=task.iterator.next();if(result.done)break;
   if(performance.now()-start>=WATER_RECOVERY_BUDGET_MS)return true;
  }
  if(!result.done)return true;
 }else result={done:true,value:car.area.nearestSidewalk(car.x,car.z,task.accept)};
 searches.delete(car);car.waterRecoveryPending=false;
 const candidate=result.value;
 // Other cars keep moving between slices. Revalidate the complete footprint
 // immediately before teleporting instead of trusting an earlier free spot.
 const pose=candidate&&task.accept(candidate.x,candidate.y,candidate.z);
 if(!pose){car.reason='water-no-safe-sidewalk';car.waterRecoveryRetry=.5;return true;}
 Object.assign(car,{...pose,x:candidate.x,z:candidate.z},{speed:0,steer:0,accumulator:0,distance:0,reason:'water-recovery',waterRecoveryRetry:0,waterRecoveryBrake:.4});
 car.recoverySerial=(car.recoverySerial??0)+1;
 return true;
}
