// Native rotation only. Never rotate the canvas with CSS: that would disagree
// with joystick coordinates, safe areas and the renderer's viewport.
import {fullscreenAdapter,appModeGuide} from './browser-app-mode.js?v=settings-complete-20261002-1';
export function createScreenOrientation({host=window,preference=()=> 'auto',changed=()=>{},requestTimeout=4000}={}){
 const doc=host.document,orientation=host.screen?.orientation;
 const native=fullscreenAdapter(doc);
 let busy=false,locked=null,ownedFullscreen=false,attempt=0,lastNativeRequest=0,fullscreenError='',helpVisible=false;
 const standalone=()=>host.navigator?.standalone===true||host.matchMedia?.('(display-mode: standalone)').matches||(!native.element()&&host.matchMedia?.('(display-mode: fullscreen)').matches);
 const fullscreenSupported=()=>native.supported();
 const release=()=>host.dispatchEvent?.(new Event('park:release-controls'));
 const unlock=()=>{try{orientation?.unlock?.();}catch{}locked=null;};
 // Promise resolution alone is not proof of fullscreen. Legacy WebKit settles
 // through its event; a denied/no-op API must not leave an endless busy button.
 const changeFullscreen=(enter,token)=>new Promise((resolve,reject)=>{
  let settled=false,expired=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);for(const event of native.events)doc.removeEventListener?.(event,check);error?reject(error):resolve();};
  const check=()=>{if(!!native.element()===enter)finish();};
  const timer=setTimeout(()=>{expired=true;finish(new Error('Fullscreen did not change'));},requestTimeout);
  for(const event of native.events)doc.addEventListener?.(event,check);
  try{
   lastNativeRequest=token;
   const operation=enter?native.request():native.exit();
   Promise.resolve(operation).then(()=>{
    if(expired&&enter&&token===lastNativeRequest&&native.element()===doc.documentElement){try{Promise.resolve(native.exit()).catch(()=>{});}catch{}return;}
    check();
   },finish);
  }catch(error){finish(error);}
 });
 async function leaveOwnedFullscreen(){
  if(!ownedFullscreen)return;
  ownedFullscreen=false;
  try{if(native.element()===doc.documentElement)await changeFullscreen(false,attempt);}catch{}
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
  const fullscreen=!!native.element(),appMode=!!standalone();
  const fullscreenMessage=fullscreenError||(fullscreen?'Full screen is active. Use Exit full screen to return.':appMode?'Opened as an app without the browser toolbar. Your device may still show its status bar.':fullscreenSupported()?'Hide the browser toolbar while you play.':'Full screen is not available in this browser. Tap Full screen for app-mode instructions, including Add to Home Screen.');
  return {mode,busy,message,fullscreen,fullscreenSupported:fullscreenSupported(),standalone:appMode,fullscreenMessage,helpVisible,guide:appModeGuide(host)};
 };
 async function apply(){
  if(busy)return false;
  const mode=preference(),id=++attempt;release();
  if(mode==='auto'){unlock();await leaveOwnedFullscreen();changed(state());return true;}
  busy=true;changed(state());
  try{
   // Do not enter fullscreen on browsers that cannot lock orientation.
   if(typeof orientation?.lock!=='function')return false;
   if(!native.element()&&fullscreenSupported()){
    await changeFullscreen(true,id);ownedFullscreen=true;
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
  if(!native.element()&&!fullscreenSupported()){helpVisible=true;changed(state());return false;}
  const id=++attempt;busy=true;fullscreenError='';release();changed(state());
  try{
   if(native.element()){await changeFullscreen(false,id);ownedFullscreen=false;unlock();}
   else{
    await changeFullscreen(true,id);
    // A pagehide/reset must not leave a late fullscreen request active.
    if(id!==attempt){ownedFullscreen=true;await leaveOwnedFullscreen();return false;}
    ownedFullscreen=false; // Explicit full screen survives orientation changes.
   }
   helpVisible=false;return true;
  }catch{helpVisible=true;fullscreenError='Your browser did not allow this change. Try again, or use the app-mode instructions below. You can keep playing normally.';return false;}
  finally{busy=false;changed(state());}
 }
 const refresh=()=>changed(state());
 const reset=()=>{attempt++;unlock();void leaveOwnedFullscreen().then(refresh);};
 const fullscreen=()=>{release();fullscreenError='';if(!native.element()){ownedFullscreen=false;locked=null;}refresh();};
 host.addEventListener?.('resize',refresh);
 for(const event of native.events)doc.addEventListener?.(event,fullscreen);
 host.addEventListener?.('pagehide',reset);
 return {apply,toggleFullscreen,state,reset,refresh,showAppGuide(){helpVisible=true;refresh();},hideAppGuide(){helpVisible=false;refresh();},dispose(){reset();host.removeEventListener?.('resize',refresh);for(const event of native.events)doc.removeEventListener?.(event,fullscreen);host.removeEventListener?.('pagehide',reset);}};
}
