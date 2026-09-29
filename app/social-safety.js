import {chatVerdict,validSafetyId,SAFETY_LIMIT} from './chat-policy.js';
const KEY='67park.feel-lab.safety.v1';
const state=globalThis[Symbol.for(KEY)]??={blocked:new Set(),muted:new Set(),names:{},sockets:new Set(),pending:new Map(),loaded:false,feedback:null};
if(!state.loaded){state.loaded=true;try{const s=JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}');for(const k of ['blocked','muted'])state[k]=new Set((s[k]||[]).filter(validSafetyId).slice(0,SAFETY_LIMIT));state.names=s.names||{};}catch{}}
export const hidesPlayerChat=id=>state.blocked.has(id)||state.muted.has(id);
export const safetySnapshot=()=>({blocked:[...state.blocked],muted:[...state.muted],pending:state.pending.size});
function persist(){
 for(const id of Object.keys(state.names))if(!state.blocked.has(id)&&!state.muted.has(id)&&!state.pending.has('blocked:'+id)&&!state.pending.has('muted:'+id))delete state.names[id];
 try{localStorage.setItem(KEY,JSON.stringify({...safetySnapshot(),names:state.names}));}catch{chatFeedback('Safety works now, but browser storage is unavailable. Keep this tab open.');}
}
function changed(){
 const net=globalThis.__eggyNet;
 if(net?.chat){const filtered=net.chat.filter(m=>!hidesPlayerChat(m.id));if(filtered.length!==net.chat.length){net.chat=filtered;net.bump?.();}}
 if(typeof document!=='undefined')for(const n of document.querySelectorAll('.remote-speech-bubble'))if(hidesPlayerChat(n.dataset.playerId))n.hidden=true;
 globalThis.dispatchEvent?.(new Event('park:safety-change'));
}
export function chatFeedback(message){
 if(typeof document==='undefined')return;
 if(!state.feedback){const n=document.createElement('output');n.id='park-chat-feedback';n.setAttribute('role','status');n.style.cssText='position:fixed;z-index:11000;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));margin:auto;max-width:440px;border-radius:18px;background:#fff9ef;color:#453e49;padding:14px 18px;box-shadow:0 5px 28px #403b4829;font:600 14px/1.4 system-ui;pointer-events:none';document.body.append(n);state.feedback=n;}
 state.feedback.textContent=message;state.feedback.hidden=false;clearTimeout(state.feedbackTimer);state.feedbackTimer=setTimeout(()=>{state.feedback.hidden=true},4500);
}
export function setPlayerSafety(kind,id,value,name='Guest'){
 if(!['blocked','muted'].includes(kind)||!validSafetyId(id)||typeof value!=='boolean')return false;
 const ws=[...state.sockets].find(s=>s.channel==='online'&&s.ws.readyState===1)?.ws;
 if(!ws){chatFeedback('Reconnect before changing player safety.');return false;}
 if(value&&state[kind].size>=SAFETY_LIMIT&&!state[kind].has(id)){chatFeedback('Safety list is full. Remove an old entry first.');return false;}
 const key=kind+':'+id;if(state.pending.has(key))return false;
 if(state.pending.size>=16){chatFeedback('Wait for your previous safety changes to finish.');return false;}
 // Do not accumulate a queue while offline. Server acknowledgement is required.
 state.pending.set(key,{kind,id,value,at:Date.now()});
 if(value)state[kind].add(id); // hide immediately; removals wait for authority
 state.names[id]=String(name).slice(0,24);
 try{ws.send(JSON.stringify({t:'safety.set',kind,target:id,value}));persist();changed();return true;}catch{state.pending.delete(key);chatFeedback('Safety could not reach the server. Please reconnect.');return false;}
}
export function protectParkSocket(ws,channel){
 const owned={ws,channel};state.sockets.add(owned);const replayed=new WeakSet();
 const receive=event=>{
  if(replayed.has(event)||typeof event.data!=='string')return;
  let m;try{m=JSON.parse(event.data);}catch{return;}
  if(m.t==='safety.state'){
   for(const kind of ['blocked','muted']){
    const authoritative=new Set((m[kind]||[]).filter(validSafetyId).slice(0,SAFETY_LIMIT));
    // Keep additions locally until acknowledged; reconcile a timed-out removal
    // conservatively instead of silently allowing previously blocked contact.
    for(const [key,p]of state.pending)if(p.kind===kind){if(authoritative.has(p.id)===p.value)state.pending.delete(key);else if(Date.now()-p.at>8000){state.pending.delete(key);chatFeedback('Safety change was not confirmed. Try again.');}else if(p.value)authoritative.add(p.id);}
    state[kind]=authoritative;
   }
   persist();changed();return;
  }
  if(m.t==='chat.result'&&!m.ok){
   const net=globalThis.__eggyNet;
   if(net?.chat){net.chat=net.chat.filter(q=>q.nonce!==m.nonce);net.bump?.();}
   globalThis.dispatchEvent?.(new CustomEvent('park:chat-rejected',{detail:{nonce:m.nonce}}));
   chatFeedback(m.message||'Message was not sent.');return;
  }
  if(m.t==='chat'&&(hidesPlayerChat(m.id)||!chatVerdict(m.text).ok)){event.stopImmediatePropagation();return;}
  if(m.t==='welcome'){
   const chat=(m.chat||[]).filter(q=>!hidesPlayerChat(q.id)&&chatVerdict(q.text).ok);
   if(chat.length!==(m.chat||[]).length){event.stopImmediatePropagation();const filtered=new MessageEvent('message',{data:JSON.stringify({...m,chat})});replayed.add(filtered);ws.dispatchEvent(filtered);}
  }
 };
 ws.addEventListener('message',receive);
 ws.addEventListener('close',()=>{state.sockets.delete(owned);ws.removeEventListener('message',receive);if(channel==='online'){state.pending.clear();changed();}},{once:true});
 return ws;
}
export function installSafetyControls(container){
 const details=document.createElement('details');details.className='park-safety-controls';
 details.innerHTML='<summary>Players · mute & block</summary><p class="party-hint">Mute hides someone’s chat and speech bubbles. Block also stops friend requests, invitations and home visits between you. Avatars remain visible. Safety is saved to this guest identity; a different browser or cleared site data creates a different identity.</p><p class="party-hint">Text only. Links and explicit sexual content are filtered. Filters can miss disguised or unfamiliar language; use Block and tell a trusted adult about unsafe contact.</p><div data-safety-list></div>';
 container.append(details);
 const list=details.querySelector('[data-safety-list]');
 const rows=new Map();let signature='';
 const empty=document.createElement('p');empty.className='party-hint';empty.textContent='Other players will appear here when they join your lobby.';
 function render(){
  if(!details.open)return;
  const online=globalThis.__candyOnline?.data,me=online?.me?.id||globalThis.__eggyNet?.id;
  const players=new Map((online?.island?.players||[]).filter(p=>p.id!==me).map(p=>[p.id,p]));
  for(const id of [...state.blocked,...state.muted])if(!players.has(id))players.set(id,{id,name:state.names[id]||'Saved player'});
  const next=JSON.stringify([...players.values()].map(p=>[p.id,p.name,state.muted.has(p.id),state.blocked.has(p.id),state.pending.has('muted:'+p.id),state.pending.has('blocked:'+p.id)]));
  if(next===signature)return;signature=next;
  // Keep the same DOM targets across polling and acknowledgements. Replacing
  // the whole list can detach a button between pointerdown and pointerup,
  // especially on slow phones, and also drops keyboard/screen-reader focus.
  for(const [id,row]of rows)if(!players.has(id)){row.element.remove();rows.delete(id);}
  if(!players.size){if(!empty.isConnected)list.append(empty);return;}
  empty.remove();let index=0;
  for(const p of players.values()){
   let row=rows.get(p.id);
   if(!row){
    const element=document.createElement('div');element.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0;border-top:1px solid #443f4914';
    const label=document.createElement('span');label.style.cssText='flex:1;min-width:85px;overflow-wrap:anywhere';element.append(label);
    row={element,label,buttons:{},name:''};rows.set(p.id,row);
    for(const kind of ['muted','blocked']){
     const b=document.createElement('button');b.type='button';b.dataset.safety=kind;b.dataset.player=p.id;
     b.style.cssText='min-height:44px;min-width:78px;padding:8px 12px;border:1px solid #ddcfbf;border-radius:14px;color:#443b49;font:600 14px system-ui';
     b.onclick=()=>{setPlayerSafety(kind,p.id,!state[kind].has(p.id),row.name);render();};row.buttons[kind]=b;element.append(b);
    }
   }
   row.name=p.name||'Guest';if(row.label.textContent!==row.name)row.label.textContent=row.name;
   for(const kind of ['muted','blocked']){
    const b=row.buttons[kind],active=state[kind].has(p.id),text=kind==='muted'?(active?'Unmute':'Mute'):(active?'Unblock':'Block');
    if(b.textContent!==text)b.textContent=text;
    b.setAttribute('aria-label',text+' '+row.name);b.setAttribute('aria-pressed',String(active));b.disabled=state.pending.has(kind+':'+p.id);b.style.background=active?'#f8d9e5':'#fffaf1';
   }
   if(list.children[index]!==row.element)list.insertBefore(row.element,list.children[index]||null);index++;
  }
 }
 let timer;details.addEventListener('toggle',()=>{clearInterval(timer);if(details.open){render();timer=setInterval(()=>{if(!container.closest('[hidden]')){for(const ws of state.sockets)if(ws.channel==='online'&&ws.ws.readyState===1)ws.ws.send(JSON.stringify({t:'safety.sync'}));}},5000);}});
 globalThis.addEventListener?.('park:safety-change',render);
 globalThis.addEventListener?.('pagehide',()=>clearInterval(timer));
 return ()=>{clearInterval(timer);globalThis.removeEventListener?.('park:safety-change',render);details.remove();};
}
