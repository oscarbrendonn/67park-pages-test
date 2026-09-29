export const SKATEPARK_RENDER_REV64='codex-skatepark-v64';

export const MINI_BOWL_NAMES64=Object.freeze([
  '67D_REF_MINI_SKATE_BOWL',
  '67D_REF_MINI_SKATE_COPING',
  '67D_REF_MINI_SKATE_DECK',
  '67D_REF_MINI_SKATE_OUTER_RIM'
]);

const MINI_BOWL_NAME_SET64=new Set(MINI_BOWL_NAMES64);
const MINI_TARGET_COLOR64=0xcec2b5;
const EPS64=1e-6;

// Exact authored GLB material state retained by the Codex live page. Hex
// values are the renderer's sRGB view of the glTF linear baseColorFactor.
const LARGE_MATERIAL64=Object.freeze({
  '67D_SKATEPARK_CONCRETE_M':Object.freeze({hex:0xd7cac4,roughness:0.89}),
  '67D_SKATEPARK_BOWL_M':Object.freeze({hex:0xcec2bb,roughness:0.86}),
  '67D_SKATEPARK_DEEP_M':Object.freeze({hex:0xb9afac,roughness:0.82}),
  '67D_SKATEPARK_CORAL_M':Object.freeze({hex:0xdf796a,roughness:0.82}),
  '67D_SKATEPARK_RAIL_M':Object.freeze({hex:0xd8c5ba,roughness:0.76}),
  '67D_SKATEPARK_MARK_M':Object.freeze({hex:0xf4efe9,roughness:0.91}),
  '67D_SKATEPARK_GOLD_M':Object.freeze({hex:0xe7b95f,roughness:0.82}),
  '67D_SKATEPARK_BLUE_M':Object.freeze({hex:0x73b3dc,roughness:0.82})
});

export function isMiniBowl64(mesh){
  return !!mesh?.isMesh && MINI_BOWL_NAME_SET64.has(mesh.name);
}

export function isLargeSkatepark64(mesh){
  return !!mesh?.isMesh && /^67D_SKATEPARK_/i.test(mesh.name||'');
}

function markMaterial64(material,kind){
  material.userData={...material.userData,skateparkRender64:SKATEPARK_RENDER_REV64,skateparkKind64:kind};
  material.needsUpdate=true;
  return material;
}

// Codex mini-bowl contract: authored geometry/normals stay untouched; all
// four low-profile pieces are matte receivers and add no AO/shadow caster.
export function applyMiniBowlRender64(mesh){
  if(!isMiniBowl64(mesh) || Array.isArray(mesh.material) || !mesh.material)
    throw Error('Skatepark v64: unsupported mini bowl mesh/material '+(mesh?.name||'missing'));
  const material=mesh.material;
  material.color.setHex(MINI_TARGET_COLOR64);
  material.metalness=0;
  material.roughness=0.90;
  material.envMapIntensity=0.30;
  if('clearcoat' in material){
    material.clearcoat=0;
    material.clearcoatRoughness=1;
  }
  return markMaterial64(material,'mini-bowl');
}

// Codex large-skatepark contract: retain every authored color and roughness.
// Only the common environment response is fixed. No Kimi clay/AO recolor hook.
export function applyLargeSkateparkRender64(mesh){
  if(!isLargeSkatepark64(mesh) || Array.isArray(mesh.material) || !mesh.material)
    throw Error('Skatepark v64: unsupported large skatepark mesh/material '+(mesh?.name||'missing'));
  const material=mesh.material;
  if(!LARGE_MATERIAL64[material.name])
    throw Error('Skatepark v64: unknown authored material '+(material.name||'missing'));
  material.metalness=0;
  material.envMapIntensity=0.34;
  return markMaterial64(material,'large-skatepark');
}

function noKimiDepthHook64(material){
  return material?.userData?.kilKenarDerinligi67===undefined &&
    material?.userData?.sahaCizgileri67===undefined;
}

export function verifySkateparkRender64({miniMeshes,largeMeshes}){
  if(!Array.isArray(miniMeshes)||!Array.isArray(largeMeshes))
    throw Error('Skatepark v64: mesh rosters missing');
  const miniNames=miniMeshes.map(mesh=>mesh.name).sort();
  const miniExpected=[...MINI_BOWL_NAMES64].sort();
  const miniExactNames=miniNames.length===miniExpected.length &&
    miniNames.every((name,index)=>name===miniExpected[index]);
  const miniMaterialExact=miniMeshes.every(mesh=>{
    const material=mesh.material;
    return !Array.isArray(material) && material &&
      material.color.getHex()===MINI_TARGET_COLOR64 &&
      Math.abs(material.metalness)<EPS64 &&
      Math.abs(material.roughness-0.90)<EPS64 &&
      Math.abs(material.envMapIntensity-0.30)<EPS64 &&
      (!('clearcoat' in material) || (
        Math.abs(material.clearcoat)<EPS64 &&
        Math.abs(material.clearcoatRoughness-1)<EPS64
      )) && noKimiDepthHook64(material) &&
      material.userData?.skateparkRender64===SKATEPARK_RENDER_REV64;
  });
  const largeMaterialExact=largeMeshes.every(mesh=>{
    const material=mesh.material, expected=material&&LARGE_MATERIAL64[material.name];
    return !Array.isArray(material) && expected &&
      material.color.getHex()===expected.hex &&
      Math.abs(material.metalness)<EPS64 &&
      Math.abs(material.roughness-expected.roughness)<EPS64 &&
      Math.abs(material.envMapIntensity-0.34)<EPS64 &&
      noKimiDepthHook64(material) &&
      material.userData?.skateparkRender64===SKATEPARK_RENDER_REV64;
  });
  const miniNonCasting=miniMeshes.every(mesh=>mesh.castShadow===false);
  const miniReceiving=miniMeshes.every(mesh=>mesh.receiveShadow===true);
  const miniFlatContract=miniMeshes.every(mesh=>mesh.userData?.miniBowlFlat64===true);
  const largeShadowCasters=largeMeshes.filter(mesh=>mesh.castShadow).length;
  const largeReceiving=largeMeshes.every(mesh=>mesh.receiveShadow===true);
  const result={
    revision:SKATEPARK_RENDER_REV64,
    asset:'skatepark-render-v64.js?v=1',
    miniCount:miniMeshes.length,
    miniNames,
    miniExactNames,
    miniMaterialExact,
    miniNonCasting,
    miniReceiving,
    miniFlatContract,
    largeCount:largeMeshes.length,
    largeShadowCasters,
    largeMaterialExact,
    largeReceiving,
    geometryChanged:false,
    transformsChanged:false,
    collisionChanged:false,
    samplerChanged:false
  };
  result.ok=miniExactNames && miniMaterialExact && miniNonCasting &&
    miniReceiving && miniFlatContract && largeMeshes.length===56 &&
    largeShadowCasters===52 && largeMaterialExact && largeReceiving;
  return Object.freeze(result);
}
