import {getPlayerAccountState,subscribePlayerAccount,parkProgressionAction,refreshPlayerProgression} from './player-account-client.js';
import {PARK_COINS,DELIVERY} from './park-progression-rules.js';
import {minimapPoint} from './park-minimap-math.js?v=minimap-20261003-1';
import {decorateUtilityButton,watchHomesButton} from './hud-utility-buttons.js?v=hud-utilities-20261004-1';
import {QUEST_GUIDES,activeDelivery,questTarget,distance,timeLeft,compassTo,guideMapPoint} from './park-quest-guide.js';
import {currencyName} from './park-economy.js';

export async function installParkProgression(host=window){
 const doc=host.document,sheet=doc.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./park-progression.css?v=quest-guide-20261005-1',import.meta.url).href;
 await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=()=>{sheet.remove();reject(Error('Progression style unavailable'))};doc.head.append(sheet)});
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text)n.textContent=text;return n};
 const brand=el('div','park-identity-title'),name=el('div','park-identity-name');
 const logo=el('img','park-identity-logo');logo.src=new URL('../brand/67park-logo.png',import.meta.url).href;logo.alt='67Park';logo.width=72;logo.height=27;brand.append(logo);
 const root=el('section','park-daily'),toggle=el('button','park-ui-control','Daily · 0/3'),panel=el('div','park-daily-panel park-ui-panel');
 root.id='park-daily';panel.id='park-daily-panel';panel.hidden=true;toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',panel.id);
 const heading=el('h2','','Your park day'),close=el('button','park-ui-control','Close'),streak=el('p'),list=el('ul'),cap=el('p'),legend=el('p','','Gold dots: 5 coins each · Blue: parcel pickup · Pink: delivery'),job=el('button','park-ui-control'),cancel=el('button','park-ui-control','Cancel delivery'),retry=el('button','park-ui-control','Retry'),status=el('p','park-daily-status'),earned=el('div','park-earned');
 close.type=job.type=cancel.type=retry.type='button';close.setAttribute('aria-label','Close daily quests');status.setAttribute('role','status');earned.setAttribute('role','status');earned.hidden=true;retry.hidden=true;
 heading.id='park-daily-heading';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Your park day');
 const intro=el('p','park-quest-intro','Three daily tasks. Coins are saved automatically.'),details=el('div','park-delivery-details'),steps=el('p','park-delivery-steps'),route=el('p','park-delivery-route');
 const tracker=el('button','park-quest-tracker park-ui-control'),trackerTitle=el('strong'),trackerDetail=el('span');tracker.type='button';tracker.hidden=true;tracker.append(trackerTitle,trackerDetail);tracker.onclick=()=>{selectTab(tracked==='explore'?'daily':'parcel');open(true)};
 const tabs=el('div','park-quest-tabs'),dailyTab=el('button','park-ui-control','Daily tasks'),parcelTab=el('button','park-ui-control','Parcel post');dailyTab.type=parcelTab.type='button';tabs.append(dailyTab,parcelTab);
 function selectTab(tab){const daily=tab==='daily';list.hidden=!daily;details.hidden=daily;intro.hidden=!daily;streak.hidden=!daily;cap.hidden=!daily;legend.hidden=true;dailyTab.setAttribute('aria-pressed',String(daily));parcelTab.setAttribute('aria-pressed',String(!daily))}
 dailyTab.onclick=()=>selectTab('daily');parcelTab.onclick=()=>selectTab('parcel');
 const track=el('button','park-ui-control','Track delivery');track.type='button';
 details.append(el('h3','','Parcel post'),steps,route,job,track,cancel);
 const header=el('header','park-quest-header');header.append(heading,close);
 panel.append(header,tabs,intro,streak,list,details,cap,legend,retry,status);root.append(toggle,panel,tracker);doc.body.append(brand,name,root,earned);selectTab('daily');
 const stopHomesPresentation=watchHomesButton(doc);
 let disposed=false,profile=getPlayerAccountState(),self=null,world=null,group=null,props=null,building=false,near=null,busy=false,refreshing=false,lastRefresh=0,lastLoginAttempt=0,lastAuto=0,anim=null,timer=null,tracked=null,listKey='',lastGuide='',lastDeliveryId=null;
 let previousId=profile?.id,previousEarned=profile?.progression?.earned??null;
 const release=()=>host.dispatchEvent(new host.Event('park:release-controls'));
 function open(value){panel.hidden=!value;if(value)earned.hidden=true;toggle.setAttribute('aria-expanded',String(value));release();(value?close:toggle).focus({preventScroll:true});updateGuide()}
 toggle.onclick=()=>open(panel.hidden);close.onclick=()=>open(false);
 panel.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();open(false)}
  if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus()}}
 });panel.addEventListener('keyup',e=>e.stopPropagation());
 // Button keyboard input must not move the avatar or trigger a park action.
 const buttonKeys=e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()};
 root.addEventListener('keydown',buttonKeys);root.addEventListener('keyup',buttonKeys);root.addEventListener('pointerdown',e=>{e.stopPropagation();release()});
 function feedback(amount,collected=false){
  host.dispatchEvent(new host.CustomEvent('candy:reward-earned',{detail:{collected}}));
  earned.textContent=`+${amount} ${currencyName(profile?.progression?.rewardCurrency||'coins')}`;earned.hidden=!panel.hidden;clearTimeout(timer);anim?.cancel();
  const reduced=host.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wallet=doc.getElementById('park-minimap-coins');
  if(wallet?.animate&&!reduced)anim=wallet.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:240,easing:host.getComputedStyle(doc.documentElement).getPropertyValue('--park-ui-ease').trim()||'ease-out'});
  timer=host.setTimeout(()=>{earned.hidden=true},2400);
 }
 function render(){
  if(disposed)return;const p=profile?.progression;
  name.textContent=profile?.name||'Connecting…';name.title=profile?.name||'';
  decorateUtilityButton(toggle,'daily','Daily',p?`${p.quests.filter(q=>q.claimed).length}/3`:'…');
  streak.className='park-quest-streak';streak.textContent=p?`Day ${p.streak.count} streak · ${p.streak.claimed?'Today’s check-in saved':'Checking in…'}`:'Connecting to your wallet…';
  const key=JSON.stringify([p?.quests||[],p?.rewardCurrency]);
  if(key!==listKey){const focused=list.contains(doc.activeElement)?doc.activeElement.dataset.quest:null;listKey=key;list.replaceChildren(...(p?.quests||[]).map(q=>{
   const guide=QUEST_GUIDES[q.id]||{title:q.label,description:'Complete this park activity.',action:'Track'},card=el('li',q.claimed?'is-done':''),title=el('strong','',guide.title),reward=el('span','park-quest-reward',`${q.claimed?'✓ ':''}+${q.reward} ${p.rewardCurrency==='badges'?'FB':'Coins'}`),description=el('p','',guide.description),progress=el('progress'),action=el('button','park-ui-control',guide.action);
   reward.title=currencyName(p.rewardCurrency||'coins');reward.setAttribute('aria-label',`${q.reward} ${currencyName(p.rewardCurrency||'coins')}${q.claimed?' saved':''}`);
   progress.max=q.target;progress.value=q.count;progress.setAttribute('aria-label',`${q.label}: ${q.count} of ${q.target}`);action.type='button';action.hidden=q.claimed;action.dataset.quest=q.id;
   action.onclick=()=>{if(q.id==='match'){const button=doc.querySelector('.online-toggle');if(button){open(false);host.dispatchEvent(new host.CustomEvent('candy:online-open',{detail:{tab:'play'}}))}else status.textContent='Play & Friends is connecting. Please try again.'}else{tracked=q.id;open(false);updateGuide()}};
   const bottom=el('div','park-quest-card-bottom');bottom.append(el('span','',`${Math.min(q.count,q.target)} / ${q.target}`),action);card.append(title,reward,description,progress,bottom);return card;
  }));if(focused){const next=[...list.querySelectorAll('button')].find(b=>b.dataset.quest===focused&&!b.hidden);(next||close).focus({preventScroll:true})}}
  intro.textContent=p?`Earn ${currencyName(p.rewardCurrency||'coins')} from the park task board. Spend them in ${p.rewardCurrency==='badges'?'Shop → Badge shop':'Shop'}.`:'';
  cap.textContent=p?`Match rewards: ${p.matchCoins}/${p.matchCap} ${currencyName(p.rewardCurrency||'coins')} today · Resets at 00:00 UTC`:'';
  const delivery=activeDelivery(p);
  if(props&&!delivery)props.parcel.visible=false;
  job.textContent=`${delivery?'Deliver parcel':'Pick up parcel'} · +${DELIVERY.reward} ${p?.rewardCurrency==='badges'?'FB':'Coins'}`;
  job.disabled=busy||!p||near!==(delivery?'dropoff':'pickup')||!!p.delivery&&!delivery;cancel.hidden=!p?.delivery;cancel.disabled=busy;retry.disabled=busy;
  steps.textContent=delivery?'1 Picked up  →  2 Meet Poppy  →  3 Get paid':'1 Meet Pip  →  2 Carry the parcel  →  3 Deliver to Poppy';
  track.textContent=tracked==='delivery'&&!delivery?'Stop tracking':'Track delivery';
  if(group){for(const mesh of group.children){const id=mesh.userData.rewardId;mesh.visible=id==='pickup'?!delivery:id==='dropoff'?!!delivery:!!p&&!p.collected.includes(id)}}
  updateGuide();
 }
 function updateGuide(){
  const p=profile?.progression,now=Date.now(),delivery=activeDelivery(p,now),target=questTarget(p,tracked,self,now),d=distance(target,self),expired=!!p?.delivery&&!delivery;
  if(expired)job.disabled=true;
  if(lastDeliveryId&&!p?.delivery){tracked=null}lastDeliveryId=p?.delivery?.id||null;
  const destination=delivery?DELIVERY.to:DELIVERY.from,meters=distance(destination,self);
  const routeText=expired?'Parcel expired. Reconnect or cancel, then ask Pip for another.':`${delivery?'Poppy · East walk':'Pip · Park entrance'}${Number.isFinite(meters)?` · ${Math.ceil(meters)} m away`:''}${delivery?` · ${timeLeft(delivery.expiresAt,now)} left`:''}. Poppy pays ${DELIVERY.reward} ${currencyName(p?.rewardCurrency||'coins')} per delivery. ${p?.quests?.find(q=>q.id==='delivery')?.claimed?'Daily bonus already received. You can still make more deliveries.':'The park task board adds a +20 daily bonus for your first delivery.'}`;
  if(route.textContent!==routeText)route.textContent=routeText;
  tracker.hidden=!panel.hidden||!p||(!target&&!expired&&!near)||(!tracked&&!delivery&&!expired&&!['pickup','dropoff'].includes(near));
  const title=expired?'Parcel expired':target?(target.label||target.name):near==='pickup'?'Pip · Parcel post':'Poppy · Parcel post';
  const detail=expired?'Tap to choose another delivery':near==='pickup'||near==='dropoff'?'You’re here · Tap to talk':target&&Number.isFinite(d)?`${compassTo(target,self)} · ${Math.ceil(d)} m${delivery?` · ${timeLeft(delivery.expiresAt,now)} left`:''} · Tap for details`:'Tap for details';
  const text=title+'|'+detail;if(text!==lastGuide){lastGuide=text;trackerTitle.textContent=title;trackerDetail.textContent=detail}
 }
 track.onclick=()=>{tracked=tracked==='delivery'&&!activeDelivery(profile?.progression)?null:'delivery';open(false)};
 const unsubscribe=subscribePlayerAccount(p=>{
  if(disposed)return;
  const delta=p.id===previousId&&previousEarned!==null?(p.progression?.earned||0)-previousEarned:0;
  const collected=p.id===previousId&&(p.progression?.collected?.length||0)>(profile?.progression?.collected?.length||0);
  previousId=p.id;previousEarned=p.progression?.earned??null;profile=p;if(delta>0)feedback(delta,collected);render();
 });
 async function act(kind,id,{quiet=false}={}){
  if(busy||disposed)return;busy=true;retry.hidden=true;if(!quiet)status.textContent='Saving…';render();
  try{await parkProgressionAction(kind,id);if(!disposed){if(kind==='delivery-start')tracked='delivery';if(kind==='delivery-finish'||kind==='delivery-cancel')tracked=null;status.textContent=kind==='delivery-start'?'Pip: “Thank you! Please take this parcel to Poppy at the East walk.” Follow the pink minimap marker.':kind==='delivery-finish'?`Delivered! Poppy’s ${currencyName(profile?.progression?.rewardCurrency||'coins')} are saved in your wallet.`:kind==='delivery-cancel'?'Delivery cancelled. You can ask Pip for a new parcel.':'Rewards saved.'}}
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
    mesh.name='Park reward '+point.id;mesh.userData.rewardId=point.id;mesh.position.set(point.x,ground+(coin?1.15:2.1),point.z);if(!coin)mesh.scale.setScalar(.45);next.add(mesh);
   }
   if(disposed){coinGeo.dispose();parcelGeo.dispose();coinMat.dispose();blue.dispose();pink.dispose();return}
   group?.removeFromParent();group=next;world=w;w.scene.add(group);group.userData.dispose=()=>{coinGeo.dispose();parcelGeo.dispose();coinMat.dispose();blue.dispose();pink.dispose()};render();
   void import('./park-delivery-props.js').then(({createDeliveryProps})=>{if(!disposed&&world===w){props?.dispose();props=createDeliveryProps(w)}}).catch(()=>{});
  }finally{building=false}
 }
 render();
 return {
  tick(position,ctx,size,overview){
   if(disposed)return;self=position;const now=Date.now(),w=host.__islandWorld;
   const visible=!!w?.ready&&!doc.querySelector('.wardrobe')&&doc.body.classList.contains('park-unified-ui');
   brand.hidden=name.hidden=root.hidden=!visible;doc.body.classList.toggle('park-progression-ready',visible);
   if(!visible){if(group)group.visible=false;if(props)props.root.visible=props.parcel.visible=false;return}
   if(w!==world&&!building){props?.dispose();props=null;group?.userData.dispose?.();group?.removeFromParent();group=null;world=null;void build(w).catch(()=>{world=w;status.textContent='Activity markers could not load. Please reload.'})}
   if(group)group.visible=!overview;
   root.hidden=overview;
   if(!doc.hidden&&now-lastRefresh>15000&&!refreshing){lastRefresh=now;refreshing=true;void refreshPlayerProgression().catch(e=>{status.textContent=e.message;retry.hidden=false}).finally(()=>{refreshing=false})}
   const p=profile?.progression;
   props?.update(self,!!activeDelivery(p),!overview,now);
   if(!busy&&now-lastLoginAttempt>15000&&(!p?.streak.claimed||now>=p.resetAt)){lastLoginAttempt=now;void act('login',undefined,{quiet:true})}
   if(!p||overview)return;
   const delivery=activeDelivery(p,now);
   const coins=PARK_COINS.filter(c=>!p.collected.includes(c.id));
   const points=[{...(delivery?DELIVERY.to:DELIVERY.from),id:delivery?'dropoff':'pickup'},...coins];
   const nearby=points.find(c=>Math.hypot(c.x-self.x,c.z-self.z)<2.6&&Math.abs(self.y-c.y)<4);
   const nextNear=nearby?.id||null;if(near!==nextNear){near=nextNear;render();if(near==='pickup'||near==='dropoff')status.textContent=near==='pickup'?`Pip is nearby · Pick up a parcel for ${DELIVERY.reward} ${currencyName(p.rewardCurrency||'coins')}.`:'Poppy is nearby · Open Daily to deliver your parcel.'}
   for(const c of points){const pos=minimapPoint(c,self,size);if(!pos?.visible)continue;ctx.beginPath();ctx.arc(pos.x,pos.y,7,0,Math.PI*2);ctx.fillStyle=c.id==='pickup'?'#80bddc':c.id==='dropoff'?'#d795b7':'#edbd50';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke()}
   const target=questTarget(p,tracked,self,now),pin=guideMapPoint(target,self,size);
   if(pin){ctx.save();ctx.translate(pin.x,pin.y);ctx.rotate(pin.angle);ctx.beginPath();if(pin.edge){ctx.moveTo(9,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath()}else ctx.arc(0,0,11,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.fillStyle=delivery?'#d795b7':'#568e8a';ctx.fill();ctx.stroke();ctx.restore()}
   updateGuide();
   const coin=coins.find(c=>distance(c,self)<2.6&&Math.abs(self.y-c.y)<4);
   if(coin&&!busy&&now-lastAuto>1800){lastAuto=now;void act('collect',coin.id,{quiet:true})}
  },
  hide(){brand.hidden=name.hidden=root.hidden=earned.hidden=true;if(group)group.visible=false;if(props)props.root.visible=props.parcel.visible=false;doc.body.classList.remove('park-progression-ready')},
  dispose(){disposed=true;unsubscribe();stopHomesPresentation();clearTimeout(timer);anim?.cancel();props?.dispose();group?.removeFromParent();group?.userData.dispose?.();sheet.remove();brand.remove();name.remove();root.remove();earned.remove();doc.body.classList.remove('park-progression-ready')},
 };
}
