// Preserve a one-frame action until the next physics step, not just the next
// render. Do not replay an interrupted press when gameplay resumes.
export function createStepAction(win=window,doc=document){
 let pending=false;
 const clear=()=>{pending=false},hidden=()=>{if(doc.hidden)clear()};
 const events=['blur','pagehide','orientationchange','park:release-controls'];
 for(const type of events)win.addEventListener(type,clear);
 doc.addEventListener('visibilitychange',hidden);
 return {push(pressed){if(pressed&&!doc.hidden)pending=true},consume(){const pressed=pending;pending=false;return pressed},clear,
  dispose(){clear();for(const type of events)win.removeEventListener(type,clear);doc.removeEventListener('visibilitychange',hidden);}};
}
