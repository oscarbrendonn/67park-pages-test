// CC0 real rolling skateboard: Lanterr, freesound.org/s/688733/.
// One loop in the existing unlocked graph; never changes rider physics.
export function createSkateRollAudio({host,getContext,getOutput,audible}){
 let buffer=null,pending=null,voice=null,retryAt=0,timer=null,lastFrame=0;
 const schedule=host.setTimeout?.bind(host)||setTimeout;
 const cancel=host.clearTimeout?.bind(host)||clearTimeout;
 async function load(){
  const ctx=getContext();if(buffer)return true;if(pending)return pending;
  if(!ctx||!host.fetch||Date.now()<retryAt)return false;
  pending=(async()=>{
   const controller=new AbortController(),timeout=schedule(()=>controller.abort(),8000);timeout?.unref?.();
   try{
    const r=await host.fetch(new URL('../../assets/audio/skate-roll-v1.wav',import.meta.url),{signal:controller.signal,cache:'force-cache'});
    if(!r.ok)throw Error('Skate audio unavailable');
    const bytes=await r.arrayBuffer();if(bytes.byteLength!==74396)throw Error('Incomplete skate audio');
    const b=await ctx.decodeAudioData(bytes);
    if(Math.abs(b.duration-1.548292)>.01)throw Error('Invalid skate audio');
    buffer=b;return true;
   }catch{retryAt=Date.now()+5000;return false;}
   finally{cancel(timeout);pending=null;}
  })();return pending;
 }
 function stop(){
  if(timer!==null){cancel(timer);timer=null;}
  const v=voice;voice=null;if(!v)return;
  try{const t=getContext().currentTime;v.gain.gain.setTargetAtTime(0,t,.015);v.source.stop(t+.06);}catch{}
 }
 function watchdog(){timer=null;if(!voice)return;if(Date.now()-lastFrame>300){stop();return;}timer=schedule(watchdog,350);timer?.unref?.();}
 function update({riding=false,grounded=false,speed=0}={}){
  try{
   if(!riding||!grounded||!Number.isFinite(speed)||Math.abs(speed)<.15||!audible()){stop();return;}
   lastFrame=Date.now();
   if(!buffer){void load();return;}
   const ctx=getContext(),s=Math.min(1,Math.abs(speed)/9);
   if(!voice){
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
    gain.gain.value=0;source.connect(gain);gain.connect(getOutput());
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start();voice={source,gain};timer=schedule(watchdog,350);timer?.unref?.();
   }
   voice.source.playbackRate.setTargetAtTime(.65+s*.85,ctx.currentTime,.12);
   voice.gain.gain.setTargetAtTime(.045+.24*Math.sqrt(s),ctx.currentTime,.08);
  }catch{stop();} // A missing audio API must never break movement.
 }
 return {load,update,stop,stats:()=>({active:!!voice,ready:!!buffer})};
}
