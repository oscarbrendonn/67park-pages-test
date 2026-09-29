// CC0 real recordings; credits and reproducible trim manifest in assets/audio/.
// Seconds (not sample indices) also work when Safari resamples the PCM bank.
export const FOLEY_CLIPS=Object.freeze({
 horn:{offset:0,duration:.17134375,loopStart:.077,loopEnd:.17134375},
 takeoff:{offset:.19634375,duration:.131},
 landing:{offset:.35234375,duration:.28},
 ollie:{offset:.65734375,duration:.19},
 flick:{offset:.87234375,duration:.21},
 skateLanding:{offset:1.10734375,duration:.387}
});
export const FOLEY_BYTES=97282;
export const FOLEY_URL=new URL('../../assets/audio/natural-foley-v1.wav',import.meta.url);

export function createNaturalAudioBank({host,onReady}){
 let buffer=null,encoded=null,download=null,pending=null,state='idle',retryAt=0;
 function preload(){
  if(buffer||encoded)return Promise.resolve(true);
  if(download)return download;
  if(Date.now()<retryAt||!host.fetch)return Promise.resolve(false);
  state='loading';
  download=Promise.resolve().then(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   timer.unref?.();
   try{
    const response=await host.fetch(FOLEY_URL.href,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
    if(!response.ok)throw Error('Recording bank unavailable');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==FOLEY_BYTES)throw Error('Incomplete recording bank');
    encoded=bytes;state='loaded';return true;
   }catch{state='failed';retryAt=Date.now()+5000;return false;}
   finally{clearTimeout(timer);download=null;}
  });
  return download;
 }
 function load(context){
  if(buffer)return Promise.resolve(true);
  if(pending)return pending;
  if(Date.now()<retryAt||!context.decodeAudioData)return Promise.resolve(false);
  pending=Promise.resolve().then(async()=>{
   try{
    if(!await preload())return false;
    const bytes=encoded;encoded=null; // release encoded data after the one decode
    const decoded=await context.decodeAudioData(bytes);
    if(decoded.numberOfChannels!==1||decoded.duration<1.519||decoded.duration>1.521)throw Error('Invalid recording bank');
    buffer=decoded;state='ready';onReady();return true;
   }catch{state='failed';retryAt=Date.now()+5000;return false;}
   finally{pending=null;}
  });
  return pending;
 }
 return {preload,load,get buffer(){return buffer;},stats:()=>({state,bytes:buffer||encoded?FOLEY_BYTES:0,decodedBytes:buffer?buffer.length*4:0})};
}
