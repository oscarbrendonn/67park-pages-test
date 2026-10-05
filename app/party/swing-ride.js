import * as T from 'three';
import {RoundedBoxGeometry} from '../../island/utils/RoundedBoxGeometry.js';
import {mergeGeometries} from '../../island/utils/BufferGeometryUtils.js';

// Shared by the authoritative server and renderer. The settled grass height
// is surveyed separately; never regenerate terrain to make room for this prop.
export const SWING_SITE=Object.freeze({x:200,y:9.398031234741211,z:109});
export const SWING_RULES=Object.freeze({asset:'candy-swings',period:3.6,height:3.6,length:2.45,amplitude:.38,seats:2});
export function swingSeat(phase,index,site=SWING_SITE){
 if(!Number.isInteger(index)||index<0||index>=2)throw RangeError('Invalid swing seat');
 const angle=SWING_RULES.amplitude*Math.sin(phase+index*Math.PI*.4),l=SWING_RULES.length;
 return {position:new T.Vector3(site.x+(index?1.2:-1.2),site.y+SWING_RULES.height-l*Math.cos(angle),site.z-l*Math.sin(angle)),heading:0,kind:'swing',posture:'bench',angle};
}
export function swingFrameBlocked(x,y,z,site=SWING_SITE){
 if(![x,y,z].every(Number.isFinite))return false;
 const h=y-site.y;if(h<-.2||h>SWING_RULES.height+.2)return false;
 const side=1.4*(1-Math.max(0,Math.min(1,h/SWING_RULES.height)));
 return [-3,3].some(dx=>[-side,side].some(dz=>Math.hypot(x-site.x-dx,z-site.z-dz)<.28));
}
export function createSwingRide({site=SWING_SITE,visual=true}={}){
 const occupants=new Map(),group=new T.Group(),pivots=[],seats=[],geometries=[],materials=[];
 group.name='PARK_CANDY_SWINGS';group.position.set(site.x,site.y,site.z);
 let phase=0,network=false;
 const entry=new T.Vector3(site.x,site.y,site.z+3.6);
 function sync(){for(let i=0;i<pivots.length;i++){const a=swingSeat(phase,i,site).angle;pivots[i].rotation.x=a;seats[i].rotation.x=-a;}group.updateMatrixWorld(true);}
 if(visual){
  const palette=['#a7d5be','#e9abc6','#adcde6','#fff3db'];
  for(const color of palette)materials.push(new T.MeshStandardMaterial({color,roughness:.55,metalness:0}));
  const bins=palette.map(()=>[]),up=new T.Vector3(0,1,0);
  function beam(a,b,r,paint){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),g=new T.CylinderGeometry(r,r,delta.length(),10);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,delta.normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);bins[paint].push(g);}
  for(const [i,x]of [-3,3].entries()){
   for(const z of [-1.4,1.4]){beam([x,.08,z],[x,3.6,0],.11,i?2:0);const g=new T.SphereGeometry(.2,10,6);g.scale(1,.4,1);g.translate(x,.08,z);bins[i?2:0].push(g);}
   beam([x,1,-1],[x,1,1],.075,3);
   const cap=new T.SphereGeometry(.19,12,8);cap.translate(x,3.6,0);bins[1].push(cap);
  }
  beam([-3.2,3.6,0],[3.2,3.6,0],.13,0);
  for(let i=0;i<bins.length;i++)if(bins[i].length){const g=mergeGeometries(bins[i]);bins[i].forEach(g=>g.dispose());geometries.push(g);const m=new T.Mesh(g,materials[i]);m.castShadow=true;m.receiveShadow=true;m.userData.safeShadowCaster=true;group.add(m);}
  const rope=new T.CylinderGeometry(.027,.027,SWING_RULES.length,6),seatGeo=new RoundedBoxGeometry(1.08,.16,.68,2,.08),backGeo=new RoundedBoxGeometry(1.08,.35,.10,2,.045);geometries.push(rope,seatGeo,backGeo);
  for(let i=0;i<2;i++){
   const pivot=new T.Group();pivot.position.set(i?1.2:-1.2,3.6,0);group.add(pivot);pivots.push(pivot);
   for(const x of [-.48,.48]){const m=new T.Mesh(rope,materials[3]);m.position.set(x,-SWING_RULES.length/2,0);pivot.add(m);}
   const seat=new T.Group();seat.position.y=-SWING_RULES.length;pivot.add(seat);seats.push(seat);
   const pad=new T.Mesh(seatGeo,materials[i?2:1]);pad.position.y=-.08;pad.castShadow=true;pad.receiveShadow=true;seat.add(pad);
   const back=new T.Mesh(backGeo,materials[i?2:1]);back.position.set(0,.14,-.29);back.castShadow=true;seat.add(back);
  }
 }
 sync();
 const ride={asset:SWING_RULES.asset,label:'Candy swings',group,entry,stats:{seats:2,period:SWING_RULES.period},
  // Preserve the grass support. This ride has no walkable moving deck;
  // mounted riders use seat(), not a fabricated floor under the whole set.
  ground:()=>null,deck:()=>null,poles:()=>[],blockers:[],
  seat:i=>swingSeat(phase,i,site),nearestSeat:()=>0,boardingSeat:()=>[0,1].find(i=>!occupants.has(i))??-1,
  claimSeat(i,id){if(!Number.isInteger(i)||i<0||i>1||typeof id!=='string'||!id)return false;if(occupants.has(i))return occupants.get(i)===id;if([...occupants.values()].includes(id))return false;occupants.set(i,id);return true;},
  releaseSeat(i,id){return occupants.get(i)===id&&occupants.delete(i);},
  seatStatus:()=>({capacity:2,occupied:[...occupants.keys()],totalOccupied:occupants.size}),
  advance(dt){if(!network&&Number.isFinite(dt)&&dt>0){phase=(phase+Math.min(.05,dt)*Math.PI*2/SWING_RULES.period)%(Math.PI*2);sync();}},
  setNetworkAngle(a){if(!Number.isFinite(a))return;network=true;phase=a;sync();},get angle(){return phase;},
  state:()=>({asset:SWING_RULES.asset,angle:phase,entry:entry.toArray(),occupancy:ride.seatStatus(),seat:ride.seat(0).position.toArray()}),
  dispose(){group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();occupants.clear();}
 };return ride;
}
