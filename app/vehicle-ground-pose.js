import {Vector3} from 'three';
import {createTyreSupport,tyreSupportHeight} from './vehicle-tyre-support.js?v=tyre-contact-1';

// Presentation-only tyre contact. Authority, bumpers, steering and seat
// ownership are unchanged. Four tyres, not the car centre, support the body.
const records=new WeakMap(),point=new Vector3();
export function applyVehicleGroundPose(car,area){
 if(car.spec?.marine||!area?.supportHeight||!car.physics||car.wheels?.length!==4)return;
 const p=car.physics;if(![p.x,p.y,p.z,p.yaw,p.steer].every(Number.isFinite))return;
 let record=records.get(car);
 if(!record||record.wheels!==car.wheels){
  record={area,wheels:car.wheels,rest:car.wheels.map(w=>w.pivot.position.y),shapes:car.wheels.map(w=>createTyreSupport(w,car.spec.wheelRadius)),key:null,pose:null};records.set(car,record);
 }
 if(record.area!==area){record.area=area;record.key=null;}
 const key=[p.x,p.z,p.yaw,p.steer,p.y].join(',');
 if(record.key!==key){
  const scale=car.spec.scale,radius=car.spec.wheelRadius*scale,rows=[];
  car.group.position.set(p.x,p.y+.015,p.z);car.group.rotation.set(0,p.yaw,0,'YXZ');
  car.wheels.forEach((w,i)=>w.pivot.position.y=record.rest[i]);car.group.updateMatrixWorld(true);
  const s=Math.sin(p.yaw),c=Math.cos(p.yaw);
  for(const [i,w]of car.wheels.entries()){
   w.pivot.getWorldPosition(point);
   const x=(point.x-p.x)*c-(point.z-p.z)*s,z=(point.x-p.x)*s+(point.z-p.z)*c;
   const localY=point.y-car.group.position.y;
   const floor=area.supportHeight(point.x,point.z);
   // Do not use centre height as a lower bound: it would lift all tyres
   // simultaneously when only the front axle has reached a curb.
   const hub=tyreSupportHeight(area.supportHeight,w,record.shapes[i],(Number.isFinite(floor)?floor:p.y)+radius)+localY-radius+.015;
   rows.push({x,z,hub,base:hub-localY,clearance:localY-radius+.015});
  }
  const mean=field=>rows.reduce((sum,r)=>sum+r[field],0)/4;
  const mx=mean('x'),mz=mean('z'),my=mean('base');
  const slope=field=>{
   const center=mean(field);let numerator=0,denominator=0;
   for(const r of rows){const offset=r[field]-center;numerator+=offset*(r.base-my);denominator+=offset*offset;}
   // A collapsed axle cannot define a slope on this axis. Stay level instead
   // of caching NaN/Infinity in the body and all four suspension transforms.
   return denominator>1e-10&&Number.isFinite(numerator)&&Number.isFinite(denominator)?numerator/denominator:0;
  };
  const sx=slope('x'),sz=slope('z');
  const pitch=Math.max(-.22,Math.min(.22,-Math.atan(sz))),roll=Math.max(-.22,Math.min(.22,Math.atan(sx)));
  const y=my-sx*mx-sz*mz;
  car.group.position.y=y;car.group.rotation.set(pitch,p.yaw,roll,'YXZ');car.group.updateMatrixWorld(true);
  const up=scale*Math.cos(pitch)*Math.cos(roll);
  const wheelY=car.wheels.map((w,i)=>{w.pivot.getWorldPosition(point);return record.rest[i]+(rows[i].hub-point.y)/up;});
  // Pitch/roll moves each contact sideways as well as vertically. Near a
  // curb, the flat-body sample can therefore land on the wrong surface.
  // Resolve suspension at the actual tilted centres (flat roads stay cheap).
  if(Math.abs(pitch)+Math.abs(roll)>1e-6)for(const [i,w]of car.wheels.entries()){
   let below=-Infinity,above=Infinity;
   for(let pass=0;pass<12;pass++){
    w.pivot.position.y=wheelY[i];w.pivot.updateWorldMatrix(false,true);
    w.pivot.getWorldPosition(point);const floor=area.supportHeight(point.x,point.z);
    const hub=tyreSupportHeight(area.supportHeight,w,record.shapes[i],(Number.isFinite(floor)?floor:p.y)+radius)+rows[i].clearance;
    const delta=(hub-point.y)/up;
    if(Math.abs(delta)<.0001)break;
    if(delta>0)below=Math.max(below,wheelY[i]);else above=Math.min(above,wheelY[i]);
    // Raising a rolled wheel also shifts it sideways. At the curb boundary
    // a naive height iteration alternated between the road and pavement.
    // Bracket that contact instead, retaining the non-penetrating side.
    wheelY[i]=Number.isFinite(below+above)&&below<above?(below+above)*.5:wheelY[i]+delta;
    if(pass===11&&Number.isFinite(above)&&above>below)wheelY[i]=above;
   }
  }
  record.key=key;record.pose={y,pitch,roll,wheelY};
 }
 const pose=record.pose;
 car.group.position.set(p.x,pose.y,p.z);car.group.rotation.set(pose.pitch,p.yaw,pose.roll,'YXZ');
 car.wheels.forEach((w,i)=>w.pivot.position.y=pose.wheelY[i]);car.group.updateMatrixWorld(true);
}
