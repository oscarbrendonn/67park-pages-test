// The existing park clock: one game day = 24 real minutes. Keep its epoch so
// all islands/clients share the same evening, including late arrivals.
export const PARK_DAY_MS=1440000, PARK_EPOCH=1754000000000;
export function clockAt(time){
 const elapsed=Number.isFinite(time)?time-PARK_EPOCH:0;
 const phase=((elapsed%PARK_DAY_MS)+PARK_DAY_MS)%PARK_DAY_MS;
 return {time:PARK_EPOCH+elapsed,day:Math.floor(elapsed/PARK_DAY_MS),hour:phase/60000,dayT:phase/PARK_DAY_MS,phase};
}
export function createParkClock({now=()=>Date.now(),fixedHour=null}={}){
 let offset=0,synced=false;
 return {read:()=>({...clockAt(fixedHour!==null&&Number.isFinite(fixedHour)?PARK_EPOCH+fixedHour*60000:now()+offset),synced}),
  sync(serverTime){if(!Number.isFinite(serverTime))return;const next=serverTime-now();offset=synced?offset*.7+next*.3:next;synced=true;}};
}
const query=typeof location==='undefined'?null:new URLSearchParams(location.search).get('hour');
export const parkClock=createParkClock({fixedHour:query!==null&&Number.isFinite(Number(query))?Number(query):null});
