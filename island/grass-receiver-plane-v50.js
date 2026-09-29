import * as THREE from 'three';

// Diagnostic candidate: retain r160's exact PCFSoft kernel while comparing
// each texel against the receiver plane at that texel, not the center depth.
// This changes neither the existing sun/depth texture nor any caster.
export const GRASS_RECEIVER_NAMES50=Object.freeze(['3_CIMEN','3_CIMEN_KOYU','8_CIM_STUB_DOLGU']);
// Audited normal-only 27 sources + the five approved v49 curb slabs + the
// original grass fill below walls 4/5. Exact names only: never props, actors,
// water, or a wildcard traversal that silently grows with future assets.
export const TERRAIN_RECEIVER_NAMES50=Object.freeze([...new Set([
 '5_YOL','3_CIMEN','3_CIMEN_KOYU','5_PARSEL_ZEMIN','8_PARK_PATIKA_UST',
 '4_KIYI_TOPRAK_TABANI','3_MERKEZ_CIMEN','5_SAHIL_GRI_ZEMIN',
 '5_DOGU_SAHIL_MEYDAN_ZEMIN','3_DOGU_SAHIL_KAVSAK_CIMEN',
 '3_DOGU_SAHIL_HALKASI','8_DOGU_SAHIL_MERKEZ_DISK','8_DOGU_SAHIL_BANKLAR',
 '8_DOGU_SAHIL_GIRIS','8_DOGU_SAHIL_ISKELE_UST','5_KB_SPOR_ZEMIN',
 '7_KB_SPOR_CIM_TASIYICI','3_KB_SPOR_CIMEN','8_KB_ATLETIZM_ZEMIN',
 '8_KB_BEYZBOL_KIL_ZEMIN','4_DOGU_SAHIL_UST_TOPRAK','3_DOGU_SAHIL_UST_CIMEN',
 '67D_SKATEPARK_BASE','67D_SKATEPARK_INNER_OUTER_SURFACE',
 '67D_SKATEPARK_LOWER_C_SURFACE','67D_SKATEPARK_QUARTER_C_SURFACE',
 '67D_SKATEPARK_LOWER_RETURN_SURFACE',
 '6_BORDUR','7_KALDIRIM_TABANI','7_MERKEZ_KALDIRIM_TABANI',
 '7_DOGU_SAHIL_KAVSAK_TABANI','7_DOGU_SAHIL_MEYDAN_APRON','8_CIM_STUB_DOLGU'
])]);
const KEY='grass-receiver-plane-depth-v50-2';
const UNIFORM='uGrassPlaneShadow50';

export function receiverPlaneChunk50(chunk=THREE.ShaderChunk.shadowmap_pars_fragment){
 const begin=chunk.indexOf('\tfloat getShadow('), end=chunk.indexOf('\n\tvec2 cubeToUV(',begin);
 if(begin<0||end<0)throw Error('Receiver-plane v50: unsupported shadow chunk');
 let body=chunk.slice(begin,end);
 const projection='\t\tshadowCoord.xyz /= shadowCoord.w;';
 if(body.split(projection).length!==2)throw Error('Receiver-plane v50: projection anchor changed');
 // Derivatives must execute before the varying frustum branch. The relative
 // determinant guard rejects grazing/singular receiver projections; it does
 // not replace a valid plane by a fixed bias or change shadow color/strength.
 body=body.replace(projection,projection+`
\t\tvec2 grassPlaneGradient50=vec2(0.0);
\t\t#if defined( SHADOWMAP_TYPE_PCF_SOFT )
\t\tvec3 grassDx50=dFdx(shadowCoord.xyz);
\t\tvec3 grassDy50=dFdy(shadowCoord.xyz);
\t\tfloat grassDet50=grassDx50.x*grassDy50.y-grassDx50.y*grassDy50.x;
\t\tfloat grassScale50=length(grassDx50.xy)*length(grassDy50.xy);
\t\tif(abs(grassDet50)>max(1e-18,grassScale50*1e-4)){
\t\t\tvec2 grassG50=vec2(grassDx50.z*grassDy50.y-grassDy50.z*grassDx50.y,
\t\t\t\tgrassDy50.z*grassDx50.x-grassDx50.z*grassDy50.x)/grassDet50;
\t\t\tif(max(abs(grassG50.x),abs(grassG50.y))<4.0) grassPlaneGradient50=grassG50*${UNIFORM};
\t\t}
\t\t#endif`);
 const softStart=body.indexOf('\t\t#elif defined( SHADOWMAP_TYPE_PCF_SOFT )');
 const softEnd=body.indexOf('\t\t#elif defined( SHADOWMAP_TYPE_VSM )',softStart);
 if(softStart<0||softEnd<0)throw Error('Receiver-plane v50: PCFSoft anchors changed');
 const before=body.slice(softStart,softEnd);
 let taps=0;
 const after=before.replace(/texture2DCompare\(\s*shadowMap,\s*([\s\S]*?),\s*shadowCoord\.z\s*\)/g,(_all,uv)=>{
  taps++;return `grassPlaneCompare50( shadowMap, ${uv}, shadowCoord.z, shadowCoord.xy, grassPlaneGradient50 )`;
 });
 if(taps!==16)throw Error('Receiver-plane v50: expected the original 16 PCFSoft taps, got '+taps);
 body=body.slice(0,softStart)+after+body.slice(softEnd);
 const helper=`\n\tuniform float ${UNIFORM};
\tfloat grassPlaneCompare50(sampler2D depths,vec2 uv,float compare,vec2 centerUv,vec2 gradient){
\t\treturn texture2DCompare(depths,uv,compare+dot(gradient,uv-centerUv));
\t}\n`;
 return chunk.slice(0,begin)+helper+body+chunk.slice(end);
}

