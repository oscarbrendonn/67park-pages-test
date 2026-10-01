// Licensed real foley. No context, autoplay, timer loop or loading-screen work.
// Exact sources/edits: assets/audio/interaction-foley-v1.json and CREDITS.md.
export const INTERACTION_BYTES=268844;
export const INTERACTION_DURATION=5.6;
export const INTERACTION_CLIPS=Object.freeze({
 splash:{offset:0,duration:2.45},bark:{offset:2.475,duration:.34},
 purr:{offset:2.84,duration:1.65},whoosh:{offset:4.515,duration:.345},
 toy:{offset:4.885,duration:.43},ball:{offset:5.34,duration:.235}
});
const URL=new globalThis.URL('../../assets/audio/interaction-foley-v1.wav',import.meta.url);
export function createInteractionAudioBank({host}){
 let buffer=null,pending=null,state='idle',retryAt=0;
 async function load(context){
  if(buffer)return true;if(pending)return pending;
  if(Date.now()<retryAt||!host.fetch||!context?.decodeAudioData)return false;
  state='loading';
  pending=Promise.resolve().then(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{
    const response=await host.fetch(URL.href,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
    if(!response.ok)throw Error('Foley unavailable');
    const data=await response.arrayBuffer();if(data.byteLength!==INTERACTION_BYTES)throw Error('Incomplete foley');
    const decoded=await context.decodeAudioData(data);
    if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-INTERACTION_DURATION)>.002)throw Error('Invalid foley');
    buffer=decoded;state='ready';return true;
   }catch{state='failed';retryAt=Date.now()+5000;return false;}
   finally{clearTimeout(timer);pending=null;}
  });
  return pending;
 }
 return {load,get buffer(){return buffer;},stats:()=>({state,bytes:buffer?INTERACTION_BYTES:0,decodedBytes:buffer?buffer.length*4:0})};
}
