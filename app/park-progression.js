import {getPlayerAccountState,subscribePlayerAccount,parkProgressionAction,refreshPlayerProgression} from './player-account-client.js';
import {PARK_COINS,DELIVERY} from './park-progression-rules.js';
import {minimapPoint} from './park-minimap-math.js?v=minimap-20261003-1';
import {decorateUtilityButton,watchHomesButton} from './hud-utility-buttons.js?v=hud-utilities-20261004-1';

export async function installParkProgression(host=window){
 const doc=host.document,sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./park-progression.css?v=hud-cluster-20261004-1',import.meta.url).href;
 await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=()=>{sheet.remove();reject(Error('Progression style unavailable'))};doc.head.append(sheet)});
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text)n.textContent=text;return n};
 const brand=el('div','park-identity-title'),name=el('div','park-identity-name');
 const logo=el('img','park-identity-logo');logo.src=new URL('../brand/67park-logo.png',import.meta.url).href;logo.alt='67Park';logo.width=72;logo.height=27;brand.append(logo);
 const root=el('section','park-daily'),toggle=el('button','park-ui-control','Daily · 0/3'),panel=el('div','park-daily-panel park-ui-panel');
 root.id='park-daily';panel.id='park-daily-panel';panel.hidden=true;toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',panel.id);
 const heading=el('h2','','Your park day'),close=el('button','park-ui-control','Close'),streak=el('p'),list=el('ul'),cap=el('p'),legend=el('p','','Gold dots: 5 coins each · Blue: parcel pickup · Pink: delivery'),job=el('button','park-ui-control'),cancel=el('button','park-ui-control','Cancel delivery'),retry=el('button','park-ui-control','Retry'),status=el('p','park-daily-status'),earned=el('div','park-earned');
 close.type=job.type=cancel.type=retry.type='button';close.setAttribute('aria-label','Close daily quests');status.setAttribute('role','status');earned.setAttribute('role','status');earned.hidden=true;retry.hidden=true;
 panel.append(heading,close,streak,list,cap,legend,job,cancel,retry,status);root.append(toggle,panel);doc.body.append(brand,name,root,earned);
 const stopHomesPresentation=watchHomesButton(doc);
 let disposed=false,profile=getPlayerAccountState(),self=null,world=null,group=null,building=false,near=null,busy=false,refreshing=false,lastRefresh=0,lastLoginAttempt=0,lastAuto=0,anim=null,timer=null;
 let previousId=profile?.id,previousEarned=profile?.progression?.earned??null;
 const release=()=>host.dispatchEvent(new host.Event('park:release-controls'));
 function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));release();if(!value)toggle.focus({preventScroll:true})}
 toggle.onclick=()=>open(panel.hidden);close.onclick=()=>open(false);
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();open(false)}});
 // Button keyboard input must not move the avatar or trigger a park action.
 const buttonKeys=e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()};
 root.addEventListener('keydown',buttonKeys);root.addEventListener('keyup',buttonKeys);root.addEventListener('pointerdown',e=>{e.stopPropagation();release()});
 function feedback(amount){
  earned.textContent=`+${amount} coins`;earned.hidden=!panel.hidden;clearTimeout(timer);anim?.cancel();
  const reduced=host.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wallet=doc.getElementById('park-minimap-coins');
  if(wallet?.animate&&!reduced)anim=wallet.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:240,easing:host.getComputedStyle(doc.documentElement).getPropertyValue('--park-ui-ease').trim()||'ease-out'});
  timer=host.setTimeout(()=>{earned.hidden=true},2400);
 }
 function render(){
  if(disposed)return;const p=profile?.progression;
  name.textContent=profile?.name||'Connecting…';name.title=profile?.name||'';
  decorateUtilityButton(toggle,'daily','Daily',p?`${p.quests.filter(q=>q.claimed).length}/3`:'…');
  streak.textContent=p?`Day ${p.streak.count} streak · ${p.streak.claimed?'Check-in received':'Check in to earn coins'}`:'Connecting to your wallet…';
  list.replaceChildren(...(p?.quests||[]).map(q=>el('li',q.claimed?'is-done':'',`${q.claimed?'✓ ':''}${q.label} · ${q.count}/${q.target} · +${q.reward}`)));
  cap.textContent=p?`Match rewards: ${p.matchCoins}/${p.matchCap} today · Resets at 00:00 UTC`:'';
  job.textContent=p?.delivery?`Deliver parcel · +${DELIVERY.reward}`:`Pick up parcel · +${DELIVERY.reward}`;
  job.disabled=busy||!near||near!==(p?.delivery?'dropoff':'pickup');cancel.hidden=!p?.delivery;cancel.disabled=busy;retry.disabled=busy;
  if(group){for(const mesh of group.children){const id=mesh.userData.rewardId;mesh.visible=id==='pickup'?!p?.delivery:id==='dropoff'?!!p?.delivery:!!p&&!p.collected.includes(id)}}
 }
 const unsubscribe=subscribePlayerAccount(p=>{
  if(disposed)return;
  if(p.id===previousId&&previousEarned!==null&&p.progression?.earned>previousEarned)feedback(p.progression.earned-previousEarned);
  previousId=p.id;previousEarned=p.progression?.earned??null;profile=p;render();
 });
 async function act(kind,id,{quiet=false}={}){
  if(busy||disposed)return;busy=true;retry.hidden=true;if(!quiet)status.textContent='Saving…';render();
  try{await parkProgressionAction(kind,id);if(!disposed)status.textContent=kind==='delivery-start'?'Parcel collected. Follow the pink marker.':kind==='delivery-finish'?'Delivered! Your coins are in your wallet.':kind==='delivery-cancel'?'Delivery cancelled.':'Rewards saved.'}
  catch(e){if(!disposed&&!quiet){status.textContent=e.message;retry.hidden=false}if(!disposed&&quiet&&e.code!=='MOVE_CLOSER'){status.textContent=e.message;retry.hidden=false}}
  finally{busy=false;render()}
 }
 job.onclick=()=>act(profile?.progression?.delivery?'delivery-finish':'delivery-start',profile?.progression?.delivery?.id);
 cancel.onclick=()=>act('delivery-cancel',profile?.progression?.delivery?.id);
 retry.onclick=()=>{lastRefresh=0;lastLoginAttempt=0;status.textContent='Reconnecting…';retry.hidden=true};
 async function build(w){
  if(building||disposed)return;building=true;
  try{
   const T=await import('three');if(disposed)return;
   const next=new T.Group();next.name='ParkRewardMarkers';
   const coinGeo=new T.CylinderGeometry(.48,.48,.12,16);coinGeo.rotateX(Math.PI/2);
   const coinMat=new T.MeshStandardMaterial({color:0xf3c76c,roughness:.55,metalness:.1});
   const parcelGeo=new T.BoxGeometry(.8,.8,.8),blue=new T.MeshStandardMaterial({color:0x9ecfe8}),pink=new T.MeshStandardMaterial({color:0xe8b6cd});
   for(const point of [...PARK_COINS,{...DELIVERY.from,id:'pickup'},{...DELIVERY.to,id:'dropoff'}]){
    const ground=w.ground(point.x,point.z);if(!Number.isFinite(ground))continue;
    const coin=!['pickup','dropoff'].includes(point.id),mesh=new T.Mesh(coin?coinGeo:parcelGeo,coin?coinMat:point.id==='pickup'?blue:pink);
    mesh.name='Park reward '+point.id;mesh.userData.rewardId=point.id;mesh.position.set(point.x,ground+1.15,point.z);next.add(mesh);
   }
   if(disposed){coinGeo.dispose();parcelGeo.dispose();coinMat.dispose();blue.dispose();pink.dispose();return}
   group?.removeFromParent();group=next;world=w;w.scene.add(group);group.userData.dispose=()=>{coinGeo.dispose();parcelGeo.dispose();coinMat.dispose();blue.dispose();pink.dispose()};render();
  }finally{building=false}
 }
 render();
 return {
  tick(position,ctx,size,overview){
   if(disposed)return;self=position;const now=Date.now(),w=host.__islandWorld;
   const visible=!!w?.ready&&!doc.querySelector('.wardrobe')&&doc.body.classList.contains('park-unified-ui');
   brand.hidden=name.hidden=root.hidden=!visible;doc.body.classList.toggle('park-progression-ready',visible);
   if(!visible){if(group)group.visible=false;return}
   if(w!==world&&!building){group?.userData.dispose?.();group?.removeFromParent();group=null;world=null;void build(w).catch(()=>{world=w;status.textContent='Activity markers could not load. Please reload.'})}
   if(group)group.visible=!overview;
   root.hidden=overview;
   if(!doc.hidden&&now-lastRefresh>15000&&!refreshing){lastRefresh=now;refreshing=true;void refreshPlayerProgression().catch(e=>{status.textContent=e.message;retry.hidden=false}).finally(()=>{refreshing=false})}
   const p=profile?.progression;
   if(!busy&&now-lastLoginAttempt>15000&&(!p?.streak.claimed||now>=p.resetAt)){lastLoginAttempt=now;void act('login',undefined,{quiet:true})}
   if(!p||overview)return;
   const points=[...PARK_COINS.filter(c=>!p.collected.includes(c.id)),{...(p.delivery?DELIVERY.to:DELIVERY.from),id:p.delivery?'dropoff':'pickup'}];
   const nearby=points.find(c=>Math.hypot(c.x-self.x,c.z-self.z)<2.6&&Math.abs(self.y-c.y)<4);
   const nextNear=nearby?.id||null;if(near!==nextNear){near=nextNear;render();if(near==='pickup'||near==='dropoff')status.textContent=near==='pickup'?`Nearby: park entrance · Pick up a parcel for ${DELIVERY.reward} coins.`:'Nearby: delivery point · Open Daily to deliver your parcel.'}
   for(const c of points){const pos=minimapPoint(c,self,size);if(!pos?.visible)continue;ctx.beginPath();ctx.arc(pos.x,pos.y,7,0,Math.PI*2);ctx.fillStyle=c.id==='pickup'?'#80bddc':c.id==='dropoff'?'#d795b7':'#edbd50';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke()}
   if(near&&!['pickup','dropoff'].includes(near)&&!busy&&now-lastAuto>1800){lastAuto=now;void act('collect',near,{quiet:true})}
  },
  hide(){brand.hidden=name.hidden=root.hidden=earned.hidden=true;if(group)group.visible=false;doc.body.classList.remove('park-progression-ready')},
  dispose(){disposed=true;unsubscribe();stopHomesPresentation();clearTimeout(timer);anim?.cancel();group?.removeFromParent();group?.userData.dispose?.();sheet.remove();brand.remove();name.remove();root.remove();earned.remove();doc.body.classList.remove('park-progression-ready')},
 };
}
