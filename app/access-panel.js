// A lightweight playtest entrance, NOT server-side authentication. Pages and
// game assets remain public on GitHub Pages. Never store the submitted password.
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
export async function startAccessScripts(doc=document){
 const errors=[];
 for(const parked of doc.querySelectorAll('script[data-park-access-type]')){
  try{await new Promise((resolve,reject)=>{
   const script=doc.createElement('script');
   for(const {name,value}of parked.attributes)if(name!=='type'&&name!=='data-park-access-type')script.setAttribute(name,value);
   script.type=parked.dataset.parkAccessType;script.async=false;
   const timer=setTimeout(()=>reject(Error('Game startup timed out')),60000);
   const finish=error=>{clearTimeout(timer);script.onload=script.onerror=null;error?reject(error):resolve();};
   script.onload=()=>finish();script.onerror=()=>finish(Error('Game script could not load'));
   script.textContent=parked.textContent;parked.replaceWith(script);
   if(!script.src&&script.type!=='module')finish();
  });}catch(error){
   errors.push(error);
   // Independent connection recovery must still start after a failed entry.
   const ledger=doc.defaultView?.__candyErrors;if(Array.isArray(ledger)&&ledger.length<100)ledger.push(error.message);
  }
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
  try{
   await startAccessScripts(doc);
   panel.remove();doc.documentElement.dataset.parkAccess='open';
  }catch{
   const recovery=doc.getElementById('park-connection-recovery');
   if(recovery&&!recovery.hidden){panel.remove();doc.documentElement.dataset.parkAccess='open';return;}
   // Do not leave a half-booted game interactive or automatically reload it.
   doc.documentElement.dataset.parkAccess='locked';
   message.textContent='The game could not load. Check your connection and try again.';
   submit.textContent='Reload';submit.disabled=false;reload=true;busy=false;
  }
 };
 toggle.addEventListener('click',()=>{
  const show=input.type==='password';input.type=show?'text':'password';
  toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-label',show?'Hide password':'Show password');
  toggle.setAttribute('aria-pressed',String(show));
 });
 input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');message.textContent='';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;if(reload){win.location.reload();return;}
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
