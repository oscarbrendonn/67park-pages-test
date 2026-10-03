// UI only: transactions, ownership, equipment and persistence belong to the
// existing game. No second wallet and no extra WebGL context in the park.
export const marketCategory=item=>item.board?'Boards':({body:'Outfits',sprout:'Headwear',back:'Back',held:'Handheld'})[item.slot]||'Accessories';
export function marketItemState(item,{owned,coins,equipment,board}){
 const has=owned.includes(item.id),equipped=has&&(item.board?board===item.board:equipment[item.slot]===`shop:${item.id}`);
 return {owned:has,equipped,affordable:coins>=item.price,remaining:Math.max(0,item.price-coins)};
}
const artwork={
 cap:'M7 28c0-12 4-18 15-18 10 0 15 6 15 18M6 28h32l7 6H6Z',
 tshirt:'m16 9-12 8 7 10 5-3v20h22V24l5 3 7-10-12-8c-2 9-20 9-22 0Z',
 hoodie:'M17 12c0-14 20-14 20 0l12 7-6 11-6-4v18H17V26l-6 4-6-11Zm0 0 10 9 10-9M27 21v12',
 bag:'M13 17h28v29H13ZM20 17v-5c0-9 14-9 14 0v5M19 31h16v10H19ZM13 24h28',
 teddy:'M18 22a9 9 0 1 1 18 0 9 9 0 1 1-18 0M18 16a5 5 0 1 1-1-9M36 16a5 5 0 1 0 1-9M18 32c-12 4-7 16-2 10-3 11 6 12 8 4h6c2 8 11 7 8-4 5 6 10-6-2-10',
 ball:'M8 27a19 19 0 1 0 38 0 19 19 0 1 0-38 0M15 12c18 8 12 23 26 29M11 37c7-10 22-6 32-23',
 kite:'m27 5 16 18-16 17L11 23Zm0 0v35M11 23h32M27 40c-10 1 10 11 0 12',
 board:'M12 23c-12 5-6 16 5 12l27-12c12-5 6-16-5-12ZM18 35a4 4 0 1 0 8 0 4 4 0 1 0-8 0M36 27a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
};
export function createMarketCatalogueView({doc,panel,items,state,buy,equip,remove,close,changeCharacter}){
 const order=['Outfits','Headwear','Back','Accessories','Handheld','Boards'];items=[...items].sort((a,b)=>order.indexOf(marketCategory(a))-order.indexOf(marketCategory(b)));
 const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(label,cls,action)=>{const b=make('button',cls,label);b.type='button';b.addEventListener('click',action);return b;};
 const root=make('section','market-catalogue');root.setAttribute('aria-label','Shop and wardrobe');
 const header=make('header','market-heading'),brand=make('div'),logo=make('img','market-brand-logo');logo.src=new URL('../brand/67park-logo.png',import.meta.url).href;logo.alt='67Park';brand.append(logo,make('h2','','Park Shop'));
 const wallet=make('span','market-wallet'),exit=button('×','market-close',close);exit.setAttribute('aria-label','Close market');header.append(brand,wallet,exit);
 const modes=make('nav','market-modes');modes.setAttribute('aria-label','Shop views');
 let mode='shop',category='All',selected=items[0]?.id,confirming=false,lastState='',disposed=false;
 const shop=button('Shop','',()=>setMode('shop')),wardrobe=button('My items','',()=>setMode('owned'));modes.append(shop,wardrobe);
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
 root.append(header,modes,character,filters,list,detail,status);panel.classList.add('market-catalogue-host','park-ui-panel');panel.append(root);
 function icon(item){
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 56 56');svg.setAttribute('aria-hidden','true');
  const defs=doc.createElementNS(svg.namespaceURI,'defs'),gradient=doc.createElementNS(svg.namespaceURI,'linearGradient'),id='market-art-'+item.id;
  gradient.id=id;gradient.setAttribute('x2','0.7');gradient.setAttribute('y2','1');
  for(const [offset,color]of [['0%','#ffffff'],['40%',item.color],['100%',item.color]]){const stop=doc.createElementNS(svg.namespaceURI,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.append(stop);}defs.append(gradient);svg.append(defs);
  const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',artwork[item.board?'board':item.id]||artwork.ball);
  const depth=path.cloneNode();depth.setAttribute('transform','translate(0 2.5)');depth.setAttribute('class','market-art-depth');path.setAttribute('fill',`url(#${id})`);svg.append(depth,path);svg.style.setProperty('--item-color',item.color);return svg;
 }
 function setMode(value){mode=value;confirming=false;render();}
 function render(){
  if(disposed)return;const s=state();lastState=JSON.stringify(s);wallet.textContent=`₵ ${s.coins}`;wallet.setAttribute('aria-label',`${s.coins} coins`);
  const src=new URL(`./profile-portraits/${s.equipment.base}.png?v=profile-hud-20261002-1`,import.meta.url).href;
  if(portrait.src!==src)portrait.src=src;
  wearing.textContent=items.filter(i=>marketItemState(i,s).equipped&&!i.board).map(i=>i.name).join(' · ')||'Original look';
  shop.setAttribute('aria-pressed',String(mode==='shop'));wardrobe.setAttribute('aria-pressed',String(mode==='owned'));
  for(const [name,b]of filterButtons)b.setAttribute('aria-pressed',String(category===name));
  const visible=items.filter(i=>(category==='All'||marketCategory(i)===category)&&(mode!=='owned'||s.owned.includes(i.id)));
  if(!visible.some(i=>i.id===selected)){selected=visible[0]?.id;confirming=false;}
  const scroll=list.scrollTop,focused=doc.activeElement?.dataset.item;list.replaceChildren();
  if(!visible.length){const empty=make('div','market-empty');empty.append(make('strong','','Your next favourite is waiting'),make('p','','Items you buy will appear here. You can equip and change them whenever you like.'),button('Browse shop','',()=>{category='All';setMode('shop');}));list.append(empty);}
  for(const item of visible){
   const row=make('div');row.setAttribute('role','listitem');const card=button('','market-product',()=>{selected=item.id;confirming=false;render();});card.dataset.item=item.id;card.setAttribute('aria-label',item.name);card.setAttribute('aria-pressed',String(selected===item.id));
   const art=make('span','market-product-art');art.style.setProperty('--item-tint',item.color+'30');art.append(icon(item));
   const own=marketItemState(item,s),label=make('span','market-product-state',own.equipped?'Equipped':own.owned?'Owned':`₵ ${item.price}`);
   card.append(art,make('strong','',item.name),make('small','',marketCategory(item)),label);row.append(card);list.append(row);
  }
  list.scrollTop=scroll;if(focused)list.querySelector(`[data-item="${focused}"]`)?.focus({preventScroll:true});
  const item=items.find(i=>i.id===selected);detail.hidden=!item;if(!item)return;
  const own=marketItemState(item,s);title.textContent=item.name;cancel.hidden=!confirming;
  description.textContent=confirming?`Spend ${item.price} coins? This item will be yours.`:own.equipped?'Worn now. Change it whenever you like.':own.owned?'Yours to wear. No extra charge.':own.affordable?'Buy once. Keep it in My items.':`You need ${own.remaining} more coins.`;
  action.textContent=own.equipped?(item.board?'Equipped':'Remove'):own.owned?'Equip':confirming?`Confirm · ₵ ${item.price}`:`Buy · ₵ ${item.price}`;
  action.disabled=own.equipped&&!!item.board||!own.owned&&!own.affordable;
 }
 function act(){
  const item=items.find(i=>i.id===selected);if(!item)return;const s=state(),own=marketItemState(item,s);
  if(!own.owned){
   if(!own.affordable)return;if(!confirming){confirming=true;render();return;}
   buy(item);const next=state();status.textContent=next.owned.includes(item.id)?`${item.name} purchased and equipped.`:'Purchase did not complete. Your balance has been refreshed.';
  }else if(own.equipped&&!item.board){remove(item);status.textContent=`${item.name} removed.`;}
  else if(!own.equipped){equip(item);status.textContent=`${item.name} equipped.`;}
  confirming=false;render();action.focus({preventScroll:true});
 }
 function key(event){
  event.stopPropagation();if(event.key==='Escape'){event.preventDefault();if(confirming){confirming=false;render();action.focus();}else close();}
  if(event.key==='Tab'){
   const nodes=[...root.querySelectorAll('button:not(:disabled)')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
   if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
  }
 }
 root.addEventListener('keydown',key);root.addEventListener('keyup',e=>e.stopPropagation());render();exit.focus({preventScroll:true});
 return {update(){if(lastState!==JSON.stringify(state()))render();},dispose(){disposed=true;root.remove();panel.classList.remove('market-catalogue-host');}};
}
