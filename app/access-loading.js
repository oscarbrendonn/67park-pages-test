// Music only: reuse the original loading UI, never create a second screen.
export function initialSelectionReady(entry,doc){
 // Preview-ready can arrive while deferred entry modules still load.
 if(doc.documentElement?.dataset?.parkAccess==='opening')return false;
 // A saved player is already entering, not browsing the character selection.
 if(doc.querySelector('.studio-cancel,.entry-cancel,.wardrobe-returning'))return false;
 return Number.isFinite(entry?.milestones?.wardrobeReady)||entry?.status==='ready'&&!doc.querySelector('.wardrobe');
}
// Give the existing access UI a painted frame before game modules compile.
// Hidden tabs and throttled Safari animation frames must never stall boot.
export function paintAccessLoading(doc=document,win=window){
 if(doc.hidden||!win.requestAnimationFrame)return Promise.resolve();
 return new Promise(resolve=>{
  let done=false,frame=null;
  const finish=()=>{if(done)return;done=true;win.clearTimeout(timer);if(frame!==null)win.cancelAnimationFrame?.(frame);resolve();};
  const timer=win.setTimeout(finish,100);
  frame=win.requestAnimationFrame(()=>{if(!done)frame=win.requestAnimationFrame(finish);});
 });
}
export function beginAccessLoading(doc=document,win=window){
 // Mini-games and standalone item studios have their own readiness contract.
 if(/\/(?:play|tumble-tiles|stone-hold|balloon|race|rockets|sports|lane-rush|skybound-soft|pet-play-preview|style-studio)(?:\/|$)/.test(win.location?.pathname||''))return {cancel(){}};
 if(!doc.createElement||!doc.body)return {cancel(){}};
 const controllerKey=Symbol.for('67park.access-music.v1'),previous=win[controllerKey];
 if(previous?.doc===doc)return previous.controller;
 previous?.controller.cancel();
 const sound=doc.createElement('button');sound.type='button';sound.className='park-ui-control';sound.dataset.parkLoadingMusic='';sound.textContent='Music on';sound.style.cssText='display:block;pointer-events:auto;min-height:44px;min-width:112px;margin:16px auto 12px';sound.title='Loading music';
 const loadingStyle=sound.style.cssText,headerStyle='display:block;pointer-events:auto;flex:0 0 48px;width:48px;min-width:48px;min-height:44px;margin:0;padding:4px;font-size:10px;line-height:1.15;white-space:normal';
 const accessStyle=headerStyle+';position:fixed;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));z-index:1';
 let audio;try{audio=new win.Audio(new URL('../assets/audio/loading-cartoon-v1.m4a',import.meta.url).href);}catch{audio={play:()=>Promise.reject(),pause(){},removeAttribute(){},load(){}};sound.hidden=true;sound.style.display='none';}
 audio.loop=true;audio.preload='none';audio.volume=.07;
 let ended=false,muted=false,timer=null,playing=false,blocked=false,playAttempt=0,pageSuspended=false;
 // The original Access card still owns input during deferred startup. A
 // wardrobe mounting underneath must not disable its music/reload buttons.
 const access=doc.querySelector('#park-access');
 const ownership=access&&win.MutationObserver?new win.MutationObserver(()=>{
  if(!ended&&doc.documentElement?.dataset?.parkAccess==='opening'&&access.inert)access.inert=false;
 }):null;
 ownership?.observe(access,{attributes:true,attributeFilter:['inert']});
 function allowed(){try{const settings=JSON.parse(win.localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}');return !muted&&win.localStorage.getItem('67park-feel-lab-muted')!=='1'&&settings.ambience!==0&&settings.sfx!==0;}catch{return !muted;}}
 function music(){
  if(ended||pageSuspended||doc.hidden||!allowed()){playing=false;playAttempt++;audio.pause();sound.textContent='Music off';sound.setAttribute('aria-pressed','false');return;}
  sound.textContent=blocked?'Tap for music':'Music on';sound.setAttribute('aria-pressed',String(!blocked));
  if(playing||blocked)return;
  playing=true;const attempt=++playAttempt;
  try{Promise.resolve(audio.play()).then(()=>{if(ended||pageSuspended||doc.hidden||!allowed())audio.pause();}).catch(()=>{if(ended||attempt!==playAttempt)return;playing=false;blocked=true;sound.textContent='Tap for music';sound.setAttribute('aria-pressed','false');});}
  catch{if(!ended){playing=false;blocked=true;sound.textContent='Tap for music';sound.setAttribute('aria-pressed','false');}}
 }
 // Safari may reject the first play after asynchronous password verification.
 // Retry on the next real gesture, never repeatedly from the polling timer.
 function gesture(event){if(event.isTrusted===false||event.target===sound||!blocked||!allowed())return;blocked=false;music();}
 function cleanup(){if(ended)return;ended=true;ownership?.disconnect();win.clearInterval(timer);doc.removeEventListener('visibilitychange',music);doc.removeEventListener('pointerdown',gesture);doc.removeEventListener('keydown',gesture);win.removeEventListener('park:audio-mute-change',music);win.removeEventListener('park:settings-change',music);win.removeEventListener('pagehide',pagehide);win.removeEventListener('pageshow',pageshow);sound.remove();if(win[controllerKey]?.controller===controller)delete win[controllerKey];}
 function cancel(){cleanup();audio.pause();audio.removeAttribute('src');audio.load();}
 function pagehide(event){if(!event.persisted){cancel();return;}pageSuspended=true;music();}
 function pageshow(){if(ended)return;pageSuspended=false;update();}
 sound.onclick=()=>{if(blocked)muted=false;else muted=!muted;blocked=false;music();};
 function update(){
  if(ended)return;
  const entry=win[Symbol.for('67park.entry.v1')]?.value;
  // Preview readiness is not park entry. The same track continues through
  // character selection, styling, retry and actual world/avatar preparation.
  const wardrobe=doc.querySelector('.wardrobe');
  const entering=doc.querySelector('.studio-cancel,.entry-cancel,.wardrobe-returning');
  // During module download use the existing access card. Afterwards add only
  // this same button to the original loader; no logo/progress/modal is cloned.
  const opening=doc.documentElement?.dataset?.parkAccess==='opening';
  if(!opening&&!wardrobe&&entry?.status==='ready'&&doc.documentElement?.dataset?.gameplayAvatarState==='ready'){cancel();return;}
  if(opening&&access)access.inert=false;
  if(!opening)ownership?.disconnect();
  const sceneLogo=doc.querySelector('.opacity-100 > img[alt="67 Park"]');
  const scene=sceneLogo?.parentNode;
  const sceneAnchor=scene?.classList?.contains('z-[60]')?sceneLogo.nextElementSibling:null;
  const header=doc.querySelector('.wardrobe .studio-topbar,.wardrobe .wardrobe-header');
  const recovery=doc.querySelector('#park-connection-recovery:not([hidden]) button:not([hidden])');
  const returning=doc.querySelector('.wardrobe-returning .return-entry progress');
  const headerTarget=!opening&&!recovery&&!returning?header:null;
  const anchor=opening?doc.querySelector('#park-access [type="submit"]'):
   recovery||
   returning||
   (entering?doc.querySelector('.wardrobe [data-entry-status]'):null)||
   (!wardrobe?sceneAnchor:null);
  if(headerTarget){if(sound.parentNode!==headerTarget||headerTarget.lastElementChild!==sound){
    sound.style.cssText=headerStyle;if(sound.hidden)sound.style.display='none';
    // Keep the same right-hand topbar slot in selection and Style Studio.
    // Appending only on ownership change avoids a self-anchor/100ms DOM loop.
    headerTarget.append(sound);
  }}else if(anchor?.parentNode){if(sound.nextSibling!==anchor){
    sound.style.cssText=opening?accessStyle:loadingStyle;
    if(sound.hidden)sound.style.display='none';
    anchor.parentNode.insertBefore(sound,anchor);
    // On mobile the wardrobe options already scroll. Reveal the newly added
    // loading controls once, within that panel; never resize the character
    // preview or pull the user's scroll back on every music tick.
    if(anchor.closest?.('.studio-options'))(anchor.hidden?sound:anchor).scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
  }}else sound.remove();
  music();
 }
 const controller={cancel};win[controllerKey]={doc,controller};
 timer=win.setInterval(update,100);
 doc.addEventListener('visibilitychange',music);doc.addEventListener('pointerdown',gesture);doc.addEventListener('keydown',gesture);win.addEventListener('park:audio-mute-change',music);win.addEventListener('park:settings-change',music);win.addEventListener('pagehide',pagehide);win.addEventListener('pageshow',pageshow);
 update();return controller;
}
