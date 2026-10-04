import {createVehicleSurfaceDomain} from './vehicle-surface-domain.js?v=skate-drive-1';
import {tunePreviewWorld} from './park-driving-tuning.js?v=beach-drive-1';
import {applyVehicleGroundPose} from './vehicle-ground-pose.js?v=skate-drive-1';
import {DRIVE_STEP,terrainProfile,traversableGrade} from './vehicle-terrain-grade.js?v=thumb-drive-1';
import {installSkateRailFinish} from './party/skate-rail-finish.js?v=flush-ends-2';
import {restoreVehicleGroundContacts} from './vehicle-contact-spec.js';
// The same domain and complete car/bus footprint are used by prediction and
// server authority. No widening by bounding boxes at rounded sidewalk corners.
export function expandIslandDriveArea(area,{ground,water=()=>false,sea=()=>8.776851733454327,blocked=()=>false,domain}){
 const surface=domain?.height??((x,z)=>area.road?.height(x,z));
 const solid=domain?.blocked;
 const waterLevel=(x,z)=>{
  // A dry authored bowl can be below ocean datum without being the sea.
  if(Number.isFinite(domain?.skateHeight?.(x,z)))return null;
  const y=surface(x,z),level=domain?.waterLevel?.(x,z),ocean=sea(x,z);
  // The raw map can still have old water beneath repaired grass/bridges.
  // Finished dry support wins; submerged sand is not a dry driving floor.
  if(Number.isFinite(y)&&y>(level??ocean)+.006)return null;
  return level??(water(x,z)?ocean:null);
 };
 const contact=(px,pz)=>{
  const level=waterLevel(px,pz);
  return {ok:false,reason:'surface-edge',normal:domain?.normal?.(px,pz),water:Number.isFinite(level)?{x:px,z:pz,level}:null};
 };
 const wet=(x,z)=>Number.isFinite(waterLevel(x,z));
 const solidAt=(x,z)=>solid?(solid(x,z)&&(!domain.solidBlocked||domain.solidBlocked(x,z,wet))):water(x,z);
 const shoreSupport=(x,z,s,c,spec)=>{
  for(const [u,v]of spec.groundContacts){
   const px=x+c*u+s*v,pz=z-s*u+c*v;
   if(!Number.isFinite(surface(px,pz))||wet(px,pz))return contact(px,pz);
   if(solidAt(px,pz))return {...contact(px,pz),water:null};
  }
  return {ok:true};
 };
 const check=(x,z,yaw,spec)=>{
  if(![x,z,yaw].every(Number.isFinite))return {ok:false,reason:'invalid'};
  const center=surface(x,z);if(!Number.isFinite(center))return contact(x,z);
  if(solidAt(x,z))return contact(x,z);
  const s=Math.sin(yaw),c=Math.cos(yaw),points=spec?area.footprint(spec):area.points,profile=terrainProfile(points);let low=center,high=center,index=0;
  let wheelSupport;
  for(const [u,v] of points){
   const px=x+c*u+s*v,pz=z-s*u+c*v,y=surface(px,pz);
   if(!Number.isFinite(y)){
    if(!wet(px,pz)||spec?.groundContacts?.length!==4)return contact(px,pz);
    // A bumper/mirror can overhang water while all four tyres remain on
    // beach sand. Never teleport from that decorative overhang. True tyre
    // entry still rescues immediately; unsupported non-water gaps still block.
    wheelSupport??=shoreSupport(x,z,s,c,spec);if(!wheelSupport.ok)return wheelSupport;
    if(solidAt(px,pz))return {...contact(px,pz),water:null};
    profile.heights[index++]=center;continue;
   }
   if(solidAt(px,pz))return {...contact(px,pz),water:null};
   low=Math.min(low,y);high=Math.max(high,y);profile.heights[index++]=y;
   // Normal curbs are traversable, but walls, roofs, cliffs and large steps
   // still fail the complete bumper/mirror footprint before moving there.
   // Finished-map clearance is identical online/offline and avoids invoking
   // the legacy raw-map ground query (which has obsolete roofs and walls).
   const actual=solid?y:ground(px,pz);
   if(!Number.isFinite(actual)||actual>y+.55||(!solid&&blocked(px,y+.6,pz)))return {ok:false,reason:'obstacle'};
  }
  profile.heights[profile.center]=center;
  if(high-low>DRIVE_STEP&&!traversableGrade(profile,surface,x,z,s,c))return {ok:false,reason:'obstacle'};
  return {ok:true,y:center};
 };
 area.supportHeight=surface;
 area.skateHeight=domain?.skateHeight;
 // The open ocean is a scene-level mesh, outside terrain's pond capture.
 area.waterLevel=waterLevel;
 area.nearestSidewalk=domain?.nearestSidewalk;
 area.beginSidewalkSearch=domain?.beginSidewalkSearch;
 area.sidewalkHeight=domain?.sidewalkHeight;
 // Dismount uses this same finished surface and static clearance, not the
 // pre-repair raw-map height under a raised lawn. Boat exits keep their own
 // dock/water rules; this accessor is only used by dry-land vehicles.
 area.exitBlocked=(x,y,z)=>solid?solidAt(x,z):blocked(x,y,z);
 area.check=check;area.stats={...area.stats,roadOnly:false,driveSurfaces:'dry-open-terrain',maxStep:DRIVE_STEP,terrainGrade:'local-probes-1',domain:domain?.stats};return area;
}
export function installIslandDriving(world){
 for(const car of world.traffic?.cars||[])restoreVehicleGroundContacts(car);
 if(world.traffic)tunePreviewWorld(world.traffic);
 if(!world.traffic||world.traffic.freeDrive)return world;
 // The bundle used to index vehicle support before the existing rounded-end
 // finish. Apply that same idempotent finish first; client and authority must
 // see identical already-approved coping tips, not an earlier sharp mesh.
 installSkateRailFinish(world);
 const domain=createVehicleSurfaceDomain(world.terrain);
 expandIslandDriveArea(world.traffic.area,{domain,ground:(x,z)=>world.ground(x,z,true),water:world.water,sea:world.sea,blocked:world.treeBlocked});
 world.traffic.freeDrive=true;world.traffic.stats.roadOnly=false;
 const update=world.update;
 world.update=function(...args){const result=update.apply(this,args);for(const car of world.traffic.cars)applyVehicleGroundPose(car,world.traffic.area);return result;};
 world.renderer.domElement.dataset.islandDriveArea=JSON.stringify(world.traffic.area.stats);
 return world;
}
