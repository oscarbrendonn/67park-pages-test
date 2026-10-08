import {prepareSkateVisual} from './skate-model-contract.js';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadCharacterAsset} from './character-assets.js?v=entry-light-1';
import {nativeCharacterURL} from './native-character.js?v=cat-character-1';
import {applyNativeShopItems,clearNativeShopItems} from './native-shop-items.js?v=player-account-shop-render-20261003-1';
import {attachCharacterCosmetics} from './character-cosmetics.js';
const owned=Symbol.for('67park.avatar-owned-resources');
export function disposeMarketModel(root){const geometries=new Set(),materials=new Set(),skeletons=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.skeleton)skeletons.add(o.skeleton);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const s of skeletons)s.dispose();root.removeFromParent();}
function wardrobeCopy(source,clothes){
 const root=clone(source);
 root.traverse(o=>{
  if(!o.isMesh)return;let geometry=o.geometry.clone();
  if(clothes&&o.isSkinnedMesh&&geometry.index){
   const a=geometry.attributes,hand=i=>{for(let n=0;n<4;n++)if(/^Hand[LR]$/.test(o.skeleton.bones[a.skinIndex.getComponent(i,n)].name.replace(/_\d+$/,''))&&a.skinWeight.getComponent(i,n)>.95)return true;return false;},keep=[];
   for(let i=0;i<geometry.index.count;i+=3){const tri=[geometry.index.getX(i),geometry.index.getX(i+1),geometry.index.getX(i+2)],hands=tri.filter(hand).length;if(hands===0)keep.push(...tri);else if(hands!==3){geometry.dispose();throw Error('Outfit wrist topology changed');}}
   geometry.setIndex(keep);
  }
  // Preserve the GLB's authored smooth normals and bone transforms. Baking
  // world positions and rebuilding normals flattens the original backpack.
  if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();o.geometry=geometry;
  o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
 });
 root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();}});return root;
}
// Freeze real visible mesh vertices, including skinning, into preview-owned
// copies. Textures/templates remain borrowed; disposal never touches them.
function snapshot(root,select=()=>true){
 root.updateMatrixWorld(true);const result=new T.Group();
 root.traverse(o=>{
  if(!o.isMesh||!o.visible||!select(o))return;o.skeleton?.update();
  let geometry=o.geometry.clone();const count=geometry.attributes.position.count,positions=new Float32Array(count*3),p=new T.Vector3();
  for(let i=0;i<count;i++){o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);p.toArray(positions,i*3);}
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();
  // Cropped wardrobe pieces retain unused body vertices. Drop only those
  // unrendered vertices from the preview so framing follows the actual item.
  if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();result.add(new T.Mesh(geometry,material));
 });return result;
}
function generatedShopProp(item){
 // Same meshes, proportions and materials as main.js Fd (park equipment).
 // These are rendered 3D meshes, not replacement illustrations or AI images.
 const root=new T.Group(),material=()=>new T.MeshStandardMaterial({color:item.color,roughness:.75,metalness:0}),add=(g,x=0,y=0,z=0)=>{const m=new T.Mesh(g,material());m.position.set(x,y,z);root.add(m);return m;};
 if(item.id==='cap'){add(new T.SphereGeometry(.062,14,10,0,Math.PI*2,0,Math.PI/2),0,.035);add(new T.BoxGeometry(.062*1.3,.062*.22,.062*.8),0,.035,.062*.85);}
 else if(item.id==='kite')add(new T.OctahedronGeometry(.055)).scale.set(1,1.3,.35);
 else if(item.id==='teddy'){add(new T.SphereGeometry(.042,10,8));add(new T.SphereGeometry(.03,10,8),0,.055);add(new T.SphereGeometry(.013,8,6),-.024,.08);add(new T.SphereGeometry(.013,8,6),.024,.08);}
 else if(item.id==='ball')add(new T.SphereGeometry(.05,12,10));
 else throw Error('No real model for '+item.id);
 return root;
}
export async function loadMarketModel(item){
 let root;
 if(item.board){
  if(!['neon','klasik','retro','logo'].includes(item.board))throw Error('Unknown skateboard');
  const asset=await loadCharacterAsset(new URL('../models/boards/'+item.board+'.glb',import.meta.url).href);root=snapshot(prepareSkateVisual(asset.scene,item.board).root);
 }else if(item.id==='cap'){
  const asset=await loadCharacterAsset(new URL('../models/items/friendsie_8/90.glb',import.meta.url).href);root=wardrobeCopy(asset.scene,false);
 }else if(item.sample&&item.asset){
  const asset=await loadCharacterAsset(item.asset);root=wardrobeCopy(asset.scene,item.clothes);
 }else if(item.sample&&item.effect){
  root=new T.Group();attachCharacterCosmetics(root,{[item.slot]:item.equipmentId},{clock:()=>0});
  // Tilt the actual flat aura towards the display camera. The worn aura is
  // still the unchanged runtime effect and remains flat below the character.
  if(item.slot==='vibe')root.rotation.x=.8;
 }else if(['tshirt','hoodie','bag'].includes(item.id)){
  const asset=await loadCharacterAsset(nativeCharacterURL('cat67')),rig=clone(asset.scene);
  try{applyNativeShopItems(rig,{[item.slot]:'shop:'+item.id});root=snapshot(rig,o=>{for(let p=o;p;p=p.parent)if(p[owned])return true;return false;});}
  finally{clearNativeShopItems(rig);const bones=new Set();rig.traverse(o=>{if(o.skeleton)bones.add(o.skeleton);});for(const s of bones)s.dispose();}
 }else root=generatedShopProp(item);
 if(!root.children.length)throw Error('Empty item model');
 const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 // Preview normalization only: board GLBs, rider scale and physics are untouched.
 root.scale.setScalar(1.5/Math.max(size.x,size.y,size.z,.001));root.position.copy(center).multiplyScalar(-root.scale.x);
 const turn=new T.Group();turn.add(root);turn.userData.itemId=item.id;return turn;
}
