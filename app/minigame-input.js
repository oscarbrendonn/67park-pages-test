import {cameraLookDelta} from './control-tuning.js?v=camera-36';
import {beginCameraDrag,moveCameraDrag,endCameraDrag} from './camera-pointer.js?v=camera-36';

// A press belongs to one pointer until release, even when the thumb slips out.
export function bindHeldAction(button, changed=()=>{}, blocked=()=>false) {
  let pointer=null, key=false, pending=false, pendingSeen=false, until=0;
  const held=()=>pointer!==null||key;
  const paint=()=>{button.classList.toggle('held',held());button.setAttribute('aria-pressed',String(held()));changed();};
  function reset(){
    const id=pointer;pointer=null;key=false;pending=false;pendingSeen=false;
    try{if(id!==null&&button.hasPointerCapture?.(id))button.releasePointerCapture(id);}catch{}
    paint();
  }
  button.addEventListener('pointerdown',e=>{
    if(blocked()||pointer!==null||e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();pointer=e.pointerId;pending=true;pendingSeen=false;until=performance.now()+100;
    try{button.setPointerCapture(pointer);}catch{}
    paint();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{
    if(pointer!==e.pointerId)return;
    pointer=null;if(name!=='pointerup')pending=false;paint();
  });
  button.addEventListener('keydown',e=>{
    if(!['Space','Enter'].includes(e.code)||blocked())return;
    e.preventDefault();e.stopPropagation();key=true;pending=true;pendingSeen=false;until=performance.now()+100;paint();
  });
  button.addEventListener('keyup',e=>{
    if(!['Space','Enter'].includes(e.code))return;
    e.preventDefault();e.stopPropagation();key=false;paint();
  });
  button.addEventListener('blur',()=>{key=false;paint();});
  button.addEventListener('contextmenu',e=>e.preventDefault());
  // Carry a quick tap over render-only frames/network sends. Even a delayed
  // first frame must observe it once; cancellation/reset still clears it.
  return {held,consume(){if(performance.now()>until&&pendingSeen)pending=false;const active=held()||pending;if(pending)pendingSeen=true;return active;},reset};
}

export function bindMinigameLook(canvas,enabled=()=>true){
  let drag=null,yaw=0,pitch=0,changed=false;
  const end=e=>{drag=endCameraDrag(drag,e);};
  canvas.addEventListener('pointerdown',e=>{if(enabled(e))drag=beginCameraDrag(e,drag);});
  canvas.addEventListener('pointermove',e=>{
    if(!enabled()){end();return;}
    const delta=moveCameraDrag(drag,e);
    if(!delta)return;
    if(delta.ended){end();return;}
    const d=cameraLookDelta(delta,drag.mouse);
    yaw-=d.x;pitch-=d.y;changed=true;e.preventDefault();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const reset=()=>{end();yaw=pitch=0;changed=false;};
  addEventListener('park:release-controls',reset);addEventListener('blur',reset);addEventListener('pagehide',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {reset,poll(){const result={lookYaw:yaw,lookPitch:pitch,looking:!!drag||changed};yaw=pitch=0;changed=false;return result;}};
}
