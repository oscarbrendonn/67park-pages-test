import {sa as shops,ta as inventory,va as openShop,wa as closeShop} from './chunk-G7D6MVRW.js?v=online-next-1';

// Use the real catalogue, prices, ownership, equipment and save path. No second
// wallet or cosmetic-only purchase state. Food/books are omitted here because
// they have no usable/equippable behaviour; their existing world shops remain.
export function marketCatalogue(catalogue){
 const seen=new Set();
 return catalogue.flatMap(shop=>shop.items).filter(item=>{
  if(!item.id||seen.has(item.id)||!(item.slot||item.board)||!Number.isFinite(item.price)||item.price<0)return false;
  seen.add(item.id);return true;
 });
}
const market={id:'park-market',sign:'Park Market',items:marketCatalogue(shops)};
let activePanel=null,returnFocus=null;
export function openParkMarket(host=window){
 // Leave unrelated dialogs to their own owner, rather than stacking two input
 // locks. The coin button is also hidden under those panels by the HUD CSS.
 if(inventory.menuShop===market){closeShop();return;}
 host.dispatchEvent(new Event('park:release-controls'));
 openShop(market);
}
export function updateMarketAccessibility(host=window,trigger){
 const doc=host.document,open=inventory.menuShop===market;
 trigger?.setAttribute('aria-expanded',String(open));
 const panel=open?doc.querySelector('.park-shop-panel'):null;
 if(activePanel&&(!open||activePanel!==panel)){
  activePanel=null;
  if(returnFocus?.isConnected&&!doc.querySelector('.wardrobe'))returnFocus.focus({preventScroll:true});
  returnFocus=null;
 }
 if(!panel||panel===activePanel)return;
 activePanel=panel;returnFocus=trigger;
 panel.classList.add('park-market-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Park Market');
 const close=panel.querySelector('button');close?.setAttribute('aria-label','Close market');
 const note=panel.lastElementChild;
 if(note)note.textContent='Bought items equip automatically · Find them in your Bag';
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeShop();return;}
  if(event.key==='Tab'){
   const buttons=[...panel.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
  }
  // Do not let shop keys drive, jump, chat or change unrelated panels.
  event.stopPropagation();
 });
 close?.focus({preventScroll:true});
}
