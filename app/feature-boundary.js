// One bounded failure record per feature; one feature cannot disable siblings.
export function createFeatureBoundary({now=Date.now,onFault=()=>{}}={}){
 const faults=new Map();
 return {
  run(key,fn,...args){
   if(faults.has(key))return;
   try{return fn(...args);}catch(error){
    const record={key,at:now(),message:String(error?.message||error).slice(0,240)};
    if(faults.size>=32)faults.delete(faults.keys().next().value);
    faults.set(key,record);try{onFault(record);}catch{}
   }
  },
  retry(key){return faults.delete(key);},
  snapshot(){return [...faults.values()].map(v=>({...v}));}
 };
}
