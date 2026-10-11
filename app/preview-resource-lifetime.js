// Preview-only resources. Shared templates, gameplay avatars and rig stay intact.
export function ownPreviewGeometry(model){
 const copies=new Map();let disposed=false;
 model.traverse(node=>{
  if(!node.isMesh||!node.geometry)return;
  const source=node.geometry;
  if(!copies.has(source))copies.set(source,source.clone());
  node.geometry=copies.get(source);
 });
 return()=>{if(disposed)return;disposed=true;for(const geometry of copies.values())geometry.dispose();copies.clear();};
}

// Prepare shared templates without cloning them. An obsolete network/decode
// request must not block a newer cached choice. Actual model construction stays
// serialized, and superseded prepared choices never allocate a preview model.
// Callers without prepare retain the original serialized load contract.
export function createLatestPreviewLoad({prepare,load,apply,release,delayMs=90}){
 let pending=null,running=false,closed=false,generation=0,timer=null,preparing=0;
 const schedule=()=>{
  if(closed||!pending||(!prepare&&running))return;
  clearTimeout(timer);timer=setTimeout(preparePending,delayMs);
 };
 async function preparePending(){
  timer=null;if(closed||!pending)return;
  const job=pending;
  if(job.preparing||job.ready)return;
  if(!prepare){job.ready=true;pump();return;}
  job.preparing=true;preparing++;
  try{
   const prepared=await prepare(job.value);
   if(closed||job.generation!==generation){job.resolve(false);return;}
   job.prepared=prepared;job.ready=true;pump();
  }catch(error){
   if(closed||job.generation!==generation)job.resolve(false);
   else{if(pending===job)pending=null;job.reject(error);}
  }finally{job.preparing=false;preparing--;}
 }
 async function pump(){
  if(running||closed||!pending?.ready)return;
  const job=pending;pending=null;running=true;let model;
  try{
   model=await load(job.value,job.prepared);
   if(closed||job.generation!==generation){release(model);model=null;job.resolve(false);}
   else{apply(model,job.value);model=null;job.resolve(true);}
  }catch(error){
   if(model)release(model);
   if(closed||job.generation!==generation)job.resolve(false);else job.reject(error);
  }finally{
   running=false;
   if(pending?.ready)pump();
   else if(pending&&!pending.preparing&&timer===null)schedule();
  }
 }
 return{
  set(value){
   if(closed)return Promise.resolve(false);
   generation++;pending?.resolve(false);
   const promise=new Promise((resolve,reject)=>{pending={value,generation,resolve,reject};});
   schedule();return promise;
  },
  dispose(){closed=true;generation++;clearTimeout(timer);pending?.resolve(false);pending=null;},
  get stats(){return {running,pending:!!pending,preparing,closed};},
 };
}
