import {PARK_COINS,DELIVERY} from './park-progression-rules.js';

// Read-only presentation. The connected lobby's received snapshot is the only
// vehicle position authority; local traffic metadata never supplies a position.
const MAX_POINTS=64,MAX_SCAN=256,SNAPSHOT_MAX_AGE=6000;
const validId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9:_-]{0,63}$/i.test(id);
const validPosition=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const position=p=>({x:p.x,y:p.y,z:p.z});
const friendlyNames=Object.freeze({'main-mint':'Mint car','small-blue':'Blue car','school-service':'Bus'});

export function vehicleMapPoints({connected,snapshot,trafficCars=[],now=globalThis.performance?.now()}={}){
 const age=now-snapshot?.received;
 if(connected!==true||!Number.isFinite(now)||!Number.isFinite(snapshot?.received)||age<0||age>SNAPSHOT_MAX_AGE||!Array.isArray(snapshot?.cars))return [];
 const kinds=new Map();
 if(Array.isArray(trafficCars))for(const car of trafficCars.slice(0,MAX_SCAN)){
  if(validId(car?.id)&&['car','bus','boat'].includes(car.kind)&&!kinds.has(car.id))kinds.set(car.id,car.kind);
 }
 const result=[],seen=new Set();
 for(const car of snapshot.cars.slice(0,MAX_SCAN)){
  if(result.length>=MAX_POINTS)break;
  if(!validId(car?.id)||seen.has(car.id)||!validPosition(car))continue;
  seen.add(car.id);
  // These two IDs are defined by the existing shared vehicle roster. Preserve
  // their kind even before the local model metadata has finished loading.
  const kind=car.id==='school-service'?'bus':car.id==='sail-cream'?'boat':kinds.get(car.id)||'car';
  const aboard=new Set();
  if(car.seats&&typeof car.seats==='object')for(const key of Object.keys(car.seats).slice(0,MAX_POINTS)){
   const occupant=car.seats[key];
   if(/^(0|[1-9]\d?)$/.test(key)&&Number(key)<MAX_POINTS&&typeof occupant==='string'&&occupant.trim()&&occupant.length<=128)aboard.add(occupant);
  }
  const occupied=aboard.size>0;
  result.push({id:'vehicle:'+car.id,category:'vehicles',kind,name:Object.hasOwn(friendlyNames,car.id)?friendlyNames[car.id]:(kind==='bus'?'Bus':kind==='boat'?'Sailboat':'Car'),
   p:position(car),occupied,detail:occupied?`In use · ${aboard.size} aboard`:'Available',active:false});
 }
 return result;
}

// Profile progression is private to this player. Do not infer a reset or
// reward from the clock: the server must confirm when a coin is available.
export function questMapPoints(profile,now=Date.now()){
 const p=profile?.progression;
 if(!p||typeof p!=='object'||Array.isArray(p)||!Number.isFinite(now))return [];
 const points=[];
 if(Array.isArray(p.collected)){
  const collected=new Set(p.collected);
  for(const coin of PARK_COINS)if(!collected.has(coin.id))points.push({id:'quest:coin:'+coin.id,category:'quests',kind:'coin',name:'67 Coin',p:position(coin),detail:coin.name,active:false});
 }
 const active=Number.isFinite(p.delivery?.expiresAt)&&p.delivery.expiresAt>now;
 const target=active?DELIVERY.to:DELIVERY.from;
 points.push({id:active?'quest:delivery:dropoff':'quest:delivery:pickup',category:'quests',kind:active?'dropoff':'pickup',
  name:active?'Poppy · Deliver parcel':'Pip · Parcel post',p:position(target),detail:active?'Deliver your parcel':'Pick up a parcel',active});
 return points;
}
