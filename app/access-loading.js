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
 const sound=doc.createElement('button');sound.type='button';sound.className='park-ui-control';sound.dataset.parkLoadingMusic='';sound.textContent='Music on';sound.style.cssText='display:block;pointer-events:auto;min-height:44px;min-width:112px;margin:16px auto 12px';sound.title='Loading music';
 let audio;try{audio=new win.Audio(new URL('../assets/audio/loading-cartoon-v1.m4a',import.meta.url).href);}catch{audio={play:()=>Promise.reject(),pause(){},removeAttribute(){},load(){}};sound.hidden=true;sound.style.display='none';}
 audio.loop=true;audio.preload='none';audio.volume=.07;
 let ended=false,muted=false,timer=null,initial=true,loading=true,playing=false;
 // The original Access card still owns input during deferred startup. A
 // wardrobe mounting underneath must not disable its music/reload buttons.
 const access=doc.querySelector('#park-access');
 const ownership=access&&win.MutationObserver?new win.MutationObserver(()=>{
  if(!ended&&doc.documentElement?.dataset?.parkAccess==='opening'&&access.inert)access.inert=false;
 }):null;
 ownership?.observe(access,{attributes:true,attributeFilter:['inert']});
 function allowed(){try{const settings=JSON.parse(win.localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}');return !muted&&win.localStorage.getItem('67park-feel-lab-muted')!=='1'&&settings.ambience!==0&&settings.sfx!==0;}catch{return !muted;}}
 function music(){if(ended||!loading||doc.hidden||!allowed()){playing=false;audio.pause();sound.textContent='Music off';sound.setAttribute('aria-pressed','false');return;}sound.textContent='Music on';sound.setAttribute('aria-pressed','true');if(playing)return;playing=true;audio.play().then(()=>{if(ended||!loading||doc.hidden||!allowed())audio.pause();}).catch(()=>{playing=false;if(!ended){sound.textContent='Tap for music';sound.setAttribute('aria-pressed','false');}});}
 function cleanup(){if(ended)return;ended=true;ownership?.disconnect();win.clearInterval(timer);doc.removeEventListener('visibilitychange',music);win.removeEventListener('park:audio-mute-change',music);win.removeEventListener('park:settings-change',music);win.removeEventListener('pagehide',cancel);sound.remove();}
 function cancel(){cleanup();audio.pause();audio.removeAttribute('src');audio.load();}
 sound.onclick=()=>{if(sound.textContent==='Tap for music')muted=false;else muted=!muted;music();};
 function update(){
  if(ended)return;
  const entry=win[Symbol.for('67park.entry.v1')]?.value;
  if(initial&&initialSelectionReady(entry,doc))initial=false;
  // Model-ready is not world-ready. Keep the controller for the second load
  // after Enter the park; browsing a wardrobe itself must remain silent.
  const wardrobe=doc.querySelector('.wardrobe');
  const entering=doc.querySelector('.studio-cancel,.entry-cancel,.wardrobe-returning');
  loading=initial||!!entering;
  // During module download use the existing access card. Afterwards add only
  // this same button to the original loader; no logo/progress/modal is cloned.
  const opening=doc.documentElement?.dataset?.parkAccess==='opening';
  if(opening&&access)access.inert=false;
  if(!opening)ownership?.disconnect();
  const sceneLogo=doc.querySelector('.opacity-100 > img[alt="67 Park"]');
  const scene=sceneLogo?.parentNode;
  const sceneAnchor=scene?.classList?.contains('z-[60]')?sceneLogo.nextElementSibling:null;
  const anchor=opening?doc.querySelector('#park-access [type="submit"]'):
   doc.querySelector('.wardrobe-returning .return-entry progress')||
   (entering?doc.querySelector('.wardrobe [data-entry-status]'):null)||
   (!wardrobe?sceneAnchor:null);
  if(loading&&anchor?.parentNode){if(sound.nextSibling!==anchor){
    anchor.parentNode.insertBefore(sound,anchor);
    // On mobile the wardrobe options already scroll. Reveal the newly added
    // loading controls once, within that panel; never resize the character
    // preview or pull the user's scroll back on every music tick.
    if(anchor.closest?.('.studio-options'))(anchor.hidden?sound:anchor).scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
  }}else sound.remove();
  music();
  if(!initial&&!wardrobe&&entry?.status==='ready')cancel();
 }
 timer=win.setInterval(update,100);
 doc.addEventListener('visibilitychange',music);win.addEventListener('park:audio-mute-change',music);win.addEventListener('park:settings-change',music);win.addEventListener('pagehide',cancel);
 update();return {cancel};
}
