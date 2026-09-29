import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {CHARACTERS,POWER_STYLE,VIBE_COLOR} from './park-source-data-v51.js';
import {sanitizeEquipment} from './park-equipment-v51.js';
import {buildFriendsieModel,dressGorilClone,parseGlbPart} from './park-source-assemble-v51.js';
import {restQuats,retargetClip} from './park-source-retarget-v51.js';
import {cloneSkinnedScene} from './park-skeleton-v51.js';

const GORILLA='goril-v1.glb';
const materialList=m=>(Array.isArray(m)?m:[m]).filter(Boolean);
function resources(root){
 const geometry=new Set(),material=new Set(),texture=new Set(),skeleton=new Set();
 root?.traverse(o=>{
  if(o.geometry)geometry.add(o.geometry);if(o.skeleton)skeleton.add(o.skeleton);
  for(const m of materialList(o.material)){material.add(m);for(const v of Object.values(m))if(v?.isTexture)texture.add(v);}
 });
 return {geometry,material,texture,skeleton};
}
function disposeResources(r){
 for(const g of r.geometry)g.dispose();for(const m of r.material)m.dispose();
 for(const t of r.texture)t.dispose();for(const s of r.skeleton)s.dispose();
 // Texture images are decoded template data and may still be in use by a
 // different body or THREE.Cache. Never close shared ImageBitmaps here.
}
function isolateResources(root,templates){
 const geometries=new Map(),materials=new Map(),textures=new Map();
 const source={geometry:new Set(),material:new Set(),texture:new Set()};
 for(const entry of templates)for(const key of Object.keys(source))for(const item of entry.resources[key])source[key].add(item);
 const texture=t=>{if(!source.texture.has(t))return t;if(!textures.has(t))textures.set(t,t.clone());return textures.get(t);};
 const material=m=>{
  if(materials.has(m))return materials.get(m);
  const copy=source.material.has(m)?m.clone():m;
  copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;
  for(const [k,v] of Object.entries(copy))if(v?.isTexture)copy[k]=texture(v);
  materials.set(m,copy);return copy;
 };
 root.traverse(o=>{
  if(o.geometry&&source.geometry.has(o.geometry)){
   const g=o.geometry;if(!geometries.has(g))geometries.set(g,g.clone());o.geometry=geometries.get(g);
  }
  if(o.material)o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
 });
}

