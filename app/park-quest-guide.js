import {DELIVERY,PARK_COINS} from './park-progression-rules.js';

// Presentation only. Completion, time limits and every coin remain server-owned.
export const QUEST_GUIDES=Object.freeze({
 delivery:{title:'A little help for the park',description:'Meet Pip at the entrance. Take a parcel to the East walk.',action:'Find Pip',symbol:'parcel'},
 explore:{title:'A walk worth taking',description:'Collect 3 gold park tokens. Each also adds 5 to your activity rewards.',action:'Find a token',symbol:'coin'},
 match:{title:'Play a round together',description:'Open Play & Friends, join a mini-game and stay until the results.',action:'Play & Friends',symbol:'play'},
});
export function activeDelivery(p,now=Date.now()){
 return p?.delivery&&p.delivery.expiresAt>now?p.delivery:null;
}
export function questTarget(p,tracked,self,now=Date.now()){
 if(tracked==='explore')return PARK_COINS.filter(c=>!p?.collected?.includes(c.id)).sort((a,b)=>distance(a,self)-distance(b,self))[0]||null;
 if(activeDelivery(p,now))return {...DELIVERY.to,id:'dropoff',label:'Deliver to Poppy'};
 if(tracked==='delivery')return {...DELIVERY.from,id:'pickup',label:'Meet Pip · Park entrance'};
 return null;
}
export function distance(a,b){return a&&b&&[a.x,a.z,b.x,b.z].every(Number.isFinite)?Math.hypot(a.x-b.x,a.z-b.z):Infinity;}
export function timeLeft(until,now=Date.now()){
 const seconds=Math.max(0,Math.ceil((until-now)/1000));
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function compassTo(target,self){
 if(!Number.isFinite(distance(target,self)))return '';
 return ['N','NE','E','SE','S','SW','W','NW'][Math.round(Math.atan2(target.x-self.x,self.z-target.z)/(Math.PI/4)+8)%8];
}
// Clamp a tracked destination to the minimap rim, retaining its bearing even
// when the 80-unit delivery is outside the current map crop.
export function guideMapPoint(target,self,size,span=150){
 if(!Number.isFinite(distance(target,self))||!(size>0)||!(span>0))return null;
 const dx=(target.x-self.x)*size/span,dy=(target.z-self.z)*size/span,len=Math.hypot(dx,dy),radius=Math.max(0,size/2-14),factor=len>radius?radius/len:1;
 return {x:size/2+dx*factor,y:size/2+dy*factor,angle:Math.atan2(dy,dx),edge:len>radius};
}
