// One owner for the initial screen. Reuse the accepted Access host; never add
// another full-screen curtain or wait for the world GPU before character choice.
export const ACCESS_OPENING_KEY=Symbol.for('67park.access-opening.v1');

export function openingDecision({scripts=false,intent='unknown',settled=false,wardrobe=false,previewReady=false,recovery=false,entering=false,playable=false}={}){
 if(!scripts||intent==='unknown')return '';
 if(playable&&!wardrobe)return 'gameplay';
 if(intent==='returning'&&!settled)return '';
 if(recovery)return 'recovery';
 if(entering||intent==='returning')return '';
 return wardrobe&&previewReady?'selection':'';
}

export function beginAccessOpening(doc=document,win=window){
 if(/\/(?:play|tumble-tiles|stone-hold|balloon|race|rockets|sports|lane-rush|skybound-soft|pet-play-preview|style-studio)(?:\/|$)/.test(win.location?.pathname||''))return null;
 const panel=doc.getElementById('park-access');
 // Standalone games/studios own their loading contract and have no main entry.
 if(!panel||![...doc.querySelectorAll('script[data-park-access-type]')].some(node=>/\/app\/main\.js(?:\?|$)/.test(node.getAttribute?.('src')||'')))return null;
 if(win[ACCESS_OPENING_KEY]?.doc===doc)return win[ACCESS_OPENING_KEY];
 const card=panel.querySelector('form'),logo=panel.querySelector('.access-logo'),submit=panel.querySelector('[type="submit"]'),message=doc.getElementById('park-access-message');
 if(!card||!logo||!submit||!message)return null;
 const make=(tag,className,text)=>{const node=doc.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
 // These are the native Al loader's exact label, bar, colours and logo sizing.
 // The existing form and recovery controls remain the same event-owning nodes.
 for(const child of card.children)if(child!==logo&&child!==submit&&child!==message){child.hidden=true;child.style.display='none';}
 panel.style.background='#f6efe4';
 card.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;max-width:none;margin:auto;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;text-align:center';
 logo.classList.add('h-24','w-auto','animate-bounce','drop-shadow-md');
 logo.style.cssText='width:auto;height:96px;max-width:100%;margin:0;object-fit:contain';
 const label=make('div','mt-3 text-[11px] font-black uppercase tracking-[0.3em] text-[#a98f6a]','loading');
 label.dataset.parkOpeningAnchor='';
 const track=make('div','mt-4 h-3 w-56 overflow-hidden rounded-full border border-black/5 bg-white/80 shadow-inner');
 const fill=make('div','h-full rounded-full bg-gradient-to-r from-[#ffd23f] via-[#ffb26b] to-[#ff9fc6] transition-[width] duration-300 ease-out');
 fill.style.width='0%';track.append(fill);track.dataset.parkOpeningProgress='';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Opening the park');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
 const percent=make('div','mt-1.5 text-[11px] font-black tabular-nums text-[#a98f6a]','0%');percent.dataset.parkOpeningPercent='';
 card.insertBefore(label,message);card.insertBefore(track,message);card.insertBefore(percent,message);
 submit.hidden=true;message.hidden=true;submit.style.display='none';message.style.display='none';
 submit.style.maxWidth='320px';message.style.maxWidth='400px';
 panel.dataset.parkOpening='loading';panel.removeAttribute?.('aria-labelledby');panel.setAttribute('aria-label','Opening the park');doc.documentElement.dataset.parkOpeningPhase='loading';
 // The preview may render under its cover, but cannot receive focus or input.
 const root=doc.getElementById('root'),rootWasInert=root?.inert;if(root)root.inert=true;
 let scripts=false,intent='unknown',settled=false,ended=false,failed=false,finishing=false,progress=0,timer=null,frame=null,paintTimer=null;
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 // An auto-entry error can precede the last critical module's load event.
 // It is still rethrown to launch() when it awaits ready, without an early
 // unhandled rejection or a second independently owned recovery screen.
 void ready.catch(()=>{});
 function clearPaint(){if(frame!==null)win.cancelAnimationFrame?.(frame);if(paintTimer!==null)win.clearTimeout(paintTimer);frame=null;paintTimer=null;}
 function stop(){ended=true;if(root)root.inert=rootWasInert;win.clearInterval(timer);clearPaint();doc.removeEventListener('visibilitychange',update);win.removeEventListener('pageshow',update);win.removeEventListener('pagehide',pagehide);}
 function reveal(phase){if(ended)return;stop();doc.documentElement.dataset.parkOpeningPhase=phase;resolveReady(phase);}
 function finish(){
  if(finishing||ended)return;finishing=true;
  // Let React commit the ready canvas/name error before removing its cover.
  // The timer fallback also completes in hidden/throttled Safari documents.
  const done=()=>{clearPaint();finishing=false;if(ended||failed)return;const next=decision();if(next){if(next!=='recovery')paint(1);reveal(next);}};
  paintTimer=win.setTimeout(done,100);
  if(!doc.hidden&&win.requestAnimationFrame)frame=win.requestAnimationFrame(()=>{frame=win.requestAnimationFrame(done);});
 }
 function paint(value){progress=Math.max(progress,Math.min(1,Number(value)||0));const n=Math.round(progress*100);fill.style.width=n+'%';percent.textContent=n+'%';track.setAttribute('aria-valuenow',String(n));}
 function showRecovery(){if(ended)return;panel.dataset.parkOpening=failed?'error':'slow';submit.hidden=false;message.hidden=false;submit.style.display='block';message.style.display='block';panel.inert=false;}
 function decision(){
  const entry=win[Symbol.for('67park.entry.v1')]?.value;
  const wardrobe=doc.querySelector('.wardrobe'),modelStatus=wardrobe?.querySelector('.wardrobe-model-status');
  const entering=!!doc.querySelector('.wardrobe-returning,.studio-cancel');
  const previewReady=Number.isFinite(entry?.milestones?.wardrobeReady)&&!!wardrobe?.querySelector('canvas.wardrobe-avatar[data-character-base]')&&!modelStatus;
  const nameError=wardrobe?.querySelector('.wardrobe-name-error[role="alert"]');
  const recovery=!!(modelStatus?.querySelector('button')||nameError?.textContent?.trim()||wardrobe?.querySelector('[data-entry-status="error"],[data-return-entry="error"],[data-return-entry="timeout"]'));
  const playable=entry?.status==='ready'&&doc.documentElement.dataset.gameplayAvatarState==='ready';
  paint(Math.min(.99,Number(entry?.progress)||0));
  return openingDecision({scripts,intent,settled,wardrobe:!!wardrobe,previewReady,recovery,entering,playable});
 }
 function update(){
  if(ended||failed||finishing)return;
  const phase=decision();if(phase)finish();
 }
 function pagehide(event){if(!event.persisted)stop();}
 const controller={doc,managed:true,ready,
  setIntent(value){if(ended||failed)return;intent=value==='returning'?'returning':'selection';settled=intent==='selection';update();},
  autoEntrySettled(result){if(ended||failed)return;settled=true;if(result==='selection'||result==='recovery')intent='selection';/* The successful returning path cannot reveal a stale Studio render. */},
  entryFailed(error){if(!ended&&!failed)rejectReady(error);},
  scriptsReady(){scripts=true;update();},
  showRecovery,
  fail(){if(ended)return;failed=true;clearPaint();finishing=false;showRecovery();win.clearInterval(timer);},
  cancel(){stop();},
 };
 win[ACCESS_OPENING_KEY]=controller;
 timer=win.setInterval(update,50);doc.addEventListener('visibilitychange',update);win.addEventListener('pageshow',update);win.addEventListener('pagehide',pagehide);
 update();return controller;
}
