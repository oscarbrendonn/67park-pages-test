// Shared presentation/rules only. Wallet mutations and eligibility live on the server.
export const MATCH_DAILY_CAP=300;
export const PARK_COIN_VALUE=5;
export const QUESTS=Object.freeze([
 {id:'match',label:'Finish a mini-game',target:1,reward:20},
 {id:'explore',label:'Find 3 park coins',target:3,reward:20},
 {id:'delivery',label:'Deliver a parcel',target:1,reward:20},
].map(Object.freeze));
export const PARK_COINS=Object.freeze([
 {id:'entry',name:'Park entrance',x:123,z:60,y:9.4},
 {id:'garden',name:'North garden',x:156,z:40,y:9.4},
 {id:'bridge',name:'Pond walk',x:190,z:50,y:9.4},
 {id:'east',name:'East walk',x:205,z:82,y:9.4},
 {id:'south',name:'South walk',x:166,z:106,y:9.4},
].map(Object.freeze));
export const DELIVERY=Object.freeze({id:'park-parcel',reward:15,minSeconds:12,expiresSeconds:600,
 from:Object.freeze({name:'Park entrance',x:125,z:62,y:9.4}),
 to:Object.freeze({name:'East walk',x:205,z:82,y:9.4})});
export const utcDay=now=>new Date(now).toISOString().slice(0,10);
export const placementCoins=place=>place===1?40:place===2?30:place===3?20:10;
