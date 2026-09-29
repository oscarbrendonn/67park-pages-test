import * as T from 'three';

// Reuse the exact static depth map, then draw moving casters into a depth copy.
// No second light, shadow shader, lower-resolution map or proxy model is used.
export function installIslandShadowCache(renderer,sun,scene){
 const map=renderer.shadowMap,original=map.render;
 const stats={rebuilds:0,hits:0,staticCasters:0,depthBytes:0,allocatedBytes:0,fallback:''};
 let backup=null,key='',enabled=true,disposed=false;
 const fixed=new Set();
 scene.traverse(o=>{
  const placedProp=/^P57_|_APPROVED_PARK_PLANTS_/.test(o.name);
  if(!o.isMesh||o.isSkinnedMesh||(!placedProp&&(o.matrixAutoUpdate||o.matrixWorldAutoUpdate)))return;
  if(o.morphTargetInfluences?.length)return;
  fixed.add(o);
 });
 stats.staticCasters=[...fixed].filter(o=>o.castShadow).length;
 const records=[...fixed].map(o=>({o,values:[]}));
 const flags=[];
 function mode(staticPass){
  flags.length=0;
  scene.traverse(o=>{if(o.castShadow){flags.push(o);o.castShadow=staticPass?fixed.has(o):!fixed.has(o);}});
 }
 function restore(){for(const o of flags)o.castShadow=true;flags.length=0;}
 function fingerprint(camera){
  const sh=sun.shadow,c=sh.camera;
  return [...sun.matrixWorld.elements,...sun.target.matrixWorld.elements,...c.projectionMatrix.elements,sh.mapSize.x,sh.mapSize.y,camera.layers.mask,map.type].join(',');
 }
 function staticChanged(){
  let changed=false;
  // Visibility, editing, or an instance-buffer update must never leave a ghost.
  // Reuse each numeric snapshot; no per-mesh string or matrix-array allocation.
  for(const {o,values} of records){
   let i=0;
   const remember=value=>{if(values[i]!==value){changed=true;values[i]=value;}i++;};
   let visible=true,attached=false;for(let p=o;p;p=p.parent){if(!p.visible)visible=false;if(p===scene)attached=true;}
   const g=o.geometry;remember(o.castShadow);remember(visible);remember(attached);remember(o.layers.mask);remember(g.id);remember(g.index);remember(g.index?.version);remember(g.attributes.position);remember(g.attributes.position?.version);remember(g.drawRange.start);remember(g.drawRange.count);remember(o.instanceMatrix?.version);remember(o.count);remember(o.customDepthMaterial);remember(o.customDepthMaterial?.version);
   for(const value of o.matrixWorld.elements)remember(value);
   const material=m=>{remember(m.id);remember(m.version);remember(m.visible);remember(m.alphaTest);remember(m.opacity);remember(m.side);remember(m.shadowSide);remember(m.alphaMap?.version);remember(m.map?.version);};
   if(Array.isArray(o.material)){remember(o.material.length);for(const m of o.material)material(m);}else{remember(1);material(o.material);}
  }
  return changed;
 }
 function release(){backup?.dispose();backup=null;key='';stats.depthBytes=0;stats.allocatedBytes=0;}
 function ensureBackup(){
  const source=sun.shadow.map;
  if(backup&&(backup.width!==source.width||backup.height!==source.height))release();
  if(!backup){
   backup=new T.WebGLRenderTarget(source.width,source.height,{format:T.RedFormat,type:T.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
   backup.depthTexture=new T.DepthTexture(source.width,source.height,source.depthTexture.type);
   backup.depthTexture.format=source.depthTexture.format;
   renderer.initRenderTarget(backup);stats.depthBytes=source.width*source.height*4;stats.allocatedBytes=source.width*source.height*5;
  }
 }
 function render(lights,renderScene,camera){
  if(!enabled||disposed||renderScene!==scene||lights.length!==1||lights[0]!==sun||map.type!==T.PCFShadowMap||!map.enabled||!map.autoUpdate||!sun.shadow.autoUpdate||renderer.getContext().isContextLost())return original.call(map,lights,renderScene,camera);
  const savedTarget=renderer.getRenderTarget(),savedFace=renderer.getActiveCubeFace(),savedMip=renderer.getActiveMipmapLevel(),savedClear=renderer.clear;
  const restoreTarget=()=>renderer.setRenderTarget(savedTarget,savedFace,savedMip);
  try{
   const next=fingerprint(camera),dirty=staticChanged();
   if(!backup||key!==next||!sun.shadow.map||dirty){
    mode(true);
    try{original.call(map,lights,scene,camera);}finally{restore();}
    ensureBackup();
    renderer.copyTextureToTexture(sun.shadow.map.depthTexture,backup.depthTexture);
    restoreTarget();key=next;stats.rebuilds++;
   }else stats.hits++;
   mode(false);
   renderer.clear=function(...args){
    if(renderer.getRenderTarget()!==sun.shadow.map)return savedClear.apply(renderer,args);
    renderer.copyTextureToTexture(backup.depthTexture,sun.shadow.map.depthTexture);
    // A depth blit changes the framebuffer binding, not Three's current target.
    renderer.setRenderTarget(sun.shadow.map);
   };
   original.call(map,lights,scene,camera);
  }catch(error){
   renderer.clear=savedClear;restore();restoreTarget();
   enabled=false;stats.fallback=String(error?.message||error);release();
   original.call(map,lights,scene,camera);
  }finally{renderer.clear=savedClear;restore();}
 }
 map.render=render;
 const invalidate=()=>{key='';};
 renderer.domElement.addEventListener('webglcontextrestored',release);
 return {stats,get enabled(){return enabled;},setEnabled(value){enabled=!!value;invalidate();},invalidate,dispose(){if(disposed)return;disposed=true;if(map.render===render)map.render=original;renderer.domElement.removeEventListener('webglcontextrestored',release);release();}};
}

// Holding the following frustum briefly does not hold moving shadows: they are
// still rendered each frame. Native light-space texel snapping is retained.
export function createShadowAnchor(stableFollow,{maxDistance=2}={}){
 const anchor=new T.Vector3();let valid=false,projection='';
 const stats={updates:0,held:0};
 return {stats,invalidate(){valid=false;},update(target,camera){
  const next=camera.projectionMatrix.elements.join(',');
  if(!valid||projection!==next||anchor.distanceToSquared(target)>=maxDistance*maxDistance){
   stableFollow.update(target);anchor.copy(target);projection=next;valid=true;stats.updates++;
  }else stats.held++;
 }};
}
