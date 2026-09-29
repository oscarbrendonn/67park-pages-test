import {bindHeldAction,bindMinigameLook} from '../app/minigame-input.js?v=controls-37';
import {isTextEntry} from '../app/text-input-guard.js?v=mobile-29';

export function createPlayerInput(){
  const keys=new Set(),base=document.getElementById('stick-base'),knob=document.getElementById('stick-knob');
  const blocked=()=>isTextEntry()||document.body.matches('.entry-open,.modal-open,.show67-overlay-open');
  const jump=bindHeldAction(document.getElementById('btn-jump'),()=>{},blocked);
  const dash=bindHeldAction(document.getElementById('btn-grab'),()=>{},blocked);
  const sprint=bindHeldAction(document.getElementById('btn-sprint'),()=>{},blocked);
  const touch=()=>navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches||innerWidth<=700;
  document.body.classList.toggle('touch',touch());
  addEventListener('resize',()=>document.body.classList.toggle('touch',touch()));
  let owner=null,x=0,y=0,startX=0,startY=0,wasDash=false,look=null;
  const move=e=>{
    if(e.pointerId!==owner)return;
    const dx=e.clientX-startX,dy=e.clientY-startY,n=Math.max(44,Math.hypot(dx,dy));
    x=dx/n;y=dy/n;knob.style.transform=`translate(${x*38}px,${y*38}px)`;e.preventDefault();
  };
  base.addEventListener('pointerdown',e=>{
    if(blocked()||owner!==null||e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();owner=e.pointerId;startX=e.clientX;startY=e.clientY;
    try{base.setPointerCapture(owner);}catch{}
    move(e);
  });
  base.addEventListener('pointermove',move);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])base.addEventListener(name,e=>{
    if(e.pointerId!==owner)return;owner=null;x=y=0;knob.style.transform='';
  });
  addEventListener('keydown',e=>{
    if(blocked()||e.defaultPrevented||['Space','Enter'].includes(e.code)&&e.target?.closest?.('button,a'))return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);
  });
  addEventListener('keyup',e=>keys.delete(e.code));
  function reset(){
    keys.clear();const id=owner;owner=null;x=y=0;wasDash=false;knob.style.transform='';
    try{if(id!==null&&base.hasPointerCapture?.(id))base.releasePointerCapture(id);}catch{}
    jump.reset();dash.reset();sprint.reset();look?.reset();
  }
  addEventListener('park:release-controls',reset);addEventListener('blur',reset);addEventListener('pagehide',reset);addEventListener('orientationchange',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {resetTransient:reset,isTouchDevice:touch(),poll(){
    // The renderer canvas is created after the input controller in both entries.
    if(!look){const canvas=document.querySelector('canvas');if(canvas)look=bindMinigameLook(canvas,()=>!blocked());}
    if(blocked()){reset();return {mx:0,my:0,moving:false,jumpHeld:false,sprintHeld:false,grabPressed:false,lookYaw:0,lookPitch:0,looking:false};}
    let mx=x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    let my=y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    let jumping=jump.consume()||keys.has('Space'),dashing=dash.consume()||keys.has('KeyE')||keys.has('KeyF');
    let running=sprint.consume()||keys.has('ShiftLeft')||keys.has('ShiftRight');
    const camera=look?.poll()||{lookYaw:0,lookPitch:0,looking:false};
    for(const pad of navigator.getGamepads?.()||[]){
      if(!pad?.connected)continue;
      if(Math.hypot(pad.axes[0]||0,pad.axes[1]||0)>.18){mx+=pad.axes[0]||0;my+=pad.axes[1]||0;}
      jumping||=!!pad.buttons[0]?.pressed;dashing||=!!pad.buttons[1]?.pressed;running||=!!pad.buttons[5]?.pressed;
      if(Math.hypot(pad.axes[2]||0,pad.axes[3]||0)>.2){camera.lookYaw-=(pad.axes[2]||0)*.045;camera.lookPitch-=(pad.axes[3]||0)*.032;camera.looking=true;}
      break;
    }
    const length=Math.hypot(mx,my),normal=Math.max(1,length),pressed=dashing&&!wasDash;wasDash=dashing;
    return {mx:mx/normal,my:my/normal,moving:length>.12,jumpHeld:jumping,sprintHeld:running,grabPressed:pressed,...camera};
  }};
}
