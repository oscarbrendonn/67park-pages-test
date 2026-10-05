import {Color} from 'three';

// Recolour existing shared ocean/pond uniforms only. The authored land mask,
// waves, surface level, swim physics and day palette stay exact.
export function createNightWater(scene){
 const rows=[],seen=new Set(),night={uDeep:new Color('#141d36'),uLight:new Color('#253453'),uHorizon:new Color('#252e51'),uWake:new Color('#42516e')};
 for(const name of ['KIMI_WATERBODY_GORUNUR','67D_PARK_WATER_UNIFIED_V65','ISLAND_WATER_TABLE_EDGE_AND_STATIC_SEA']){
  const material=scene.getObjectByName(name)?.material;
  for(const [key,color] of Object.entries(night)){
   const value=material?.uniforms?.[key]?.value;
   if(!value?.isColor||seen.has(value))continue;
   seen.add(value);rows.push({key,value,day:value.clone(),night:color});
  }
 }
 return {step(daylight,sky){const light=Number.isFinite(daylight)?Math.max(0,Math.min(1,daylight)):1;for(const row of rows){
  // The supplied sky is already blended for the current hour. Blending it
  // again leaves a pale daytime horizon band during dusk.
  if(row.key==='uHorizon'&&sky?.isColor)row.value.copy(sky);
  else row.value.copy(row.night).lerp(row.day,light);
 }},
  dispose(){for(const row of rows)row.value.copy(row.day);},count:rows.length};
}
