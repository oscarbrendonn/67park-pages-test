import {createSwingRide,SWING_SITE,SWING_RULES,swingFrameBlocked} from './swing-ride.js?v=swings-1';

export function validSwingSite(w,site=SWING_SITE){
 for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
  const x=site.x+dx,z=site.z+dz,g=w.ground(x,z),hit=w.sample?.(x,z);
  if(!Number.isFinite(g)||Math.abs(g-site.y)>.15||!hit||!/CIM|GRASS/i.test(hit.object.name)||Math.abs(hit.point.y-g)>.2||w.water?.(x,z)||w.treeBlocked?.(x,g+.6,z))return false;
 }return true;
}
// Add one ride to the existing network mount/exit/seat-pose flow. No new
// movement controller, second camera or invented local seat ownership.
export function createParkSwings({world,scene,canInstall=()=>true}){
 let owner=null,ride=null,previousBlocker=null,blocker=null,rejected=false;
 function dispose(){
  if(owner&&ride){const i=owner.rides.indexOf(ride);if(i>=0)owner.rides.splice(i,1);if(owner.treeBlocked===blocker)owner.treeBlocked=previousBlocker;ride.dispose();}
  owner=ride=blocker=previousBlocker=null;rejected=false;
 }
 function step(){
  const w=world();if(w!==owner){dispose();owner=w;}if(!w?.ready||ride||rejected||!scene()||!canInstall())return;
  if(!validSwingSite(w)){rejected=true;return;}
  ride=createSwingRide();scene().add(ride.group);w.rides.push(ride);
  previousBlocker=w.treeBlocked;blocker=(x,y,z)=>previousBlocker?.(x,y,z)||swingFrameBlocked(x,y,z);w.treeBlocked=blocker;
  const old=w.dispose;w.dispose=function(...args){if(owner===w)dispose();return old?.apply(this,args);};
 }
 return {step,dispose,debug:()=>({installed:!!ride,rejected,asset:SWING_RULES.asset,site:SWING_SITE,ride:ride?.state()})};
}
