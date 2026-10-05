// A lightweight playtest entrance, NOT server-side authentication. Pages and
// game assets remain public on GitHub Pages. Never store the submitted password.
import {GAME_LOAD_TIMEOUT_MS} from './startup-budget.js';
export const ACCESS_KEY='67park.access.v1';
export const ACCESS_REVISION='access-panel-1';
const digest='84c103c457dd89d26735175de81fb54fb4a06063b9573082a38441863ead0be3';

export async function matchesAccessPassword(value,crypto=globalThis.crypto){
 if(typeof value!=='string'||!value.length||value.length>128)return false;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')===digest;
}
export function hasTabAccess(storage){
 try{return storage.getItem(ACCESS_KEY)===ACCESS_REVISION;}catch{return false;}
}
export function rememberTabAccess(storage){
 try{storage.setItem(ACCESS_KEY,ACCESS_REVISION);}catch{/* Private storage may be unavailable; this page can still open. */}
}

// Inert script tags keep WebGL, models, audio and online sessions from starting
// behind the password form. Restore their original order, including classic
// input setup before the module entry. Import maps are left untouched.
export function warmAccessModules(doc){
 // Fetch only six known boot dependencies, after access is accepted. This
 // shortens dependency discovery without executing modules or preloading maps.
 try{
  if(doc.getElementById?.('park-boot-preload'))return;
  const entry=[...doc.querySelectorAll('script[data-park-access-type]')].find(n=>/\/app\/main\.js(?:\?|$)/.test(n.getAttribute?.('src')||''));
  if(!entry)return;
  const base=new URL('../',new URL(entry.getAttribute('src'),doc.baseURI));
  const imports=JSON.parse(doc.querySelector('script[type="importmap"]')?.textContent||'{}').imports||{};
  const files=['app/chunk-N3VSSEEL.js','app/chunk-G7D6MVRW.js','app/chunk-A5QZM2VZ.js','app/chunk-OZ77422N.js','vendor/three.module.js','vendor/three.core.js'];
  for(const [i,file]of files.entries()){
   const fallback=new URL(file,base),mapped=Object.values(imports).find(v=>typeof v==='string'&&new URL(v,doc.baseURI).pathname===fallback.pathname);
   const url=new URL(mapped||fallback,doc.baseURI);if(url.origin!==base.origin)continue;
   const link=doc.createElement('link');link.rel='modulepreload';link.href=url.href;if(i===0)link.id='park-boot-preload';doc.head.append(link);
  }
 }catch{/* A preload hint must never prevent the normal ordered boot. */}
}
export async function startAccessScripts(doc=document){
 warmAccessModules(doc);
 const errors=[];
 const record=(error,optional)=>{
  if(!optional)errors.push(error);
  // Optional presentation failures must not become a terminal recovery error.
  const win=doc.defaultView;
  const ledger=optional&&win?(win.__parkOptionalBootErrors??=[]):win?.__candyErrors;
  if(Array.isArray(ledger)&&ledger.length<100)ledger.push(error.message);
 };
 for(const parked of doc.querySelectorAll('script[data-park-access-type]')){
  const optional=parked.dataset.parkAccessOptional==='true';
  const loading=new Promise((resolve,reject)=>{
   const script=doc.createElement('script');
   for(const {name,value}of parked.attributes)if(name!=='type'&&name!=='data-park-access-type')script.setAttribute(name,value);
   script.type=parked.dataset.parkAccessType;script.async=false;
   // An async=false optional module would still block the browser's ordered
   // execution queue even without awaiting it here. Critical order stays intact.
   if(optional)script.async=true;
   let settled=false,timer;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;error?reject(error):resolve();};
   timer=setTimeout(()=>finish(Error('Game startup timed out')),GAME_LOAD_TIMEOUT_MS);
   script.onload=()=>finish();script.onerror=()=>finish(Error('Game script could not load'));
   script.textContent=parked.textContent;
   // Sports rebuilds body.innerHTML while its module loads. Remaining parked
   // nodes may then be detached: replacing one would never execute its script.
   try{
    if(parked.isConnected)parked.replaceWith(script);else (doc.head||doc.body).append(script);
    if(!script.src&&script.type!=='module')finish();
   }catch(error){finish(error);}
  });
  if(optional){void loading.catch(error=>record(error,true));continue;}
  // Independent connection recovery must still start after a failed entry.
  try{await loading;}catch(error){record(error,false);}
 }
 if(errors.length)throw errors[0];
}

export function installAccessPanel(doc=document,win=window){
 const panel=doc.getElementById('park-access');if(!panel||panel.dataset.installed)return;
 panel.dataset.installed='true';
 const form=panel.querySelector('form'),input=doc.getElementById('park-access-password');
 const submit=panel.querySelector('[type="submit"]'),toggle=panel.querySelector('[data-access-show]');
 const message=doc.getElementById('park-access-message');
 let storage;try{storage=win.sessionStorage;}catch{/* Denied storage must not block entering the password. */}
 let busy=false,reload=false;
 const launch=async()=>{
  busy=true;submit.disabled=true;submit.textContent='Opening the park…';input.value='';input.blur();input.disabled=true;toggle.disabled=true;
  message.textContent='';doc.documentElement.dataset.parkAccess='opening';
  const slow=setTimeout(()=>{
   if(!panel.isConnected||doc.documentElement.dataset.parkAccess!=='opening')return;
   message.textContent='Game files are taking longer to load. You can keep waiting or reload.';
   submit.textContent='Reload page';submit.disabled=false;reload=true;
  },20000);
  try{
   await startAccessScripts(doc);
   panel.remove();doc.documentElement.dataset.parkAccess='open';
  }catch{
   const recovery=doc.getElementById('park-connection-recovery');
   if(recovery&&!recovery.hidden){panel.remove();doc.documentElement.dataset.parkAccess='open';return;}
   // Do not leave a half-booted game interactive or automatically reload it.
   if(!panel.isConnected)doc.body.append(panel);
   doc.documentElement.dataset.parkAccess='locked';
   message.textContent='The game could not load. Check your connection and try again.';
   submit.textContent='Reload';submit.disabled=false;reload=true;busy=false;
  }finally{clearTimeout(slow);}
 };
 toggle.addEventListener('click',()=>{
  const show=input.type==='password';input.type=show?'text':'password';
  toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-label',show?'Hide password':'Show password');
  toggle.setAttribute('aria-pressed',String(show));
 });
 input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');message.textContent='';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(reload){win.location.reload();return;}if(busy)return;
  busy=true;submit.disabled=true;
  try{
   if(!await matchesAccessPassword(input.value,win.crypto)){
    input.setAttribute('aria-invalid','true');message.textContent='Incorrect password. Try again.';
    return;
   }
   rememberTabAccess(storage);await launch();
  }catch{message.textContent='Access could not be checked. Please try again.';}
  finally{if(doc.documentElement.dataset.parkAccess==='locked'){busy=false;submit.disabled=false;}}
 });
 submit.disabled=false;
 // This flag is inserted only into authenticated HTML by the private server.
 // It is a boot hint, not authority: every asset/API request still needs its
 // HttpOnly session cookie, regardless of DOM or sessionStorage changes.
 if(win.__parkServerAccess===true||hasTabAccess(storage))void launch();
}

if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installAccessPanel(),{once:true});
 else installAccessPanel();
}
