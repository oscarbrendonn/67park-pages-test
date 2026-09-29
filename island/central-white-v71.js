import * as THREE from 'three';

// Four ivory panels underneath the original small lawn islands and edging.
export function applyCentralWhite71(root){
  const grass=root.getObjectByName('3_MERKEZ_CIMEN');
  const edging=root.getObjectByName('7_MERKEZ_KALDIRIM_TABANI');
  if(!grass||!edging)throw Error('Central plaza source missing');
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(edging),cx=49.3719545,cz=-32.327407;
  const material=new THREE.MeshStandardMaterial({color:0xd1c7ca,emissive:0xd1c7ca,emissiveIntensity:.12,roughness:.6,metalness:0,envMapIntensity:.22});
  material.name='CENTER71_CLEAN_IVORY';
  const meshes=[],gap=3.15,radius=10.5,t=Math.sqrt(radius*radius-gap*gap);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const farX=sx<0?cx-bounds.min.x-.5:bounds.max.x-cx-.5;
    const farZ=sz<0?cz-bounds.min.z-.5:bounds.max.z-cz-.5;
    const points=[[farX,farZ],[gap,farZ],[gap,t]];
    const a0=Math.atan2(t,gap),a1=Math.atan2(gap,t);
    for(let i=1;i<=32;i++){const a=a0+(a1-a0)*i/32;points.push([radius*Math.cos(a),radius*Math.sin(a)]);}
    points.push([farX,gap]);
    const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(cx+sx*x,-(cz+sz*z))));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,steps:1});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,9.235,0);
    geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
    geometry.applyMatrix4(root.matrixWorld.clone().invert());
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.name='CENTER_WHITE71_'+sx+'_'+sz;
    mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);
  }
  grass.visible=true;edging.visible=true;
  root.updateMatrixWorld(true);
  return {meshes,hidden:[],version:72};
}
