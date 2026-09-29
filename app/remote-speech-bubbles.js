import {Vector3} from 'three';
import {hidesPlayerChat} from './social-safety.js';

const entries=new Map(),anchor=new Vector3(),stack=[],seen=new Set();
const LIMIT=16,LIFETIME=10000;
let sheet=null;

function findHead(root){
  stack.length=0;seen.clear();stack.push(root);
  for(let i=0;stack.length&&i<512;i++){
    const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);
    if(node.isBone&&/^Head(?:_\d+)?$/i.test(node.name))return node;
    if(Array.isArray(node.children))for(let j=Math.min(node.children.length,512)-1;j>=0&&stack.length<512;j--)stack.push(node.children[j]);
  }
  return null;
}
function attached(node,root){for(let i=0;node&&i<64;i++,node=node.parent)if(node===root)return true;return false;}
function latest(messages,id){
  for(let i=(messages?.length||0)-1,n=0;i>=0&&n<30;i--,n++)if(messages[i]?.id===id&&!messages[i].pending)return messages[i];
  return null;
}
function element(id){
  if(!sheet){sheet=document.createElement('style');sheet.textContent='.remote-speech-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;width:10px;height:10px;border-radius:0 0 3px 0;background:#fffaf4;border-right:1px solid #8770692e;border-bottom:1px solid #8770692e;transform:translateX(-50%) rotate(45deg)}';document.head.append(sheet);}
  const node=document.createElement('div');node.className='remote-speech-bubble';node.dataset.playerId=id;
  node.setAttribute('role','status');node.setAttribute('aria-live','polite');
  node.style.cssText='position:fixed;left:0;top:0;z-index:25;pointer-events:none;max-width:min(240px,65vw);padding:10px 16px;border:1px solid #8770692e;border-radius:16px;background:#fffaf4;color:#443f43;box-shadow:0 2px 4px #51403a0a,0 8px 20px #51403a14,inset 0 1px 0 #fff;font:550 14px/1.45 system-ui;letter-spacing:.01em;text-align:center;overflow-wrap:anywhere;white-space:pre-wrap;';
  node.hidden=true;document.body.append(node);return node;
}

// Called by the existing remote-avatar frame callback. No separate frame loop,
// skinned-vertex bounds, recursive matrix updates, or per-message timers.
export function updateRemoteSpeech({id,visual,camera,messages,blocked=false,now=Date.now()}){
  blocked=blocked||hidesPlayerChat(id);
  let entry=entries.get(id);
  try{
    const message=latest(messages,id),at=Number(message?.at),text=typeof message?.text==='string'?message.text.trim().slice(0,140):'';
    if(!text||!Number.isFinite(at)||now-at>=LIFETIME||at-now>30000){if(entry&&!entry.node.hidden)entry.node.hidden=true;return;}
    const key=String(message.nonce||at)+'|'+text;
    if(!entry){
      if(entries.size>=LIMIT)removeRemoteSpeech(entries.keys().next().value);
      entry={node:element(id),key:'',visual:null,head:null,nextSearch:0,expires:0,failed:false,transform:''};entries.set(id,entry);
    }
    if(entry.key!==key){entry.key=key;entry.node.textContent=text;entry.expires=now+Math.min(LIFETIME,LIFETIME-Math.max(0,now-at));entry.failed=false;}
    if(entry.failed||now>=entry.expires||document.hidden||blocked||!camera||!visual){if(!entry.node.hidden)entry.node.hidden=true;return;}
    if(entry.visual!==visual||entry.head&&!attached(entry.head,visual)){entry.visual=visual;entry.head=null;entry.nextSearch=0;}
    if(!entry.head&&now>=entry.nextSearch){entry.head=findHead(visual);entry.nextSearch=now+250;}
    const p=visual.position,m=entry.head?.matrixWorld?.elements;
    if(!p){entry.node.hidden=true;return;}
    anchor.set(p.x,p.y+2,p.z);
    if(m&&Number.isFinite(m[12])&&Number.isFinite(m[13])&&Number.isFinite(m[14]))anchor.set(m[12],m[13]+.55,m[14]);
    anchor.project(camera);
    if(!(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)&&Number.isFinite(anchor.z))||Math.abs(anchor.x)>1||Math.abs(anchor.y)>1||anchor.z<-1||anchor.z>1){if(!entry.node.hidden)entry.node.hidden=true;return;}
    const rect=document.querySelector('canvas')?.getBoundingClientRect(),width=rect?.width||innerWidth,height=rect?.height||innerHeight;
    const label=document.querySelector('[data-remote-name="'+String(id).replace(/[^a-zA-Z0-9_-]/g,'')+'"]')?.getBoundingClientRect();
    let top=(rect?.top||0)+(1-anchor.y)*height/2-12;
    if(label?.width>0&&Number.isFinite(label.top))top=Math.min(top,label.top-10);
    const transform=`translate(${(rect?.left||0)+(anchor.x+1)*width/2}px,${top}px) translate(-50%,-100%)`;
    if(entry.transform!==transform){entry.node.style.transform=transform;entry.transform=transform;}
    entry.node.hidden=false;
  }catch{if(entry){entry.failed=true;try{entry.node.hidden=true;}catch{}}}
}
export function removeRemoteSpeech(id){const entry=entries.get(id);if(entry){try{entry.node.remove();}catch{}entries.delete(id);}}
export function clearRemoteSpeech(){for(const id of entries.keys())removeRemoteSpeech(id);}
export function remoteSpeechStats(){return {entries:entries.size,visible:[...entries.values()].filter(e=>!e.node.hidden).length};}
if(typeof window!=='undefined')window.addEventListener('pagehide',clearRemoteSpeech);
