import {steeringFromDrag} from '../app/control-tuning.js?v=camera-36';
export function bindRallyTouch(get, held, notify) {
 const names=['left','right','gas','brake'];
 const buttons=Object.fromEntries(names.map(n=>[n,get('rr-'+n)]));
 const pointers=new Map(),keys=new Set();
 function sync(){
  held.clear();for(const n of keys)held.add(n);for(const p of pointers.values())held.add(p.action);
  for(const n of names)buttons[n].setAttribute('aria-pressed',String(held.has(n)));
  notify();
 }
 for(const name of names){
  const el=buttons[name];
  el.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   e.preventDefault();pointers.set(e.pointerId,{action:name,owner:el});
   try{el.setPointerCapture(e.pointerId)}catch{}
   sync();
  });
  el.addEventListener('pointermove',e=>{
   const p=pointers.get(e.pointerId);if(!p||p.owner!==el||!['left','right'].includes(p.action))return;
   e.preventDefault();
   const left=buttons.left.getBoundingClientRect(),right=buttons.right.getBoundingClientRect();
   // Keep the held direction outside the pad; allow a thumb to slide across its centre.
   if(e.clientY<left.top-20||e.clientY>left.bottom+20||e.clientX<left.left-20||e.clientX>right.right+20)return;
   const next=e.clientX<(left.right+right.left)/2?'left':'right';
   if(p.action!==next){p.action=next;sync()}
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{
   if(pointers.get(e.pointerId)?.owner!==el)return;
   pointers.delete(e.pointerId);sync();
  });
  el.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();keys.add(name);sync()}});
  el.addEventListener('keyup',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();keys.delete(name);sync()}});
  el.addEventListener('blur',()=>{if(keys.delete(name))sync()});
  el.addEventListener('contextmenu',e=>e.preventDefault());
 }
 const wheel=get('rr-wheel'),knob=wheel.querySelector('span');
 let owner=null,startX=0,analog=0;
 const paint=()=>{knob.style.transform=`translateX(${-analog*38}px)`;wheel.setAttribute('aria-valuenow',String(Math.round(-analog*100)));notify();};
 wheel.addEventListener('pointerdown',e=>{
  if(owner!==null||e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();owner=e.pointerId;startX=e.clientX;analog=0;
  try{wheel.setPointerCapture(owner)}catch{}
  paint();
 });
 wheel.addEventListener('pointermove',e=>{
  if(owner!==e.pointerId)return;e.preventDefault();analog=-steeringFromDrag(e.clientX,startX);paint();
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])wheel.addEventListener(name,e=>{
  if(owner!==e.pointerId)return;owner=null;analog=0;paint();
 });
 wheel.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home'].includes(e.code))return;
  e.preventDefault();e.stopPropagation();analog=e.code==='ArrowLeft'?1:e.code==='ArrowRight'?-1:0;paint();
 });
 wheel.addEventListener('keyup',e=>{
  if(!['ArrowLeft','ArrowRight','Home'].includes(e.code))return;e.stopPropagation();analog=0;paint();
 });
 wheel.addEventListener('blur',()=>{if(owner===null){analog=0;paint();}});
 wheel.addEventListener('contextmenu',e=>e.preventDefault());
 return {steer:()=>analog,reset(){
  const id=owner;owner=null;analog=0;
  try{if(id!==null&&wheel.hasPointerCapture?.(id))wheel.releasePointerCapture(id)}catch{}
  pointers.clear();keys.clear();sync();paint();
 }};
}
