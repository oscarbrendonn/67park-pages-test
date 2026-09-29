// One press owns one charge. A second finger, lost capture or interruption must
// never release another finger's shot or leave charging latched.
export function installShotInput({button,charge,release,cancel,clearKeys=()=>{},win=window,doc=document}) {
 let owner=null;
 const editable=node=>!!node?.closest?.('input,textarea,select,[contenteditable]');
 const finish=(commit=false)=>{
  if(!owner)return;
  const old=owner;owner=null;
  try{if(old.pointer!==undefined&&button.hasPointerCapture?.(old.pointer))button.releasePointerCapture(old.pointer)}catch{}
  if(commit)release();else cancel();
 };
 const down=e=>{
  if(owner||button.disabled||(e.button!==undefined&&e.button!==0))return;
  e.preventDefault();owner={pointer:e.pointerId};
  try{button.setPointerCapture(e.pointerId)}catch{owner=null;return}
  charge();
 };
 const up=e=>{if(owner?.pointer===e.pointerId)finish(true)};
 const lost=e=>{if(owner?.pointer===e.pointerId)finish(false)};
 const keydown=e=>{
  if(editable(e.target)||editable(doc.activeElement)||button.disabled)return;
  if(e.code!=='Space'&&!(e.code==='Enter'&&e.target===button))return;
  e.preventDefault();if(e.repeat||owner)return;owner={key:e.code};charge();
 };
 const keyup=e=>{if(owner?.key===e.code){e.preventDefault();finish(true)}};
 const reset=()=>{finish(false);clearKeys()};
 const hidden=()=>{if(doc.hidden)reset()};
 const hooks=[[button,'pointerdown',down],[win,'pointerup',up],[win,'pointercancel',lost],[button,'lostpointercapture',lost],[win,'keydown',keydown],[win,'keyup',keyup],[win,'park:release-controls',reset],[win,'blur',reset],[win,'pagehide',reset],[win,'orientationchange',reset],[doc,'visibilitychange',hidden]];
 for(const [target,type,fn]of hooks)target.addEventListener(type,fn);
 return()=>{reset();for(const[target,type,fn]of hooks)target.removeEventListener(type,fn)};
}
