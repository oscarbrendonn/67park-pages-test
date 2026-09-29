// Shared by the React bundle and the separately imported Island runtime.
const key=Symbol.for('67park.entry.v1'),manifestKey=Symbol.for('67park.entry.downloads.v1');
const now=()=>globalThis.performance?.now()??Date.now();
const shared=globalThis[key]??={listeners:new Set(),last:Date.now(),generation:0,manifest:new Map(),observed:new Map(),notifyTimer:null,lastNotify:0};
function freshValue(){shared.startedClock=now();return {status:'loading',stage:'Opening the park',step:0,total:15,files:0,bytes:0,error:'',slow:false,progress:0,downloadBytes:0,downloadTotal:0,downloadFiles:0,downloadExpectedFiles:0,entryStarted:Date.now(),elapsedMs:0,readyAt:null,stageEvents:[],milestones:{}};}
// A previously opened page can import a newly deployed Island runtime. Keep
// its shared object/listeners and existing state, filling only the fields that
// older React bundles did not create. Missing timing starts at adoption; no
// historical stage events or ready timestamp are fabricated.
shared.listeners??=new Set();shared.last??=Date.now();shared.generation??=0;
shared.manifest??=new Map();shared.observed??=new Map();shared.notifyTimer??=null;shared.lastNotify??=0;
if(!shared.value)shared.value=freshValue();
else{
 const previous=shared.value,startedClock=shared.startedClock??now(),defaults=freshValue();
 shared.startedClock=startedClock;shared.value={...defaults,...previous};
 shared.value.progress=previous.progress??(previous.status==='ready'?1:Math.min((shared.value.total-1)/shared.value.total,Math.max(0,shared.value.step)/shared.value.total));
}
const elapsed=()=>Math.max(0,Math.round(now()-shared.startedClock));
export const entrySnapshot=()=>shared.value;
export const subscribeEntry=fn=>{shared.listeners.add(fn);return()=>shared.listeners.delete(fn);};
function notify(){clearTimeout(shared.notifyTimer);shared.notifyTimer=null;shared.lastNotify=Date.now();for(const fn of shared.listeners)fn();}
function publish(patch){shared.value={...shared.value,...patch,elapsedMs:elapsed()};shared.last=Date.now();notify();}
function downloadState(){
 let bytes=0,total=0,files=0;
 for(const [url,expected]of shared.manifest){const seen=shared.observed.get(url);total+=expected;bytes+=Math.min(expected,seen?.bytes||0);if(seen?.complete)files++;}
 const fraction=total?bytes/total:shared.manifest.size?files/shared.manifest.size:0;
 // Prerequisite downloads occupy the first setup unit. No timer-based fill,
 // and the final setup unit is reserved for the explicit ready signal.
 const progress=shared.value.status==='ready'?1:Math.min((shared.value.total-1)/shared.value.total,Math.max(shared.value.step,fraction)/shared.value.total);
 return {downloadBytes:bytes,downloadTotal:total,downloadFiles:files,downloadExpectedFiles:shared.manifest.size,progress};
}
function reportDownload(){
 shared.value={...shared.value,...downloadState(),elapsedMs:elapsed()};shared.last=Date.now();
 // One shared throttle, not one throttle per concurrently downloading file.
 const wait=250-(Date.now()-shared.lastNotify);
 if(wait<=0)notify();else if(shared.notifyTimer===null)shared.notifyTimer=setTimeout(notify,wait);
}
function assetKey(input){
 try{const value=typeof input==='string'?input:input?.url??String(input);const url=new URL(value,globalThis.location?.href??'http://entry.local/');return url.pathname+url.search;}catch{return '';}
}
/** Expected decoded response bytes (raw file sizes), never Content-Length of gzip/br.
 * Call before requests, or seed Symbol.for('67park.entry.downloads.v1') before
 * the module script. Late configuration reconciles already observed requests.
 */
