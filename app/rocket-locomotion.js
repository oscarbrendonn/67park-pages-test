// Server-safe horizontal adapter. Same scalar speed ramp and vector approach
// as advanceClaudeGorilla + approachVelocity; arena collision remains owner.
export function rocketTravel(p,x,z,run,dt,profile){
 const magnitude=Math.hypot(x,z),moving=magnitude>.08,n=Math.max(1,magnitude);
 const target=moving?(run?profile.sprint:profile.run)*Math.min(1,magnitude)*(p.slow>0?.48:1):0;
 const acceleration=p.grounded!==false?(moving?profile.groundAcceleration:profile.groundBraking):profile.airAcceleration;
 const amount=acceleration*Math.min(.05,Math.max(0,dt));
 p.moveSpeed=(p.moveSpeed||0)+Math.max(-amount,Math.min(amount,target-(p.moveSpeed||0)));
 if(moving)p.moveHeading=Math.atan2(x/n,z/n);
 const heading=p.moveHeading??p.yaw??Math.PI;
 const tx=Math.sin(heading)*p.moveSpeed,tz=Math.cos(heading)*p.moveSpeed;
 const vx=p.moveVX||0,vz=p.moveVZ||0,dx=tx-vx,dz=tz-vz,d=Math.hypot(dx,dz),f=d?Math.min(1,amount/d):1;
 p.moveVX=vx+dx*f;p.moveVZ=vz+dz*f;
 return {x:(p.moveVX+(p.kx||0))*dt,z:(p.moveVZ+(p.kz||0))*dt};
}
export function spawnHeading(z){return z>0?Math.PI:0;}
export function movementAim(move,aim,active,heading=Math.PI){
 if(active)return aim;
 const d=Math.hypot(move.x,move.z);
 return d>.08?{x:move.x/d,z:move.z/d}:{x:Math.sin(heading),z:Math.cos(heading)};
}
