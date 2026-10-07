const url=new URL('../../assets/audio/soft-feedback-v1.wav',import.meta.url);
export const SOFT_CLIPS=Object.freeze({click:{offset:0,duration:.2},'ui-confirm':{offset:.4,duration:.42},'coin-collect':{offset:1,duration:.47},'reward-earned':{offset:1.7,duration:1}});
export function createSoftFeedbackBank({host=globalThis}={}){
 let buffer=null,pending=null,retryAt=0;
 return {get buffer(){return buffer},load(ctx){
  if(buffer)return Promise.resolve(true);if(pending)return pending;
  if(Date.now()<retryAt||!host.fetch||!ctx?.decodeAudioData)return Promise.resolve(false);
  pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{const r=await host.fetch(url.href,{credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('Unavailable');
    const decoded=await ctx.decodeAudioData(await r.arrayBuffer());if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-3)>.01)throw Error('Invalid bank');buffer=decoded;return true;
   }catch{retryAt=Date.now()+5000;return false}finally{clearTimeout(timer);pending=null}
  })();return pending;
 }};
}
