import {CAR110,BUS110} from '../island/candy-vehicle-model-v110.js';

// Older world bundles keep the approved models but predate the four tyre
// probes. Normalize only that missing metadata, never rebuild the world or
// resize a vehicle to match a newer spec. Physics and rendering share it.
export function restoreVehicleGroundContacts(car){
 const spec=car?.spec,reference=car?.kind==='car'?CAR110:car?.kind==='bus'?BUS110:null;
 if(!spec||!reference||spec.marine||spec.groundContacts?.length===4)return false;
 if(!['scale','halfWidth','halfLength','wheelbase','wheelRadius'].every(k=>spec[k]===reference[k]))return false;
 const next=Object.freeze({...spec,groundContacts:reference.groundContacts});
 car.spec=next;
 if(car.physics)car.physics.spec=next;
 return true;
}
