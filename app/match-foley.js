import {createContactBank,CONTACT_CLIPS} from './party/contact-recordings.js';
// Recorded contact layer for legacy mini-games. Reuses their unlocked master:
// no second AudioContext, autoplay, timer, simulation writes or synthetic fallback.
import {createInteractionAudioBank,INTERACTION_CLIPS} from './party/interaction-audio.js';
import {createNaturalAudioBank,FOLEY_CLIPS} from './party/natural-audio.js';
import {createWorldAudioBank,WORLD_CLIPS} from './party/world-audio.js';
import {createSoftFeedbackBank,SOFT_CLIPS} from './party/soft-feedback-audio.js';
export function createMatchFoley({context,output,muted,host=globalThis}){
 const interaction=createInteractionAudioBank({host}),natural=createNaturalAudioBank({host}),world=createWorldAudioBank({host});
 const soft=createSoftFeedbackBank({host});
 const basketball=createContactBank('basketball',{host});
 const voices=new Set(),last=new Map();let serial=null,age=null,previous=null,step=0,variant=0,disposed=false;
 const audible=()=>!disposed&&!host.document?.hidden&&!muted()&&context()?.state==='running'&&!!output();
 function stop(){for(const s of voices)try{s.stop()}catch{}voices.clear();}
 function play(name,{gain=.2,pitch=1,key=name}={}){
  if(!audible()||voices.size>=16)return false;
  const c=context(),now=c.currentTime;if(now-(last.get(key)??-Infinity)<.09)return false;
  const bank=name==='basketball'?basketball:SOFT_CLIPS[name]?soft:WORLD_CLIPS[name]?world:FOLEY_CLIPS[name]?natural:interaction,clip=(name==='basketball'?CONTACT_CLIPS[name]:null)||SOFT_CLIPS[name]||WORLD_CLIPS[name]||FOLEY_CLIPS[name]||INTERACTION_CLIPS[name];
  if(!clip)return false;
  if(!bank.buffer){void bank.load(c);return false;}
  const s=c.createBufferSource(),g=c.createGain(),length=clip.duration/pitch;
  s.buffer=bank.buffer;s.playbackRate.value=pitch;
  g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(gain,now+.004);g.gain.setValueAtTime(gain,now+Math.max(.005,length-.025));g.gain.linearRampToValueAtTime(0,now+length);
  s.connect(g);g.connect(output());voices.add(s);s.onended=()=>{voices.delete(s);s.disconnect();g.disconnect()};s.start(now,clip.offset,clip.duration);s.stop(now+length+.005);last.set(key,now);return true;
 }
 function event(e,mode){
  if(e.type==='shot')play(mode==='basket'?'basketball':mode==='penalty'?'ball':'whoosh',{gain:mode==='basket'?.32:.24,pitch:mode==='penalty'?.85:1,key:'shot'});
  else if(['hit','save','burst','bomb-explode','pop'].includes(e.type))play('ball',{gain:e.type==='burst'?.26:.18,pitch:e.type==='burst'?.7:1,key:'impact'});
  else if(e.type==='swing')play('whoosh',{gain:.17});
  else if(e.type==='recover')play('whoosh',{gain:.12,pitch:.85});
  else if(e.type==='goal'||e.type==='score'&&e.points>0)play('ui-confirm',{gain:.35,key:'score'});
 }
 function update(frame,id,mode){
  if(!frame)return;
  const time=Number(frame.age??frame.tick??0);
  if(age!==null&&time<age){serial=null;previous=null;step=0;last.clear();}age=time;
  const events=frame.events||[],latest=Math.max(0,...events.map(e=>Number(e.n??e.id)||0));
  if(serial!==null)for(const e of events)if(Number(e.n??e.id)>serial)event(e,mode);
  // Empty/truncated event windows must not rewind the consumed-event cursor.
  serial=Math.max(serial??0,latest);
  const p=frame.players?.find(p=>p.id===id);
  if(audible()){const c=context();void interaction.load(c);void natural.load(c);void world.load(c);void soft.load(c);if(mode==='basket')void basketball.load(c);}
  else stop();
  if(p&&previous&&mode==='race'&&p.wallHit&&!previous.wallHit)play('landing',{gain:.19,pitch:.8,key:'wall'});
  if(p&&previous&&mode!=='race'){
   if(p.grounded===false&&previous.grounded===true&&(p.vy??p.v?.[1])>0)play('takeoff',{gain:.32});
   if(p.grounded===true&&previous.grounded===false)play('landing',{gain:.38});
   const x=p.x??p.p?.[0],z=p.z??p.p?.[2],px=previous.x??previous.p?.[0],pz=previous.z??previous.p?.[2];
   const distance=Math.hypot(x-px,z-pz);
   if(p.grounded&&Number.isFinite(distance)&&distance<2){step+=distance;if(step>.9){step%=.9;const n=variant++;play('stone'+(n%2?'L':'R')+(1+n%3),{gain:.29,key:'step'});}}
   else step=0;
  }
  // Snapshot primitive fields: simulation often mutates the frame in place.
  previous=p?{...p,p:p.p?.slice(),v:p.v?.slice()}:null;
 }
 const quiet=()=>{if(!audible())stop();};
 for(const e of ['pagehide','park:audio-mute-change','storage'])host.addEventListener?.(e,quiet);
 host.document?.addEventListener?.('visibilitychange',quiet);
 return {update,event,play,stop,stats:()=>({voices:voices.size,serial}),dispose(){disposed=true;stop();for(const e of ['pagehide','park:audio-mute-change','storage'])host.removeEventListener?.(e,quiet);host.document?.removeEventListener?.('visibilitychange',quiet);}};
}