export function configureEntryDownloads(manifest){
 if(!Array.isArray(manifest)||manifest.length>512)throw Error('Entry download manifest must contain at most 512 assets');
 const entries=new Map();
 for(const item of manifest){if(!item||typeof item.url!=='string'||!item.url.startsWith('/')||item.url.startsWith('//')||!Number.isSafeInteger(item.bytes)||item.bytes<0)throw Error('Invalid entry download manifest asset');
  const url=assetKey(item.url);if(entries.has(url)&&entries.get(url)!==item.bytes)throw Error('Conflicting entry download manifest asset');entries.set(url,item.bytes);
 }
 shared.manifest=entries;publish(downloadState());
}
export function beginEntry({restart=false}={}){
 // CityMap mounts after prerequisite downloads. Do not discard their progress
 // or restart the deadline. A remount after ready/error starts a new cycle.
 if(shared.value.status==='loading'&&!restart)return;
 clearTimeout(shared.notifyTimer);shared.notifyTimer=null;shared.generation++;shared.observed.clear();shared.value=freshValue();publish(downloadState());
}
export async function entryStage(step,stage){
 if(shared.value.status==='error')throw Error(shared.value.error);
 if(shared.value.status==='ready')return;
 const next=Math.max(shared.value.step,Math.min(shared.value.total-1,Math.max(0,Math.trunc(Number(step)||0))));
 const events=shared.value.stageEvents;
 const stageEvents=next>shared.value.step?[...events,[next,elapsed()]].slice(-15):events;
 shared.value={...shared.value,step:next};publish({...downloadState(),stage,stageEvents,slow:false});
 await new Promise(r=>setTimeout(r,0));
}
export function recordEntryMilestone(name){
 if(typeof name!=='string'||!/^[a-z][a-zA-Z0-9]{0,31}$/.test(name))throw Error('Invalid entry milestone name');
 if(Object.hasOwn(shared.value.milestones,name)||Object.keys(shared.value.milestones).length>=16)return;
 publish({milestones:{...shared.value.milestones,[name]:elapsed()}});
}
export function entryReady(){
 if(shared.value.status!=='loading')return;
 publish({status:'ready',step:15,progress:1,stage:'Your park is ready',error:'',slow:false,readyAt:Date.now(),stageEvents:[...shared.value.stageEvents,[15,elapsed()]].slice(-15)});
}
export function entryFailed(error){if(shared.value.status!=='loading')return;publish({status:'error',stage:'The park could not finish loading',error:String(error?.message||error),slow:false});}
/** Compact, DOM-readable QA values only: no URLs, labels, names, or errors. */
export function entryTelemetryAttributes(value=shared.value){
 return {'data-entry-started':value.entryStarted,'data-entry-elapsed-ms':value.elapsedMs,'data-entry-ready-at':value.readyAt??'','data-entry-stage':value.step,'data-entry-files':value.files,'data-entry-bytes':value.bytes,'data-entry-download-bytes':value.downloadBytes,'data-entry-download-total':value.downloadTotal,'data-entry-download-files':value.downloadFiles,'data-entry-download-expected-files':value.downloadExpectedFiles,'data-entry-stage-events':JSON.stringify(value.stageEvents),'data-entry-milestones':JSON.stringify(value.milestones)};
}
export function watchEntry({slowMs=20000,deadlineMs=180000}={}){
 const timer=setInterval(()=>{
  if(shared.value.status!=='loading')return;
  if(elapsed()>deadlineMs)entryFailed('Loading took too long. Retry with your saved character.');
  else if(Date.now()-shared.last>slowMs&&!shared.value.slow){shared.value={...shared.value,slow:true,elapsedMs:elapsed()};notify();}
 },1000);
 return()=>clearInterval(timer);
}
export function retryEntry(){location.reload();}
// Idle deadline also covers the response body, not just HTTP headers.
// No global fetch override, no cache deletion, no unbounded retries.
export async function assetFetch(url,options={},config={}){
 const controller=new AbortController(),idleMs=config.idleMs??45000,fetcher=config.fetcher??globalThis.fetch;
 const generation=shared.generation,identity=assetKey(url);let attemptBytes=0;
 // Island preload queue reads this so it never re-requests a URL whose real request already started.
 if(identity&&(shared.requested??=new Set()).size<512)shared.requested.add(identity);
 let timer,reader,closed=false;
 const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new Error('Download stalled')),idleMs);};
 const external=()=>controller.abort(options.signal?.reason);
 options.signal?.addEventListener('abort',external,{once:true});if(options.signal?.aborted)external();
 const cleanup=()=>{if(closed)return;closed=true;clearTimeout(timer);options.signal?.removeEventListener('abort',external);};
 const observe=(bytes,complete=false)=>{
  if(generation!==shared.generation||shared.value.status!=='loading')return;
  attemptBytes+=bytes;
  // Bounded metadata only, never retain response chunks or asset contents.
  if(identity&&(shared.observed.has(identity)||shared.observed.size<512)){
   const previous=shared.observed.get(identity);
   shared.observed.set(identity,{bytes:Math.max(previous?.bytes||0,attemptBytes),complete:complete||previous?.complete||false});
  }
  shared.value={...shared.value,bytes:shared.value.bytes+bytes,files:shared.value.files+(complete?1:0)};reportDownload();
 };
 reset();
 try{
  const response=await fetcher(url,{...options,signal:controller.signal});
  if(!response.ok)throw Error('Could not download '+String(url).split('/').pop().split('?')[0]+' (HTTP '+response.status+')');
  if(!response.body){cleanup();observe(0,true);return response;}
  reader=response.body.getReader();
  const body=new ReadableStream({
   async pull(stream){try{reset();const {done,value}=await reader.read();if(done){cleanup();observe(0,true);stream.close();return;}
    observe(value.byteLength);stream.enqueue(value);reset();
   }catch(error){cleanup();stream.error(controller.signal.aborted?Error('Download interrupted. Check your connection and retry.'):error);}},
   cancel(reason){const cancelled=reader.cancel(reason);controller.abort(reason);cleanup();return cancelled;}
  });
  return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
 }catch(error){cleanup();throw controller.signal.aborted?Error('Download interrupted. Check your connection and retry.'):error;}
}
if(globalThis[manifestKey])configureEntryDownloads(globalThis[manifestKey]);
