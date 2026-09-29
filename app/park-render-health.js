// Local-only evidence for intermittent phone graphics stalls. No chat content,
// network transmission, restart loop, or swallowed gameplay exception.
export function installParkRenderHealth({canvas,renderer,ready,mode,recover=()=>{},win=window,doc=document,now=()=>performance.now()}) {
 let previous=-1,lastAdvance=now(),lost=false,lastError='',panel=null,lastReport='',attempts=0,attemptWindow=now();
 const resume=()=>{if(lost||doc.hidden||!ready())return;try{recover();win.dispatchEvent?.(new Event('park:release-controls'));}catch(e){lastError=String(e.message).slice(0,240);}};
 const record=code=>{
  let house=null;try{const h=win.__parkHousing?.debug();if(h)house={visit:h.visit,failed:h.failed,pending:h.pending?.action||null}}catch{}
  const data={version:'home-stability-1',code,mode:mode(),frames:renderer.info.render.frame,
   house,programs:renderer.info.programs?.length||0,
   contextLost:lost||renderer.getContext().isContextLost(),error:lastError,
   viewport:{width:win.innerWidth,height:win.innerHeight,scale:win.visualViewport?.scale||1}};
  const key=code+':'+data.frames;if(key===lastReport)return;lastReport=key;
  try{win.localStorage.setItem('67park:render-report',JSON.stringify(data))}catch{}
  if(!panel){panel=doc.createElement('output');panel.id='park-render-report';panel.setAttribute('role','status');
   panel.style.cssText='position:fixed;z-index:10020;left:12px;right:12px;bottom:12px;max-width:430px;padding:12px 16px;border:1px solid #ddc5b3;border-radius:16px;background:#fff8ee;color:#473b35;font:600 13px/1.4 system-ui;pointer-events:auto';doc.body.append(panel)}
  panel.hidden=false;panel.dataset.report=JSON.stringify(data);
  panel.textContent='Graphics paused · '+code+'. Your saved character is kept. ';
  const retry=doc.createElement('button');retry.type='button';retry.textContent='Try resume';retry.onclick=resume;retry.style.cssText='min-height:44px;margin:4px;padding:8px 12px;border-radius:12px';
  const reload=doc.createElement('button');reload.type='button';reload.textContent='Reconnect & reload';reload.onclick=()=>win.location?.reload();reload.style.cssText=retry.style.cssText;panel.append?.(retry,reload);
  if(now()-attemptWindow>60000){attempts=0;attemptWindow=now();}
  if(!lost&&attempts<2){attempts++;resume();}
 };
 const error=e=>{lastError=String(e.message||e.reason?.message||e.reason||'Unknown error').slice(0,240)};
 const onLost=e=>{e?.preventDefault?.();lost=true;record('G33-CONTEXT')};
 const onRestored=()=>{lost=false;lastAdvance=now();lastReport='';if(panel)panel.hidden=true;resume();};
 const reset=()=>{lastAdvance=now()};
 const check=()=>{
  const frame=renderer.info.render.frame;
  if(doc.hidden||!ready()){previous=frame;lastAdvance=now();if(panel)panel.hidden=true;return}
  if(frame!==previous&&!lost){previous=frame;lastAdvance=now();lastReport='';if(panel)panel.hidden=true;return}
  if(now()-lastAdvance>5000)record(lost?'G33-CONTEXT':mode()==='never'?'G33-PAUSED':lastError?'G33-SCRIPT':'G33-RENDER');
 };
 canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 win.addEventListener('error',error);win.addEventListener('unhandledrejection',error);
 doc.addEventListener('visibilitychange',reset);
 const timer=win.setInterval(check,1000);
 return()=>{win.clearInterval(timer);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);win.removeEventListener('error',error);win.removeEventListener('unhandledrejection',error);doc.removeEventListener('visibilitychange',reset);panel?.remove()};
}
