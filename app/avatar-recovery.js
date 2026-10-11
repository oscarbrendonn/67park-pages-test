// A current avatar can fail after the park has opened. Keep that scene and
// selection in place, with explicit recovery instead of reopening the chooser.
export function holdAvatarInputGate(gate){
 const descriptor=gate&&Object.getOwnPropertyDescriptor(gate,'blocked');
 if(!descriptor||!descriptor.configurable||!descriptor.writable||typeof descriptor.value!=='boolean')return null;
 let desired=descriptor.value,released=false;
 const get=()=>true,set=value=>{desired=value;};
 Object.defineProperty(gate,'blocked',{configurable:true,enumerable:descriptor.enumerable,get,set});
 return()=>{if(released)return;released=true;const current=Object.getOwnPropertyDescriptor(gate,'blocked');if(current?.get===get&&current?.set===set)Object.defineProperty(gate,'blocked',{...descriptor,value:desired});};
}
export function createAvatarRecovery({snapshot,retry,uiGate,input,canShow,
 documentRef=globalThis.document,windowRef=globalThis}={}){
 let panel=null,retryButton=null,label=null,active=false,previousFocus=null,reloading=false,releaseGate=null;
 const releaseControls=()=>{
  if(input){input.x=0;input.z=0;input.jumpQueued=false;input.sitQueued=false;input.run=false;}
  windowRef.dispatchEvent?.(new Event('park:release-controls'));
 };
 // Installed with the runtime, before profile/settings React effects. Those
 // dialogs must not consume Escape/Tab intended for this later modal owner.
 const guardKey=event=>{
  if(!active)return;event.stopImmediatePropagation();
  if(event.key==='Escape'){event.preventDefault();return;}
  if(event.key==='Tab'){
   event.preventDefault();if(event.type!=='keydown')return;
   const buttons=[...panel.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(documentRef.activeElement);
   buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus({preventScroll:true});return;
  }
  if(!panel.contains(event.target)||!['Enter',' ','Spacebar'].includes(event.key))event.preventDefault();
 };
 windowRef.addEventListener?.('keydown',guardKey,true);windowRef.addEventListener?.('keyup',guardKey,true);
 const canRecover=()=>canShow?canShow():!!windowRef.__islandWorld?.ready&&documentRef?.documentElement?.dataset?.parkAccess==='open'&&!documentRef.querySelector('.wardrobe');
 function close(){
  if(!active)return;active=false;
  panel?.close?.();panel?.remove();panel=null;retryButton=null;label=null;
  releaseGate?.();releaseGate=null;
  releaseControls();
  if(previousFocus?.isConnected&&!previousFocus.inert)previousFocus.focus?.({preventScroll:true});
  previousFocus=null;reloading=false;
 }
 function update(){
  if(!active)return;
  const state=snapshot();if(state.status==='ready'){close();return;}
  panel.dataset.avatarState=state.status;
  retryButton.disabled=state.status!=='error';
  retryButton.textContent=state.status==='error'?'Retry character':'Preparing character…';
  label.textContent=state.status==='error'?'Your character could not be displayed. Retry here without leaving the park.':'Preparing the same character. If loading does not finish, you can reload the page.';
 }
 function show(){
  if(active){update();return true;}
  if(!documentRef?.body||!canRecover())return false;
  // Classic KeyE listeners predate this module. Hold their existing gate while
  // preserving any concurrent owner's writes, rather than restoring a stale flag.
  try{releaseGate=holdAvatarInputGate(uiGate);}catch{return false;}
  if(!releaseGate)return false;
  active=true;previousFocus=documentRef.activeElement;releaseControls();
  panel=documentRef.createElement('dialog');panel.id='park-avatar-recovery';panel.className='park-ui-panel';
  panel.setAttribute('aria-labelledby','park-avatar-recovery-title');panel.setAttribute('aria-describedby','park-avatar-recovery-message');
  panel.style.cssText='position:fixed;z-index:10060;box-sizing:border-box;width:calc(100% - 24px);max-width:360px;max-height:calc(100dvh - 24px);overflow:auto;padding:20px;margin:auto;';
  const title=documentRef.createElement('h2');title.id='park-avatar-recovery-title';title.textContent='Let’s bring your character back';title.style.cssText='margin:0 0 10px;font-size:19px;line-height:1.25';
  label=documentRef.createElement('p');label.id='park-avatar-recovery-message';label.setAttribute('role','status');label.style.cssText='margin:0 0 16px;font-size:14px;line-height:1.45';
  const actions=documentRef.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  retryButton=documentRef.createElement('button');retryButton.type='button';retryButton.className='park-ui-control';retryButton.style.cssText='flex:1;min-width:130px;padding:10px 12px';
  const reload=documentRef.createElement('button');reload.type='button';reload.className='park-ui-control';reload.textContent='Reload page';reload.style.cssText=retryButton.style.cssText;
  retryButton.onclick=()=>{if(snapshot().status!=='error')return;releaseControls();try{retry();update();}catch{update();label.textContent='Your character could not be retried. Reload to try again; your saved character is kept.';}};
  reload.onclick=()=>{if(reloading)return;reloading=true;releaseControls();windowRef.location?.reload();};
  panel.addEventListener('cancel',event=>event.preventDefault());
  // Button Space/Enter events must not bubble to the world's movement handlers.
  for(const type of ['keydown','keyup','pointerdown','pointerup','click'])panel.addEventListener(type,event=>event.stopPropagation());
  actions.append(retryButton,reload);panel.append(title,label,actions);documentRef.body.append(panel);
  try{panel.showModal();}catch{close();return false;}
  update();retryButton?.focus({preventScroll:true});return true;
 }
 return{show,update,dispose(){close();windowRef.removeEventListener?.('keydown',guardKey,true);windowRef.removeEventListener?.('keyup',guardKey,true);},get active(){return active;}};
}
