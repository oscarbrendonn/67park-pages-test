// One in-flight preparation and one reusable room. No frame callback awaits it.
// Failed/stale attempts cannot attach an old room or leave controls blocked.
export function createHousingLoader(world,{load=attempt=>import('./housing-interior.js?v=home-entry-3&attempt='+attempt),timeoutMs=12000}={}){
 let room=null,job=null,epoch=0,disposed=false,attempt=0;
 const stats={phase:'idle',attempts:0,error:''};
 return {
  get room(){return room},stats,
  prepare(){
   if(disposed)return Promise.reject(Error('Home loader disposed'));
   if(room)return Promise.resolve(room);if(job)return job;
   const token=++epoch;stats.phase='loading';stats.error='';stats.attempts=++attempt;
   let timer,candidate;
   const work=Promise.resolve().then(()=>load(attempt)).then(async module=>{
    if(disposed||token!==epoch)throw Error('Home preparation cancelled');
    candidate=module.createHousingInterior(world,{markers:false});
    await candidate.prepare?.();
    if(disposed||token!==epoch){candidate.dispose();candidate=null;throw Error('Home preparation cancelled');}
    return candidate;
   });
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Home loading timed out')),timeoutMs)});
   job=Promise.race([work,timeout]).then(value=>{room=value;stats.phase='ready';return value}).catch(e=>{
    if(token===epoch){epoch++;stats.phase=disposed?'disposed':'error';stats.error=String(e.message||e);}
    // If import/compile finishes after timeout, only its own temporary room dies.
    work.then(value=>{if(value!==room)value.dispose()},()=>{candidate?.dispose();candidate=null});
    throw e;
   }).finally(()=>{clearTimeout(timer);job=null});
   return job;
  },
  dispose(){disposed=true;epoch++;room?.dispose();room=null;stats.phase='disposed';},
 };
}