/** Source Effects.tsx math/materials, with reduced-motion and disposal support. */
function equipmentEffects(eq){
 const group=new THREE.Group();group.name='PARK_EQUIPMENT_EFFECTS';group.position.y=.52;
 let aura=null,ring=null;
 const style=POWER_STYLE[eq.power];
 if(style){
  aura=new THREE.Group();aura.name='POWER_AURA';group.add(aura);
  const geometry=style.shape==='star'?new THREE.OctahedronGeometry(.07):style.shape==='heart'?new THREE.SphereGeometry(.06,10,8):new THREE.ConeGeometry(.05,.12,6);
  const material=new THREE.MeshStandardMaterial({color:style.color,emissive:style.color,emissiveIntensity:.35,roughness:.4});
  for(let i=0;i<4;i++){
   const item=new THREE.Mesh(geometry,material),angle=i/4*Math.PI*2;
   item.position.set(Math.cos(angle)*.62,0,Math.sin(angle)*.62);aura.add(item);
  }
 }
 if(VIBE_COLOR[eq.vibe]){
  ring=new THREE.Mesh(new THREE.RingGeometry(.42,.62,32),new THREE.MeshBasicMaterial({color:VIBE_COLOR[eq.vibe],transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  ring.name='VIBE_GLOW';ring.position.y=-.45;ring.rotation.x=-Math.PI/2;group.add(ring);
 }
 function update(dt,time,{reduced=false}={}){
  const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0,t=Number.isFinite(time)?time:0;
  if(aura){
   if(reduced){aura.rotation.y=0;aura.position.y=.35;}else{aura.rotation.y+=step*1.7;aura.position.y=.35+Math.sin(t*2.2)*.06;}
   aura.children.forEach((item,i)=>{item.position.y=reduced?0:Math.sin(t*3+i*1.6)*.09;if(reduced)item.rotation.y=0;else item.rotation.y+=step*2.5;});
  }
  if(ring){const pulse=reduced?.5:(Math.sin(t*2.6)+1)/2;ring.scale.setScalar(.9+pulse*.25);ring.material.opacity=.22+pulse*.18;}
 }
 update(0,0,{reduced:true});return {group,update};
}

/**
 * Independent preview/game bodies own GPU resources; decoded source templates
 * have bounded LRU retention and are pinned while a body/build references them.
 * `loadGLTF` injection is for offline tests. It receives source file + asset URL.
 */
export function createEquipmentAssetLoader({loadGLTF,maxCached=8}={}){
 if(!Number.isInteger(maxCached)||maxCached<1)throw Error('Invalid template cache limit');
 const loader=loadGLTF?null:new GLTFLoader(),cache=new Map();let serial=0;
 const fetchGLTF=loadGLTF||((_file,url)=>loader.loadAsync(url));
 function trim(){
  while(cache.size>maxCached){
   const free=[...cache.values()].filter(e=>e.refs===0&&e.value).sort((a,b)=>a.used-b.used)[0];
   if(!free)break;cache.delete(free.file);disposeResources(free.resources);
  }
 }
 function acquire(file){
  let entry=cache.get(file);
  if(!entry){
   entry={file,refs:0,used:++serial,value:null,resources:null,promise:null};cache.set(file,entry);
   const url=file===GORILLA?'model/goril-eggy-oyun.glb':'park-assets-v28/friends/'+file;
   entry.promise=Promise.resolve().then(()=>fetchGLTF(file,url)).then(gltf=>{
    if(!gltf?.scene?.isObject3D||!Array.isArray(gltf.animations))throw Error('Invalid source GLTF: '+file);
    entry.value=gltf;entry.resources=resources(gltf.scene);return gltf;
   }).catch(error=>{if(cache.get(file)===entry)cache.delete(file);throw error;});
  }
  entry.refs++;entry.used=++serial;return entry;
 }
 const release=entries=>{for(const entry of entries){entry.refs--;entry.used=++serial;if(entry.refs<0)throw Error('Equipment cache reference underflow');}trim();};
 async function loadEquipmentCharacter(input){
  const eq=sanitizeEquipment(input);if(!eq)throw Error('Invalid equipment');
  const def=CHARACTERS.find(c=>c.id===eq.base),files=new Set([GORILLA]);
  if(def.file)files.add(def.file);
  for(const slot of ['body','head','sprout','back','kicks','held']){const p=parseGlbPart(eq[slot]);if(p)files.add(p.file+'.glb');}
  const entries=[...files].map(acquire);let body=null,model=null,effects=null,isolated=false;
  try{
   const results=await Promise.allSettled(entries.map(e=>e.promise));
   const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
   const loaded=new Map(entries.map(e=>[e.file,e.value])),gorilla=loaded.get(GORILLA);
   const getScene=file=>loaded.get(file)?.scene||null;
   if(def.file){
    model=buildFriendsieModel(eq,getScene)?.model;
    if(!model)throw Error('Could not assemble source character');
   }else{
    model=cloneSkinnedScene(gorilla.scene);model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;
    if(!Number.isFinite(height)||height<=0)throw Error('Invalid gorilla base bounds');
    dressGorilClone(model,eq,getScene);
    const scale=1.28/height;model.scale.multiplyScalar(scale);
    model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);
   }
   // All active geometry/materials/textures are private before rendering.
   isolateResources(model,entries);isolated=true;
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
   const sourceRest=restQuats(gorilla.scene),destinationRest=restQuats(model);
   const clips=def.file?gorilla.animations.map(c=>retargetClip(c,sourceRest,destinationRest)):gorilla.animations.map(c=>c.clone());
   body=new THREE.Group();body.name='PARK_CHARACTER_'+eq.base;body.add(model);
   body.userData.visual=model;body.userData.characterId=eq.base;body.userData.equipment={...eq};
   body.updateMatrixWorld(true);body.userData.characterBounds=new THREE.Box3().setFromObject(model);
   effects=equipmentEffects(eq);let disposed=false,attached=false;
   const owned=resources(model),effectOwned=resources(effects.group);
   for(const key of Object.keys(owned))for(const r of effectOwned[key])owned[key].add(r);
   body.userData.updateEquipmentEffects=(dt,time,options)=>{
    if(disposed)return;
    // Controller computes body height/sole in its constructor. Cosmetic rings
    // must not alter those measurements. First tick occurs after construction.
    if(!attached){attached=true;body.add(effects.group);}effects.update(dt,time,options);
   };
   body.userData.disposeEquipment=()=>{
    if(disposed)return;disposed=true;body.userData.equipmentDisposed=true;
    body.removeFromParent();effects.group.removeFromParent();disposeResources(owned);release(entries);
   };
   body.userData.equipmentEffects=effects.group;
   return {body,clips};
  }catch(error){
   if(isolated&&model)disposeResources(resources(model));
   if(effects)disposeResources(resources(effects.group));
   body?.removeFromParent();release(entries);throw error;
  }
 }
 function clearUnused(){
  for(const [file,entry] of cache)if(entry.refs===0&&entry.value){cache.delete(file);disposeResources(entry.resources);}
 }
 function cacheInfo(){return [...cache.values()].map(e=>({file:e.file,refs:e.refs,loaded:!!e.value}));}
 return {loadEquipmentCharacter,clearUnused,cacheInfo};
}
const defaultLoader=createEquipmentAssetLoader();
export const loadEquipmentCharacter=eq=>defaultLoader.loadEquipmentCharacter(eq);
export function disposeEquipmentCharacter(body){
 if(!body)return;
 if(typeof body.userData?.disposeEquipment!=='function')throw Error('Not an equipment character; use its original disposer');
 body.userData.disposeEquipment();
}
