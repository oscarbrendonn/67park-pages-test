const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const valid=(p,area,spec)=>p&&[p.x,p.z,p.yaw].every(Number.isFinite)&&area.check(p.x,p.z,p.yaw,spec).ok;
/** Check the swept bumper/mirror footprint, including rotational travel.
 * Bounded work: packet discontinuities reconcile to a checked server pose,
 * never interpolate across a pavement/grass island or run an unbounded loop.
 */
export function sweepRoadPose(from,to,area,spec){
 if(!valid(from,area,spec))return null;
 const angle=shortest(from.yaw,to.yaw),travel=Math.hypot(to.x-from.x,to.z-from.z)+Math.hypot(spec.halfWidth??0,spec.halfLength??0)*Math.abs(angle);
 if(!Number.isFinite(travel)||travel>3.84)return null;
 const steps=Math.max(1,Math.ceil(travel/.08));let last={x:from.x,y:from.y,z:from.z,yaw:from.yaw},clipped=false;
 for(let i=1;i<=steps;i++){
  const t=i/steps,p={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,yaw:from.yaw+angle*t};
  const hit=area.check(p.x,p.z,p.yaw,spec);if(!hit.ok){clipped=true;break;}
  last={...p,y:hit.y??from.y};
 }
 return {...last,clipped};
}
export function roadRenderPose(current,predicted,authoritative,blend,area,spec){
 if(!valid(authoritative,area,spec))return valid(current,area,spec)?current:null;
 if(!valid(current,area,spec))return authoritative;
 const t=Math.max(0,Math.min(1,blend)),candidate={x:current.x+(predicted.x-current.x)*t,z:current.z+(predicted.z-current.z)*t,yaw:current.yaw+shortest(current.yaw,predicted.yaw)*t};
 const checked=sweepRoadPose(current,candidate,area,spec);
 // A valid endpoint doesn't make a straight blend through a curved road safe.
 // Reconcile only to the validated server pose rather than display off-road.
 return checked&&!checked.clipped?checked:authoritative;
}
