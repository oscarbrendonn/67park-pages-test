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

// At most one async model construction plus the most recent requested choice.
// Superseded queued choices never start; already-running work is released safely.
export function createLatestPreviewLoad({load,apply,release,delayMs=90}){
 let pending=null,running=false,closed=false,generation=0,timer=null;
 const schedule=()=>{if(running||closed||!pending)return;clearTimeout(timer);timer=setTimeout(pump,delayMs);};
 async function pump(){
  timer=null;if(running||closed||!pending)return;
  const job=pending;pending=null;running=true;let model;
  try{
   model=await load(job.value);
   if(closed||job.generation!==generation){release(model);model=null;job.resolve(false);}
   else{apply(model,job.value);model=null;job.resolve(true);}
  }catch(error){
   if(model)release(model);
   if(closed||job.generation!==generation)job.resolve(false);else job.reject(error);
  }finally{running=false;schedule();}
 }
 return{
  set(value){
   if(closed)return Promise.resolve(false);
   generation++;pending?.resolve(false);
   const promise=new Promise((resolve,reject)=>{pending={value,generation,resolve,reject};});
   schedule();return promise;
  },
  dispose(){closed=true;generation++;clearTimeout(timer);pending?.resolve(false);pending=null;},
  get stats(){return {running,pending:!!pending,closed};},
 };
}
