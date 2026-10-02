import {Vector3} from 'three';
import {createSpeechBubble,placeSpeechBubble} from './speech-bubble-view.js?v=speech-polish-1';
let bubble=null,expires=0,visual=null,head=null;
const anchor=new Vector3();
let failed=false,nextSearch=0;
if(typeof window!=='undefined')window.addEventListener('park:chat-rejected',()=>{expires=1;failed=true;if(bubble)bubble.hidden=true;});
const diagnostics={messages:0,updates:0,errors:0};
const stack=[],seen=new Set();
export function speechDiagnostics(){return {...diagnostics};}
function fail(){failed=true;diagnostics.errors++;try{if(bubble){bubble.hidden=true;bubble.dataset.state='unavailable';}}catch{}}
function attachedTo(node,root){for(let n=0;node&&n<64;n++,node=node.parent)if(node===root)return true;return false;}
function findHead(root){
 stack.length=0;seen.clear();if(root)stack.push(root);
 for(let count=0;stack.length&&count<512;count++){
  const node=stack.pop();if(!node||seen.has(node))continue;seen.add(node);
  if(node.isBone&&/^Head(?:_\d+)?$/i.test(node.name))return node;
  if(Array.isArray(node.children))for(let i=Math.min(node.children.length,512)-1;i>=0;i--)if(stack.length<512)stack.push(node.children[i]);
 }
 return null;
}
export function showLocalSpeech(text){
 try{showSpeech(text);}catch{fail();}
}
function showSpeech(text){
 if(typeof text!=='string')return;
 const message=text.slice(0,140).trim();
 if(!message)return;
 if(!bubble)bubble=createSpeechBubble(document,{id:'local-speech-bubble'});
 bubble.textContent=message; // Never interpret chat as HTML.
 bubble.dataset.speaker='You';
 // Start the reading time only once the keyboard/menu has released the view.
 bubble.hidden=true;expires=0;failed=false;visual=null;head=null;nextSearch=0;diagnostics.messages++;
}
export function updateLocalSpeech(context){
 if(!bubble||failed)return;
 try{projectSpeech(context);}catch{fail();}
}
function projectSpeech(context){
 if((expires&&performance.now()>expires)||document.hidden||!context?.camera||!context.position||context.blocked||context.parked){bubble.hidden=true;return;}
 if(visual!==context.visual||head&&!attachedTo(head,context.visual)){visual=context.visual;head=null;nextSearch=0;}
 if(!head&&performance.now()>=nextSearch){head=findHead(visual);nextSearch=performance.now()+250;}
 anchor.set(context.position.x,context.position.y+2,context.position.z);
 // The renderer maintains these matrices. Never measure/skin every vertex or
 // recursively update a live character from the optional chat overlay.
 const matrix=head?.matrixWorld?.elements;
 if(matrix&&[matrix[12],matrix[13],matrix[14]].every(Number.isFinite))anchor.set(matrix[12],matrix[13]+.55,matrix[14]);
 anchor.project(context.camera);
 if(![anchor.x,anchor.y,anchor.z].every(Number.isFinite)||Math.abs(anchor.x)>1||Math.abs(anchor.y)>1||anchor.z<-1||anchor.z>1){bubble.hidden=true;return;}
 const rect=document.querySelector('canvas')?.getBoundingClientRect();
 const width=rect?.width||innerWidth,height=rect?.height||innerHeight;
 if(!placeSpeechBubble(bubble,(rect?.left||0)+(anchor.x+1)*width/2,(rect?.top||0)+(1-anchor.y)*height/2-12,rect,{overview:!!context.hawk||!!context.camera.userData?.parkOverview}))return;
 if(!expires)expires=performance.now()+10000;
 diagnostics.updates++;
}
