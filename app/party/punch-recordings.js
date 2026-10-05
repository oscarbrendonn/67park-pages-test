// Licensed animal calls; lazy, bounded, and routed through the existing SFX bus.
const urls={goril:new URL('../../assets/audio/punch-gorilla-v1.wav',import.meta.url),frog67:new URL('../../assets/audio/punch-frog-v1.wav',import.meta.url)};
export function createPunchRecordings({host,getContext,getOutput,audible,voices,onPlay}){
 const encoded=new Map(),buffers=new Map(),fetches=new Map(),decodes=new Map();let generation=0,active=null;
 const supported=base=>Object.hasOwn(urls,base);
 function preload(base){
  if(!supported(base)||!host.fetch)return Promise.resolve(false);
  if(encoded.has(base)||buffers.has(base))return Promise.resolve(true);
  if(fetches.has(base))return fetches.get(base);
  const request=Promise.resolve().then(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);timer.unref?.();
   try{const r=await host.fetch(urls[base].href,{cache:'force-cache',signal:controller.signal});if(!r.ok)throw Error('Punch voice unavailable');
    const bytes=await r.arrayBuffer();if(bytes.byteLength<44||bytes.byteLength>64000)throw Error('Punch voice size');encoded.set(base,bytes);return true;
   }catch{return false;}finally{clearTimeout(timer);fetches.delete(base);}
  });fetches.set(base,request);return request;
 }
 function load(base){
  if(buffers.has(base))return Promise.resolve(true);if(decodes.has(base))return decodes.get(base);
  const ctx=getContext();if(!ctx||!supported(base))return Promise.resolve(false);
  const request=Promise.resolve().then(async()=>{try{
   if(!await preload(base))return false;
   const buffer=await ctx.decodeAudioData(encoded.get(base).slice(0));
   if(buffer.numberOfChannels!==1||buffer.duration<.1||buffer.duration>.65)return false;
   buffers.set(base,buffer);encoded.delete(base);return true;
  }catch{return false;}finally{decodes.delete(base);}});decodes.set(base,request);return request;
 }
 function cancel(){generation++;if(active){try{active.stop();}catch{}active=null;}}
 function sound(base){
  if(!audible()||!buffers.has(base)||voices.size>=24)return false;
  cancel();const ctx=getContext(),source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffers.get(base);gain.gain.value=base==='frog67'?.75:.28;
  source.connect(gain);gain.connect(getOutput());voices.add(source);active=source;
  source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();if(active===source)active=null;};
  source.start();onPlay(base);return true;
 }
 function play(base){
  if(!supported(base)||!audible())return false;
  if(buffers.has(base))return sound(base);
  const token=++generation,at=Date.now();
  void load(base).then(ready=>{if(ready&&token===generation&&Date.now()-at<=120&&audible())sound(base);});
  return true;
 }
 return {supported,preload,load,play,cancel,stats:()=>({loaded:[...buffers.keys()],active:!!active})};
}
