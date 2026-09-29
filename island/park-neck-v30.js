import * as THREE from 'three';

// The imported head includes a textured neck stump that protrudes through the
// plain black torso. Match only that anatomical collar, not the pale muzzle.
// The mask is baked once in bind pose, so it follows skinning in every animation.
export function matchGorillaNeck(body){
  if(body.userData.characterId!=='goril'||body.userData.neckFinish)return;
  const head=body.getObjectByName('GORIL_KAFA'),torso=body.getObjectByName('FS_Body');
  if(!head?.isSkinnedMesh||!torso?.material?.color)return;
  body.updateMatrixWorld(true);head.skeleton.update();
  const box=new THREE.Box3().setFromObject(body),height=box.max.y-box.min.y;
  const point=new THREE.Vector3(),mask=new Float32Array(head.geometry.attributes.position.count);
  const smooth=THREE.MathUtils.smoothstep;
  let matched=0;
  for(let i=0;i<mask.length;i++){
    head.getVertexPosition(i,point).applyMatrix4(head.matrixWorld);
    // Normalized to the original 1.28m actor. The collar is inside the torso's
    // 0.15m radius; the muzzle projects beyond this and remains entirely intact.
    const y=(point.y-box.min.y)/height;
    const radial=Math.hypot(point.x-body.position.x,point.z-body.position.z)/height;
    mask[i]=(1-smooth(y,.436,.462))*(1-smooth(radial,.119,.148));
    if(mask[i]>.001)matched++;
  }
  head.geometry.setAttribute('parkNeckMask',new THREE.BufferAttribute(mask,1));
  const material=head.material,finish=torso.material;
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.parkNeckColor={value:finish.color.clone()};
    shader.uniforms.parkNeckRoughness={value:finish.roughness};
    shader.uniforms.parkNeckMetalness={value:finish.metalness};
    shader.vertexShader='attribute float parkNeckMask;\nvarying float vParkNeckMask;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvParkNeckMask = parkNeckMask;');
    shader.fragmentShader='varying float vParkNeckMask;\nuniform vec3 parkNeckColor;\nuniform float parkNeckRoughness;\nuniform float parkNeckMetalness;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, parkNeckColor, vParkNeckMask);')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, parkNeckRoughness, vParkNeckMask);')
      .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, parkNeckMetalness, vParkNeckMask);')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, vParkNeckMask));');
  };
  material.customProgramCacheKey=()=> 'gorilla-neck-body-finish-v30';
  material.needsUpdate=true;
  body.userData.neckFinish={version:30,matchedVertices:matched,color:finish.color.getHexString()};
}
