// Presentation only. Existing social authority and room commands remain intact.
import {createSocialFeatures} from './social-features.js?v=friend-lobbies-1';
export const SOCIAL_TABS=Object.freeze(['play','friends','requests','party','account']);
export function friendLobbyAction(state,person){
 if(!state.connected)return {label:'Reconnect first',disabled:true};
 if(!person.connected||!person.island)return {label:'Offline',disabled:true};
 if(state.room)return {label:'Leave your room first',disabled:true};
 if(person.roomId)return {label:'In a match room',disabled:true};
 if(person.island.code===state.island?.code)return {label:'In your lobby',disabled:true};
 if(person.island.players>=person.island.capacity)return {label:'Lobby full',disabled:true};
 return {label:'Join lobby',disabled:false};
}
export function filterFriends(friends=[],query='',onlineOnly=false){
 // Search must not change when the browser's locale changes (notably I in tr).
 const fold=value=>value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
 const needle=fold(query.trim());
 return friends.filter(p=>(!onlineOnly||p.connected)&&(!needle||fold(p.name||'').includes(needle)))
  .sort((a,b)=>Number(!!b.connected)-Number(!!a.connected)||(a.name||'').localeCompare(b.name||''));
}
if(typeof document!=='undefined'){
 const css=document.querySelector('link[data-social-panel]')||document.createElement('link');
 css.rel='stylesheet';css.href=new URL('./social-panel.css?v=friend-lobbies-1',import.meta.url).href;css.dataset.socialPanel='1';
 if(!css.isConnected)document.head.append(css);
}
export function createSocialPanel(React,client){
 const h=React.createElement,{SocialSettings}=createSocialFeatures(React,null,client);
 const labels={play:'Play',friends:'Friends',requests:'Requests',party:'Party',account:'Account'};
 function useSocialView(state,dialog){
  const [view,setView]=React.useState(()=>/\/play\/(index\.html)?$/.test(location.pathname)?'play':'friends');
  const [query,setQuery]=React.useState(''),[onlineOnly,setOnlineOnly]=React.useState(false),lastRoom=React.useRef(null);
  React.useEffect(()=>{if(state.room?.code&&state.room.code!==lastRoom.current)setView('party');lastRoom.current=state.room?.code||null;},[state.room?.code]);
  React.useEffect(()=>{const scroll=dialog.current?.querySelector('.online-scroll');if(scroll)scroll.scrollTop=0;},[view]);
  return {view,setView,query,setQuery,onlineOnly,setOnlineOnly};
 }
 function SocialTabs({social,state}){
  const count=(state.invites?.length||0)+(state.requests?.length||0);
  const keys=event=>{
   let index=SOCIAL_TABS.indexOf(social.view);
   if(event.key==='ArrowRight')index=(index+1)%SOCIAL_TABS.length;
   else if(event.key==='ArrowLeft')index=(index+SOCIAL_TABS.length-1)%SOCIAL_TABS.length;
   else if(event.key==='Home')index=0;else if(event.key==='End')index=SOCIAL_TABS.length-1;else return;
   event.preventDefault();social.setView(SOCIAL_TABS[index]);event.currentTarget.querySelectorAll('[role=tab]')[index]?.focus();
  };
  return h('nav',{className:'social-tabs',role:'tablist','aria-label':'Play and friends sections',onKeyDown:keys},
   ...SOCIAL_TABS.map(id=>h('button',{key:id,id:'social-tab-'+id,type:'button',role:'tab','aria-selected':social.view===id,'aria-controls':'social-panel-content',tabIndex:social.view===id?0:-1,onClick:()=>social.setView(id)},
    labels[id],id==='requests'&&count>0&&h('span',{className:'social-tab-count','aria-label':count+' pending'},count),id==='party'&&state.room&&h('span',{className:'social-tab-count'},state.room.members.length))));
 }
 function FriendsTools({social,total,shown}){
  return h('div',{className:'social-friend-tools'},
   h('label',null,'Search friends',h('input',{type:'search',value:social.query,placeholder:'Search by name',autoComplete:'off',maxLength:80,onChange:e=>social.setQuery(e.target.value)})),
   h('label',{className:'social-online-filter'},h('input',{type:'checkbox',checked:social.onlineOnly,onChange:e=>social.setOnlineOnly(e.target.checked)}),'Online only'),
   h('small',{role:'status'},`${shown} of ${total} friends`));
 }
 function FriendRemove({person,connected}){
  const [confirm,setConfirm]=React.useState(false),cancel=React.useRef(null),trigger=React.useRef(null);
  React.useEffect(()=>{if(confirm)cancel.current?.focus();},[confirm]);
  if(!confirm)return h('button',{ref:trigger,type:'button',className:'subtle','aria-label':`Remove ${person.name} from friends`,disabled:!connected,onClick:()=>setConfirm(true)},'Remove');
  return h('span',{className:'social-remove-confirm',role:'group','aria-label':`Remove ${person.name} confirmation`,onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setConfirm(false);queueMicrotask(()=>trigger.current?.focus());}}},
   h('span',null,`Remove ${person.name}?`),
   h('button',{type:'button',disabled:!connected,onClick:()=>{if(connected){client.act('friend.remove',{target:person.id});setConfirm(false);}}},'Remove friend'),
   h('button',{ref:cancel,type:'button',onClick:()=>{setConfirm(false);queueMicrotask(()=>trigger.current?.focus());}},'Cancel'));
 }
 function FriendLobbyJoin({person,state}){
  const action=friendLobbyAction(state,person);
  return h('button',{type:'button',className:'social-join-lobby',disabled:action.disabled,
   'aria-label':`${action.label} · ${person.name}`,title:person.island?`${person.island.players}/${person.island.capacity} players · Same park and games`:'Friend is offline',
   onClick:()=>{if(!action.disabled)client.act('island.join-friend',{target:person.id});}},action.label);
 }
 function RequestsPanel({state,canJoin}){
  const invitations=state.invites||[],requests=state.requests||[],sent=state.sentInvites||[];
  return h('section',{className:'online-card social-requests-panel','aria-label':'Requests and invitations'},
   h('h2',null,'Requests & invitations'),
   !invitations.length&&!requests.length&&h('p',null,'No incoming requests. New invitations will appear here.'),
   ...invitations.map(i=>h('div',{className:'online-invite',key:i.id},h('div',null,h('b',null,i.from),h('p',null,i.kind==='match'?'Match invitation':'Island invitation')),
    h('button',{type:'button',disabled:!canJoin,onClick:()=>client.act('invite.accept',{id:i.id})},'Join'),
    h('button',{type:'button',disabled:!state.connected,'aria-label':`Decline invitation from ${i.from}`,onClick:()=>client.act('invite.decline',{id:i.id})},'Decline'))),
   invitations.length>0&&!canJoin&&h('p',null,state.connected?'Finish or leave your current match before joining an invitation.':'Reconnect to respond to invitations.'),
   ...requests.map(q=>h('div',{className:'online-invite',key:q.id},h('div',null,h('b',null,q.fromPlayer?.name||'Player'),h('p',null,'Wants to be your friend.')),
    h('button',{type:'button',disabled:!state.connected,onClick:()=>client.act('friend.accept',{id:q.id})},'Accept'),
    h('button',{type:'button',disabled:!state.connected,'aria-label':`Decline friend request from ${q.fromPlayer?.name||'Player'}`,onClick:()=>client.act('friend.decline',{id:q.id})},'Decline'))),
   h(SocialSettings,{state,view:'requests'}),
   sent.length>0&&h('h3',null,'Sent invitations'),
   ...sent.map(i=>h('div',{className:'social-pending',key:i.id},h('span',null,`${i.to} · Invitation pending`),h('button',{disabled:!state.connected,'aria-label':`Cancel invitation to ${i.to}`,onClick:()=>client.act('invite.cancel',{id:i.id})},'Cancel'))),
   !!state.inviteActivity?.length&&h('details',{className:'social-invite-history',open:true},h('summary',null,'Invitation activity'),h('ul',{className:'social-people','aria-label':'Invitation activity'},...state.inviteActivity.slice(-6).reverse().map(i=>h('li',{key:i.id},`${i.name} · ${i.direction==='sent'?'Sent':'Received'} · ${i.status}`)))));
 }
 function AccountPanel({state}){return h('section',{className:'online-card social-account-panel','aria-label':'Account and privacy'},h('h2',null,'Account & privacy'),h(SocialSettings,{state,view:'account'}));}
 function PartyEmpty({onPlay}){return h('section',{className:'online-card social-party-empty'},h('h2',null,'Your party'),h('p',null,'Create a room or find a match in Play. Your team will appear here.'),h('button',{type:'button',onClick:onPlay},'Choose a game'));}
 return {useSocialView,SocialTabs,FriendsTools,FriendRemove,FriendLobbyJoin,RequestsPanel,AccountPanel,PartyEmpty,filterFriends};
}
