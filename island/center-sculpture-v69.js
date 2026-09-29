import * as THREE from 'three';

// Reference's rounded, layered toy sculpture, inside the original fountain footprint.
export function applyCenterSculpture69(root){
  if(root.userData.centerSculpture69)return root.userData.centerSculpture69;
  root.updateMatrixWorld(true);
  const names=['67D_CENTER_FOUNTAIN_PLINTH','67D_CENTER_FOUNTAIN_RIM','67D_CENTER_FOUNTAIN_BASIN'];
  const meshes=names.map(n=>root.getObjectByName(n));
  if(meshes.some(m=>!m?.isMesh))throw Error('Central fountain source missing');
  const bounds=new THREE.Box3().setFromObject(meshes[0]),center=bounds.getCenter(new THREE.Vector3());
  const radius=(bounds.max.x-bounds.min.x)/2,baseY=bounds.max.y-.48;
  const path=(start)=>new THREE.Path().moveTo(...start);
  const base=path([0,0]).lineTo(5.25,0).quadraticCurveTo(5.82,0,5.82,.22)
    .quadraticCurveTo(5.82,.46,5.35,.48).lineTo(0,.48);
  // Continuous rolled lip and recessed inner dish: no coplanar ring overlays.
  const dish=path([0,.43]).lineTo(4.8,.43).quadraticCurveTo(5.22,.43,5.22,.76)
    .lineTo(5.22,1.04).quadraticCurveTo(5.22,1.48,4.87,1.48)
    .quadraticCurveTo(4.52,1.48,4.50,1.14).quadraticCurveTo(4.42,.77,4.04,.73)
    .lineTo(0,.73);
  const ornament=path([0,.72]).lineTo(3.3,.72).quadraticCurveTo(3.65,.72,3.65,.90)
    .quadraticCurveTo(3.65,1.12,3.3,1.14).lineTo(2.37,1.14)
    .quadraticCurveTo(1.98,1.14,1.94,1.44).quadraticCurveTo(1.92,1.7,2.18,1.85)
    .quadraticCurveTo(2.28,2.10,1.84,2.18).quadraticCurveTo(1.48,2.25,1.2,2.7)
    .quadraticCurveTo(.82,3.18,0,3.23);
  const colors=[0xbab6c3,0xaaa6b8,0xc1bdce];
  [base,dish,ornament].forEach((profile,i)=>{
    const mesh=meshes[i],geometry=new THREE.LatheGeometry(profile.getPoints(12),96);
    geometry.scale(radius/5.92,1,radius/5.92);
    geometry.translate(center.x,baseY,center.z);
    geometry.applyMatrix4(mesh.matrixWorld.clone().invert());
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=new THREE.MeshPhysicalMaterial({color:colors[i],roughness:.32,metalness:0,clearcoat:.28,clearcoatRoughness:.3,envMapIntensity:.45});
    material.name='CENTER69_PASTEL_GREY_'+i;
    mesh.geometry.dispose();mesh.geometry=geometry;mesh.material=material;
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.safeShadowCaster=true;
  });
  root.updateMatrixWorld(true);
  return root.userData.centerSculpture69={version:69,radius,center:[center.x,baseY,center.z],height:3.23,meshes:names};
}
