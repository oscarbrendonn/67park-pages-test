// UI only: transactions, ownership, equipment and persistence belong to the
// existing account service. No local currency authority or extra WebGL context.
import {currencyName,itemOffer,walletBalance} from './park-economy.js';
export const marketCategory=item=>item.category||(item.board?'Boards':({body:'Outfits',sprout:'Headwear',back:'Back',held:'Handheld'})[item.slot]||'Accessories');
export function marketItemState(item,{owned,coins,badges,equipment,board}){
 const has=item.included===true||owned.includes(item.id),equipped=has&&(item.board?board===item.board:equipment[item.slot]===(item.equipmentId||`shop:${item.id}`));
 const balance=walletBalance({coins,badges},item.currency||'coins');
 return {owned:has,equipped,affordable:balance>=item.price,remaining:Math.max(0,item.price-balance)};
}
export function createMarketCatalogueView({doc,panel,items,state,buy,equip,remove,close,changeCharacter,initialMode='shop'}){
 const order=['Eyewear','Headwear','Outfits','Shoes','Backpacks','Wings','Powers','Glows','Back','Accessories','Handheld','Boards'];items=[...items].sort((a,b)=>order.indexOf(marketCategory(a))-order.indexOf(marketCategory(b)));
 const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(label,cls,action)=>{const b=make('button',cls,label);b.type='button';b.addEventListener('click',action);return b;};
 const root=make('section','market-catalogue');root.setAttribute('aria-label','Shop and wardrobe');
 const header=make('header','market-heading'),brand=make('div'),logo=make('img','market-brand-logo');logo.src=new URL('../brand/67park-logo.png',import.meta.url).href;logo.alt='67Park';brand.append(logo,make('h2','','Park Shop'));
 const wallet=make('span','market-wallet'),exit=button('←','market-close',close);exit.setAttribute('aria-label','Close market');exit.title='Back to park';header.append(exit,brand,wallet);
 const modes=make('nav','market-modes');modes.setAttribute('aria-label','Shop views');
 let mode=initialMode==='owned'?'owned':items.some(i=>i.sample)?'samples':'shop',category='All',selected=items[0]?.id,confirming=false,lastState='',disposed=false,pending=false;
 const samples=button('Friends picks','',()=>setMode('samples')),shop=button('67 Coins shop','',()=>setMode('shop')),badgeShop=button('Badge shop','',()=>setMode('badges')),boards=button('Skateboards','',()=>setMode('boards')),wardrobe=button('My items','',()=>setMode('owned'));modes.append(samples,shop,badgeShop,boards,wardrobe);
 const character=make('section','market-character'),portrait=make('img');portrait.alt='Current character';portrait.draggable=false;
 const characterInfo=make('div'),wearing=make('p','market-wearing');characterInfo.append(make('strong','','Your character'),wearing);
 const change=button('Change character','market-change',()=>{close();changeCharacter();});character.append(portrait,characterInfo,change);
 const filters=make('nav','market-filters');filters.setAttribute('aria-label','Item categories');
 const categories=['All',...new Set(items.map(marketCategory))],filterButtons=new Map();
 for(const name of categories){const b=button(name,'',()=>{category=name;confirming=false;render();});filterButtons.set(name,b);filters.append(b);}
 const list=make('div','market-products');list.setAttribute('role','list');list.setAttribute('aria-label','Catalogue items');
 const detail=make('footer','market-detail'),info=make('div','market-detail-info'),title=make('strong'),description=make('p'),action=button('','market-action',act),cancel=button('Cancel','market-cancel',()=>{confirming=false;render();});
 info.append(title,description);detail.append(info,cancel,action);
 const status=make('p','market-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const sidebar=make('aside','market-sidebar');sidebar.append(modes,make('p','market-eyebrow','COLLECTION'),filters);
 const stage=make('section','market-stage');stage.setAttribute('aria-label','Real 3D item preview');
 const stageLabel=make('span','market-stage-category'),stageArt=make('div','market-stage-art'),stageName=make('h3'),stageNote=make('p','market-stage-note','Loading item model…');
 const canvas=make('canvas','market-model-canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','3D item. Drag or use arrow keys to rotate.');stageArt.append(canvas);
 const thumbnails=new Map();let modelView=null,modelFailed=false;
 stage.append(stageLabel,stageArt,stageName,stageNote,character);
 root.append(header,sidebar,stage,list,detail,status);panel.classList.add('market-catalogue-host','park-ui-panel');panel.append(root);
 // Keep focus and pointer input in the shop without unmounting the park.
 const hidden=[],seen=new Set(),parents=new Set();
 function isolate(){let branch=panel;while(branch?.parentElement){parents.add(branch.parentElement);for(const sibling of branch.parentElement.children)if(sibling!==branch&&sibling instanceof doc.defaultView.HTMLElement&&!seen.has(sibling)){seen.add(sibling);hidden.push([sibling,sibling.inert,sibling.classList.contains('market-background-hidden')]);sibling.inert=true;sibling.classList.add('market-background-hidden');}branch=branch.parentElement;if(branch===doc.body)break;}}
 isolate();const isolationObserver=new doc.defaultView.MutationObserver(isolate);for(const parent of parents)isolationObserver.observe(parent,{childList:true});
 function icon(item){const src=thumbnails.get(item.id);if(src){const img=make('img');img.src=src;img.alt=item.name+' · real model';img.draggable=false;return img;}return make('span','market-model-loading',thumbnails.has(item.id)?'Preview unavailable':'Loading model…');}
 import('./market-model-view.js').then(({createMarketModelView})=>{if(disposed)return;modelView=createMarketModelView({canvas,onThumbnail(id,url){if(disposed)return;thumbnails.set(id,url);for(const card of list.querySelectorAll('[data-item]'))if(card.dataset.item===id)card.querySelector('.market-product-art').replaceChildren(icon(items.find(i=>i.id===id)));},onStatus(value,id){if(disposed||selected!==id)return;canvas.style.visibility=value==='ready'?'visible':'hidden';stageNote.textContent=value==='ready'?'Real item model · Drag to rotate':value==='error'?'Preview unavailable. Select another item to retry.':'Loading item model…';}});render();}).catch(()=>{if(!disposed){modelFailed=true;stageNote.textContent='3D preview unavailable. Close and reopen the shop to retry.';}});
 const offer=item=>itemOffer(item,mode==='badges'?'badges':'coins');
 function setMode(value){if(pending)return;mode=['owned','badges','boards','samples'].includes(value)?value:'shop';category='All';confirming=false;status.textContent='';render();}
 function render(){
  if(disposed)return;const s=state();lastState=JSON.stringify(s);wallet.textContent=`67 ${s.coins} · FB ${s.badges||0}`;wallet.setAttribute('aria-label',`${s.coins} Six Seven Coins, ${s.badges||0} Fashion Badges`);wallet.title='67: Six Seven Coins · FB: Fashion Badges';root.setAttribute('aria-busy',String(pending));samples.disabled=shop.disabled=badgeShop.disabled=boards.disabled=wardrobe.disabled=change.disabled=cancel.disabled=pending;
  if(!status.textContent)status.textContent=mode==='samples'?'One pick per type · Already included in your wardrobe.':mode==='badges'?(s.badgeShop?'Earn Fashion Badges in Daily tasks and Parcel post. No Coins will be spent.':'Badge purchases are not available on this server yet.'):'Six Seven Coins shop · No real-money top-up. Existing items stay yours.';
  const src=new URL(`./profile-portraits/${s.equipment.base}.png?v=profile-hud-20261002-1`,import.meta.url).href;
  if(portrait.src!==src)portrait.src=src;
  wearing.textContent=items.filter(i=>marketItemState(i,s).equipped&&!i.board).map(i=>i.name).join(' · ')||'Original look';
  shop.setAttribute('aria-pressed',String(mode==='shop'));wardrobe.setAttribute('aria-pressed',String(mode==='owned'));
  badgeShop.setAttribute('aria-pressed',String(mode==='badges'));
  boards.setAttribute('aria-pressed',String(mode==='boards'));
  samples.setAttribute('aria-pressed',String(mode==='samples'));
  const available=items.filter(i=>(mode==='samples'?i.sample:mode==='shop'?!i.sample:true)&&(mode!=='owned'||i.included||s.owned.includes(i.id))&&(mode!=='boards'||i.board)&&offer(i));
  if(category!=='All'&&!available.some(i=>marketCategory(i)===category))category='All';
  for(const [name,b]of filterButtons){b.hidden=name!=='All'&&!available.some(i=>marketCategory(i)===name);b.setAttribute('aria-pressed',String(category===name));b.disabled=pending;}
  const visible=available.filter(i=>category==='All'||marketCategory(i)===category).map(offer).filter(Boolean);
  modelView?.thumbnails(visible);
  if(!visible.some(i=>i.id===selected)){selected=visible[0]?.id;confirming=false;}
  const scroll=list.scrollTop,focused=doc.activeElement?.dataset.item;list.replaceChildren();
  if(!visible.length){const empty=make('div','market-empty');empty.append(make('strong','','Your next favourite is waiting'),make('p','','Items you buy will appear here. You can equip and change them whenever you like.'),button('Browse shop','',()=>{category='All';setMode('shop');}));list.append(empty);}
  for(const item of visible){
   const row=make('div');row.setAttribute('role','listitem');const card=button('','market-product',()=>{if(pending)return;selected=item.id;confirming=false;render();});card.disabled=pending;card.dataset.item=item.id;card.setAttribute('aria-label',item.name);card.setAttribute('aria-pressed',String(selected===item.id));
   const art=make('span','market-product-art');art.style.setProperty('--item-tint',item.color+'30');art.append(icon(item));
   const own=marketItemState(item,s),label=make('span','market-product-state',own.equipped?'Equipped':item.included?'Included':own.owned?'Owned':`${item.price} ${item.currency==='badges'?'FB':'67 Coins'}`);label.title=currencyName(item.currency);
   card.append(art,make('strong','',item.name),make('small','',marketCategory(item)),label);row.append(card);list.append(row);
  }
  list.scrollTop=scroll;if(focused)list.querySelector(`[data-item="${focused}"]`)?.focus({preventScroll:true});
  const base=items.find(i=>i.id===selected),item=base&&offer(base);detail.hidden=!item;
  stageName.textContent=item?.name||'Make it yours';stageLabel.textContent=item?marketCategory(item):'YOUR COLLECTION';stageNote.hidden=!item;modelView?.select(item);canvas.hidden=!item;
  if(!item)return;stageArt.style.setProperty('--item-tint',item.color+'30');if(modelFailed)stageNote.textContent='3D preview unavailable. Close and reopen the shop to retry.';
  const own=marketItemState(item,s);title.textContent=item.name;cancel.hidden=!confirming;
  description.textContent=pending?'Saving to your player account…':confirming?`Spend ${item.price} ${currencyName(item.currency)}? This item will be yours.`:own.equipped?'Worn now. Change it whenever you like.':own.owned?'Yours to wear. No extra charge.':own.affordable?`Price: ${item.price} ${currencyName(item.currency)}. Buy once; keep it.`:`You need ${own.remaining} more ${currencyName(item.currency)}.`;
  if(item.sample&&item.slot==='back'&&!pending&&!confirming)description.textContent+=' Backpack and wings share one slot.';
  action.textContent=pending?'Saving…':own.equipped?(item.board?'Equipped':'Remove'):own.owned?'Equip':`${confirming?'Confirm':'Buy'} · ${item.price} ${item.currency==='badges'?'FB':'67'}`;
  action.disabled=pending||own.equipped&&!!item.board||!own.owned&&(!own.affordable||mode==='badges'&&!s.badgeShop);
 }
 async function act(){
  if(pending||disposed)return;
  const base=items.find(i=>i.id===selected),item=base&&offer(base);if(!item)return;const s=state(),own=marketItemState(item,s);
  if(!own.owned&&!own.affordable||own.equipped&&item.board)return;
  if(!own.owned&&!confirming){confirming=true;status.textContent='';render();return;}
  pending=true;confirming=false;status.textContent='';render();
  try{
   let message;
   if(!own.owned){
    if(await buy(item)===false||!state().owned.includes(item.id))throw Error('Purchase did not complete. Check your balance and try again.');
    message=`${item.name} purchased and equipped.`;
   }else if(own.equipped&&!item.board){
    if(await remove(item)===false)throw Error('This item could not be removed. Please try again.');
    message=`${item.name} removed.`;
   }else{
    if(await equip(item)===false)throw Error('This item could not be equipped. Please try again.');
    message=`${item.name} equipped.`;
   }
   if(!disposed)status.textContent=message;
  }catch(error){if(!disposed)status.textContent=error?.message||'Your item could not be saved. Please try again.';}
  finally{pending=false;if(!disposed){render();action.focus({preventScroll:true});}}
 }
 function key(event){
  event.stopPropagation();if(event.key==='Escape'){event.preventDefault();if(confirming){confirming=false;render();action.focus();}else close();}
  if(event.key==='Tab'){
   const nodes=[...root.querySelectorAll('button:not(:disabled),canvas[tabindex="0"]')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
   if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
  }
 }
 root.addEventListener('keydown',key);root.addEventListener('keyup',e=>e.stopPropagation());render();exit.focus({preventScroll:true});
 return {setMode,update(){if(lastState!==JSON.stringify(state()))render();},dispose(){disposed=true;modelView?.dispose();thumbnails.clear();isolationObserver.disconnect();for(const[node,was,hadClass]of hidden){node.inert=was;if(!hadClass)node.classList.remove('market-background-hidden');}root.remove();panel.classList.remove('market-catalogue-host');}};
}
