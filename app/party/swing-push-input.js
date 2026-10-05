// Capture only a mounted rider's canvas drag, never HUD buttons or other rides.
export function createSwingPushInput({target=globalThis.window,active,send}){
 let gesture=null;
 const reset=()=>{gesture=null;};
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function down(e){if(!active()||e.target?.tagName!=='CANVAS'||e.isPrimary===false||(e.button??0)!==0)return;gesture={id:e.pointerId,y:e.clientY};consume(e);}
 function move(e){if(!gesture||gesture.id!==e.pointerId)return;if(!active()){reset();return;}consume(e);const delta=gesture.y-e.clientY;if(delta>=32){gesture.y=e.clientY;send();}else if(delta<0)gesture.y=e.clientY;}
 function up(e){if(gesture?.id!==e.pointerId)return;consume(e);reset();}
 const rows=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['blur',reset],['pagehide',reset],['visibilitychange',reset]];
 for(const [type,fn]of rows)target?.addEventListener(type,fn,{capture:true,passive:false});
 return {reset,dispose(){for(const [type,fn]of rows)target?.removeEventListener(type,fn,true);reset();}};
}
