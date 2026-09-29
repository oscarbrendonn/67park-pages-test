import * as T from 'three';
import {SAILBOAT,installBoatDriveArea} from './boat-driving-rules.js?v=boat-driving-1';
import {updateParkDriving} from './park-driving-tuning.js?v=bus-drive-1';
import {installGrassUnderfill} from './grass-underfill.js?v=grass-underfill-1';

export function installBoatDriving(world){
 installGrassUnderfill(world);
 if(world.boatDriving)return world;
 const home=JSON.parse(world.renderer.domElement.dataset.lunapark77).placements.find(p=>p.asset==='sailCream');
 if(!home||Math.abs(home.y-SAILBOAT.y)>.001)throw Error('Sailboat waterline changed');
 const meshes=world.lunapark.group.children.filter(o=>o.isMesh&&o.name==='LUNA77_sailCream');if(!meshes.length)throw Error('Sailboat geometry missing');
 // Contacts retain their original triangle index; queries transform into its
 // moored coordinate space instead of allocating a new index every frame.
 const rawGround=world.boatContacts.baseGround,rawWater=world.boatContacts.baseWater;
 installBoatDriveArea(world.traffic.area,{ground:rawGround,water:rawWater});
 const group=new T.Group();group.name='67PARK_DRIVABLE_SAILBOAT';group.position.set(home.x,home.y,home.z);group.rotation.y=home.yaw;world.scene.add(group);group.updateMatrixWorld(true);
 const inverse=group.matrixWorld.clone().invert();
 for(const mesh of meshes){mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=true;mesh.matrix.copy(inverse);mesh.userData.dynamicShadow=true;group.add(mesh);world.shadowCache?.markDynamic?.(mesh);}
 group.updateMatrixWorld(true);
 const physics={...SAILBOAT,spec:SAILBOAT.spec,area:world.traffic.area,speed:0,steer:0,accumulator:0,distance:0,reason:'',blocked:()=>false,stop(){this.speed=0;this.accumulator=0;},update(dt,input){updateParkDriving(this,dt,input);}};
 const owners=new Map(),seats=SAILBOAT.seats.map(point=>{const position=new T.Vector3(...point);position.y+=.24;return {position,base:position.clone()};});
 // The legacy traffic broadphase must stay below water for boats; exact hull
 // and deck contacts are supplied separately by boatContacts.
 const car={...SAILBOAT,group,model:group,physics,roofUnderside:-.4,capacity:seats.length,userDataSeatFit:true,seats,wheels:[],stats:{draws:meshes.length,triangles:0},
  seatStatus:()=>({occupied:[...owners.keys()],capacity:seats.length}),ownerAt:i=>owners.get(i),claimSeat(i,owner){if(!Number.isInteger(i)||i<0||i>=seats.length||owners.has(i))return false;owners.set(i,owner);return true;},releaseSeat(i,owner){if(owners.get(Number(i))===owner)owners.delete(Number(i));},animate(){},dispose(){owners.clear();}};
 const contactPose={x:physics.x,y:group.position.y,z:physics.z,yaw:physics.yaw};
 world.traffic.cars.push(car);world.boatContacts.setPoseGetter('sailCream',()=>{
  contactPose.x=physics.x;contactPose.y=group.position.y;contactPose.z=physics.z;contactPose.yaw=physics.yaw;return contactPose;
 });
 world.boatDriving={revision:'boat-driving-1',id:car.id,capacity:seats.length,networked:true,addedModels:0};
 const dispose=world.dispose;world.dispose=function(...args){group.removeFromParent();for(const m of meshes){m.geometry.dispose();m.material.dispose();}return dispose?.apply(this,args);};
 return world;
}
