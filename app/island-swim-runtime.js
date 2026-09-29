import * as THREE from 'three';
import {createSwimBoundary} from './island-swim-boundary.js';
import {installIslandSwimQA} from './island-swim-qa.js';
import {installWaterTable} from './island-water-table.js';

export function installIslandSwimBoundary(world){
 if(world.swimBoundary)return world;
 // Measured after all authored island corrections. Includes the west island,
 // pools, parks and bridges, but NOT the large decorative ocean plane.
 const bounds=new THREE.Box3().setFromObject(world.terrain);
 const center={x:40,z:-38},radius=312;
 const boundary=createSwimBoundary(bounds,{shape:'circle',center,radius,water:world.water,sea:world.sea});
 const waterTable=installWaterTable(world,{center,radius});
 world.waterTable=waterTable;
 world.swimBoundary=boundary;
 world.constrainSwimmer=(body,dt)=>boundary.constrain(body,dt);
 world.renderer.domElement.dataset.swimBoundary=JSON.stringify(boundary.stats);
 const removeQA=installIslandSwimQA(world);
 const dispose=world.dispose.bind(world);
 world.dispose=()=>{removeQA?.();waterTable.dispose();dispose();};
 return world;
}
