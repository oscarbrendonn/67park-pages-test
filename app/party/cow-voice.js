// CC0 field recording. One lazy decode in the existing game audio graph.
export const COW_VOICE_URL='/67park-pages-test/assets/audio/cow-moo-v1.wav?v=cow-release-1';
export function createCowVoice({host,getContext,getOutput,audible,voices,onPlay}) {
 let bytes,fetching,decoding,buffer,active,generation=0,last=-Infinity,plays=0,requests=0;
 function preload(){
  if(bytes)return Promise.resolve(bytes);
  if(fetching)return fetching;
  if(!host.fetch)return Promise.resolve(null);
  requests++;
  fetching=host.fetch(COW_VOICE_URL,{cache:'force-cache'}).then(async r=>{
   if(!r.ok)throw Error('Cow voice unavailable');
   const data=await r.arrayBuffer();if(data.byteLength>160000||data.byteLength<44)throw Error('Cow voice size');
   return bytes=data;
  }).catch(()=>null).finally(()=>{fetching=null;});
  return fetching;
 }
 async function load(){
  if(buffer)return true;if(decoding)return decoding;
  const ctx=getContext();if(!ctx)return false;
  decoding=(async()=>{const data=await preload();if(!data)return false;
   const decoded=await ctx.decodeAudioData(data.slice(0));
   if(decoded.numberOfChannels!==1||decoded.duration>3||decoded.duration<.3)return false;
   buffer=decoded;return true;
  })().catch(()=>false).finally(()=>{decoding=null;});
  return decoding;
 }
 function release(){
  const old=active;active=null;if(!old)return;
  try{const now=getContext().currentTime;old.gain.gain.cancelScheduledValues(now);
   old.gain.gain.setTargetAtTime(0,now,.008);old.source.stop(now+.035);
  }catch{try{old.source.stop();}catch{}}
 }
 function cancel(){generation++;release();}
 function sound(){
  const ctx=getContext();if(!audible()||!buffer||voices.size>=24||ctx.currentTime-last<.60)return false;
  release();
  const source=ctx.createBufferSource(),gain=ctx.createGain(),start=ctx.currentTime;
  source.buffer=buffer;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.48,start+.012);
  gain.gain.setValueAtTime(.48,start+buffer.duration-.045);gain.gain.linearRampToValueAtTime(0,start+buffer.duration);
  source.connect(gain);gain.connect(getOutput());voices.add(source);active={source,gain};
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();if(active?.source===source)active=null;};
  source.start();last=start;plays++;onPlay?.();return true;
 }
 function play(){
  if(!audible())return;
  if(buffer){sound();return;}
  const token=++generation,at=Date.now();
  load().then(ready=>{if(ready&&token===generation&&Date.now()-at<250)sound();});
 }
 return {preload,load,play,cancel,stats:()=>({ready:!!buffer,active:!!active,plays,requests})};
}
