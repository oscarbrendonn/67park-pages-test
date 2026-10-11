// Entry budgets measure work the browser was allowed to do, not time spent
// suspended in another app. Foreground time is preserved across every pause.
export function createEntryActiveClock({now=()=>performance.now(),documentRef=globalThis.document,pageTarget=globalThis.window}={}){
 let sampled=now(),elapsed=0,suspended=false,stopped=false;
 let active=!documentRef?.hidden;
 const listeners=new Set(),bindings=[];
 const read=()=>{const at=now();if(!stopped&&active)elapsed+=Math.max(0,at-sampled);sampled=at;return elapsed;};
 const update=()=>{read();active=!stopped&&!suspended&&!documentRef?.hidden;for(const fn of listeners)fn();};
 const bind=(target,type,fn)=>{target?.addEventListener?.(type,fn);bindings.push([target,type,fn]);};
 bind(documentRef,'visibilitychange',update);
 bind(pageTarget,'pagehide',()=>{read();suspended=true;update();});
 bind(pageTarget,'pageshow',()=>{read();suspended=false;update();});
 bind(documentRef,'freeze',()=>{read();suspended=true;update();});
 bind(documentRef,'resume',()=>{read();suspended=false;update();});
 return {now:read,isActive:()=>active,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},stop(){if(stopped)return;read();stopped=true;active=false;for(const[target,type,fn]of bindings)target?.removeEventListener?.(type,fn);listeners.clear();}};
}

// One clock/listener set per request; reset on real incoming bytes. The timer
// is dormant when hidden, resumes its remaining budget, and always cleans up.
export function createEntryDeadline(callback,ms,options={}){
 const clock=createEntryActiveClock(options),schedule=options.schedule??setTimeout,cancel=options.cancel??clearTimeout;
 let timer,stopped=false,deadline=clock.now()+ms;
 const stop=()=>{if(stopped)return;stopped=true;cancel(timer);unsubscribe();clock.stop();};
 const arm=()=>{
  cancel(timer);if(stopped||!clock.isActive())return;
  const remaining=deadline-clock.now();
  timer=schedule(()=>{if(stopped)return;if(clock.isActive()&&clock.now()>=deadline){stop();callback();}else arm();},Math.max(0,remaining));
 };
 const unsubscribe=clock.subscribe(arm);
 arm();return {reset(){if(stopped)return;deadline=clock.now()+ms;arm();},stop};
}
