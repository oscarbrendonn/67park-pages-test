// Rendering can sample a short tap between two 25 Hz network sends. Preserve
// that tap until one packet consumes it; never replay it after blocked input.
export function createNetworkJumpLatch(){
 let pending=false;
 return {
  sample(held,enabled){pending=enabled&&(pending||held===true);},
  consume(){const value=pending;pending=false;return value;},
  reset(){pending=false;},
 };
}
