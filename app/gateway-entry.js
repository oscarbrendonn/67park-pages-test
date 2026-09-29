// The north pavement beside the old entrance, safely clear of the road/shore.
export const GATEWAY_ANCHOR=Object.freeze({x:246.2,z:115.4,radius:3.2,yaw:0,returnX:243,returnZ:119.2});
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const activeStatuses=new Set(['queued','loading','countdown','playing']);

export function createGatewayJumpSensor(anchor=GATEWAY_ANCHOR){
 let previous=null,armed=0,grounded=false,spent=false,lastJump=0;
 const reset=()=>{previous=null;armed=0;grounded=false;spent=false;lastJump=0;};
 return {reset,step({position,velocity,ground,dt=0,jumped=false,onGround=false,allowed=true}={}){
  if(!allowed||!finite(position)||!finite(velocity)||!Number.isFinite(ground)){reset();return false;}
  if(previous&&Math.hypot(position.x-previous.x,position.y-previous.y,position.z-previous.z)>3){reset();previous={...position};grounded=onGround;lastJump=jumped;return false;}
  armed=Math.max(0,armed-Math.max(0,Math.min(.1,dt)));
  if(onGround&&!jumped){armed=0;spent=false;}
  if(jumped&&jumped!==lastJump||grounded&&!onGround&&velocity.y>2){armed=1.8;spent=false;}
  const sin=Math.sin(anchor.yaw),cos=Math.cos(anchor.yaw);
  const local=p=>({x:cos*(p.x-anchor.x)-sin*(p.z-anchor.z),z:sin*(p.x-anchor.x)+cos*(p.z-anchor.z),y:p.y-ground});
  const q=local(position),before=previous&&local(previous);
  let sample=q;
  if(before&&before.z*q.z<0){const t=before.z/(before.z-q.z);sample={x:before.x+(q.x-before.x)*t,y:before.y+(q.y-before.y)*t,z:0};}
  const inside=Math.abs(sample.z)<.58&&sample.y>.95&&sample.y<3.6&&Math.pow(sample.x/1.65,2)+Math.pow((sample.y+.45-2.65)/2.04,2)<1;
  previous={...position};grounded=onGround;lastJump=jumped;
  if(!armed||spent||!inside)return false;
  spent=true;armed=0;return true;
 }};
}

// A short pull through the fixed opening, ending lower than take-off. The
// normal travel animation elsewhere in the park remains unchanged.
export function gatewayTravelPose(start,entry,progress){
 const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
 const nx=Math.sin(entry.anchor.yaw),nz=Math.cos(entry.anchor.yaw);
 const side=(start.x-entry.anchor.x)*nx+(start.z-entry.anchor.z)*nz>=0?1:-1;
 return {x:start.x+(entry.anchor.x-nx*side*.65-start.x)*ease,
  y:start.y+(entry.ground+.62-start.y)*ease,
  z:start.z+(entry.anchor.z-nz*side*.65-start.z)*ease};
}

function waitForRoom(online,predicate,{signal,timeout=6000}={}){
 return new Promise((resolve,reject)=>{
  let unsubscribe=()=>{},timer,settled=false;
  const finish=(error,room)=>{if(settled)return;settled=true;clearTimeout(timer);unsubscribe();signal?.removeEventListener('abort',abort);error?reject(error):resolve(room);};
  const abort=()=>finish(Error('Portal entry cancelled.'));
  const check=()=>{const data=online.data;if(predicate(data.room))finish(null,data.room);else if(data.error)finish(Error(data.error));else if(!data.connected)finish(Error('Connection lost. Please try the portal again.'));};
  unsubscribe=online.subscribe(check);if(settled){unsubscribe();return;}signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>finish(Error('The server did not answer. Please try the portal again.')),timeout);
  if(signal?.aborted)abort();else check();
 });
}

