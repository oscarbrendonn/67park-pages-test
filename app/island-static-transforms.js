// These authored layers never move after placement. Their materials, shader
// clocks and instanced foliage LOD may still update; only object transforms are
// cached. Cars, rides, players, lights, balls and portal/effect roots are excluded.
const FIXED_ROOTS=new Set(['LOWER_PLAZA_V83','CENTRAL_BUILDINGS_V68','ISLAND_NORTH_HOMES','ISLAND_NORTH_APARTMENTS','REFERENCE_CITY_V60','WEST_COURTYARD_V102','NORTHWEST_SPORTS_V97','BOTTOM_HOMES_V103','NORTH_REFERENCE_POOL_V104','SEASIDE_TIMBER_TOY_V81']);
export function cacheStaticTransforms(roots,terrain){
 const saved=[];
 for(const root of roots){
  if(root!==terrain&&!FIXED_ROOTS.has(root.name))continue;
  root.updateWorldMatrix(true,true);
  root.traverse(o=>{if(o.userData.sport||o.userData.sportsBall103)return;saved.push([o,o.matrixAutoUpdate,o.matrixWorldAutoUpdate]);o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
 }
 return {objects:saved.length,dispose(){for(const[o,local,world]of saved){o.matrixAutoUpdate=local;o.matrixWorldAutoUpdate=world;}saved.length=0;}};
}
