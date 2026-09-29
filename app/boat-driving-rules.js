// One measured cream sailboat. Reuses the island vehicle ownership protocol;
// the three coloured dinghies and rose sailboat remain solid moored scenery.
export const SAILBOAT=Object.freeze({id:'sail-cream',kind:'boat',x:245,z:-128,yaw:.22,y:8.560851733454328,
 spec:Object.freeze({marine:true,halfWidth:1.78,halfLength:3.62,wheelbase:5,scale:1,wheelRadius:.3}),
 // Authored benches span X +/-1.295 and Z +/-1.14..1.67. Rear centre is
 // the driver; the two front seats stay clear of the central mast.
 seats:Object.freeze([Object.freeze([0,.91,-1.4]),Object.freeze([-.68,.91,1.4]),Object.freeze([.68,.91,1.4])])});
export const BOAT_DRIVING=Object.freeze({maxSpeed:7,reverseSpeed:2.5,acceleration:2.2,braking:5,steerAngle:.66,steerRate:1.7,returnRate:2.2});
const moored=[[222,-165.4,1.7,3.5,0],[229,-165,1.7,3.5,0],[234,-141.8,1.7,3.5,0],[248,-156,1.78,3.62,-.28]];
export function installBoatDriveArea(area,{ground,water}){
 if(area.boatDriving1)return area;
 const dryCheck=area.check.bind(area);
 area.check=(x,z,yaw,spec)=>{
  if(!spec?.marine)return dryCheck(x,z,yaw,spec);
  if(![x,z,yaw].every(Number.isFinite))return {ok:false,reason:'invalid'};
  const sin=Math.sin(yaw),cos=Math.cos(yaw);
  // A bounded continuous perimeter plus centre line, not the empty corners of
  // a sail's AABB. Maximum spacing .4m; physics sweeps at 120Hz.
  for(const [u,v]of area.footprint(spec)){
   const px=x+cos*u+sin*v,pz=z-sin*u+cos*v;
   if(px<215||px>285||pz< -188||pz> -108)return {ok:false,reason:'harbour-boundary'};
   const y=ground(px,pz);if(!water(px,pz)||(Number.isFinite(y)&&y>8.78))return {ok:false,reason:'shoreline'};
   for(const [bx,bz,w,l,a]of moored){const dx=px-bx,dz=pz-bz;if(Math.abs(Math.cos(a)*dx-Math.sin(a)*dz)<w+.15&&Math.abs(Math.sin(a)*dx+Math.cos(a)*dz)<l+.15)return {ok:false,reason:'moored-boat'};}
  }
  return {ok:true,y:SAILBOAT.y};
 };
 area.boatDriving1=true;return area;
}
export function findBoatExit(car,{ground,water,cars=[]}){
 const p=car.physics;
 if(Math.abs(p.speed)>.4)return null;
 // Prefer real dry docks; otherwise disembark safely into adjacent water.
 for(const dry of [true,false])for(const side of [-1,1])for(const longitudinal of [-1.8,0,1.8]){
  const u=side*(car.spec.halfWidth+.8),x=p.x+Math.cos(p.yaw)*u+Math.sin(p.yaw)*longitudinal,z=p.z-Math.sin(p.yaw)*u+Math.cos(p.yaw)*longitudinal;
  const occupied=cars.some(c=>{if(c===car)return false;const q=c.physics,dx=x-q.x,dz=z-q.z;return Math.abs(Math.cos(q.yaw)*dx-Math.sin(q.yaw)*dz)<c.spec.halfWidth+.45&&Math.abs(Math.sin(q.yaw)*dx+Math.cos(q.yaw)*dz)<c.spec.halfLength+.45;});if(occupied)continue;
  const probes=[[0,0],[.42,0],[-.42,0],[0,.42],[0,-.42]];
  if(dry){const y=ground(x,z);if(Number.isFinite(y)&&Math.abs(y-p.y)<1.2&&probes.every(([dx,dz])=>{const h=ground(x+dx,z+dz);return Number.isFinite(h)&&Math.abs(h-y)<.22&&!water(x+dx,z+dz);}))return {x,y:y+.58,z};}
  else if(probes.every(([dx,dz])=>water(x+dx,z+dz)))return {x,y:8.776851733454327+.58,z};
 }
 return null;
}
