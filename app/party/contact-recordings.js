// Separate CC0 contacts: existing footsteps, vehicle and fountain banks stay intact.
export const CONTACT_CLIPS=Object.freeze({'coin-collect':{offset:0,duration:.35},basketball:{offset:0,duration:.254}});
export function createContactBank(name,{host=globalThis}={}){
 const file=name==='basketball'?'basket-contact-v1.wav':'coin-contact-v1.wav';
 let buffer=null,pending=null,retryAt=0;
 return {get buffer(){return buffer;},load(ctx){
  if(buffer)return Promise.resolve(true);if(pending)return pending;
  if(!ctx?.decodeAudioData||!host.fetch||Date.now()<retryAt)return Promise.resolve(false);
  pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{const r=await host.fetch(new URL('../../assets/audio/'+file,import.meta.url),{signal:controller.signal,cache:'force-cache'});if(!r.ok)throw Error('Unavailable contact');
    const b=await ctx.decodeAudioData(await r.arrayBuffer());if(Math.abs(b.duration-CONTACT_CLIPS[name].duration)>.015)throw Error('Invalid contact');buffer=b;return true;
   }catch{retryAt=Date.now()+5000;return false;}finally{clearTimeout(timer);pending=null;}
  })();return pending;
 }};
}
