// Capture only a mounted rider's canvas drag, never HUD buttons or other rides.
let movementAxis=0;
export const setSwingMovement=value=>{movementAxis=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;};
export const swingMovement=()=>movementAxis;
export function createSwingPushInput({target=globalThis.window,active,send,movement=()=>0,now=()=>performance.now()}){
 let gesture=null,lastPump=-Infinity,suspended=false;const keys=new Set();
 const reset=()=>{gesture=null;lastPump=-Infinity;keys.clear();movementAxis=0;};
 const step=()=>{
  if(!active()||suspended){reset();return;}
  const z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)||movement();
  if(!Number.isFinite(z)||Math.abs(z)<.25){lastPump=-Infinity;return;}
  const time=now();if(time-lastPump>=250){lastPump=time;send();}
 };
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function down(e){if(!active()||e.isPrimary===false||(e.button??0)!==0)return;suspended=false;if(e.target?.tagName!=='CANVAS')return;gesture={id:e.pointerId,y:e.clientY};consume(e);}
 function move(e){if(!gesture||gesture.id!==e.pointerId)return;if(!active()){reset();return;}consume(e);const delta=gesture.y-e.clientY;if(delta>=32){gesture.y=e.clientY;send();}else if(delta<0)gesture.y=e.clientY;}
 function up(e){if(gesture?.id!==e.pointerId)return;consume(e);reset();}
 const pause=()=>{suspended=true;reset();},resume=()=>{suspended=false;reset();};
 const keydown=e=>{if(!active()||!['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code)||e.target?.closest?.('input,textarea,select,[contenteditable="true"],dialog')||target?.document?.querySelector('dialog[open]'))return;suspended=false;keys.add(e.code);consume(e);};
 const keyup=e=>{keys.delete(e.code);};
 const rows=[['keydown',keydown],['keyup',keyup],['park:release-controls',reset],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['blur',pause],['pagehide',pause],['focus',resume],['pageshow',resume],['visibilitychange',()=>{suspended=!!target?.document?.hidden;reset();}]];
 for(const [type,fn]of rows)target?.addEventListener(type,fn,{capture:true,passive:false});
 // Mounted rides skip the walking controller's partyStep. Poll this shared
 // input independently; server still owns motion and enforces the rate cap.
 const timer=target?.setInterval?.(step,80);
 timer?.unref?.();
 return {step,reset,dispose(){if(timer!==undefined)target?.clearInterval?.(timer);for(const [type,fn]of rows)target?.removeEventListener(type,fn,true);reset();}};
}
