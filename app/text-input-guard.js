import {settingsOpen} from './player-settings.js';
// Text entry owns keys and pointer gestures, without switching camera modes.
export function isTextEntry(target = globalThis.document?.activeElement) {
 return settingsOpen() || !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
  target.tagName === 'SELECT' || target.isContentEditable === true ||
  !!target.closest?.('[contenteditable="true"],[contenteditable=""]'));
}
export function ignoreGameKey(event) {
 return !!event.defaultPrevented || isTextEntry(event.target) || isTextEntry();
}
export function stopChatKey(event) { event.stopPropagation(); }
export function releaseGameControls() {
 globalThis.window?.dispatchEvent(new Event('park:release-controls'));
}
let finishPrevious=null;
export function focusChatInput(input) {
 if(!input)return;
 finishPrevious?.();
 const win=globalThis.window,doc=input.ownerDocument||globalThis.document;
 const viewport=win?.visualViewport,container=input.closest?.('.park-chat');
 const meta=doc?.querySelector('meta[name="viewport"]');
 const original=meta?.getAttribute('content');
 const scale=viewport?.scale||1,scrollX=win?.scrollX||0,scrollY=win?.scrollY||0;
 const ios=/iPhone|iPad|iPod/.test(globalThis.navigator?.userAgent||'')||
  (globalThis.navigator?.platform==='MacIntel'&&globalThis.navigator?.maxTouchPoints>1);
 let closed=false,timer=null,restored=false;
 // Apply before focus, independently of asynchronously loaded stylesheet order.
 input.style.fontSize='18px';
 releaseGameControls();
 // iOS uses this cap for automatic focus magnification. Never set user-scalable=no,
 // and restore the author's viewport after the keyboard transition.
 if(ios&&meta){
  const parts=(original||'width=device-width,initial-scale=1').split(',').filter(p=>!/^\s*maximum-scale\s*=/i.test(p));
  meta.setAttribute('content',parts.concat('maximum-scale='+Math.max(1,scale)).join(','));
 }
 const layout=()=>{
  releaseGameControls();
  if(!container||!viewport||!win.matchMedia?.('(pointer:coarse),(max-width:650px)').matches)return;
  const height=Math.max(80,viewport.height),top=(viewport.offsetTop||0)+Math.min(144,Math.max(8,height-112));
  container.dataset.chatKeyboard='true';
  container.style.setProperty('--chat-keyboard-top',top+'px');
  container.style.setProperty('--chat-keyboard-room',Math.max(0,height-(top-(viewport.offsetTop||0))-68)+'px');
 };
 const restore=()=>{
  if(restored)return;restored=true;clearTimeout(timer);
  if(ios&&meta){if(original===null)meta.removeAttribute('content');else meta.setAttribute('content',original);}
  // Restore only keyboard-induced page panning from an initially unzoomed view.
  if(scale===1&&(viewport?.scale||1)===1&&!isTextEntry(doc?.activeElement))win?.scrollTo?.({left:scrollX,top:scrollY,behavior:'instant'});
  if(finishPrevious===restore)finishPrevious=null;
 };
 const close=()=>{
  if(closed)return;closed=true;releaseGameControls();
  viewport?.removeEventListener('resize',layout);viewport?.removeEventListener('scroll',layout);
  input.removeEventListener('blur',close);
  if(container){delete container.dataset.chatKeyboard;container.style.removeProperty('--chat-keyboard-top');container.style.removeProperty('--chat-keyboard-room');}
  timer=setTimeout(restore,300);finishPrevious=restore;
 };
 input.addEventListener('blur',close);
 viewport?.addEventListener('resize',layout);viewport?.addEventListener('scroll',layout);
 layout();input.focus({preventScroll:true});
 return close;
}
