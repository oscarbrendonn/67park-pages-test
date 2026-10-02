// A small, optional park guide. It never takes over movement or activates a
// gameplay button. The ordinary HUD remains usable around this non-modal card.
export const GUIDE_KEY='67park.first-visit-guide.v1';
export const GUIDE_STEPS=Object.freeze([
 {id:'move',title:'Make yourself at home',text:'Drag the left joystick to move. On a keyboard, use WASD or the arrow keys.',selector:'.park-stick'},
 {id:'camera',title:'Look around',text:'Drag an empty area to look around. Pinch with two fingers or use the mouse wheel to zoom.'},
 {id:'interact',title:'Try something nearby',text:'Go near a car, pet, shop or ride. Use Interact or E; the nearby hint tells you what will happen.',selector:'.park-action[data-party-icon="interact"]'},
 {id:'map',title:'Find your way',text:'Bird’s-eye view shows the park and players. Use Me to find yourself, or Players in this park to find a friend.',selector:'button[aria-label="Bird’s-eye view"]'},
 {id:'friends',title:'Play together',text:'Open Play & friends to add friends, invite them and choose a mini-game together.',selector:'.online-toggle'},
]);

export function guideAllowed({worldReady=false,avatarReady=false,bodyReady=false,map='city',mounted=false,atHome=false,inRoom=false,blocked=false,hidden=false}={}){
 return !!worldReady&&!!avatarReady&&!!bodyReady&&map==='city'&&!mounted&&!atHome&&!inRoom&&!blocked&&!hidden;
}

export function createGuideMemory({read=()=>null,write=()=>{},sessionRead=()=>null,sessionWrite=()=>{},memo={}}={}){
 let persistent=true,seen=!!memo.seen;
 try{seen||=read(GUIDE_KEY)==='seen';}catch{persistent=false;}
 try{seen||=sessionRead(GUIDE_KEY)==='seen';}catch{}
 return {
  seen:()=>seen,
  persistent:()=>persistent,
  markSeen(){
   seen=true;memo.seen=true;
   try{write(GUIDE_KEY,'seen');persistent=read(GUIDE_KEY)==='seen';}catch{persistent=false;}
   try{sessionWrite(GUIDE_KEY,'seen');}catch{}
   return persistent;
  }
 };
}

const INSTALL_KEY=Symbol.for('67park.first-visit-guide');
const MEMO_KEY=Symbol.for('67park.first-visit-guide-memory');
const blockers='.wardrobe,.return-entry,dialog[open],#party-settings:not([hidden]),.park-inventory-panel,.park-shop-panel,.claude-emote-panel,.park-map-directory-panel,.park-chat input:focus,.park-chat textarea:focus';
function isVisible(host,element){
 if(!element||element.hidden||!element.getClientRects().length)return false;
 const style=host.getComputedStyle(element);return style.visibility!=='hidden'&&style.display!=='none'&&style.opacity!=='0';
}

export function readGuideAvailability(host=window){
 const doc=host.document;
 let mounted=false,atHome=false,map=null;
 try{mounted=!!host.__candy?.state?.().mounted;atHome=!!host.__parkHousing?.debug?.().visit;map=host.__party?.status?.().map??null;}catch{}
 return guideAllowed({worldReady:host.__islandWorld?.ready,avatarReady:doc.documentElement.dataset.gameplayAvatarState==='ready',
  bodyReady:!!host.__eggyInput?.playerRef?.body,map,mounted,atHome,inRoom:!!host.__candyOnline?.data?.room,hidden:doc.hidden,
  blocked:[...doc.querySelectorAll(blockers)].some(el=>isVisible(host,el))});
}

