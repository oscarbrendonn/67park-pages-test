// Approved preview's water + air layer only; no ambience or swing recording.
// Derived from the CC0 recordings credited in interaction-foley-v1.json.
const url=new URL('../../assets/audio/fountain-launch-v1.wav',import.meta.url);
export const FOUNTAIN_CLIPS=Object.freeze({launch:{offset:0,duration:1.4}});
export function createFountainAudioBank({host=globalThis}={}){
 let buffer=null,pending=null,retryAt=0;
 return {get buffer(){return buffer;},load(ctx){
  if(buffer)return Promise.resolve(true);if(pending)return pending;
  if(Date.now()<retryAt||!host.fetch||!ctx?.decodeAudioData)return Promise.resolve(false);
  pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{const r=await host.fetch(url.href,{credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('Unavailable');
    const b=await ctx.decodeAudioData(await r.arrayBuffer());if(b.numberOfChannels!==1||Math.abs(b.duration-1.4)>.01)throw Error('Invalid clip');buffer=b;return true;
   }catch{retryAt=Date.now()+5000;return false;}finally{clearTimeout(timer);pending=null;}
  })();return pending;
 }};
}
