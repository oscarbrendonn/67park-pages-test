// A bounded swim jump, driven by the same queued input as the land controller.
// The float controller owns vertical placement in water, so use a ballistic
// offset instead of accumulating impulses against its per-frame clamp.
export function createWaterJump() {
  let elapsed = -1;
  let last = null;
  return function step({dt, position:p, world, queued, enabled}) {
    const sea = world?.sea?.(p.x,p.z);
    const wet = enabled && Number.isFinite(sea) && world?.water?.(p.x,p.z);
    const teleported = last && Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)>4;
    last={x:p.x,y:p.y,z:p.z};
    if(!wet || teleported) { elapsed=-1; return 0; }
    if(elapsed<0 && queued && Math.abs(p.y-sea-.58)<.2) elapsed=0;
    if(elapsed<0) return 0;
    elapsed+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));
    if(elapsed>=.6) { elapsed=-1; return 0; }
    // 1.68 m apex, 0.60 s flight; repeated presses cannot reset the arc.
    return 18.6666666667*elapsed*(.6-elapsed);
  };
}
export const stepWaterJump=createWaterJump();
