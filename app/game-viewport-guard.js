// The game owns touch gestures even on loading screens, margins and inputs.
// Keep propagation intact: game camera/joystick Pointer Events still flow.
export function installGameViewportGuard(doc = document, win = window) {
 const nav=win.navigator;
 const ios=!!nav&&(/iPad|iPhone|iPod/.test(nav.userAgent||'')||
  (/Macintosh/.test(nav.userAgent||'')&&nav.maxTouchPoints>1));
 let viewport=null,originalViewport=null,lockedViewport=null,restoreTimer=null;
 const isNameField=target=>target?.id==='wardrobe-name'||target?.id==='studio-player-name';
 const restoreViewport=()=>{
  if(restoreTimer!==null){win.clearTimeout(restoreTimer);restoreTimer=null;}
  if(viewport&&viewport.getAttribute('content')===lockedViewport){
   if(originalViewport===null)viewport.removeAttribute('content');
   else viewport.setAttribute('content',originalViewport);
  }
  viewport=null;originalViewport=null;lockedViewport=null;
 };
 // Install before the trusted tap focuses the field. This limits Safari's
 // input auto-zoom, not the game's camera. Restore the exact author viewport
 // after editing; Android/desktop and already user-zoomed pages are untouched.
 const prepareNameFocus=event=>{
  if(!ios||!isNameField(event.target))return;
  if(viewport){finishNameFocus(event);return;}
  if((win.visualViewport?.scale||1)>1.01)return;
  const meta=doc.querySelector('meta[name="viewport"]');if(!meta)return;
  viewport=meta;originalViewport=meta.getAttribute('content');
  lockedViewport=(originalViewport||'width=device-width,initial-scale=1')
   .split(',').map(part=>part.trim()).filter(part=>!/^maximum-scale\s*=/i.test(part)).concat('maximum-scale=1').join(',');
  meta.setAttribute('content',lockedViewport);
  finishNameFocus(event); // Also release if a cancelled tap never focuses.
 };
 const finishNameFocus=event=>{
  if(!isNameField(event.target)||!viewport)return;
  if(restoreTimer!==null)win.clearTimeout(restoreTimer);
  restoreTimer=win.setTimeout(()=>{
   restoreTimer=null;
   if(!isNameField(doc.activeElement))restoreViewport();
  },300);
 };
 const focusOptions={capture:true,passive:true};
 if(ios){
  for(const type of ['pointerdown','touchstart','focusin'])doc.addEventListener(type,prepareNameFocus,focusOptions);
  doc.addEventListener('focusout',finishNameFocus,focusOptions);
  win.addEventListener('pagehide',restoreViewport);
 }
 const prevent = event => { if (event.cancelable) event.preventDefault(); };
 const touch = event => {
  // Keep single-finger scrolling, selection and input focus native.
  if (event.touches?.length > 1) prevent(event);
 };
 const options = {capture:true, passive:false};
 const touchTypes = ['touchstart','touchmove'];
 const gestureTypes = ['gesturestart','gesturechange','gestureend'];
 for (const type of touchTypes) doc.addEventListener(type,touch,options);
 // Safari can emit gestures without a matching TouchEvent target.
 for (const type of gestureTypes) doc.addEventListener(type,prevent,options);
 return () => {
  if(ios){
   for(const type of ['pointerdown','touchstart','focusin'])doc.removeEventListener(type,prepareNameFocus,focusOptions);
   doc.removeEventListener('focusout',finishNameFocus,focusOptions);
   win.removeEventListener('pagehide',restoreViewport);
  }
  restoreViewport();
  for (const type of touchTypes) doc.removeEventListener(type,touch,options);
  for (const type of gestureTypes) doc.removeEventListener(type,prevent,options);
 };
}
if (typeof document !== 'undefined') installGameViewportGuard();
