import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {CHARACTERS} from './park-roster-v28.js';
import {canonicalBaseBounds} from './park-bounds-v28.js';
import {restQuats,retargetClip} from './park-retarget-v28.js';
export {CHARACTERS};
const loader=new GLTFLoader();
let sourceRest,sourceClips;
export async function loadParkCharacter(id='goril'){
  const def=CHARACTERS.find(c=>c.id===id);if(!def)throw new Error('Bilinmeyen karakter');
  const gltf=await loader.loadAsync(def.file?'park-assets-v28/friends/'+def.file:'model/goril-eggy-oyun.glb');
  return createParkCharacter(gltf,id);
}
export function createParkCharacter(gltf,id='goril'){
  const def=CHARACTERS.find(c=>c.id===id);if(!def)throw new Error('Bilinmeyen karakter');
  const model=gltf.scene;
  model.updateMatrixWorld(true);
  model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
  if(!def.file){sourceRest=restQuats(model);sourceClips=gltf.animations;}
  if(!sourceRest)throw new Error('Önce ana karakter yüklenmeli');
  const box=def.file?canonicalBaseBounds(model,id):new THREE.Box3().setFromObject(model);
  const scale=(def.file?1.35:1.28)/(box.max.y-box.min.y);
  model.scale.multiplyScalar(scale);
  model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  const body=new THREE.Group();body.name='PARK_CHARACTER_'+id;body.add(model);
  body.userData.visual=model;body.userData.characterId=id;
  body.updateMatrixWorld(true);
  const clips=def.file?sourceClips.map(c=>retargetClip(c,sourceRest,restQuats(model))):gltf.animations;
  return {body,clips};
}
export async function loadParkBoard(kind='logo'){
  if(!['logo','neon','klasik','retro'].includes(kind))throw new Error('Bilinmeyen kaykay');
  const gltf=await loader.loadAsync('park-assets-v28/boards/'+kind+'.glb');
  return createParkBoard(gltf,kind);
}
export function createParkBoard({scene:b},kind='logo'){
  // Source SkateBoard.tsx normalization and logo deck correction, unchanged.
  b.traverse(o=>{if(o.name==='body'&&kind==='logo')o.rotation.x=Math.PI;});
  b.rotation.y=-Math.PI/2;
  const size=new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
  b.scale.setScalar(1.15/size.z);
  const box=new THREE.Box3().setFromObject(b),center=box.getCenter(new THREE.Vector3());
  b.position.set(-center.x,-box.min.y,-center.z);
  const root=new THREE.Group();root.add(b);root.updateMatrixWorld(true);
  const wheels=[],nodes=[];b.traverse(o=>{if(/^wheel_\d+$/.test(o.name))nodes.push(o);});
  for(const node of nodes){const pivot=new THREE.Group();
    pivot.position.copy(new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()));
    root.add(pivot);pivot.attach(node);wheels.push(pivot);}
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  root.userData.wheels=wheels;root.userData.kind=kind;
  root.userData.deck=.16; // Source FOOT_BOARD - FOOT_GROUND, less wheel clearance.
  return root;
}
// Assets are loaded on selection, not all at boot. Retire replaced GPU buffers.
export function disposeParkObject(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);
    for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))materials.add(m);});
  for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}
  for(const t of textures){t.dispose();t.source?.data?.close?.();}
  for(const g of geometries)g.dispose();for(const s of skeletons)s.dispose();
  root?.removeFromParent();
}
