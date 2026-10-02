import {botPracticeUrl} from './bot-practice.js';
import {invitationServerNow} from './invitation-summary.js';
if(typeof document!=='undefined'&&!document.querySelector('link[data-party-fundamentals]')){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./party-fundamentals.css',import.meta.url).href;css.dataset.partyFundamentals='1';document.head.append(css);
}
export const elapsedQueue=(queuedAt,now)=>Number.isFinite(queuedAt)&&Number.isFinite(now)?Math.max(0,Math.floor((now-queuedAt)/1000)):0;
export const queueTimeLabel=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export function requestPartyAction(state,person){
 if(!state.connected)return {label:'Reconnect first',disabled:true};
 if(state.room)return {label:'Leave your room first',disabled:true};
 if(!person.connected)return {label:'Offline',disabled:true};
 if(person.roomStatus!=='waiting')return {label:'Party is not waiting',disabled:true};
 if(state.sentPartyRequests?.length)return {label:'Request pending',disabled:true};
 return {label:'Ask to join party',disabled:false};
}

// Resolve only a matching authoritative receipt. A plain room=null snapshot,
// local optimistic state, timeout, or disconnect never authorizes navigation.
export function leaveForBotPractice(client,room,{timeoutMs=8000,id=globalThis.crypto.randomUUID().replaceAll('-','')}={}){
 return new Promise((resolve,reject)=>{
  let done=false,timer,unsubscribe=()=>{};
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);unsubscribe();error?reject(error):resolve(value);};
  const check=()=>{const s=client.getSnapshot();if(!s.connected)return finish(Error('Connection lost. Reconnect before opening bot practice.'));
   if(s.practiceExit?.id===id&&!s.room)return finish(null,botPracticeUrl(s.practiceExit.mode));
   if(s.error)finish(Error(s.error));
  };
  // act clears the previous server error synchronously; subscribe afterwards
  // then check to cover a fast receipt without mistaking a stale error for it.
  if(client.act('queue.practice-leave',{id,code:room.code,confirmed:true})===false)return finish(Error('The request was not sent. Please reconnect.'));
  unsubscribe=client.subscribe(check);timer=setTimeout(()=>finish(Error('The server did not confirm the switch. Check your party before retrying.')),timeoutMs);check();
 });
}

