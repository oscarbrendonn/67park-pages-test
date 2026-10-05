import {loadPlayerAccount,sendPlayerGift,subscribePlayerAccount,refreshPlayerProgression} from './player-account-client.js';
import {itemOffer,currencyName,walletBalance} from './park-economy.js';

export function createFriendActions(React,client){
 const h=React.createElement;
 function GiftPanel({person,onClose}){
  const [profile,setProfile]=React.useState(null),[items,setItems]=React.useState([]),[itemId,setItem]=React.useState(''),[currency,setCurrency]=React.useState('coins');
  const [status,setStatus]=React.useState('Loading your wallet…'),[busy,setBusy]=React.useState(false),[receipt,setReceipt]=React.useState(null),attempt=React.useRef(null),lock=React.useRef(false),close=React.useRef(null);
  React.useEffect(()=>{let live=true;close.current?.focus();const off=subscribePlayerAccount(p=>{if(live)setProfile(p)});
   Promise.all([loadPlayerAccount(),import('./chunk-G7D6MVRW.js?v=online-next-1')]).then(([p,m])=>{
    if(!live)return;const seen=new Set(),list=m.sa.flatMap(s=>s.items).filter(i=>{if(seen.has(i.id)||!(i.slot||i.board))return false;seen.add(i.id);return true});
    setProfile(p);setItems(list);setItem(list[0]?.id||'');setStatus('Choose a gift. It goes into your friend’s wardrobe, not onto their character.');
   }).catch(e=>{if(live)setStatus(e.message)});return()=>{live=false;off()};},[]);
  const item=items.find(i=>i.id===itemId),offer=item&&itemOffer(item,currency),balance=walletBalance(profile?.inventory,currency);
  const submit=async()=>{
   if(lock.current||!offer||!profile)return;lock.current=true;setBusy(true);setStatus('Sending gift…');
   const key=[person.id,itemId,currency].join('|');if(attempt.current?.key!==key)attempt.current={key,id:crypto.randomUUID()};
   try{const data=await sendPlayerGift(person.id,itemId,currency,attempt.current.id);setReceipt(data.gift);setStatus(`Gift sent to ${person.name}. They can equip it from their profile.`)}catch(e){setStatus(e.message)}finally{lock.current=false;setBusy(false)};
  };
  return h('section',{className:'friend-gift-panel park-ui-panel',role:'region','aria-label':`Gift to ${person.name}`,onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!busy)onClose()}}},
   h('header',null,h('h3',null,`A gift for ${person.name}`),h('button',{ref:close,type:'button',disabled:busy,onClick:onClose,'aria-label':'Close gift'},'Close')),
   h('p',{className:'friend-gift-wallet'},`${currencyName(currency)} · ${balance}`),
   !receipt&&h(React.Fragment,null,
    h('label',null,'Gift',h('select',{'aria-label':'Gift',value:itemId,disabled:busy,onChange:e=>{setItem(e.target.value);attempt.current=null}},...items.map(i=>h('option',{key:i.id,value:i.id},i.name)))),
    h('label',null,'Pay with',h('select',{'aria-label':'Pay with',value:currency,disabled:busy,onChange:e=>{setCurrency(e.target.value);attempt.current=null}},h('option',{value:'coins'},currencyName('coins')),h('option',{value:'badges'},currencyName('badges')))),
    h('p',null,offer?`${item.name} · ${offer.price} ${currencyName(currency)}`:'This item is not offered in this currency.'),
    h('button',{type:'button',className:'park-ui-control',disabled:busy||!offer||!profile||balance<offer.price,onClick:submit},busy?'Sending…':`Send gift${offer?' · '+offer.price:''}`),
    offer&&balance<offer.price&&h('p',null,'Not enough funds. Nothing has been charged.')),
   h('p',{role:'status','aria-live':'polite'},status));
 }
 function FriendActions({person,state}){
  const [gift,setGift]=React.useState(false);
  const free=state.connected&&!state.room,available=free&&person.connected&&!person.roomId;
  const action=(text,type,disabled)=>h('button',{type:'button',className:'park-ui-control',disabled,'aria-label':`${text} · ${person.name}`,onClick:()=>client.act(type,{target:person.id})},text);
  return h('div',{className:'friend-actions'},
   action('Go to friend','friend.travel',!available||!state.socialActions?.travel),
   action('Summon','friend.summon',!available||!state.socialActions?.summon),
   ['countdown','playing'].includes(person.roomStatus)&&action('Watch match','friend.watch',!free||!person.connected||!state.socialActions?.watch),
   h('button',{type:'button',className:'park-ui-control',disabled:!state.connected,'aria-expanded':gift,'aria-label':`Send gift · ${person.name}`,onClick:()=>setGift(!gift)},'Send gift'),
   gift&&h(GiftPanel,{person,onClose:()=>setGift(false)}));
 }
 function GiftHistory({notice}){
  const [profile,setProfile]=React.useState(null),[error,setError]=React.useState('');
  React.useEffect(()=>{let live=true;const off=subscribePlayerAccount(p=>{if(live)setProfile(p)});refreshPlayerProgression().then(p=>{if(live)setProfile(p)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false;off()};},[notice]);
  return h('section',{className:'friend-gift-history','aria-label':'Gift history'},h('h3',null,'Your gifts'),error&&h('p',{role:'alert'},error),
   !profile?.gifts?.received?.length&&h('p',null,'Received gifts appear here. Equip them from Profile → Wardrobe.'),
   ...(profile?.gifts?.received||[]).slice(0,10).map(g=>h('p',{key:g.id},`${g.fromName} sent ${g.itemId} · Owned`)),
   ...(profile?.gifts?.sent||[]).slice(0,5).map(g=>h('p',{key:g.id},`Sent ${g.itemId} to ${g.toName} · ${g.price} ${currencyName(g.currency)}`)));
 }
 return {FriendActions,GiftHistory};
}
