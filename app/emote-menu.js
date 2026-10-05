import {getPlayerAccountState,subscribePlayerAccount,refreshPlayerProgression,saveEmoteFavorite} from './player-account-client.js?v=player-account-20261003-1';
import {DEFAULT_EMOTE_FAVORITES,EMOTE_FAVORITES_REVISION} from './emote-catalogue.js';
import {isTextEntry,releaseGameControls} from './text-input-guard.js';

export function EmoteMenu({React:R,catalogue,state,setEmote,setOpen,equipment,isNative,Icon,beginModal}){
 const h=R.createElement,dialog=R.useRef(null),alive=R.useRef(false),busy=R.useRef(false);
 const [editing,edit]=R.useState(false),[all,showAll]=R.useState(false),[slot,selectSlot]=R.useState(0),[pending,setPending]=R.useState(false),[status,setStatus]=R.useState('');
 const subscribe=R.useCallback(fn=>{state.listeners.add(fn);return()=>state.listeners.delete(fn)},[state]);
 R.useSyncExternalStore(subscribe,()=>state.version);
 const profile=R.useSyncExternalStore(subscribePlayerAccount,getPlayerAccountState),available=profile?.emotes?.revision===EMOTE_FAVORITES_REVISION;
 const favorites=profile?.emotes?.favorites||DEFAULT_EMOTE_FAVORITES;
 const rows=catalogue.filter(row=>row.id!=='groundpunch'||isNative(equipment.base));
 R.useEffect(()=>{
  alive.current=true;
  if(!document.getElementById('park-emote-menu-style')){const link=document.createElement('link');link.id='park-emote-menu-style';link.rel='stylesheet';link.href=new URL('./emote-menu.css',import.meta.url).href;document.head.append(link);}
  const keys=event=>{
   if(state.panelOpen){
    if(event.type==='keydown'&&(event.code==='KeyB'||event.key==='Escape')){event.preventDefault();setOpen(false);}
    event.stopImmediatePropagation();return;
   }
   if(event.type==='keydown'&&event.code==='KeyB'&&!event.repeat&&!event.defaultPrevented&&!isTextEntry(event.target)&&!document.querySelector('dialog[open]')){event.preventDefault();releaseGameControls();setOpen(true);}
  };
  window.addEventListener('keydown',keys,true);window.addEventListener('keyup',keys,true);
  return()=>{alive.current=false;window.removeEventListener('keydown',keys,true);window.removeEventListener('keyup',keys,true);};
 },[state,setOpen]);
 R.useEffect(()=>{
  if(!state.panelOpen)return;
  const origin=document.activeElement,el=dialog.current;edit(false);showAll(false);setStatus('');releaseGameControls();
  const unblock=beginModal?.();el.showModal();el.querySelector('[aria-label="Close emotes"]')?.focus({preventScroll:true});
  void refreshPlayerProgression().catch(e=>{if(alive.current&&el.open)setStatus(e.message);});
  return()=>{el.close();unblock?.();releaseGameControls();if(origin?.isConnected)origin.focus({preventScroll:true});};
 },[state.panelOpen]);
 // Favorite saves can finish after closing, but cannot mutate a later user's UI.
 async function assign(id){
  if(busy.current||!available)return;busy.current=true;setPending(true);setStatus('Saving favorites…');const owner=profile.id;
  try{await saveEmoteFavorite(slot,id);if(alive.current&&getPlayerAccountState()?.id===owner)setStatus('Favorites saved.');}
  catch(e){if(alive.current&&getPlayerAccountState()?.id===owner)setStatus(e.message);}
  finally{busy.current=false;if(alive.current)setPending(false);}
 }
 function play(id){if(!id||pending)return;setEmote(state.current===id?null:id);setOpen(false);}
 const icon=id=>['clap','sway','bow'].includes(id)?h('svg',{viewBox:'0 0 28 28',width:28,height:28,'aria-hidden':true},
  h('g',{fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
   h('circle',{cx:id==='bow'?17:14,cy:id==='bow'?10:6,r:2.5}),
   h('path',{d:id==='clap'?'M14 9v8m-5-6 5 3 5-3M14 17l-4 7m4-7 4 7M8 5 6 3m14 2 2-2':id==='bow'?'M15 12l-6 3 2 5-2 5m0-10 7 4m-5 1 4 5':'M14 9l-2 8 4 7m-4-7-4 6M12 12l-6 3m6-3 8-2M23 5l2 2-2 2'}))):h(Icon,{id});
 if(!state.panelOpen)return null;
 const control=(label,fn,props={})=>h('button',{type:'button',className:'park-ui-control',onClick:fn,...props},label);
 const tile=(row,fn,props={})=>control(h(R.Fragment,null,icon(row.id),h('span',null,row.label)),fn,props);
 return h('dialog',{ref:dialog,role:'dialog',className:'park-emote-menu park-ui-panel','aria-labelledby':'park-emote-title',onCancel:e=>{e.preventDefault();setOpen(false);},onClick:e=>{if(e.target!==e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)setOpen(false);}},
  h('header',null,h('div',null,h('small',null,'EXPRESS YOURSELF'),h('h2',{id:'park-emote-title'},'Emotes')),control('×',()=>setOpen(false),{'aria-label':'Close emotes'})),
  h('div',{className:'emote-menu-body'},
   h('div',{className:'emote-section-heading'},h('h3',null,'Favorites'),control(editing?'Done':'Edit favorites',()=>{edit(!editing);if(!editing)showAll(true);},{disabled:pending||!available,'aria-pressed':editing})),
   h('div',{className:'emote-favorite-slots'},...favorites.map((id,i)=>{
    const row=rows.find(e=>e.id===id),selected=editing&&slot===i;
    return control(h(R.Fragment,null,h('small',null,i+1),row?icon(row.id):h('span',{'aria-hidden':true},'+'),h('span',null,row?.label||'Empty')),()=>editing?selectSlot(i):play(row?.id),{key:i,disabled:pending||!editing&&!row,'aria-label':`${editing?'Choose':'Play'} favorite ${i+1}: ${row?.label||'Empty'}`,'aria-pressed':editing?selected:state.current===id&&!!id,'data-slot':i});
   })),
   editing?h('p',{className:'emote-help'},`Editing slot ${slot+1}. Choose an emote below. Existing favorites swap places.`):h('p',{className:'emote-help'},'Tap a favorite to play. Move to stop.'),
   editing?control('Clear this slot',()=>assign(null),{disabled:pending||!favorites[slot]}):null,
   control(all?'Hide all emotes':'All emotes',()=>showAll(!all),{'aria-expanded':all,'aria-controls':'emote-catalogue'}),
   h('div',{id:'emote-catalogue',className:'emote-catalogue',hidden:!all},...rows.map(row=>tile(row,()=>editing?assign(row.id):play(row.id),{key:row.id,disabled:pending,'aria-label':`${editing?'Save':'Play'} ${row.label}`,'aria-pressed':editing?favorites[slot]===row.id:state.current===row.id,'data-emote':row.id}))),
   state.current?control('Stop emote',()=>{setEmote(null);setOpen(false);}):null,
   h('p',{className:'emote-status',role:'status'},status||(!available?'Connect to your updated account to save favorites.':''))));
}
