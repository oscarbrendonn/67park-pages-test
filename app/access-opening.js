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
 // Reuse the approved returning-entry card and measured download detail. The
 // existing Access host and recovery controls remain the event-owning nodes.
 for(const child of card.children)if(child!==logo&&child!==submit&&child!==message){child.hidden=true;child.style.display='none';}
 panel.style.background='var(--park-ui-surface)';
 card.classList.add('return-entry','park-ui-panel');
 card.style.cssText='width:100%;max-width:480px;margin:auto;text-align:center';
 logo.classList.add('return-entry-logo');
 logo.style.cssText='display:block;width:148px;height:48px;max-width:100%;margin:0 auto 24px;object-fit:contain';
 const title=make('h1','','Opening the park');
 const stage=make('p','return-entry-stage','Opening the park');stage.setAttribute('role','status');stage.setAttribute('aria-live','polite');
 const track=make('progress','');track.max=1;track.value=0;track.dataset.parkOpeningAnchor='';track.dataset.parkOpeningProgress='';track.setAttribute('aria-label','Park preparation progress');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
 const percent=make('p','return-entry-detail','0% · Preparing your park');percent.dataset.parkOpeningPercent='';
 card.insertBefore(title,message);card.insertBefore(stage,message);card.insertBefore(track,message);card.insertBefore(percent,message);
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
 function paint(value,entry=win[Symbol.for('67park.entry.v1')]?.value){
  progress=Math.max(progress,Math.min(1,Number(value)||0));const n=Math.round(progress*100);track.value=progress;track.setAttribute('aria-valuenow',String(n));
  stage.textContent=entry?.stage||'Opening the park';
  const total=Number(entry?.downloadTotal),bytes=Math.min(total,Math.max(0,Number(entry?.downloadBytes)||0));
  const detail=Number.isFinite(total)&&total>0?'Map files: '+(bytes/1048576).toFixed(1)+' / '+(total/1048576).toFixed(1)+' MiB':'Preparing your park';
  percent.textContent=n+'% · '+detail;
 }
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
