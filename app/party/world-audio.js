// CC0 source credits and reproducible edits: assets/audio/world-foley-v1.json.
export const WORLD_BYTES=778168;
export const WORLD_DURATION=16.210916666666666;
export const WORLD_CLIPS=Object.freeze({"grassL1":{"offset":0,"duration":0.42},"grassL2":{"offset":0.445,"duration":0.31958333333333333},"grassL3":{"offset":0.7895833333333333,"duration":0.29954166666666665},"grassR1":{"offset":1.114125,"duration":0.40575},"grassR2":{"offset":1.544875,"duration":0.34020833333333333},"grassR3":{"offset":1.9100833333333334,"duration":0.32945833333333335},"stoneL1":{"offset":2.2645416666666667,"duration":0.3729166666666667},"stoneL2":{"offset":2.6624583333333334,"duration":0.331625},"stoneL3":{"offset":3.019083333333333,"duration":0.3309166666666667},"stoneR1":{"offset":3.375,"duration":0.3566666666666667},"stoneR2":{"offset":3.756666666666667,"duration":0.322625},"stoneR3":{"offset":4.104291666666667,"duration":0.34208333333333335},"sandL1":{"offset":4.471375,"duration":0.42},"sandL2":{"offset":4.916375,"duration":0.31958333333333333},"sandL3":{"offset":5.260958333333333,"duration":0.29954166666666665},"sandR1":{"offset":5.5855,"duration":0.40575},"sandR2":{"offset":6.01625,"duration":0.34020833333333333},"sandR3":{"offset":6.381458333333334,"duration":0.32945833333333335},"creak1":{"offset":6.735916666666666,"duration":0.7},"creak2":{"offset":7.460916666666667,"duration":0.7},"fountain":{"offset":8.185916666666667,"duration":8,"loopStart":0,"loopEnd":8}});
const url=new URL('../../assets/audio/world-foley-v1.wav',import.meta.url);
export function createWorldAudioBank({host=globalThis}={}){
 let buffer=null,pending=null,state='idle',retryAt=0;
 async function load(context){
  if(buffer)return true;if(pending)return pending;
  if(Date.now()<retryAt||!host.fetch||!context?.decodeAudioData)return false;
  state='loading';
  pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);timer.unref?.();
   try{
    const response=await host.fetch(url.href,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
    if(!response.ok)throw Error('Foley unavailable');
    const data=await response.arrayBuffer();if(data.byteLength!==WORLD_BYTES)throw Error('Incomplete foley');
    const decoded=await context.decodeAudioData(data);
    if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-WORLD_DURATION)>.002)throw Error('Invalid foley');
    buffer=decoded;state='ready';return true;
   }catch{state='failed';retryAt=Date.now()+5000;return false;}
   finally{clearTimeout(timer);pending=null;}
  })();return pending;
 }
 return {load,get buffer(){return buffer},stats:()=>({state,bytes:buffer?WORLD_BYTES:0})};
}
// Classify the final ground sampler hit, never coordinates or guessed colours.
export function footstepSurface(hit){
 const o=hit?.object;if(!o)return 'stone';
 const explicit=o.userData?.audioSurface;if(['grass','sand','stone'].includes(explicit))return explicit;
 const names=[o.name,...(Array.isArray(o.material)?o.material:[o.material]).map(m=>m?.name||'')].join(' ').toLowerCase();
 if(/grass|lawn|turf/.test(names))return 'grass';
 if(/sand|beach/.test(names))return 'sand';
 return 'stone';
}