export function createPartyFundamentals(React,client){
 const h=React.createElement;
 function useServerNow(state,active){
  const [clock,setClock]=React.useState(()=>Date.now()),anchor=React.useRef(null);
  if(Number.isFinite(state.now)&&anchor.current?.serverNow!==state.now)anchor.current={serverNow:state.now,receivedAt:Date.now()};
  React.useEffect(()=>{if(!active)return;setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[active]);
  return invitationServerNow(anchor.current,clock);
 }
 function ConfirmAction({label,title,description,confirmLabel,onConfirm,disabled=false}){
  const [open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),trigger=React.useRef(null),cancel=React.useRef(null);
  const close=()=>{if(busy)return;setOpen(false);setError('');queueMicrotask(()=>trigger.current?.focus());};
  React.useEffect(()=>{if(open)cancel.current?.focus();},[open]);
  const confirm=async()=>{if(disabled||busy)return;setBusy(true);setError('');try{await onConfirm();setOpen(false);queueMicrotask(()=>trigger.current?.focus());}catch(e){setError(e.message||'Please try again.');}finally{setBusy(false);}};
  return h(React.Fragment,null,h('button',{ref:trigger,type:'button',disabled:disabled||busy,onClick:()=>setOpen(true)},label),open&&h('div',{className:'party-fundamentals party-fundamentals-confirm',role:'group','aria-label':title,onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}},h('h3',null,title),h('p',null,description),h('div',{className:'party-fundamentals-actions'},h('button',{type:'button',disabled:disabled||busy,onClick:confirm},busy?'Please wait…':confirmLabel),h('button',{ref:cancel,type:'button',disabled:busy,onClick:close},'Cancel')),error&&h('p',{role:'alert'},error)));
 }
 function RemoveMember({state,person}){
  const room=state.room;
  if(!room||room.status!=='waiting'||room.host!==state.me?.id||person.id===state.me.id)return null;
  return h(ConfirmAction,{label:`Remove ${person.name}`,title:`Remove ${person.name} from this party?`,description:'They will stay in the park. This does not block them or remove your friendship.',confirmLabel:'Remove from party',disabled:!state.connected,onConfirm:()=>{const s=client.getSnapshot();if(!s.connected||s.room?.code!==room.code||s.room.status!=='waiting'||s.room.host!==s.me?.id)throw Error('The party changed. Please check it again.');if(client.act('room.remove-member',{target:person.id,code:room.code,confirmed:true})===false)throw Error('Could not send removal. Please reconnect.');}});
 }
 function PartyRequestButton({state,person}){
  const a=requestPartyAction(state,person);
  return h('button',{type:'button',disabled:a.disabled,'aria-label':`${a.label} · ${person.name}`,onClick:()=>{if(!requestPartyAction(client.getSnapshot(),person).disabled)client.act('party.request',{target:person.id});}},a.label);
 }
 function PartyRequests({state}){
  const incoming=state.partyRequests||[],sent=state.sentPartyRequests||[],now=useServerNow(state,!!(incoming.length||sent.length));
  if(!incoming.length&&!sent.length)return null;
  return h('section',{className:'party-fundamentals','aria-label':'Party join requests'},h('h3',null,'Party join requests'),...incoming.map(q=>h('div',{key:q.id,className:'party-fundamentals'},h('p',null,`${q.fromName} wants to join your party.`),h('small',null,q.expires<=now?'Request expired':`Expires in ${Math.max(0,Math.ceil((q.expires-now)/1000))}s`),h('div',{className:'party-fundamentals-actions'},h('button',{type:'button',disabled:!state.connected||q.expires<=now,'aria-label':`Accept party request from ${q.fromName}`,onClick:()=>client.act('party.request.accept',{id:q.id})},'Accept request'),h('button',{type:'button',disabled:!state.connected,'aria-label':`Decline party request from ${q.fromName}`,onClick:()=>client.act('party.request.decline',{id:q.id})},'Decline request')))),...sent.map(q=>h('div',{key:q.id,className:'party-fundamentals'},h('p',null,`Waiting for ${q.leaderName} to approve your request.`),h('small',null,q.expires<=now?'Request expired':`Expires in ${Math.max(0,Math.ceil((q.expires-now)/1000))}s`),h('button',{type:'button',disabled:!state.connected,onClick:()=>client.act('party.request.cancel',{id:q.id})},'Cancel party request'))));
 }
 function QueueTools({state}){
  const room=state.room,queued=room?.status==='queued',now=useServerNow(state,queued);
  if(!room||!['waiting','queued'].includes(room.status))return null;
  return h('section',{className:'party-fundamentals','aria-label':'Matchmaking choices'},queued&&h('p',null,'Finding players · ',h('span',{className:'party-fundamentals-time','aria-live':'off'},queueTimeLabel(elapsedQueue(room.queuedAt,now)))) ,h('p',null,queued?'Explore the park while you wait, or choose local bot practice.':'Local bot practice is separate from your online party.'),h('div',{className:'party-fundamentals-actions'},h(ConfirmAction,{label:'Switch to bot practice',title:'Leave this party for bot practice?',description:room.members.length>1?'Only you will leave. The remaining party stays together and matchmaking pauses. If you are leader, leadership moves to a teammate. Local practice does not award online scores.':'Your online room will close. You will start a local practice match with bots; no online scores are awarded.',confirmLabel:'Leave party & practice',disabled:!state.connected,onConfirm:async()=>{const url=await leaveForBotPractice(client,room);location.assign(url);}})));
 }
 return {ConfirmAction,RemoveMember,PartyRequestButton,PartyRequests,QueueTools};
}
