import * as THREE from 'three';

// Only these four closed curb/pavement layers replace their old, coincident
// open side-shadow helpers. Other terrain and all decorative objects stay put.
export const CURB_SHADOW_NAMES49=Object.freeze([
  '6_BORDUR','7_KALDIRIM_TABANI','7_MERKEZ_KALDIRIM_TABANI',
  '7_DOGU_SAHIL_KAVSAK_TABANI'
]);

export function installCurbShadows49(root,names){
  if(!Array.isArray(names)||!names.length||new Set(names).size!==names.length||
      names.some(name=>!CURB_SHADOW_NAMES49.includes(name)))
    throw new Error('Invalid v49 curb shadow targets');
  const targets=names.map(name=>{
    const mesh=root.getObjectByName(name);
    if(!mesh?.isMesh||!mesh.geometry?.attributes?.position||Array.isArray(mesh.material))
      throw new Error('Missing closed curb shadow source: '+name);
    const helper=mesh.getObjectByName('67D_DIK_YAN_GOLGE_'+name);
    if(helper?.visible&&helper.castShadow)
      throw new Error('Remove old open curb shadow helper before v49: '+name);
    if(mesh.customDepthMaterial&&!mesh.userData.curbShadow49)
      throw new Error('Existing custom curb depth must be reviewed: '+name);
    return mesh;
  });
  let installedCount=0;
  const records=[];
  for(const mesh of targets){
    if(!mesh.userData.curbShadow49){
      const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
      depth.name='CURB_CLOSED_BACKFACE_DEPTH_V49_'+mesh.name;
      depth.customProgramCacheKey=()=> 'curb-closed-backface-depth-v49';
      // Closed backfaces, not an extra global/packed bias, keep the contact
      // shadow of the ~15cm exposed curb while avoiding front-side self-acne.
      const previousBeforeShadow=mesh.onBeforeShadow;
      mesh.onBeforeShadow=function(...args){
        previousBeforeShadow?.apply(this,args);
        // r160 copies shared visual.side into the depth material just before
        // this callback. Override only the current dedicated shadow draw.
        if(args[5]===depth)depth.side=THREE.BackSide;
      };
      mesh.customDepthMaterial=depth;
      mesh.castShadow=true;
      mesh.userData.safeShadowCaster=true;
      mesh.userData.curbShadow49={version:49,name:mesh.name,
        shadow:'closed-volume-backfaces',packedDepthBias:0,
        originalVisibleMaterialPreserved:true,receiveShadowPreserved:true};
      installedCount++;
    }
    records.push({...mesh.userData.curbShadow49,
      triangles:(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3});
  }
  return {version:49,count:records.length,names:[...names],installedCount,
    triangles:records.reduce((sum,row)=>sum+row.triangles,0),records,
    addedVisualDrawCalls:0,addedTextures:0,addedLights:0,
    replacesOpenSideHelpers:true,globalTerrainCastsEnabled:false};
}
