import {rescueRoomAllowsPark,RESCUE_MATCH_MESSAGE} from './player-rescue-policy.js?v=critical-followup-20261003-1';

const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);

export function createRescueController({read,send,apply,notify,now=()=>Date.now(),nonce=()=>crypto.randomUUID()}){
 let pending=null;
 const finish=(state,message)=>{pending=null;notify({state,message});};
 return {
  request(){
   if(pending)return false;
   const s=read();
   if(!s.ready){notify({state:'error',message:'Rescue is only available after your character is ready in the park.'});return false;}
   if(!rescueRoomAllowsPark(s.room)){notify({state:'error',message:RESCUE_MATCH_MESSAGE});return false;}
   if(!s.connected||!s.island){notify({state:'error',message:'Reconnect to the park, then try again.'});return false;}
   pending={request:nonce(),island:s.island,at:now(),destination:null};
   notify({state:'pending',message:'Finding safe ground and releasing your seat…'});
   if(!send({t:'player.rescue',request:pending.request,island:pending.island})){finish('error','Could not reach the server. Please reconnect and try again.');return false;}
   return true;
  },
  receive(m){
   if(!pending||m.t!=='player.rescue.result'||m.request!==pending.request)return;
   if(!m.ok){finish('error',m.message||'Recovery could not finish. Please try again.');return;}
   if(m.island!==pending.island||!finitePoint(m.p)){finish('error','The park changed. Please try again.');return;}
   pending.destination=m.p;
  },
  tick(){
   if(!pending)return;
   const s=read();
   if(s.island!==pending.island||!s.connected){finish('error','Connection changed. Please try again after reconnecting.');return;}
   if(!s.ready){finish('error','The park is no longer ready. Try again after returning to the park.');return;}
   if(!rescueRoomAllowsPark(s.room)){finish('error',RESCUE_MATCH_MESSAGE);return;}
   if(now()-pending.at>9000){finish('error','Recovery was not confirmed. Please try again.');return;}
   if(pending.destination&&!s.mounted&&!s.home&&!s.travel){
    try{if(apply(pending.destination)!==false)finish('success','You are back on safe ground.');else finish('error','The landing point is not clear yet. Please try again.');}
    catch{finish('error','Recovery could not finish. Please try again.');}
   }
  },
  cancel(){pending=null;},get pending(){return !!pending;}
 };
}

export function installPlayerRescue(host=window){
 let ws=null;
 const housing=()=>host.__parkHousing?.debug?.();
 const controller=createRescueController({
  read:()=>({ready:host.__islandWorld?.ready&&host.__eggyInput?.playerRef?.body&&host.document.documentElement.dataset.gameplayAvatarState==='ready'&&host.__party?.status?.().map==='city',connected:host.__candyOnline?.data.connected&&host.__eggyNet?.connected,room:host.__candyOnline?.data.room,island:host.__candyOnline?.data.island?.code,mounted:host.__candy?.state?.().mounted,home:housing()?.visit,travel:housing()?.pending||housing()?.loading?.phase==='loading'}),
  send:m=>host.__candyOnline?.send(m),
  notify:detail=>host.dispatchEvent(new CustomEvent('park:rescue-status',{detail})),
  apply:p=>{
   const world=host.__islandWorld,body=host.__eggyInput?.playerRef?.body;
   if(!body||!world?.ready)return false;
   const y=world.traffic?.area?.supportHeight?.(p[0],p[2])??world.ground(p[0],p[2]);
   if(!Number.isFinite(y)||Math.abs(y+.6-p[1])>.45)return false;
   host.dispatchEvent(new Event('park:release-controls'));
   host.dispatchEvent(new Event('park:rescue-detach'));
   const input=host.__eggyInput.input;input.x=input.z=0;input.run=input.jumpQueued=input.sitQueued=false;
   const from=body.translation();
   for(const cam of new Set([world.camera,host.__eggyCam]))if(cam?.position){cam.position.x+=p[0]-from.x;cam.position.y+=p[1]-from.y;cam.position.z+=p[2]-from.z;cam.updateMatrixWorld();}
   body.setEnabled?.(true);body.setTranslation({x:p[0],y:p[1],z:p[2]},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel?.({x:0,y:0,z:0},true);
   return true;
  }
 });
 const received=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}if(m.t==='player.rescue.detach')host.dispatchEvent(new Event('park:rescue-detach'));else controller.receive(m);};
 const request=()=>{sync();controller.request();};
 const sync=()=>{const next=host.__candyOnline?.ws;if(ws!==next){ws?.removeEventListener('message',received);ws=next;ws?.addEventListener('message',received);}controller.tick();};
 host.addEventListener('park:rescue-request',request);
 const timer=host.setInterval(sync,100);
 const dispose=()=>{host.clearInterval(timer);controller.cancel();ws?.removeEventListener('message',received);host.removeEventListener('park:rescue-request',request);};
 host.addEventListener('pagehide',()=>controller.cancel());
 return dispose;
}
