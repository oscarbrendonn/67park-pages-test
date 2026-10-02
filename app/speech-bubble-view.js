// One visual treatment for local and remote speech. No animation/frame loop,
// HTML interpretation, avatar bounds scan or gameplay state mutation.
const measured=new WeakMap();
const mapObstacles=new WeakMap();
export function speechPlacement(x,bottom,width,height,view,obstacles=[]){
 const leftEdge=view.left+10,rightEdge=view.left+view.width-10;
 const topEdge=view.top+10,bottomEdge=view.top+view.height-10;
 if(![x,bottom,width,height,leftEdge,rightEdge,topEdge,bottomEdge].every(Number.isFinite)||width<=0||height<=0||width>rightEdge-leftEdge||height>bottomEdge-topEdge)return null;
 const left=Math.max(leftEdge,Math.min(rightEdge-width,x-width/2));
 // Do not put a speech card below its speaker when the head is off the top.
 if(bottom-height<topEdge)return null;
 let top=Math.min(bottomEdge-height,bottom-height);
 // In overview, keep names and controls readable. Move only upward so the
 // tail still points toward the speaker; crowded messages remain in chat.
 for(let i=0;i<=obstacles.length;i++){
  const hits=obstacles.filter(r=>left<r.right+6&&left+width>r.left-6&&top<r.bottom+8&&top+height>r.top-8);
  if(!hits.length)break;
  top=Math.min(...hits.map(r=>r.top))-height-8;
  if(top<topEdge)return null;
 }
 return {left,top,tail:Math.max(18,Math.min(width-18,x-left))};
}
function installSpeechStyles(doc){
 if(!doc.getElementById('park-speech-style')){
  const style=doc.createElement('style');style.id='park-speech-style';
  style.textContent=`
   .park-speech-bubble{position:fixed;left:0;top:0;z-index:25;box-sizing:border-box;pointer-events:none;width:max-content;max-width:min(236px,calc(100vw - 28px));padding:9px 13px;border:1px solid #a899ac45;border-radius:17px;background:#fffcf7;color:#39323f;box-shadow:0 2px 3px #38283c0a,0 5px 14px #38283c1a,inset 0 1px 0 #fff;font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:0;text-align:center;overflow-wrap:anywhere;white-space:pre-wrap;text-wrap:pretty;isolation:isolate}
   .park-speech-bubble[hidden]{display:none!important}
   .park-speech-bubble::after{content:"";position:absolute;left:var(--speech-tail,50%);bottom:-5px;width:9px;height:9px;background:#fffcf7;border-right:1px solid #a899ac45;border-bottom:1px solid #a899ac45;border-radius:0 0 3px 0;transform:translateX(-50%) rotate(45deg)}
   .park-speech-bubble[data-overview=true]{font-size:12px;padding:7px 11px;border-radius:14px}
   .park-speech-bubble[data-overview=true]::before{content:attr(data-speaker);display:block;font-size:10px;color:#638174;margin-bottom:2px}
   @media(max-height:480px){.park-speech-bubble{max-width:min(220px,calc(100vw - 28px));padding:7px 11px;font-size:12px;border-radius:14px}}
   body.park-unified-ui:has(#hawk-map-navigation) .park-chat:not([data-chat-keyboard=true]){left:max(12px,env(safe-area-inset-left))!important;top:auto!important;bottom:max(130px,calc(env(safe-area-inset-bottom) + 118px))!important;transform:none!important;max-width:min(300px,calc(100vw - 24px))!important}
   body.park-unified-ui:has(#hawk-map-navigation) .park-chat:not(:has(input))>div:first-child:not(:empty){position:static!important;max-width:100%!important;max-height:76px!important}
   body.park-unified-ui:has(.park-chat input) #hawk-map-navigation{visibility:hidden}
   @media(max-height:480px){body.park-unified-ui:has(#hawk-map-navigation) .park-chat:not(:has(input))>.park-chat-history{display:none!important}}
  `;doc.head.append(style);
 }
}
if(typeof document!=='undefined')installSpeechStyles(document);
export function createSpeechBubble(doc,{id,playerId}={}){
 installSpeechStyles(doc);
 const node=doc.createElement('div');node.className='park-speech-bubble'+(playerId?' remote-speech-bubble':'');
 if(id)node.id=id;if(playerId)node.dataset.playerId=playerId;
 node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');node.dir='auto';node.hidden=true;
 doc.body.append(node);return node;
}
export function placeSpeechBubble(node,x,bottom,rect,{overview=false}={}){
 const win=node.ownerDocument.defaultView,vv=win.visualViewport;
 if(node.dataset.overview!==String(overview))node.dataset.overview=String(overview);
 const left=Math.max(rect?.left||0,vv?.offsetLeft||0),top=Math.max(rect?.top||0,vv?.offsetTop||0);
 const right=Math.min(rect?.right??win.innerWidth,(vv?.offsetLeft||0)+(vv?.width||win.innerWidth));
 const end=Math.min(rect?.bottom??win.innerHeight,(vv?.offsetTop||0)+(vv?.height||win.innerHeight));
 const view={left,top,width:right-left,height:end-top};
 const key=node.textContent+'|'+view.width+'|'+win.innerHeight+'|'+overview+'|'+node.dataset.speaker;
 let size=measured.get(node);
 if(size?.key!==key){
  node.style.maxWidth=Math.max(0,Math.min(overview?190:win.innerHeight<=480?220:236,view.width-20))+'px';
  node.style.visibility='hidden';node.hidden=false;
  size={key,width:node.offsetWidth,height:node.offsetHeight};measured.set(node,size);
  node.style.visibility='';
 }
 const obstacles=[];
 if(overview){
  const doc=node.ownerDocument,now=win.performance.now();let cached=mapObstacles.get(doc);
  if(!cached||now-cached.at>=80||cached.width!==view.width||cached.height!==view.height){
   const boxes=[];
   for(const el of doc.querySelectorAll('.park-map-player,.park-map-player-name,.park-toolbar>button,.online-toggle,.park-chat,#hawk-map-navigation')){
    const r=el.getBoundingClientRect();if(r.width&&r.height&&win.getComputedStyle(el).visibility!=='hidden')boxes.push(r);
   }
   cached={at:now,width:view.width,height:view.height,boxes};mapObstacles.set(doc,cached);
  }
  obstacles.push(...cached.boxes);
  // Fixed priority avoids two neighboring cards chasing each other upward.
  const priority=node.dataset.playerId||'';
  for(const other of doc.querySelectorAll('.park-speech-bubble[data-overview=true]:not([hidden])'))if(other!==node&&(other.dataset.playerId||'')<priority)obstacles.push(other.getBoundingClientRect());
 }
 const point=speechPlacement(x,bottom,size.width,size.height,view,obstacles);
 if(!point){node.hidden=true;return false;}
 const transform=`translate3d(${Math.round(point.left)}px,${Math.round(point.top)}px,0)`;
 if(node.style.transform!==transform)node.style.transform=transform;
 const tail=Math.round(point.tail)+'px';if(node.style.getPropertyValue('--speech-tail')!==tail)node.style.setProperty('--speech-tail',tail);
 node.hidden=false;return true;
}
