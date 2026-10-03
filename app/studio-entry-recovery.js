export const STUDIO_ENTRY_SLOW_MS=20000;

// Observe one Enter attempt, not the asset cache or GPU owner. A slow load is
// still allowed to finish normally; only the player chooses to leave/reload.
export function watchStudioEntrySlow(onSlow,{delayMs=STUDIO_ENTRY_SLOW_MS,now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,documentRef=globalThis.document,eventTarget=globalThis}={}){
 const started=now();let stopped=false,timer=null;
 const stop=()=>{stopped=true;if(timer!==null)clearTimer(timer);timer=null;documentRef?.removeEventListener?.('visibilitychange',check);eventTarget?.removeEventListener?.('pageshow',check);};
 function check(){
  if(stopped)return;
  if(timer!==null)clearTimer(timer);timer=null;
  const elapsedMs=Math.max(0,now()-started);
  if(elapsedMs>=delayMs){stop();onSlow({elapsedMs});}
  else timer=setTimer(check,delayMs-elapsedMs);
 }
 documentRef?.addEventListener?.('visibilitychange',check);
 eventTarget?.addEventListener?.('pageshow',check);
 check();return stop;
}

export function studioEntryRecoveryView({busy,error,entry={},avatar={},slow=false}){
 const ready=entry.status==='ready'&&avatar.status==='ready';
 return {visible:!!busy&&!error&&!ready&&slow,
  stage:entry.status==='ready'?'The park is ready. Your character is still preparing.':entry.stage||'Preparing the park and your character.'};
}

export function createStudioEntryRecovery(React,{watch=watchStudioEntrySlow}={}){
 return function StudioEntryRecovery({busy,error,entry={},avatar={},onReload}){
  const [slow,setSlow]=React.useState(false),recovery=React.useRef(null),ready=entry.status==='ready'&&avatar.status==='ready';
  React.useEffect(()=>{
   setSlow(false);
   if(!busy||error||ready)return;
   return watch(()=>setSlow(true));
  },[busy,error,ready,avatar.key,avatar.generation]);
  const view=studioEntryRecoveryView({busy,error,entry,avatar,slow});
  React.useEffect(()=>{
   // The options panel scrolls independently on small screens. Reveal the new
   // message and action once, without stealing focus or following later ticks.
   if(view.visible)recovery.current?.scrollIntoView({behavior:'instant',block:'nearest',inline:'nearest'});
  },[view.visible]);
  if(!view.visible)return null;
  const h=React.createElement;
  return h('section',{ref:recovery,className:'studio-entry-recovery','aria-label':'Character preparation recovery','data-studio-entry':'slow','data-entry-stage':entry.stage||'','data-world-state':entry.status||'loading','data-avatar-state':avatar.status||'loading','data-avatar-generation':avatar.generation},
   h('div',{role:'status','aria-live':'polite'},h('strong',null,'This is taking a little longer'),h('p',null,view.stage),h('p',null,'Loading is still running. You can keep waiting, keep choosing your look, or reload this page.')),
   typeof onReload==='function'&&h('button',{type:'button',className:'studio-reload',onClick:onReload},'Reload page'));
 };
}
