// First-entry curtain only: never pauses model preparation or changes GPU ownership.
export function initialSelectionReady(entry,doc){
 return Number.isFinite(entry?.milestones?.wardrobeReady)||entry?.status==='ready'&&!doc.querySelector('.wardrobe');
}
export function beginAccessLoading(doc=document,win=window){
 // Mini-games and standalone item studios have their own readiness contract.
 if(/\/(?:play|tumble-tiles|stone-hold|balloon|race|rockets|sports|lane-rush|skybound-soft|pet-play-preview|style-studio)(?:\/|$)/.test(win.location?.pathname||''))return {cancel(){}};
 if(!doc.createElement||!doc.body)return {cancel(){}};
 const layer=doc.createElement('section');layer.id='park-initial-loading';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Loading the park');
 layer.style.cssText='position:fixed;inset:0;z-index:2147483000;background:var(--park-ui-surface,#f3f7fa);display:grid;place-items:center;padding:24px;color:var(--park-ui-ink,#354953);font:16px system-ui';
 const box=doc.createElement('div');box.className='park-ui-panel';box.style.cssText='box-sizing:border-box;width:min(340px,100%);text-align:center;padding:28px;border-radius:28px;background:var(--park-ui-card,#fff)';
 const title=doc.createElement('h2');title.textContent='Loading your park…';
 const message=doc.createElement('p');message.textContent='Preparing your character and the park.';message.setAttribute('role','status');
 const sound=doc.createElement('button');sound.className='park-ui-control';sound.textContent='Music on';
 const retry=doc.createElement('button');retry.className='park-ui-control';retry.textContent='Show loading options';retry.hidden=true;
 box.append(title,message,sound,retry);layer.append(box);doc.body.append(layer);
 let audio;try{audio=new win.Audio(new URL('../assets/audio/loading-party-v1.mp3',import.meta.url).href);}catch{audio={play:()=>Promise.reject(),pause(){},removeAttribute(){},load(){}};sound.hidden=true;}
 audio.loop=false;audio.preload='none';audio.volume=.07;
 let ended=false,muted=false,timer=null;
 function allowed(){try{const settings=JSON.parse(win.localStorage.getItem('67park.feel-lab.player-settings.v1')||'{}');return !muted&&win.localStorage.getItem('67park-feel-lab-muted')!=='1'&&settings.ambience!==0&&settings.sfx!==0;}catch{return !muted;}}
 function music(){if(ended||doc.hidden||!allowed()){audio.pause();sound.textContent='Music off';return;}sound.textContent='Music on';audio.play().then(()=>{if(ended)audio.pause();}).catch(()=>{if(!ended)sound.textContent='Tap for music';});}
 function cleanup(){if(ended)return;ended=true;win.clearInterval(timer);doc.removeEventListener('visibilitychange',music);win.removeEventListener('park:audio-mute-change',music);win.removeEventListener('park:settings-change',music);win.removeEventListener('pagehide',cancel);layer.remove();}
 function cancel(){cleanup();audio.pause();audio.removeAttribute('src');audio.load();}
 function finish(){cancel();}
 sound.onclick=()=>{if(sound.textContent==='Tap for music')muted=false;else muted=!muted;music();};retry.onclick=()=>{finish();doc.querySelector('.wardrobe')?.focus();};
 const start=Date.now();
 timer=win.setInterval(()=>{
  const entry=win[Symbol.for('67park.entry.v1')]?.value;
  if(initialSelectionReady(entry,doc)){finish();return;}
  // Never leave music playing behind a slow/error panel or an active game.
  if(Date.now()-start>12000||doc.documentElement.dataset.gameplayAvatarState==='ready'){muted=true;audio.pause();sound.hidden=true;}
  if(entry?.status==='error'||doc.querySelector('.wardrobe-avatar-error')||Date.now()-start>20000){message.textContent='Loading is taking longer. Open the loading options to retry or keep waiting.';retry.hidden=false;}
 },100);
 doc.addEventListener('visibilitychange',music);win.addEventListener('park:audio-mute-change',music);win.addEventListener('park:settings-change',music);win.addEventListener('pagehide',cancel);
 music();return {cancel};
}
