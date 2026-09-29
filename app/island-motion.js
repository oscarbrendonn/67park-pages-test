import {sweepRoadPose} from './road-render-guard.js';
// Collision and ramp response are independent of render rate and visual LOD.
export function treeIndex(rows){
 const cells=new Map(),size=8;
 for(const p of rows){if(p.asset!=='tree')continue;const r=.40*(p.scale||1),tree={x:p.x,z:p.z,y:p.y??0,r,top:(p.y??0)+5*(p.scale||1)};
  for(let x=Math.floor((p.x-r-.5)/size);x<=Math.floor((p.x+r+.5)/size);x++)for(let z=Math.floor((p.z-r-.5)/size);z<=Math.floor((p.z+r+.5)/size);z++){const k=x+','+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(tree);}}
 return (x,y,z,r=.42)=>(cells.get(Math.floor(x/size)+','+Math.floor(z/size))||[]).some(t=>y+.5>t.y&&y-.55<t.top&&Math.hypot(x-t.x,z-t.z)<t.r+r);
}
export function rampResponse({height,aheadHeight,behindHeight,speed,grounded,board,cooldown=0}){
 if(!board||!grounded||cooldown>0||speed<2.5||height==null||aheadHeight==null||behindHeight==null)return 0;
 const rise=height-behindHeight,fall=aheadHeight-height;
 // Sample 0.6 m either side. Only an actual uphill-to-level/downhill lip launches.
 if(rise<.075||rise>.9||fall>rise*.3)return 0;
 return Math.min(6,Math.max(1.5,speed*rise/.6*.72));
}
export function extrapolateCar(state,age,area,spec){
 if(Math.abs(state.speed)<.001||age<=0)return state;
 const seconds=Math.max(0,Math.min(.16,age));
 const d=state.speed*seconds,yaw=state.yaw+state.speed/spec.wheelbase*Math.tan(state.steer)*seconds;
 const heading=(state.yaw+yaw)/2,x=state.x+Math.sin(heading)*d,z=state.z+Math.cos(heading)*d;
 // Even with a valid endpoint, never predict through an intervening curb.
 const checked=sweepRoadPose(state,{x,z,yaw},area,spec);
 return checked?{...state,...checked}:state;
}
