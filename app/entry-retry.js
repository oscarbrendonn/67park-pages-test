// One explicit recovery navigation, never an automatic reload loop. A lost
// WebGL context needs a fresh renderer; do not overlap two world/GPU owners.
const KEY='67park.entry-retry.v1',TTL=10*60*1000;
export function createEntryRetry({host=globalThis,now=Date.now}={}){
 let pending=null,used=false,low=false;
 const storage=()=>host.sessionStorage;
 try{const value=JSON.parse(storage()?.getItem(KEY)||'null');
  storage()?.removeItem(KEY);
  if(value?.version===1&&typeof value.base==='string'&&typeof value.name==='string'&&now()>=value.at&&now()-value.at<TTL){pending=value;low=true;used=true;}
 }catch{}
 const consume=(base,name)=>{const match=!!pending&&pending.base===base&&pending.name===name;pending=null;return match;};
 const retry=({base,name}={})=>{
  if(used)return {ok:false,message:'The lighter loading attempt could not finish. Close other game tabs and apps before reopening the park. Your saved character and name have not been reset.'};
  if(typeof base!=='string'||!base||typeof name!=='string'||!name)return {ok:false,message:'Choose your character and name before retrying.'};
  try{
   const value=JSON.stringify({version:1,base,name,at:now()});
   storage().setItem(KEY,value);
   if(storage().getItem(KEY)!==value)throw Error('Storage unavailable');
  }catch{return {ok:false,message:'Your browser could not save the retry state. Allow storage before retrying; this page has not been reset.'};}
  used=true;host.dispatchEvent?.(new Event('park:release-controls'));host.location.reload();return {ok:true};
 };
 // Keep the lighter rendering after entry; suddenly restoring full shadows
 // would reintroduce the same GPU spike. A deliberate settings change exits it.
 host.addEventListener?.('park:settings-change',()=>{low=false;});
 return {consume,retry,low:()=>low};
}
const slot=Symbol.for('67park.entry-retry.v1');
const recovery=globalThis[slot]??=createEntryRetry();
export const consumeEntryRetry=recovery.consume;
export const requestEntryRetry=recovery.retry;
export const entryRetryLowGraphics=recovery.low;
