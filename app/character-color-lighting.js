// A small neutral diffuse fill for coloured native coats, shared by wardrobe,
// local/remote avatars and mini-games. No light, texture, mesh or frame callback.
// Keep authored RGB/vertex paint, normal shading, eyes and accessories intact.
const revision='character-color-1';
const finishes={frog67:{fill:.65,names:['frog-unified-skin']},cat67:{fill:.12,names:['cat_matching_body','cat_face','cat_ear_satin']}};
const bodyNames=new Set(['FS_Body','Goril_El_L','Goril_El_R']);
export function applyCharacterColorLighting(root,base){
 const finish=finishes[base];if(!finish)return;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(!material?.isMeshStandardMaterial||(!bodyNames.has(mesh.name)&&!finish.names.includes(material.name)))continue;
   if(material.userData.characterColorLighting===revision)continue;
   const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',
     '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += diffuseColor.rgb * '+finish.fill.toFixed(2)+';');
   };
   material.customProgramCacheKey=()=>key+'|'+revision+'|'+base;
   material.userData.characterColorLighting=revision;
   material.needsUpdate=true;
  }
 });
}
