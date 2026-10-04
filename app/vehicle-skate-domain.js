import {createCityHeightSampler58} from '../island/city-height-sampler58.js';
import {Box3} from 'three';

// Only the two authored skateparks. Never turn buildings or unrelated props
// into a drivable floor, and never mutate the approved visual geometry.
const names=/^67D_(?:REF_MINI_SKATE_(?:BOWL|COPING|DECK|OUTER_RIM)|SKATEPARK_(?:BASE|INNER_OUTER_SURFACE|CENTER_STAIR_BANK|CENTER_STAIR_WING_[01]|BOWL_NW_(?:DECK|SURFACE_MESH(?:_1)?|COPING)|PERIMETER_SEAM_[01]|MARK_67|INNER_S_CORAL_ACCENT|LOWER_C_(?:SURFACE|COPING|COLOR_ACCENT_MESH(?:_1)?)|INNER_OUTER_(?:SHARED_COPING|COLOR_ACCENT_MESH(?:_1)?)|QUARTER_C_(?:SURFACE|COPING|INNER_COPING)|CENTER_SPINE_(?:A|COPING)|DIAGONAL_LAUNCH(?:_COPING)?|STEP_[01]_[0-5]|STEP_CURB_[01]|STEP_RAIL_[01]|EAST_WALL_BANK|CENTER_STAIR_[0-6]|CENTER_STAIR_RAIL(?:_POST_[01])?|LOWER_RETURN_(?:SURFACE|COPING)))$/;
export const isVehicleSkateMesh=name=>names.test(name);
const rail=name=>/^67D_SKATEPARK_(?:STEP_RAIL_[01]|CENTER_STAIR_RAIL(?:_POST_[01])?)$/.test(name);
export function createVehicleSkateDomain(terrain){
 const floors=[],rails=[];
 terrain.traverse(m=>{
  if(!m.isMesh||m.visible===false||!isVehicleSkateMesh(m.name)||!m.geometry?.attributes.position?.count)return;
  (rail(m.name)?rails:floors).push(m);
 });
 if(!floors.length)return null;
 const floor=createCityHeightSampler58(floors,{cellSize:2,cacheSize:256});
 // These five rails are all authored along Z. Preserve their existing .42m
 // clearance skin, including rounded ends (axial-only probes missed corners).
 const segments=rails.map(m=>{const b=new Box3().setFromObject(m),r=(b.max.x-b.min.x)/2;return{x:(b.min.x+b.max.x)/2,z0:b.min.z+r,z1:b.max.z-r,radius:r+.42};});
 const nearest=(x,z)=>{
  let best=null;
  for(const s of segments){const dx=s.x-x,dz=Math.max(s.z0,Math.min(s.z1,z))-z,distance=Math.hypot(dx,dz),gap=distance-s.radius;
   if(!best||gap<best.gap)best={dx,dz,distance,gap};
  }
  return best;
 };
 const blocked=(x,z)=>{
  if(floor.height(x,z)==null)return null;
  for(const s of segments){const dx=s.x-x,dz=Math.max(s.z0,Math.min(s.z1,z))-z;if(dx*dx+dz*dz<s.radius*s.radius)return true;}
  return false;
 };
 return {height:floor.height,blocked,normal(x,z){const p=nearest(x,z);return p&&p.gap<.3&&p.distance>1e-8?{x:p.dx/p.distance,z:p.dz/p.distance}:null;},stats:{meshes:floors.length,rails:rails.length,triangles:floor.stats.triangles,bytes:floor.stats.bytes}};
}