export function createGatewayEntry(online,{target=globalThis.window,navigate=url=>globalThis.location.assign(url),timeout=6000,lock=()=>()=>{}}={}){
 let pending=null,dead=false,abort=null,travel=null,veil=null;
 const makeVeil=()=>{if(veil||!target?.document)return;veil=target.document.createElement('div');veil.setAttribute('aria-hidden','true');veil.style.cssText='position:fixed;inset:0;z-index:100000;background:#f6f0e7;opacity:0;pointer-events:none';target.document.body.append(veil);};
 const request=async(type,payload,predicate)=>{
  if(!online.act(type,payload))throw Error(online.data.error||'Please wait for the server connection.');
  return waitForRoom(online,predicate,{signal:abort.signal,timeout});
 };
 const ensureRoom=async()=>{
  if(!online.data.connected)throw Error('Please wait for the server connection.');
  let room=online.data.room;
  if(room&&room.mode!=='balloon')throw Error('Leave your current match room before entering Balloon Battle.');
  if(!room)return request('queue.join',{capacity:4,mode:'balloon',teamMode:'solo'},r=>r?.mode==='balloon'&&activeStatuses.has(r.status));
  if(room.status==='results'){
   if(room.host!==online.data.me?.id)throw Error('Your party host needs to set up the next round.');
   room=await request('room.rematch',{},r=>r?.status==='waiting');
  }
  if(room.status==='waiting'&&room.host===online.data.me?.id){
   const full=room.members.length===room.capacity;
   return request(full?'room.start':'queue.join',{},r=>r?.mode==='balloon'&&activeStatuses.has(r.status));
  }
  return room; // Guests keep their party; the host controls matchmaking.
 };
 const enter=entry=>{
  if(dead)return Promise.resolve(false);if(pending)return pending;
  abort=new AbortController();travel={...entry};let automatic=false,autoWait=null,departing=false;const unlock=lock();makeVeil();
  const observe=event=>{if(!event.detail?.gatewayEntry){automatic=true;autoWait=event.detail?.animation;}};
  target?.addEventListener('candy:portal-travel',observe);
  pending=Promise.resolve().then(async()=>{
   try{
    if(dead||abort.signal.aborted)return false;
    if(!online.data.connected)throw Error('Please wait for the server connection.');
    if(online.data.room&&online.data.room.mode!=='balloon')throw Error('Leave your current match room before entering Balloon Battle.');
    // Start the physical dip immediately, while the server confirms the room.
    // Otherwise network latency can let the jump land before travel begins.
    const ready=ensureRoom(),waits=[];
    if(!automatic){target.dispatchEvent(new Event('candy:depart'));target.dispatchEvent(new CustomEvent('candy:portal-travel',{detail:{gatewayEntry:true,entry:travel,waitUntil:p=>waits.push(p)}}));}
    await ready;if(dead||abort.signal.aborted)return false;
    if(automatic){await autoWait;departing=true;return true;} // Ordinary router owns the destination.
    let timer;try{await Promise.race([Promise.all(waits),new Promise(resolve=>{timer=setTimeout(resolve,900);})]);}finally{clearTimeout(timer);}
    if(dead||abort.signal.aborted)return false;
    if(!automatic){const room=online.data.room;if(!online.data.connected||!room||room.mode!=='balloon')throw Error('Connection lost. Please try the portal again.');navigate('/67park-pages-test/balloon/?match='+encodeURIComponent(room.code)+'&portal=1');}
    departing=true;return true;
   }catch(error){
    if(!dead&&!abort.signal.aborted){online.update({error:String(error.message||error)});target?.dispatchEvent(new CustomEvent('candy:online-open',{detail:{mode:'balloon'}}));}
    return false;
   }finally{target?.removeEventListener('candy:portal-travel',observe);pending=null;travel=null;unlock();if(!departing){veil?.remove();veil=null;}}
  });return pending;
 };
 const dispose=()=>{dead=true;abort?.abort();veil?.remove();veil=null;target?.removeEventListener('pagehide',dispose);};
 target?.addEventListener('pagehide',dispose);
 return {enter,get busy(){return !!pending;},get travel(){return travel;},progress(t){if(veil)veil.style.opacity=String(Math.max(0,Math.min(1,(t-.7)/.3)));},dispose};
}
