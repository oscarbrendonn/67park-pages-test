import * as THREE from 'three';

// Optional receiver-only experiment. Nothing happens until explicitly called.
// It softly filters ALL sun/spot shadows received by 5_YOL, not just curb
// casters: a shared packed-depth map does not identify the originating object.
const TAG='road-receiver-pcf-v49';
const INCLUDE='#include <shadowmap_pars_fragment>';

function roadShadowChunk49(radius,filter){
  const source=THREE.ShaderChunk.shadowmap_pars_fragment;
  const start=source.indexOf('float getShadow( sampler2D');
  const end=source.indexOf('vec2 cubeToUV(',start);
  if(start<0||end<start)throw new Error('Unsupported Three shadow chunk for road PCF v49');
  const body=source.slice(start,end);
  const branch='#if defined( SHADOWMAP_TYPE_PCF )';
  const soft='#elif defined( SHADOWMAP_TYPE_PCF_SOFT )';
  const a=body.indexOf(branch),b=body.indexOf(soft,a);
  if(a<0||b<a)throw new Error('Missing Three PCF branches for road PCF v49');
  let kernel=body.slice(a,b);
  if((kernel.match(/texture2DCompare\(/g)??[]).length!==17||
    (kernel.match(/\* shadowRadius/g)??[]).length!==4||!kernel.includes('1.0 / 17.0'))
    throw new Error('Unexpected Three PCF kernel for road PCF v49');
  let helper='';
  if(filter==='bilinear5'){
    // Each bilinear comparison interpolates four binary depth comparisons at
    // actual texel centres. Five continuous samples cost twenty comparisons;
    // unlike the rejected seventeen binary-tap prototype, no fixed hard steps.
    helper=`
float roadBilinearShadow49(sampler2D shadowMap,vec2 shadowMapSize,vec2 uv,float compare){
  vec2 texel=vec2(1.0)/shadowMapSize;
  vec2 grid=uv*shadowMapSize-0.5;
  vec2 f=fract(grid);
  vec2 base=(floor(grid)+0.5)*texel;
  float a=texture2DCompare(shadowMap,base,compare);
  float b=texture2DCompare(shadowMap,base+vec2(texel.x,0.0),compare);
  float c=texture2DCompare(shadowMap,base+vec2(0.0,texel.y),compare);
  float d=texture2DCompare(shadowMap,base+texel,compare);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
`;
    kernel=branch+' || defined( SHADOWMAP_TYPE_PCF_SOFT )\n'+`
  vec2 roadStep49=vec2(${radius.toFixed(6)})/shadowMapSize;
  vec2 roadUv49=shadowCoord.xy;
  shadow=(
    2.0*roadBilinearShadow49(shadowMap,shadowMapSize,roadUv49,shadowCoord.z)+
    roadBilinearShadow49(shadowMap,shadowMapSize,roadUv49+vec2(roadStep49.x,0.0),shadowCoord.z)+
    roadBilinearShadow49(shadowMap,shadowMapSize,roadUv49-vec2(roadStep49.x,0.0),shadowCoord.z)+
    roadBilinearShadow49(shadowMap,shadowMapSize,roadUv49+vec2(0.0,roadStep49.y),shadowCoord.z)+
    roadBilinearShadow49(shadowMap,shadowMapSize,roadUv49-vec2(0.0,roadStep49.y),shadowCoord.z)
  )*(1.0/6.0);
`;
  }else{
    kernel=kernel.replace(branch,branch+' || defined( SHADOWMAP_TYPE_PCF_SOFT )')
      .replaceAll('* shadowRadius','* '+radius.toFixed(6));
  }
  const patched=body.slice(0,a)+kernel+body.slice(b);
  return source.slice(0,start)+helper+patched+source.slice(end);
}

export function installRoadShadowFilter49(root,{radius=1.4,filter='pcf17',isolateSharedMaterial=false}={}){
  if(!Number.isFinite(radius)||radius<1.35||radius>1.5)
    throw new Error('Road PCF v49 radius must be between 1.35 and 1.5 texels');
  if(!['pcf17','bilinear5'].includes(filter))throw new Error('Unsupported road PCF v49 filter');
  const road=root?.getObjectByName?.('5_YOL');
  if(!road?.isMesh||!road.material?.isMeshStandardMaterial||Array.isArray(road.material))
    throw new Error('Missing single-material 5_YOL road for PCF v49');
  const sourceMaterial=road.material,shared=[];
  root.traverse(object=>{
    if(object===road)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(materials.includes(sourceMaterial))shared.push(object.name||object.type||object.uuid);
  });
  if(shared.length&&!isolateSharedMaterial)
    throw new Error('Road PCF material shared with non-road: '+shared.join(', '));
  const previousState=sourceMaterial.userData.roadShadowFilter49;
  if(previousState){
    if(previousState.version!==49||previousState.radius!==radius||previousState.filter!==filter)
      throw new Error('Different road PCF state already installed; reload for another radius');
    return {...previousState,installedCount:0};
  }
  // Validate the local renderer kernel before mutating even the callback.
  const chunk=roadShadowChunk49(radius,filter);
  const previousCompile=sourceMaterial.onBeforeCompile;
  const previousCacheKey=sourceMaterial.customProgramCacheKey;
  // GLB 5_YOL_M also serves the residential/sports ground. Only an explicit
  // opt-in isolates the road receiver; never edit that shared source material.
  // Three's clone() does not copy shader callbacks, so chain them explicitly.
  const material=shared.length?sourceMaterial.clone():sourceMaterial;
  if(shared.length)material.userData={...sourceMaterial.userData};
  material.onBeforeCompile=function(shader,...args){
    previousCompile?.call(this,shader,...args);
    const occurrences=shader.fragmentShader.split(INCLUDE).length-1;
    if(occurrences!==1)throw new Error('Expected one unexpanded shadow include for road PCF v49');
    shader.fragmentShader=shader.fragmentShader.replace(INCLUDE,chunk);
  };
  material.customProgramCacheKey=function(){
    return String(previousCacheKey?.call(this)??'')+'|'+TAG+'-'+filter+'-r'+radius.toFixed(6);
  };
  const state={version:49,name:road.name,scope:'road-receiver-only',filter,radius,
    count:1,addedDrawCalls:0,addedTextures:0,addedLights:0,
    addedMaterials:shared.length?1:0,isolatedSharedMaterial:shared.length>0,
    preservedSharedUsers:shared,
    previousShadowFetches:16,shadowFetches:filter==='bilinear5'?20:17,palettePreserved:true,
    allShadowsReceivedByRoadFiltered:true,nonRoadMaterialsPreserved:true};
  material.userData.roadShadowFilter49=state;
  if(shared.length)road.material=material;
  material.needsUpdate=true;
  return {...state,installedCount:1};
}