export function installGrassReceiverPlane50(root,{names=GRASS_RECEIVER_NAMES50,enabled=true}={}){
 return installReceiverPlane50(root,{names,enabled,allowed:GRASS_RECEIVER_NAMES50,scope:'grass'});
}

export function installTerrainReceiverPlane50(root,{names=TERRAIN_RECEIVER_NAMES50,enabled=true}={}){
 return installReceiverPlane50(root,{names,enabled,allowed:TERRAIN_RECEIVER_NAMES50,scope:'terrain'});
}

function installReceiverPlane50(root,{names,enabled,allowed,scope}){
 if(!root?.traverse||!Array.isArray(names)||!names.length||new Set(names).size!==names.length)
  throw Error('Receiver-plane v50: invalid root or target names');
 if(names.some(n=>!allowed.includes(n)))throw Error('Receiver-plane v50: non-'+scope+' target refused');
 const patchedChunk=receiverPlaneChunk50();
 const uniform={value:enabled?1:0}, prepared=[];
 try{
  for(const name of names){
   const matches=[];root.traverse(o=>{if(o.isMesh&&o.name===name)matches.push(o);});
   if(matches.length!==1)throw Error('Receiver-plane v50: expected exactly one '+name);
   const mesh=matches[0],source=mesh.material;
   if(Array.isArray(source)||!source?.isMeshStandardMaterial||source.userData?.receiverPlane50)
    throw Error('Receiver-plane v50: unsupported/already-patched material on '+name);
   // Isolation is intentional: several source materials are shared across
   // unrelated surfaces. All PBR values and texture references are retained.
   const material=source.clone(),previousCompile=source.onBeforeCompile,previousKey=source.customProgramCacheKey;
   prepared.push({mesh,source,material});
   material.extensions={...source.extensions,derivatives:true};
   material.userData={...source.userData,receiverPlane50:KEY};
   material.onBeforeCompile=function(shader,renderer){
    if(previousCompile)previousCompile.call(this,shader,renderer);
    const anchor='#include <shadowmap_pars_fragment>';
    if(shader.fragmentShader.split(anchor).length!==2)throw Error('Receiver-plane v50: prior shader replaced shadow chunk');
    shader.uniforms[UNIFORM]=uniform;
    shader.fragmentShader=shader.fragmentShader.replace(anchor,patchedChunk);
   };
   material.customProgramCacheKey=()=>String(previousKey?.call(source)??'')+'|'+KEY;
   material.needsUpdate=true;
  }
 }catch(error){for(const p of prepared)p.material.dispose();throw error;}
 // No visible assignment until every name/material/source chunk is valid.
 for(const p of prepared)p.mesh.material=p.material;
 return {version:50,scope,count:prepared.length,names:[...names],uniform,
  textureReads:16,addedTextureReads:0,addedLights:0,addedMeshes:0,
  setEnabled(value){uniform.value=value?1:0;return uniform.value===1;},
  restore(){for(const p of prepared){if(p.mesh.material===p.material)p.mesh.material=p.source;p.material.dispose();}}
 };
}
