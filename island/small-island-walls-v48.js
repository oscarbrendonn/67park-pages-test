import * as THREE from 'three';

// Replace only the five small-island divider vertex positions. The approved
// terrain GLB, all indices, visual materials and main-island walls are retained.
// Run after final root positioning, before relief-mask baking and ground queries.
export function applySmallIslandWalls48({root, meshes, patch}) {
  if (!patch || patch.version !== 48) throw new Error('Missing v48 low-wall patch');
  root.updateMatrixWorld(true);
  const mesh=meshes.find(m=>m.name===patch.mesh);
  if (!mesh) throw new Error('Reference divider mesh missing: '+patch.mesh);
  if (mesh.userData.smallIslandWalls48) return mesh.userData.smallIslandWalls48;
  const source=mesh.geometry.attributes.position;
  if (source.count!==patch.vertexCount || patch.components?.length!==5)
    throw new Error('Low-wall source geometry does not match this map');
  const ids=new Set();
  for (const part of patch.components) {
    if (part.worldPositions?.length!==part.vertices.length*3 ||
        part.worldNormals?.length!==part.vertices.length*3 ||
        !part.worldPositions.every(Number.isFinite) || !part.worldNormals.every(Number.isFinite))
      throw new Error('Invalid low-wall coordinates: '+part.id);
    for (const id of part.vertices) {
      if (!Number.isInteger(id) || id<0 || id>=source.count || ids.has(id))
        throw new Error('Invalid low-wall vertex: '+id);
      ids.add(id);
    }
  }
  const geometry=mesh.geometry.clone(), position=geometry.attributes.position, normal=geometry.attributes.normal;
  const toLocal=mesh.matrixWorld.clone().invert(), p=new THREE.Vector3();
  const normalsToLocal=new THREE.Matrix3().getNormalMatrix(toLocal);
  const mask=new Float32Array(source.count);
  for (const part of patch.components) {
    for (let i=0;i<part.vertices.length;i++) {
      const id=part.vertices[i];
      p.fromArray(part.worldPositions,i*3).applyMatrix4(toLocal);
      position.setXYZ(id,p.x,p.y,p.z);
      p.fromArray(part.worldNormals,i*3).applyMatrix3(normalsToLocal).normalize();
      normal.setXYZ(id,p.x,p.y,p.z);
      mask[id]=1;
    }
  }
  geometry.setAttribute('smallWall48',new THREE.BufferAttribute(mask,1));
  position.needsUpdate=true; normal.needsUpdate=true;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();

  // The existing sun/PCF map provides the soft cast shadow. A per-component
  // shadow-only mask leaves the other five main-island dividers unchanged.
  // No extra mesh, texture, light, visual draw call or per-frame update is added.
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  depth.name='SMALL_ISLAND_WALLS_DEPTH_V48';
  depth.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute float smallWall48;\nvarying float vSmallWall48;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSmallWall48=smallWall48;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying float vSmallWall48;')
      .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vSmallWall48<0.5) discard;')
      // ~1.4cm at the existing 340m shadow range removes self-shadow stipple
      // from these low flat caps without changing the sun or other casters.
      .replace('packDepthToRGBA( fragCoordZ )','packDepthToRGBA( min(1.0,fragCoordZ+0.00004) )');
  };
  depth.customProgramCacheKey=()=> 'small-island-only-depth-v48-bias1';
  mesh.geometry=geometry;
  mesh.customDepthMaterial=depth;
  // GLTF marks the visible source material DoubleSide. Three copies that onto
  // customDepthMaterial immediately before this callback. For a closed wall,
  // only backfaces should write depth: front-cap self-shadow stipple disappears
  // while its volume still casts a real shadow. Do not change the shared PBR material.
  const previousBeforeShadow=mesh.onBeforeShadow;
  mesh.onBeforeShadow=function(...args) {
    previousBeforeShadow?.apply(this,args);
    if(args[5]===depth) depth.side=THREE.BackSide;
  };
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.userData.safeShadowCaster=true;
  const report={version:48,count:patch.components.length,
    changedComponentIds:patch.components.map(p=>p.id),vertices:ids.size,
    visibleHeight:patch.policy?.visibleHeight??0.55,
    originalMaterialsPreserved:true,originalFacesPreserved:true,
    shadow:'existing-sun-small-components-backfaces-only',addedVisualDrawCalls:0};
  mesh.userData.smallIslandWalls48=report;
  return report;
}
