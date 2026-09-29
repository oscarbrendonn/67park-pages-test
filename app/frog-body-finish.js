import * as T from '../vendor/three.module.js';

// Paint on the original skinned gorilla body. No mesh, rig,
// weights or animation data is modified; the rest-position mask skins with it.
export function applyBodyFinish(root,entry){
 for(const name of ['FS_Body','Goril_El_L','Goril_El_R']){
  const mesh=root.getObjectByName(name);if(!mesh)continue;
  if(!mesh.userData.originalPreviewMaterial)mesh.userData.originalPreviewMaterial=mesh.material;
  else for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();
  const originals=Array.isArray(mesh.userData.originalPreviewMaterial)?mesh.userData.originalPreviewMaterial:[mesh.userData.originalPreviewMaterial];
  const frog=entry.id==='frog'&&entry.finishRevision===2;
  const materials=originals.map(original=>{
   const mat=frog?new T.MeshPhysicalMaterial({color:entry.bodyColor,roughness:entry.roughness??.36,metalness:0,clearcoat:.6,clearcoatRoughness:.22}):original.clone();
   mat.color.set(entry.bodyColor);mat.roughness=entry.roughness??(frog?.36:.25);mat.metalness=entry.id==='robot'?.7:0;
   if(frog&&name==='FS_Body'){
    mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,size=box.getSize(new T.Vector3());
    mat.onBeforeCompile=shader=>{
     shader.uniforms.frogBodyMin={value:box.min.clone()};shader.uniforms.frogBodySize={value:size};shader.uniforms.frogBellyColor={value:new T.Color('#D3CA8E')};
     shader.vertexShader='varying vec3 frogRestPosition;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfrogRestPosition = position;');
     shader.fragmentShader='varying vec3 frogRestPosition;\nuniform vec3 frogBodyMin;\nuniform vec3 frogBodySize;\nuniform vec3 frogBellyColor;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 bodyP=(frogRestPosition-frogBodyMin)/frogBodySize;
      float bellyY=(bodyP.y-.71)/.215;
      float bellyWidth=.205*(1.0-.16*bellyY);
      float bellyR=pow(abs((bodyP.x-.5)/bellyWidth),2.6)+pow(abs(bellyY),2.6);
      float bellyMask=(1.0-smoothstep(.92,1.04,bellyR))*smoothstep(.55,.66,bodyP.z);
      diffuseColor.rgb=mix(diffuseColor.rgb,frogBellyColor,bellyMask);`);
    };
    mat.customProgramCacheKey=()=> 'frog-reference-belly-1';
   }
   return mat;
  });
  mesh.material=Array.isArray(mesh.userData.originalPreviewMaterial)?materials:materials[0];
 }
}
