import {sa as shops,ta as inventory,va as openShop,wa as closeShop,ya as equipBoard,i as board,Ba as equipment,Ha as setSlot,Ja as openWardrobe} from './chunk-G7D6MVRW.js?v=online-next-1';
import {createMarketCatalogueView} from './market-catalogue-view.js?v=player-account-20261003-1';
import {getPlayerAccountState,purchasePlayerItem,equipPlayerItem} from './player-account-client.js';
import {MARKET_SAMPLES} from './market-samples.js';
import {createMarketTransactions} from './market-transactions.js';
import {realItemOffer} from './real-item-policy.js';

// Use the real catalogue, server wallets, ownership, equipment and save path.
// No local currency authority. Food/books are omitted here because
// they have no usable/equippable behaviour; their existing world shops remain.
export function marketCatalogue(catalogue){
 const seen=new Set();
 return catalogue.flatMap(shop=>shop.items).map(realItemOffer).filter(Boolean).filter(item=>{
  if(!item.id||seen.has(item.id)||!(item.slot||item.board)||!Number.isFinite(item.price)||item.price<0)return false;
  seen.add(item.id);return true;
 });
}
const market={id:'park-market',sign:'Park Market',items:[...MARKET_SAMPLES,...marketCatalogue(shops)]};
const transactions=createMarketTransactions({inventory,equipment,setSlot,equipBoard,purchasePlayerItem,equipPlayerItem,getPlayerAccountState});
let activePanel=null,returnFocus=null,view=null,styleReady=false,stylePending=false,initialMode='shop';
function loadStyle(doc){
 if(styleReady||stylePending)return;stylePending=true;
 const links=['market-catalogue.css','market-screen.css'].map(file=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./'+file+'?v=market-screen-20261005-1',import.meta.url).href;return link;});
 let loaded=0;for(const link of links){link.onload=()=>{if(++loaded===links.length)styleReady=true;};link.onerror=()=>{for(const node of links)node.remove();stylePending=false;};doc.head.append(link);}
}
export function openParkMarket(host=window,options={}){
 loadStyle(host.document);
 // Leave unrelated dialogs to their own owner, rather than stacking two input
 // locks. The coin button is also hidden under those panels by the HUD CSS.
 if(inventory.menuShop===market){if(options.initialMode==='owned'){view?.setMode('owned');return;}closeShop();return;}
 initialMode=options.initialMode==='owned'?'owned':'shop';
 host.dispatchEvent(new Event('park:release-controls'));
 openShop(market);
}
export function updateMarketAccessibility(host=window,trigger){
 const doc=host.document,open=inventory.menuShop===market;
 trigger?.setAttribute('aria-expanded',String(open));
 const panel=open?doc.querySelector('.park-shop-panel'):null;
 if(activePanel&&(!open||activePanel!==panel)){
  view?.dispose();view=null;
  activePanel=null;
  if(returnFocus?.isConnected&&!doc.querySelector('.wardrobe'))returnFocus.focus({preventScroll:true});
  returnFocus=null;
 }
 if(!panel)return;
 if(panel===activePanel&&view){view.update();return;}
 if(styleReady){
  activePanel=panel;returnFocus=trigger;
  panel.classList.add('park-market-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Park Market');
  view=createMarketCatalogueView({doc,panel,items:market.items,initialMode,
   state:()=>({owned:[...inventory.owned],coins:inventory.coins,badges:getPlayerAccountState()?.inventory.badges||0,badgeShop:getPlayerAccountState()?.economy?.badgeShop===true,equipment:{...equipment},board:board.kind}),
   ...transactions,
   close:closeShop,changeCharacter:()=>openWardrobe(true),
  });return;
 }
 if(panel===activePanel)return;
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
