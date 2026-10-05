// One physics implementation for offline prediction and the dedicated Kimi
// server. Preserve the 120 Hz collision sweep, footprint and mounting rules.
import {BOAT_DRIVING} from './boat-driving-rules.js?v=boat-driving-1';
import {recoverVehicleFromWater} from './vehicle-water-recovery.js?v=water-recovery-2';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d);
export const PARK_DRIVING_REVISION='beach-drive-1';
export const PARK_DRIVING=Object.freeze({maxSpeed:13,reverseSpeed:4,acceleration:8,braking:16,steerAngle:.66,steerRate:3.8,returnRate:4.8});
export function sweepParkVehiclePath(car,x,z,yaw,step=.08){
  const travel=Math.hypot(x-car.x,z-car.z)+Math.abs(yaw-car.yaw)*Math.hypot(car.spec.halfWidth??0,car.spec.halfLength??0);
  const steps=Math.max(1,Math.ceil(travel/step));
  let last={x:car.x,y:car.y,z:car.z,yaw:car.yaw};
  for(let i=1;i<=steps;i++){
    const t=i/steps,px=car.x+(x-car.x)*t,pz=car.z+(z-car.z)*t,pyaw=car.yaw+(yaw-car.yaw)*t;
    const hit=car.area.check(px,pz,pyaw,car.spec);
    if(!hit.ok)return {...last,clipped:true,contact:hit};
    if(car.blocked?.(px,pz,pyaw))return {...last,clipped:true,contact:{ok:false,reason:'car'}};
    last={x:px,y:hit.y??car.y,z:pz,yaw:pyaw};
  }
  return {...last,clipped:false};
}
export function slideParkVehicle(car,hit,dx,dz,nyaw,distance){
  if(car.spec.marine||!hit.normal)return false;
  const {x:nx,z:nz}=hit.normal,length=Math.hypot(nx,nz);
  if(!Number.isFinite(length)||length<1e-8)return false;
  const x=nx/length,z=nz/length,inward=dx*x+dz*z;
  const tx=dx-x*inward,tz=dz-z*inward,travel=Math.hypot(tx,tz);
  // Retain even a small real tangent. The old 50% cutoff made steep glancing
  // contacts feel glued to corners and prevented turning away from a stop.
  // Exactly head-on still stops; never invent a sideways direction.
  if(travel<1e-10)return false;
  // Test turning first; if the outside bumper would rotate through the wall,
  // allow only the outward clearance needed by the rotating footprint. This
  // lets a long bus turn away without pinning its rear corner to the wall.
  // The total move still fits this 120 Hz step's distance budget.
  // A curved wall's conservative 25 cm cells can block its mathematical
  // tangent. Spend part of THIS substep on outward clearance, not a teleport
  // or an enlarged collision tolerance. Try the zero-bias path first.
  for(const bias of [0,.18,.4,.65,'x','z',.85,.98,.999])for(const yaw of [nyaw,car.yaw]){
    const extent=a=>car.spec.halfWidth*Math.abs(Math.cos(a)*x-Math.sin(a)*z)+car.spec.halfLength*Math.abs(Math.sin(a)*x+Math.cos(a)*z);
    let moveX,moveZ;
    if(typeof bias==='string'){
      // The clearance mask is axis-aligned. At a stair-step, a short move
      // along its exposed face clears the cell without reversing the other
      // coordinate. It must still advance along the wall's smooth tangent.
      moveX=bias==='x'?Math.sign(tx)*Math.abs(distance):0;
      moveZ=bias==='z'?Math.sign(tz)*Math.abs(distance):0;
      if(moveX*x+moveZ*z>=0)continue;
    }else{
      const outward=Math.max(Math.abs(distance)*bias,-inward,yaw===car.yaw?0:extent(yaw)-extent(car.yaw)+1e-5);
      if(outward>=Math.abs(distance))continue;
      const along=Math.min(travel,Math.sqrt(distance*distance-outward*outward));
      const fraction=travel>1e-10?along/travel:0;
      moveX=tx*fraction-x*outward;moveZ=tz*fraction-z*outward;
    }
    if(moveX*tx+moveZ*tz<=0)continue;
    const px=car.x+moveX,pz=car.z+moveZ;
    const end=sweepParkVehiclePath(car,px,pz,yaw,.04);
    if(end.clipped)continue;
    car.x=px;car.z=pz;car.y=end.y;car.yaw=yaw;
    car.distance+=Math.sign(distance)*Math.hypot(moveX,moveZ);car.reason='wall-slide';
    return true;
  }
  return false;
}
export function updateParkDriving(car,dt,{throttle=0,steer=0,brake=false}={}) {
  if(![dt,throttle,steer].every(Number.isFinite)){car.stop();return;}
  dt=clamp(dt,0,.05);throttle=clamp(throttle,-1,1);steer=clamp(steer,-1,1);
  if(recoverVehicleFromWater(car,dt))return;
  if(car.waterRecoveryBrake>0){car.waterRecoveryBrake=Math.max(0,car.waterRecoveryBrake-dt);throttle=steer=0;brake=true;}
  car.accumulator+=dt;car.distance=0;car.reason='';
  const h=1/120, p=car.spec.marine?BOAT_DRIVING:PARK_DRIVING;
  while(car.accumulator+1e-9>=h){
    car.accumulator-=h;
    const angle=p.steerAngle/(1+Math.abs(car.speed)*.045);
    car.steer=approach(car.steer,-steer*angle,(Math.abs(steer)<.01?p.returnRate:p.steerRate)*h);
    if(brake)car.speed=approach(car.speed,0,p.braking*h);
    else if(Math.abs(throttle)>.06)car.speed=approach(car.speed,throttle>0?p.maxSpeed*throttle:p.reverseSpeed*throttle,(car.speed*throttle<-.03?11:p.acceleration)*h);
    else car.speed=approach(car.speed,0,2*h);
    const turn=car.speed/car.spec.wheelbase*Math.tan(car.steer)*h;
    const heading=car.yaw+turn*.5,d=car.speed*h,nx=car.x+Math.sin(heading)*d,nz=car.z+Math.cos(heading)*d,nyaw=car.yaw+turn;
    if(Math.abs(d)<1e-7)continue;
    // Check intervening samples too: at a curved cell boundary the endpoint
    // alone can be clear while the bumper crosses a thin blocked sliver.
    // Prediction uses this same path sweep, so it cannot pin an otherwise
    // moving authoritative car to a stricter intermediate collision.
    const path=sweepParkVehiclePath(car,nx,nz,nyaw);
    if(path.clipped){
      const hit=path.contact;
      // The surface domain distinguishes dry tyre support from a bumper
      // overhang. Only real tyre/centre water entry requests this rescue;
      // dry beach sand remains drivable. Solid walls still slide.
      if(hit.water&&!car.spec.marine){car.speed=0;car.reason='water-edge';continue;}
      if(slideParkVehicle(car,hit,nx-car.x,nz-car.z,nyaw,d))continue;
      car.speed=0;car.reason=hit.reason;continue;
    }
    car.x=nx;car.z=nz;car.y=path.y;car.yaw=nyaw;car.distance+=d;
  }
}
export function tunePreviewWorld(world){
  for(const car of world?.cars||[]){
    if(!['car','bus','boat'].includes(car.kind)||car.physics.previewDriving35)continue;
    car.physics.previewDriving35=true;
    car.physics.update=function(dt,input){return updateParkDriving(this,dt,input)};
  }
  return world;
}
