// Authored playing-line bounds; the stadium uses the existing west widening.
const sx=80.3/40.3,stadiumX=x=>201.15+(x-201.15)*sx;
export const LOBBY_COURTS=Object.freeze([
 {id:'basket',sport:'basketball',label:'Basketball',mesh:'SPORT103_BASKETBALL',radius:.288,authoredRadius:.32,x:-54,z:-30.5,halfX:14,halfZ:7.5,spawn:[-51.2,-28.3],anchor:[-63.5,-32.5],lift:.31,entry:[-54,-18.9]},
 {id:'penalty',sport:'football',label:'Football',mesh:'SPORT103_FOOTBALL',radius:.306,authoredRadius:.34,x:stadiumX(181.2),z:-37,halfX:9.5*sx,halfZ:23.4,spawn:[stadiumX(183),-28.8],anchor:[181.2,-37],lift:.32,entry:[stadiumX(181.2),1.8]}
]);
export const COURT_PLAYER_RADIUS=.38;
// Preserve first contact direction even if a movement sample crosses the centre.
export function courtBallContact(ball,player,previous,radius){
 let dx=ball.x-player.x,dz=ball.z-player.z,d=Math.hypot(dx,dz);
 if(previous&&Math.hypot(player.x-previous.x,player.z-previous.z)<3){
  const sx=previous.x-ball.x,sz=previous.z-ball.z,vx=player.x-previous.x,vz=player.z-previous.z;
  const a=vx*vx+vz*vz,b=2*(sx*vx+sz*vz),c=sx*sx+sz*sz-radius*radius,disc=b*b-4*a*c;
  if(a>1e-10&&c>=-1e-6&&disc>=0){const t=(-b-Math.sqrt(disc))/(2*a);if(t>=0&&t<=1){dx=-(sx+vx*t);dz=-(sz+vz*t);d=Math.hypot(dx,dz);return {nx:dx/d,nz:dz/d};}}
 }
 if(d>=radius)return null;
 if(d<1e-6){dx=ball.x-(previous?.x??player.x);dz=ball.z-(previous?.z??player.z);d=Math.hypot(dx,dz);if(d<1e-6)return null;}
 return {nx:dx/d,nz:dz/d};
}
export function courtStrike(ball,player,heading){
 if(!Number.isFinite(heading))return false;
 const dx=ball.x-player.x,dz=ball.z-player.z,d=Math.hypot(dx,dz);
 return d>.05&&d<1.5&&(dx*Math.sin(heading)+dz*Math.cos(heading))/d>.65;
}
export function courtContains(c,x,z,margin=0){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x-c.x)<=c.halfX+margin&&Math.abs(z-c.z)<=c.halfZ+margin;}
export function constrainCourtBall(ball,c){
 for(const [axis,center,half] of [['x',c.x,c.halfX],['z',c.z,c.halfZ]]){
  const lo=center-half+c.radius,hi=center+half-c.radius,v='v'+axis;
  if(ball[axis]<lo){ball[axis]=lo;ball[v]=Math.abs(ball[v])*.42;}
  if(ball[axis]>hi){ball[axis]=hi;ball[v]=-Math.abs(ball[v])*.42;}
 }
 return ball;
}
export class LobbyCourtBalls{
 constructor(ground=()=>0){this.players=new Map();this.balls=LOBBY_COURTS.map(c=>({id:c.id,x:c.spawn[0],z:c.spawn[1],vx:0,vz:0,floor:(ground(...c.anchor)??0)+c.lift}));}
 step(dt,now,players=[]){
  dt=Math.max(0,Math.min(.05,dt));const active=[];
  for(const p of players){
   if(!Array.isArray(p.p)||p.p.length!==3||!p.p.every(Number.isFinite)||!Number.isFinite(p.at)||now-p.at>250||now<p.at||p.mounted||p.inMatch)continue;
   let last=this.players.get(p.id);
   let fresh=false;
   if(!last||p.at!==last.at){
    const seconds=last?(p.at-last.at)/1000:0,dx=last?p.p[0]-last.x:0,dz=last?p.p[2]-last.z:0;
    // Joining, teleporting and stale/reconnected packets cannot kick a ball.
    const valid=seconds>0&&seconds<.3&&Math.hypot(dx,dz)<3&&Math.hypot(dx,dz)/seconds<=16;
    const tag=typeof p.e==='string'&&/^pk1b:\d{1,5}$/.test(p.e)?p.e:null;
    const strike=!!(valid&&tag&&tag!==last?.strikeTag&&now-(last?.strikeAt??-Infinity)>=350);
    last={x:p.p[0],z:p.p[2],at:p.at,previous:valid?{x:last.x,z:last.z}:null,valid,vx:valid?dx/seconds:0,vz:valid?dz/seconds:0,strike,heading:p.heading,strikeTag:tag||last?.strikeTag,strikeAt:strike?now:last?.strikeAt};this.players.set(p.id,last);fresh=true;
   }
   active.push({...last,fresh,y:p.p[1],id:p.id});
  }
  for(const [id,p] of this.players)if(now-p.at>1000)this.players.delete(id);
  for(const b of this.balls){const c=LOBBY_COURTS.find(c=>c.id===b.id);
   const near=active.filter(p=>p.valid&&courtContains(c,p.x,p.z)&&Math.abs(p.y-b.floor-.555)<.65).sort((a,d)=>Math.hypot(b.x-a.x,b.z-a.z)-Math.hypot(b.x-d.x,b.z-d.z)||a.id.localeCompare(d.id));
   for(const p of near){
    if(p.fresh&&p.strike&&courtStrike(b,p,p.heading)){b.vx=Math.sin(p.heading)*7;b.vz=Math.cos(p.heading)*7;break;}
    const contact=courtBallContact(b,p,p.fresh?p.previous:null,c.radius+COURT_PLAYER_RADIUS+.035);if(!contact)continue;
    const {nx,nz}=contact,approach=p.vx*nx+p.vz*nz;
    // One impulse per movement packet; waiting packets cannot repeatedly kick.
    if(p.fresh&&approach>.15){const speed=Math.min(8,Math.max(.65,approach*1.08));if(b.vx*nx+b.vz*nz<speed){b.vx=nx*speed;b.vz=nz*speed;}}
    b.x=p.x+nx*(c.radius+COURT_PLAYER_RADIUS+.035);b.z=p.z+nz*(c.radius+COURT_PLAYER_RADIUS+.035);
    break;
   }
   b.x+=b.vx*dt;b.z+=b.vz*dt;const drag=Math.exp(-2.4*dt);b.vx*=drag;b.vz*=drag;if(Math.hypot(b.vx,b.vz)<.025)b.vx=b.vz=0;constrainCourtBall(b,c);
  }
 }
 snapshot(){return this.balls.map(({id,x,z,vx,vz})=>({id,x,z,vx,vz}));}
}
