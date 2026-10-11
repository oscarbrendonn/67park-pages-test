import {createEntryActiveClock} from './entry-active-time.js';
// Progress-aware deadline shared by the bundled entrance and island loader.
// UI updates alone never count as progress. Keep a hard ceiling for trickle
// downloads, plus a bounded stalled-stage recovery and explicit cancellation.
export function startEntryWatchdog({snapshot,fail,slow,clock=()=>performance.now(),schedule=setInterval,cancel=clearInterval,documentRef=globalThis.document,pageTarget=globalThis.window},{slowMs=20000,deadlineMs=180000,maxMs=600000}={}){
 const activeClock=createEntryActiveClock({now:clock,documentRef,pageTarget});
 const started=activeClock.now();let progressAt=started,last=null;
 const poll=()=>{
  const state=snapshot();if(state.status!=='loading')return;
  const at=activeClock.now(),next=[state.bytes||0,state.files||0,state.step||0];
  if(last&&next.some((n,i)=>n>last[i]))progressAt=at;
  last=next;
  if(at-started>=maxMs||at-progressAt>=Math.min(deadlineMs,180000)){
   fail('Loading stopped making progress. Retry with your saved character.');return;
  }
  if(at-progressAt>=slowMs&&!state.slow)slow();
 };
 poll();const timer=schedule(poll,1000);return()=>{cancel(timer);activeClock.stop();};
}
