import {Ka as online,ta as inventory} from './chunk-G7D6MVRW.js?v=online-next-1';
import {mapPlayers} from './map-player-markers.js?v=entry-map-recovery-20261003-1';
import {minimapPoint,minimapImageRect,minimapCoins} from './park-minimap-math.js?v=minimap-20261003-1';

// An offline orthographic image, not a second renderer or a second island model.
// Decorate the original map button: React's existing click/keyboard handler owns
// opening overview, blocked travel and restoring the camera on Back.
export async function installParkMinimap(host=window){
 const doc=host.document,image=new host.Image();
 image.src=new URL('./minimap/park.webp?v=minimap-20261003-1',import.meta.url).href;
 await image.decode();
 const sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./park-minimap.css?v=minimap-20261003-1',import.meta.url).href;
 await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=()=>{sheet.remove();reject(Error('Minimap style unavailable'));};doc.head.append(sheet);});
 let button=null,canvas=null,ctx=null,balance=null,frame=null,last=0,disposed=false;
 const detach=()=>{button?.classList.remove('park-minimap-button');canvas?.remove();balance?.remove();button=canvas=ctx=balance=null;doc.body.classList.remove('park-minimap-ready');};
 const tick=now=>{
  if(disposed)return;
  frame=host.requestAnimationFrame(tick);
  if(doc.hidden||now-last<50)return;last=now;
  const next=doc.querySelector('.park-toolbar>button[aria-label="Bird’s-eye view"]');
  const self=host.__eggyInput?.playerRef?.body?.translation();
  if(!next||!self||!Number.isFinite(self.x)||!Number.isFinite(self.z)){if(button)detach();return;}
  if(next!==button||!canvas?.isConnected){
   detach();button=next;canvas=doc.createElement('canvas');canvas.className='park-minimap-canvas';canvas.setAttribute('aria-hidden','true');
   // Fixed 256px backing store is enough even on Retina; no DPR-sized GPU work.
   canvas.width=canvas.height=256;ctx=canvas.getContext('2d');if(!ctx){detach();return;}
   balance=doc.createElement('div');balance.id='park-minimap-coins';balance.setAttribute('role','status');balance.setAttribute('aria-live','off');
   const coin=doc.createElement('span');coin.className='park-minimap-coin';coin.textContent='₵';coin.setAttribute('aria-hidden','true');
   const amount=doc.createElement('span');amount.className='park-minimap-amount';balance.append(coin,amount);doc.body.append(balance);
   button.append(canvas);button.classList.add('park-minimap-button');doc.body.classList.add('park-minimap-ready');
  }
  // Overview owns the whole map viewport. Restore its existing compact chrome
  // so the additional mini-map footprint cannot shrink the full-map fit area.
  const overview=!!doc.getElementById('hawk-map-navigation');
  doc.body.classList.toggle('park-minimap-ready',!overview);balance.hidden=overview;
  const amount=minimapCoins(inventory.coins);
  if(balance.lastElementChild.textContent!==amount){balance.lastElementChild.textContent=amount;balance.setAttribute('aria-label',`${amount} coins`);}
  const size=256,rect=minimapImageRect(self,size);
  ctx.clearRect(0,0,size,size);ctx.fillStyle='#bed8e2';ctx.fillRect(0,0,size,size);
  if(rect)ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height);
  const players=mapPlayers({self,id:online.id,connected:online.connected,remotes:online.remotes,presence:host.__candyOnline?.data?.island?.players});
  for(const player of players){
   if(player.self)continue;const p=minimapPoint(player.p,self,size);if(!p?.visible)continue;
   ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fillStyle=player.color;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();
  }
  // North-up map; the player stays exactly in the centre even at the shore.
  ctx.beginPath();ctx.arc(size/2,size/2,17,0,Math.PI*2);ctx.fillStyle='#67c3ac55';ctx.fill();
  ctx.beginPath();ctx.arc(size/2,size/2,9,0,Math.PI*2);ctx.fillStyle='#44ae99';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#fff';ctx.stroke();
  ctx.font='bold 21px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.strokeStyle='#527576';ctx.lineWidth=3;ctx.strokeText('N',size/2,28);ctx.fillText('N',size/2,28);
  canvas.dataset.centerX=String(self.x);canvas.dataset.centerZ=String(self.z);
 };
 const dispose=()=>{disposed=true;host.cancelAnimationFrame(frame);detach();sheet.remove();host.removeEventListener('pagehide',leave);};
 const leave=e=>{if(!e.persisted)dispose();};host.addEventListener('pagehide',leave);
 frame=host.requestAnimationFrame(tick);return dispose;
}
if(typeof window!=='undefined')installParkMinimap().catch(()=>console.warn('Mini map unavailable; the original map button remains available.'));
