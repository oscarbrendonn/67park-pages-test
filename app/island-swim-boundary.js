// Analytic offshore navigation only: no meshes, textures, raycasts or rigid bodies.
// The rounded-rectangle default remains compatible with v1. The circular water
// table adds a five-metre approach zone without changing ordinary swimming.
export function createSwimBoundary(bounds,{
 distance=60,bodyRadius=.4,shape='rounded-rectangle',center={x:40,z:-38},radius:circleRadius=312,
 softBand=5,minApproachSpeed=.2,maxSwimSpeed=3.15,water=()=>true,sea=()=>0
}={}){
 const min={x:Number(bounds.min.x),z:Number(bounds.min.z)},max={x:Number(bounds.max.x),z:Number(bounds.max.z)};
 const circular=shape==='circle',origin={x:Number(center.x),z:Number(center.z)};
 if(!['circle','rounded-rectangle'].includes(shape)||![min.x,min.z,max.x,max.z,distance,bodyRadius].every(Number.isFinite)||max.x<=min.x||max.z<=min.z||distance<=bodyRadius||bodyRadius<0)throw Error('Invalid swim boundary');
 if(circular&&(![origin.x,origin.z,circleRadius,softBand,minApproachSpeed,maxSwimSpeed].every(Number.isFinite)||circleRadius<=bodyRadius||softBand<=0||minApproachSpeed<=0||maxSwimSpeed<minApproachSpeed))throw Error('Invalid circular swim boundary');
 const radius=(circular?circleRadius:distance)-bodyRadius,rescueRadius=(circular?circleRadius:distance)+16;
 // A world coordinate around 350 m rounds by up to 0.015 mm in Rapier float32.
 // This tolerance avoids repeatedly waking a stationary body on the circle.
 const epsilon=circular?6e-5:1e-5,velocityEpsilon=1e-9;
 const delta=circular?(x,z)=>({x:x-origin.x,z:z-origin.z}):(x,z)=>({x:x<min.x?x-min.x:x>max.x?x-max.x:0,z:z<min.z?z-min.z:z>max.z?z-max.z:0});
 const extent=(x,z)=>{const d=delta(x,z);return Math.hypot(d.x,d.z);};
 const contains=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&extent(x,z)<=radius+epsilon;
 function project(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Non-finite swim position');
  const d=delta(x,z),length=Math.hypot(d.x,d.z),nx=length?d.x/length:0,nz=length?d.z/length:0,clamped=length>radius;
  return {x:clamped?x-d.x+nx*radius:x,z:clamped?z-d.z+nz*radius:z,nx,nz,clamped};
 }
 const stats={version:circular?'offshore-swim-v2-circle':'offshore-swim-v1',shape,bounds:{min,max},distance,bodyRadius,edgeRadius:radius,rescueRadius,corrections:0,velocityStops:0,
  ...(circular?{center:origin,radius:circleRadius,softBand,minApproachSpeed,maxSwimSpeed,contactEpsilon:epsilon,softCaps:0}: {})};
 function wet(p){return water(p.x,p.z)&&p.y<sea(p.x,p.z)+1.1;}
 function approach(p){
  if(!circular||![p.x,p.y,p.z].every(Number.isFinite))return null;
  const d=delta(p.x,p.z),length=Math.hypot(d.x,d.z),gap=radius-length;
  // Interior land, ponds and pool play do not query the water sampler at all.
  if(gap>=softBand||!length||!wet(p))return null;
  const t=Math.max(0,Math.min(1,gap/softBand));
  return {length,gap,nx:d.x/length,nz:d.z/length,weight:t*t*(3-2*t)};
 }
 function limitVelocity(position,velocity){
  const a=approach(position);
  if(!a||![velocity.x,velocity.z].every(Number.isFinite))return {...velocity};
  const outward=velocity.x*a.nx+velocity.z*a.nz;
  if(outward<=0)return {...velocity};
  // A small approach floor makes the visible rim reachable in finite time.
  // This modifies the fresh desired velocity, never repeatedly damps momentum.
  const allowed=a.gap<=epsilon?0:Math.min(outward,Math.max(minApproachSpeed,outward*a.weight));
  return {...velocity,x:velocity.x-(outward-allowed)*a.nx,z:velocity.z-(outward-allowed)*a.nz};
 }
 function capBody(body,dt){
  const p=body.translation(),a=approach(p);
  if(!a)return false;
  const v=body.linvel();if(![v.x,v.y,v.z].every(Number.isFinite))return false;
  const outward=v.x*a.nx+v.z*a.nz;
  let allowed=a.gap<=epsilon?0:Math.max(minApproachSpeed,maxSwimSpeed*a.weight);
  // Apply AFTER the controller impulse. Bound the next step, including the
  // tiny inward component needed to follow a round rim at tangential speed.
  // Tangential velocity and y are unchanged; existing stronger inward motion
  // is never slowed. Pathological frame gaps still retain pre-step projection.
  const step=Number.isFinite(dt)&&dt>0?Math.min(dt,.25):0;
  if(step){
   const tangentSq=Math.max(0,v.x*v.x+v.z*v.z-outward*outward);
   const nextRadial=Math.sqrt(Math.max(0,radius*radius-tangentSq*step*step));
   // Treat sub-float32 positive drift as contact, not a forced idle correction.
   allowed=Math.min(allowed,(nextRadial-Math.min(a.length,radius))/step);
  }
  if(outward<=allowed+velocityEpsilon)return false;
  body.setLinvel({x:v.x-(outward-allowed)*a.nx,y:v.y,z:v.z-(outward-allowed)*a.nz},true);
  stats.softCaps++;return true;
 }
 function constrain(body,dt){
  const p=body.translation();
  if(![p.x,p.y,p.z].every(Number.isFinite))return false;
  const d=delta(p.x,p.z),length=Math.hypot(d.x,d.z);
  if(length<radius-epsilon||!length||!wet(p))return false;
  const nx=d.x/length,nz=d.z/length;
  let corrected=false;
  if(length>radius+epsilon){
   body.setTranslation({x:p.x-d.x+nx*radius,y:p.y,z:p.z-d.z+nz*radius},true);
   stats.corrections++;corrected=true;
  }
  const v=body.linvel(),outward=v.x*nx+v.z*nz;
  if(outward>velocityEpsilon){
   body.setLinvel({x:v.x-outward*nx,y:v.y,z:v.z-outward*nz},true);
   stats.velocityStops++;corrected=true;
  }
  return corrected;
 }
 return {contains,project,constrain,limitVelocity,capBody,stats,outsideRescue:(x,z)=>!Number.isFinite(x)||!Number.isFinite(z)||extent(x,z)>rescueRadius};
}
