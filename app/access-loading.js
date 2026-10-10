// First-entry curtain only: never pauses model preparation or changes GPU ownership.
export function initialSelectionReady(entry,doc){
 // Preview-ready can arrive while deferred entry modules still load. Revealing
 // it then exposes the pending password form again, followed by another loader.
 if(doc.documentElement?.dataset?.parkAccess==='opening')return false;
 // A saved player is already entering, not browsing the character selection.
 if(doc.querySelector('.studio-cancel,.entry-cancel,.wardrobe-returning'))return false;
 return Number.isFinite(entry?.milestones?.wardrobeReady)||entry?.status==='ready'&&!doc.querySelector('.wardrobe');
}
// Give the curtain a painted frame before cached game modules start compiling.
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
 const layer=doc.createElement('section');layer.id='park-initial-loading';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Loading the park');
 // Access itself uses 2147483646. Its pending form must not cover this curtain.
 // Preserve the original scene loader (Al): 67Park logo, cream background,
 // and yellow/pink progress bar. This shield only covers deferred boot; it
 // must not replace the native returning-player/wardrobe loading UI.
 layer.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f6efe4;display:grid;place-items:center;padding:16px;overflow:auto;color:#a98f6a;font:16px system-ui';
 const box=doc.createElement('div');box.style.cssText='box-sizing:border-box;width:min(340px,100%);text-align:center;display:flex;flex-direction:column;align-items:center';
 const logo=doc.createElement('img');logo.src=new URL('../brand/67park-logo.png',import.meta.url).href;logo.alt='67 Park';logo.className='h-24 w-auto animate-bounce drop-shadow-md';logo.style.cssText='height:96px;width:auto;max-width:100%;object-fit:contain';
 const title=doc.createElement('div');title.textContent='loading';title.style.cssText='font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.3em;margin-top:4px';
 const track=doc.createElement('div');track.setAttribute('role','progressbar');track.setAttribute('aria-label','Park preparation progress');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.style.cssText='box-sizing:border-box;margin-top:16px;height:12px;width:224px;max-width:100%;overflow:hidden;border-radius:999px;border:1px solid #0000000d;background:#ffffffcc;box-shadow:inset 0 2px 4px #0000000d';
 const fill=doc.createElement('div');fill.style.cssText='height:100%;border-radius:999px;background:linear-gradient(to right,#ffd23f,#ffb26b,#ff9fc6);width:0%';track.append(fill);
 const percent=doc.createElement('div');percent.style.cssText='margin-top:6px;font-size:11px;font-weight:900;font-variant-numeric:tabular-nums';
 const message=doc.createElement('p');message.hidden=true;message.setAttribute('role','status');message.style.cssText='font-size:13px;line-height:1.5';
 const sound=doc.createElement('button');sound.type='button';sound.className='park-ui-control';sound.dataset.parkLoadingMusic='';sound.textContent='Music on';sound.style.cssText='display:block;min-height:44px;min-width:112px;margin:16px auto 12px';sound.title='Loading music';
 const retry=doc.createElement('button');retry.className='park-ui-control';retry.textContent='Show loading options';retry.hidden=true;
 box.append(logo,sound,title,track,percent,message,retry);layer.append(box);doc.body.append(layer);
 let audio;try{audio=new win.Audio(new URL('../assets/audio/loading-cartoon-v1.m4a',import.meta.url).href);}catch{audio={play:()=>Promise.reject(),pause(){},removeAttribute(){},load(){}};sound.hidden=true;sound.style.display='none';}
 audio.loop=true;audio.preload='none';audio.volume=.07;
 let ended=false,muted=false,timer=null,curtain=true,loading=true,playing=false;
 // Wardrobe's modal setup can mark body siblings inert. Repair our own shield
 // in that mutation microtask, not on the next 100ms music tick, so a tap on
 // the visible music button cannot fall through during the loading handoff.
 const ownership=win.MutationObserver?new win.MutationObserver(()=>{if(curtain&&!ended&&layer.inert)layer.inert=false;}):null;
 ownership?.observe(layer,{attributes:true,attributeFilter:['inert']});
 function allowed(){try{const settings=JSON.parse(win.localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}');return !muted&&win.localStorage.getItem('67park-feel-lab-muted')!=='1'&&settings.ambience!==0&&settings.sfx!==0;}catch{return !muted;}}
 function music(){if(ended||!loading||doc.hidden||!allowed()){playing=false;audio.pause();sound.textContent='Music off';sound.setAttribute('aria-pressed','false');return;}sound.textContent='Music on';sound.setAttribute('aria-pressed','true');if(playing)return;playing=true;audio.play().then(()=>{if(ended||!loading||doc.hidden||!allowed())audio.pause();}).catch(()=>{playing=false;if(!ended){sound.textContent='Tap for music';sound.setAttribute('aria-pressed','false');}});}
 function cleanup(){if(ended)return;ended=true;ownership?.disconnect();win.clearInterval(timer);doc.removeEventListener('visibilitychange',music);win.removeEventListener('park:audio-mute-change',music);win.removeEventListener('park:settings-change',music);win.removeEventListener('pagehide',cancel);sound.remove();layer.remove();}
 function cancel(){cleanup();audio.pause();audio.removeAttribute('src');audio.load();}
 function finish(){curtain=false;ownership?.disconnect();layer.remove();}
 sound.onclick=()=>{if(sound.textContent==='Tap for music')muted=false;else muted=!muted;music();};retry.onclick=()=>{finish();doc.querySelector('.wardrobe')?.focus();};
 const start=Date.now();
 timer=win.setInterval(()=>{
  if(ended)return;
  // The wardrobe modal may mark body siblings inert as it mounts underneath.
  // This temporary topmost dialog owns its own music/recovery controls.
  if(curtain)layer.inert=false;
  const entry=win[Symbol.for('67park.entry.v1')]?.value;
  // Move the same control above the existing progress, never replace that UI.
  // Fresh-entry status stays untouched: adding a child button would break its
  // existing :not(:has(button)) compact loading styles.
  const nativeProgress=doc.querySelector('.wardrobe-returning .return-entry progress');
  // The status becomes a hidden ready marker while the avatar can still be
  // loading; errors keep a recovery section. Keep the toggle above either.
  const freshStatus=doc.querySelector('.wardrobe [data-entry-status]');
  const anchor=nativeProgress||freshStatus;
  const accessOpen=doc.documentElement?.dataset?.parkAccess!=='opening';
  if(curtain&&accessOpen&&nativeProgress?.parentNode){
   nativeProgress.parentNode.insertBefore(sound,nativeProgress);finish();
  }else if(curtain&&initialSelectionReady(entry,doc))finish();
  // Model-ready is not world-ready. Keep the controller for the second load
  // after Enter the park; browsing a wardrobe itself must remain silent.
  const wardrobe=doc.querySelector('.wardrobe');
  const entering=doc.querySelector('.studio-cancel,.entry-cancel,.wardrobe-returning');
  loading=curtain||!!entering;
  if(!curtain){
   if(loading&&anchor?.parentNode){if(sound.nextSibling!==anchor){
    anchor.parentNode.insertBefore(sound,anchor);
    // On mobile the wardrobe options already scroll. Reveal the newly added
    // loading controls once, within that panel; never resize the character
    // preview or pull the user's scroll back on every music tick.
    if(anchor.closest?.('.studio-options'))(anchor.hidden?sound:anchor).scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
   }}
   else sound.remove();
  }
  music();
  if(!curtain&&!wardrobe&&entry?.status==='ready'){cancel();return;}
  const progress=Math.round(Math.max(0,Math.min(1,Number(entry?.progress)||0))*100);
  fill.style.width=progress+'%';percent.textContent=progress+'%';track.setAttribute('aria-valuenow',String(progress));
  if(entry?.status==='error'||doc.querySelector('.wardrobe-avatar-error')||Date.now()-start>20000){message.hidden=false;message.textContent='Loading is taking longer. Open the loading options to retry or keep waiting.';retry.hidden=false;}
 },100);
 doc.addEventListener('visibilitychange',music);win.addEventListener('park:audio-mute-change',music);win.addEventListener('park:settings-change',music);win.addEventListener('pagehide',cancel);
 music();return {cancel};
}