export function installFirstVisitGuide({host=window,available=()=>readGuideAvailability(host),memory,delay=1500}={}){
 if(host[INSTALL_KEY])return host[INSTALL_KEY];
 const doc=host.document;
 memory??=createGuideMemory({memo:host[MEMO_KEY]??=( {} ),read:k=>host.localStorage.getItem(k),write:(k,v)=>host.localStorage.setItem(k,v),sessionRead:k=>host.sessionStorage.getItem(k),sessionWrite:(k,v)=>host.sessionStorage.setItem(k,v)});
 const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./first-visit-guide.css?v=park-fundamentals-20261002-1',import.meta.url).href;doc.head.append(sheet);
 const card=doc.createElement('section');card.className='park-first-guide';card.hidden=true;card.setAttribute('role','region');card.setAttribute('aria-label','Getting started guide');
 card.innerHTML='<header><div><span class="park-guide-progress"></span><h2></h2></div><button type="button" class="park-guide-close" aria-label="Close guide">×</button></header><div class="park-guide-copy" aria-live="polite" aria-atomic="true"><p class="park-guide-text"></p><p class="park-guide-storage" hidden>This guide can only be remembered for this visit.</p></div><footer><button type="button" data-guide="skip">Skip guide</button><button type="button" data-guide="next">Next</button></footer><p class="park-guide-replay">Replay anytime in Settings → Help.</p>';
 const ring=doc.createElement('div');ring.className='park-guide-spotlight';ring.hidden=true;ring.setAttribute('aria-hidden','true');doc.body.append(ring,card);
 const progress=card.querySelector('.park-guide-progress'),title=card.querySelector('h2'),copy=card.querySelector('.park-guide-text'),next=card.querySelector('[data-guide=next]'),skip=card.querySelector('[data-guide=skip]');
 let active=false,pending=!memory.seen(),replay=false,index=0,readyAt=0,timer=null,disposed=false,previousFocus=null;
 const now=()=>host.performance?.now?.()??Date.now();
 const release=()=>host.dispatchEvent(new host.Event('park:release-controls'));
 const schedule=()=>{if(!disposed&&timer===null&&(active||pending))timer=host.setTimeout(()=>{timer=null;tick();},400);};
 const place=()=>{
  if(card.hidden)return;
  const box=card.getBoundingClientRect(),overlaps=r=>r.right>box.left&&r.left<box.right;
  let top=12,bottom=host.innerHeight-12;
  for(const el of doc.querySelectorAll('.park-toolbar button,#party-settings-btn,#park-home-button,.online-toggle,.park-weather,.park-hud>div.absolute.right-4.top-4>button')){
   if(!isVisible(host,el))continue;const r=el.getBoundingClientRect();if(overlaps(r)&&r.top<host.innerHeight*.55)top=Math.max(top,r.bottom+8);
  }
  for(const el of doc.querySelectorAll('.park-action,#preview-hit,#party-throw,.park-stick,.park-chat')){
   if(!isVisible(host,el))continue;const r=el.getBoundingClientRect();if(overlaps(r)&&r.top>top)bottom=Math.min(bottom,r.top-8);
  }
  const gap=Math.max(110,bottom-top);card.style.maxHeight=`${gap}px`;card.dataset.compact=String(gap<200);
  const height=card.getBoundingClientRect().height;card.style.top=`${Math.max(top,Math.min((host.innerHeight-height)/2,bottom-height))}px`;
 };
 const spotlight=()=>{
  place();
  const selector=GUIDE_STEPS[index].selector,target=selector?doc.querySelector(selector):null;
  if(card.hidden||!isVisible(host,target)){ring.hidden=true;return;}
  const r=target.getBoundingClientRect(),box=card.getBoundingClientRect();
  // Never draw a misleading highlight behind the explanation card or outside
  // the viewport. There is no cloned/fake control and the ring takes no input.
  if(r.left<0||r.top<0||r.right>host.innerWidth||r.bottom>host.innerHeight||(r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom)){ring.hidden=true;return;}
  ring.style.left=`${r.left-4}px`;ring.style.top=`${r.top-4}px`;ring.style.width=`${r.width+8}px`;ring.style.height=`${r.height+8}px`;ring.hidden=false;
 };
 const paint=()=>{const step=GUIDE_STEPS[index];card.dataset.step=step.id;progress.textContent=`QUICK TOUR · ${index+1} / ${GUIDE_STEPS.length}`;title.textContent=step.title;copy.textContent=step.text;next.textContent=index===GUIDE_STEPS.length-1?'Let’s play':'Next';skip.hidden=index===GUIDE_STEPS.length-1;card.querySelector('.park-guide-storage').hidden=memory.persistent();spotlight();};
 const hide=()=>{card.hidden=true;ring.hidden=true;};
 const close=()=>{
  const ownedFocus=card.contains(doc.activeElement);active=pending=replay=false;readyAt=0;memory.markSeen();hide();
  if(timer!==null){host.clearTimeout(timer);timer=null;}
  if(ownedFocus&&isVisible(host,previousFocus))previousFocus.focus({preventScroll:true});
 };
 function tick(){
  if(disposed)return;
  let allowed=false;try{allowed=available();}catch{}
  if(!allowed){readyAt=0;hide();schedule();return;}
  if(pending){
   if(!readyAt)readyAt=now();
   if(now()-readyAt<(replay?0:delay)){schedule();return;}
   pending=false;active=true;index=0;previousFocus=doc.activeElement;memory.markSeen();card.hidden=false;paint();
   if(replay){release();next.focus({preventScroll:true});}
  }else if(active){card.hidden=false;spotlight();}
  schedule();
 }
 const replayGuide=()=>{if(disposed)return;release();active=false;pending=true;replay=true;readyAt=0;hide();tick();};
 const keydown=e=>{
  if(card.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
  if(card.contains(e.target))e.stopImmediatePropagation();
 };
 const keyup=e=>{if(!card.hidden&&card.contains(e.target))e.stopImmediatePropagation();};
 card.querySelector('.park-guide-close').addEventListener('click',close);skip.addEventListener('click',close);
 next.addEventListener('click',()=>{if(index===GUIDE_STEPS.length-1){close();return;}index++;paint();});
 card.addEventListener('focusin',release);
 for(const event of ['pointerdown','pointerup','touchstart','touchmove','touchend','wheel'])card.addEventListener(event,e=>e.stopPropagation(),{passive:true});
 host.addEventListener('park:guide-replay',replayGuide);host.addEventListener('keydown',keydown,true);host.addEventListener('keyup',keyup,true);
 const api={replay:replayGuide,close,refresh:tick,status:()=>({active,pending,visible:!card.hidden,step:GUIDE_STEPS[index].id,seen:memory.seen()}),dispose(){disposed=true;if(timer!==null)host.clearTimeout(timer);hide();card.remove();ring.remove();sheet.remove();host.removeEventListener('park:guide-replay',replayGuide);host.removeEventListener('keydown',keydown,true);host.removeEventListener('keyup',keyup,true);delete host[INSTALL_KEY];}};
 host[INSTALL_KEY]=api;tick();return api;
}
