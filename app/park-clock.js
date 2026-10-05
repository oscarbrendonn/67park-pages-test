// One game day = 72 real minutes. Keep its epoch so
// all islands/clients share the same evening, including late arrivals.
export const PARK_DAY_MS=4320000, PARK_HOUR_MS=PARK_DAY_MS/24, PARK_EPOCH=1754000000000;
export function clockAt(time){
 const elapsed=Number.isFinite(time)?time-PARK_EPOCH:0;
 const phase=((elapsed%PARK_DAY_MS)+PARK_DAY_MS)%PARK_DAY_MS;
 // The authored world reads a 24-minute visual timestamp. Scale only that
 // adapter; network sync, gameplay timers and real time remain untouched.
 return {time:PARK_EPOCH+elapsed/3,day:Math.floor(elapsed/PARK_DAY_MS),hour:phase/PARK_HOUR_MS,dayT:phase/PARK_DAY_MS,phase};
}
export function createParkClock({now=()=>Date.now(),fixedHour=null}={}){
 let offset=0,synced=false;
 return {read:()=>({...clockAt(fixedHour!==null&&Number.isFinite(fixedHour)?PARK_EPOCH+fixedHour*PARK_HOUR_MS:now()+offset),synced}),
  sync(serverTime){if(!Number.isFinite(serverTime))return;const next=serverTime-now();offset=synced?offset*.7+next*.3:next;synced=true;}};
}
const query=typeof location==='undefined'?null:new URLSearchParams(location.search).get('hour');
export const parkClock=createParkClock({fixedHour:query!==null&&Number.isFinite(Number(query))?Number(query):null});
