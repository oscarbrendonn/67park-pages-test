import {receiverPlaneChunk50} from './grass-receiver-plane-v50.js';

// Resolved from BOTH actual map inventories. These separately modelled
// coping/accent/bank receivers were not members of the accepted terrain33.
// Do not replace this explicit roster by a runtime family-name wildcard.
export const SKATE_RECEIVER_NAMES50=Object.freeze([
 '67D_SKATEPARK_CENTER_STAIR_BANK',
 '67D_SKATEPARK_BOWL_NW_COPING',
 '67D_SKATEPARK_LOWER_C_COPING',
 '67D_SKATEPARK_LOWER_C_COLOR_ACCENT_MESH',
 '67D_SKATEPARK_LOWER_C_COLOR_ACCENT_MESH_1',
 '67D_SKATEPARK_INNER_OUTER_SHARED_COPING',
 '67D_SKATEPARK_INNER_OUTER_COLOR_ACCENT_MESH',
 '67D_SKATEPARK_INNER_OUTER_COLOR_ACCENT_MESH_1',
 '67D_SKATEPARK_QUARTER_C_COPING',
 '67D_SKATEPARK_QUARTER_C_INNER_COPING',
 '67D_SKATEPARK_CENTER_SPINE_COPING',
 '67D_SKATEPARK_DIAGONAL_LAUNCH_COPING',
 '67D_SKATEPARK_LOWER_RETURN_COPING'
]);
const KEY='skate-receiver-plane-depth-v50-1';

export function installSkateReceiverPlane50(root,{names=SKATE_RECEIVER_NAMES50,enabled=true}={}){
 if(!root?.traverse||!Array.isArray(names)||!names.length||new Set(names).size!==names.length)
  throw Error('Skate receiver-plane v50: invalid root or target names');
 if(names.some(n=>!SKATE_RECEIVER_NAMES50.includes(n)))throw Error('Skate receiver-plane v50: target outside audited roster');
 // Exact same accepted shader: no extra tolerance bias, taps or blur.
 const patchedChunk=receiverPlaneChunk50(),uniform={value:enabled?1:0},prepared=[];
 try{
  for(const name of names){
   const matches=[];root.traverse(o=>{if(o.isMesh&&o.name===name)matches.push(o);});
   if(matches.length!==1)throw Error('Skate receiver-plane v50: expected exactly one '+name);
   const mesh=matches[0],source=mesh.material;
   if(Array.isArray(source)||!source?.isMeshStandardMaterial||source.userData?.receiverPlane50)
    throw Error('Skate receiver-plane v50: unsupported/already-patched material on '+name);
   const material=source.clone(),previousCompile=source.onBeforeCompile,previousKey=source.customProgramCacheKey;
   prepared.push({mesh,source,material});
   material.extensions={...source.extensions,derivatives:true};
   material.userData={...source.userData,receiverPlane50:KEY};
   material.onBeforeCompile=function(shader,renderer){
    if(previousCompile)previousCompile.call(this,shader,renderer);
    const anchor='#include <shadowmap_pars_fragment>';
    if(shader.fragmentShader.split(anchor).length!==2)throw Error('Skate receiver-plane v50: prior hook replaced shadow chunk');
    shader.uniforms.uGrassPlaneShadow50=uniform;
    shader.fragmentShader=shader.fragmentShader.replace(anchor,patchedChunk);
   };
   material.customProgramCacheKey=()=>String(previousKey?.call(source)??'')+'|'+KEY;
   material.needsUpdate=true;
  }
 }catch(error){for(const p of prepared)p.material.dispose();throw error;}
 for(const p of prepared)p.mesh.material=p.material;
 return {version:50,scope:'skate-coping-accent-bank',count:prepared.length,names:[...names],uniform,
  textureReads:16,addedTextureReads:0,addedLights:0,addedMeshes:0,addedDepthTolerance:0,
  setEnabled(value){uniform.value=value?1:0;return uniform.value===1;},
  restore(){for(const p of prepared){if(p.mesh.material===p.material)p.mesh.material=p.source;p.material.dispose();}}
 };
}
