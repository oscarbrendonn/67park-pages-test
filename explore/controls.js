// Camera-only controls. No player, physics, network or asset mutations.
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function stickVector(dx,dy,radius){
 const length=Math.hypot(dx,dy),scale=length>radius?radius/length:1;
 return {x:dx*scale/radius,z:dy*scale/radius,px:dx*scale,py:dy*scale};
}
export function rotatePose(pose,dx,dy){
 pose.yaw-=dx*.0035;pose.pitch=clamp(pose.pitch-dy*.0035,-1.48,1.35);
}
export function stepPose(pose,input,dt,bounds){
 dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
 const length=Math.max(1,Math.hypot(input.x,input.z,input.y));
 const speed=(input.fast?65:24)*dt/length;
 const sin=Math.sin(pose.yaw),cos=Math.cos(pose.yaw);
 // Negative z is forward, same convention as the joystick.
 pose.x=clamp(pose.x+(input.x*cos-input.z*sin)*speed,bounds.minX,bounds.maxX);
 pose.z=clamp(pose.z+(input.x*sin+input.z*cos)*speed,bounds.minZ,bounds.maxZ);
 pose.y=clamp(pose.y+input.y*speed,bounds.minY,bounds.maxY);
 return pose;
}
export function overviewPose(box,aspect,fov=50){
 const halfX=(box.max.x-box.min.x)/2,halfZ=(box.max.z-box.min.z)/2;
 const tangent=Math.tan(fov*Math.PI/360),pitch=-1.30;
 // Include depth tilt and building height, leaving room for the mobile HUD.
 const height=1.25*Math.max(halfX/(tangent*Math.max(.2,aspect)),halfZ/tangent)+(box.max.y-box.min.y);
 return {x:(box.min.x+box.max.x)/2,y:box.min.y+height,z:(box.min.z+box.max.z)/2+height/Math.tan(-pitch),yaw:0,pitch};
}

// Perspective ray/ground intersection: dragging stays attached to the grabbed
// map location, even in the slightly tilted bird's-eye view or near the edges.
export function mapPoint(pose,pixel,viewport,planeY=0){
 if(!(viewport.width>0&&viewport.height>0))return null;
 const tangent=Math.tan((viewport.fov??50)*Math.PI/360);
 const sx=(pixel.x/viewport.width*2-1)*tangent*viewport.width/viewport.height;
 const sy=(1-pixel.y/viewport.height*2)*tangent;
 const sin=Math.sin(pose.yaw),cos=Math.cos(pose.yaw),sp=Math.sin(pose.pitch),cp=Math.cos(pose.pitch);
 const dx=sin*cp+cos*sx-sin*sp*sy,dy=sp+cp*sy,dz=-cos*cp+sin*sx+cos*sp*sy;
 if(Math.abs(dy)<1e-8)return null;
 const t=(planeY-pose.y)/dy;
 if(!Number.isFinite(t)||t<=0)return null;
 return {x:pose.x+dx*t,y:planeY,z:pose.z+dz*t};
}
export function clampMapPose(pose,viewport,limits){
 pose.y=limits.planeY+clamp(pose.y-limits.planeY,limits.minHeight,limits.maxHeight);
 const center=mapPoint(pose,{x:viewport.width/2,y:viewport.height/2},viewport,limits.planeY);
 if(center){pose.x+=clamp(center.x,limits.minX,limits.maxX)-center.x;pose.z+=clamp(center.z,limits.minZ,limits.maxZ)-center.z;}
 return pose;
}
export function transformMapGesture(pose,from,to,scale,viewport,limits){
 if(!Number.isFinite(scale)||scale<=0)return pose;
 const anchor=mapPoint(pose,from,viewport,limits.planeY);
 if(!anchor)return pose;
 pose.y=limits.planeY+clamp((pose.y-limits.planeY)*scale,limits.minHeight,limits.maxHeight);
 const next=mapPoint(pose,to,viewport,limits.planeY);
 if(next){pose.x+=anchor.x-next.x;pose.z+=anchor.z-next.z;}
 return clampMapPose(pose,viewport,limits);
}
