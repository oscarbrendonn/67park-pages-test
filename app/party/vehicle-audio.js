// Real CC0 cabin recordings. This graph never changes driving or owns a timer.
import {createVehiclePowertrain,powertrainMix} from './vehicle-powertrain-audio.js?v=five-gears-1';
export const VEHICLE_AUDIO_URL=new URL('../../assets/audio/vehicle-cabin-v2.wav',import.meta.url);
export const VEHICLE_AUDIO_BYTES=608444;
export const VEHICLE_CLIPS=Object.freeze({
 start:{offset:0,duration:1.48},stop:{offset:1.505,duration:1.05},
 idle:{offset:2.58,duration:2.78,loopStart:.08,loopEnd:2.78},
 low:{offset:5.385,duration:1.88,loopStart:.08,loopEnd:1.88},
 mid:{offset:7.29,duration:2.56,loopStart:.08,loopEnd:2.56},
 brake:{offset:9.875,duration:1.05},
 high:{offset:10.95,duration:1.70,loopStart:.08,loopEnd:1.70}
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};

export function createVehicleAudio({host,getContext,getOutput,audible,onCue=()=>{}}){
 let buffer=null,pending=null,retryAt=0,loadState='idle',wanted=null,active=null;
 let previousTime=null,braking=false,lastBrake=-Infinity,powertrain=null;
 const transmission=createVehiclePowertrain();
 let lastMix=null,starts=0,sequence=0;
 const sources=new Set();
 const target=(param,value,t,tau=.12)=>param.setTargetAtTime(value,t,tau);
 function cleanup(v){
  sources.delete(v);try{v.source.disconnect();v.gain.disconnect();v.filter?.disconnect();}catch{}
 }
 function release(v,duration=.10){
  if(v.released)return;v.released=true;
  const now=getContext()?.currentTime??0;
  try{v.gain.gain.cancelScheduledValues(now);target(v.gain.gain,0,now,duration/4);v.source.stop(now+duration);}catch{cleanup(v);}
 }
 function voice(name,gain,rate=1,loop=false){
  const ctx=getContext(),clip=VEHICLE_CLIPS[name];
  if(!ctx||!buffer||!audible()||sources.size>=8)return null;
  let v;
  try{
   v={source:ctx.createBufferSource(),gain:ctx.createGain(),filter:ctx.createBiquadFilter(),name,released:false};
   sources.add(v);v.source.buffer=buffer;v.source.playbackRate.value=rate;
   v.filter.type='lowpass';v.filter.frequency.value=6500;v.filter.Q.value=.5;
   v.source.connect(v.filter);v.filter.connect(v.gain);v.gain.connect(getOutput());
   const now=ctx.currentTime;v.gain.gain.setValueAtTime(0,now);
   v.gain.gain.linearRampToValueAtTime(gain,now+.04);
   v.source.onended=()=>cleanup(v);v.source.loop=loop;
   if(loop){v.source.loopStart=clip.offset+clip.loopStart;v.source.loopEnd=clip.offset+clip.loopEnd;v.source.start(now,clip.offset+clip.loopStart);}
   else{v.source.start(now,clip.offset,clip.duration);v.source.stop(now+clip.duration/rate+.01);}
   return v;
  }catch{if(v){try{v.source.stop();}catch{}cleanup(v);}return null;}
 }
 async function ready(){
  if(buffer)return true;
  if(pending)return pending;
  const ctx=getContext();
  if(!ctx?.decodeAudioData||!host.fetch||Date.now()<retryAt)return false;
  loadState='loading';
  pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{
    const response=await host.fetch(VEHICLE_AUDIO_URL.href,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
    if(!response.ok)throw Error('Vehicle recording unavailable');
    const data=await response.arrayBuffer();if(data.byteLength!==VEHICLE_AUDIO_BYTES)throw Error('Incomplete vehicle recording');
    const decoded=await ctx.decodeAudioData(data);
    if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-12.675)>.005)throw Error('Invalid vehicle recording');
    buffer=decoded;loadState='ready';return true;
   }catch{loadState='failed';retryAt=Date.now()+5000;return false;}
   finally{clearTimeout(timer);pending=null;}
  })();
  return pending;
 }
 function start(){
  if(active||!wanted||!buffer||!audible())return;
  // On a slow download, join at the current RPM instead of playing a late key turn.
  const ignition=wanted.ignition&&Date.now()-wanted.at<2000;
  const layers=['idle','low','mid','high'].map(name=>voice(name,0,1,true));
  if(layers.some(v=>!v)){for(const v of layers)if(v)release(v);return;}
  active={layers,started:getContext().currentTime,ignition};starts++;
  if(ignition&&voice('start',.30,wanted.kind==='bus'?.91:1))onCue('vehicle-start');
 }
 function update(speed=0,{throttle=0,brake=false,kind='car',ignition=false}={}){
  if(!audible()){stop();return;}
  const ctx=getContext(),now=ctx.currentTime;
  if(!wanted){wanted={at:Date.now(),kind,ignition};previousTime=now;transmission.reset();}
  wanted.kind=kind;
  if(!buffer){
   // Attach one completion, not one promise callback per animation frame.
   if(!pending){const token=sequence;ready().then(ok=>{if(ok&&sequence===token&&wanted&&audible())start();});}
   return;
  }
  start();if(!active)return;
  const magnitude=Math.abs(Number(speed)||0),dt=clamp(now-previousTime,.001,.1);
  powertrain=transmission.update(Number(speed)||0,{throttle,brake,kind,dt});
  // Only the brake pedal produces tyre friction. A network correction, curb
  // or released accelerator must not make a fake stop/brake sound.
  const slowing=!!brake&&magnitude>1.3;
  if(slowing&&!braking&&now-lastBrake>1.4){if(voice('brake',.055,kind==='bus'?.85:1)){onCue('vehicle-brake');lastBrake=now;}}
  braking=slowing;previousTime=now;
  lastMix=powertrainMix(powertrain,kind);
  const fade=active.ignition?smooth((now-active.started-.30)/.85):1;
  active.layers.forEach((v,i)=>{
   target(v.gain.gain,lastMix.gains[i]*fade,now,.055);
   target(v.source.playbackRate,lastMix.rates[i],now,.045);
   target(v.filter.frequency,lastMix.cutoff,now,.10);
  });
 }
 function stop({shutdown=false}={}){
  const running=!!active,kind=wanted?.kind;wanted=null;active=null;sequence++;
  previousTime=null;powertrain=null;lastMix=null;transmission.reset();braking=false;
  for(const v of sources)release(v,shutdown?.22:.06);
  if(shutdown&&running&&audible()&&voice('stop',.32,kind==='bus'?.91:1))onCue('vehicle-stop');
 }
 return {ready,update,stop,stats:()=>({state:loadState,active:!!active,layers:active?.layers.length||0,voices:sources.size,starts,
  speed:powertrain?.speed||0,load:powertrain?.load||0,powertrain,mix:lastMix,decodedBytes:buffer?buffer.length*4:0})};
}
