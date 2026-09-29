// Native rotation only. Never rotate the canvas with CSS: that would disagree
// with joystick coordinates, safe areas and the renderer's viewport.
export function createScreenOrientation({host=window,preference=()=> 'auto',changed=()=>{}}={}){
 const doc=host.document,orientation=host.screen?.orientation;
 let busy=false,locked=null,ownedFullscreen=false,attempt=0,fullscreenError='';
 const standalone=()=>host.navigator?.standalone===true||host.matchMedia?.('(display-mode: standalone)').matches||host.matchMedia?.('(display-mode: fullscreen)').matches;
 const fullscreenSupported=()=>!!(doc.fullscreenEnabled&&doc.documentElement.requestFullscreen&&doc.exitFullscreen);
 const release=()=>host.dispatchEvent?.(new Event('park:release-controls'));
 const unlock=()=>{try{orientation?.unlock?.();}catch{}locked=null;};
 async function leaveOwnedFullscreen(){
  if(!ownedFullscreen)return;
  ownedFullscreen=false;
  try{if(doc.fullscreenElement===doc.documentElement)await doc.exitFullscreen?.();}catch{}
 }
 const state=()=>{
  const mode=preference(),landscape=host.innerWidth>host.innerHeight;
  let message='Rotate your phone to play upright or sideways.';
  if(busy)message='Switching screen orientation…';
  else if(mode!=='auto'){
   const matches=mode==='landscape'?landscape:!landscape;
   message=matches?`${mode==='landscape'?'Landscape':'Portrait'} view is active${locked===mode?' and locked':''}.`:
    mode==='landscape'?'Turn your phone sideways. If it stays upright, turn off your phone’s rotation lock.':'Hold your phone upright. If it stays sideways, turn off your phone’s rotation lock.';
  }
  const fullscreen=!!doc.fullscreenElement,appMode=!!standalone();
  const fullscreenMessage=fullscreenError||(fullscreen?'Full screen is active. Use Exit full screen to return.':appMode?'Opened as an app without the browser toolbar.':fullscreenSupported()?'Hide the browser toolbar while you play.':'Full screen is not available in this browser. On iPhone, open in Safari, tap Share → Add to Home Screen, then open the 67Park icon. Enable Open as Web App if offered.');
  return {mode,busy,message,fullscreen,fullscreenSupported:fullscreenSupported(),standalone:appMode,fullscreenMessage};
 };
 async function apply(){
  if(busy)return false;
  const mode=preference(),id=++attempt;release();
  if(mode==='auto'){unlock();await leaveOwnedFullscreen();changed(state());return true;}
  busy=true;changed(state());
  try{
   // Do not enter fullscreen on browsers that cannot lock orientation.
   if(typeof orientation?.lock!=='function')return false;
   if(!doc.fullscreenElement&&doc.fullscreenEnabled&&doc.documentElement.requestFullscreen){
    await doc.documentElement.requestFullscreen();ownedFullscreen=true;
   }
   if(id!==attempt||preference()!==mode)return false;
   await orientation.lock(mode);
   if(id!==attempt||preference()!==mode){unlock();return false;}
   locked=mode;return true;
  }catch{
   // Native APIs are optional. Manual rotation remains usable without a
   // blocking overlay, lost controls, an unhandled rejection or fake success.
   unlock();await leaveOwnedFullscreen();return false;
  }finally{
   if(id!==attempt||preference()!==mode){unlock();await leaveOwnedFullscreen();}
   busy=false;changed(state());
  }
 }
 async function toggleFullscreen(){
  if(busy)return false;
  if(!doc.fullscreenElement&&!fullscreenSupported()){changed(state());return false;}
  const id=++attempt;busy=true;fullscreenError='';release();changed(state());
  try{
   if(doc.fullscreenElement){await doc.exitFullscreen();ownedFullscreen=false;unlock();}
   else{
    await doc.documentElement.requestFullscreen();
    // A pagehide/reset must not leave a late fullscreen request active.
    if(id!==attempt){ownedFullscreen=true;await leaveOwnedFullscreen();return false;}
    ownedFullscreen=false; // Explicit full screen survives orientation changes.
   }
   return true;
  }catch{fullscreenError='Your browser did not allow this change. You can keep playing normally or try again.';return false;}
  finally{busy=false;changed(state());}
 }
 const refresh=()=>changed(state());
 const reset=()=>{attempt++;unlock();void leaveOwnedFullscreen().then(refresh);};
 const fullscreen=()=>{release();if(!doc.fullscreenElement){ownedFullscreen=false;locked=null;}refresh();};
 host.addEventListener?.('resize',refresh);
 doc.addEventListener?.('fullscreenchange',fullscreen);
 host.addEventListener?.('pagehide',reset);
 return {apply,toggleFullscreen,state,reset,refresh,dispose(){reset();host.removeEventListener?.('resize',refresh);doc.removeEventListener?.('fullscreenchange',fullscreen);host.removeEventListener?.('pagehide',reset);}};
}
