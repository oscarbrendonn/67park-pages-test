import * as T from 'three';
import {roundRailEnds} from './rounded-rail-ends.js?v=flush-ends-2';
import {createCopingEndAlignment} from './coping-end-alignment.js?v=flush-ends-2';
import {installSkateRailSupport} from './skate-rail-support.js?v=skate-solid-1';
import {installSkateObstacleSupport} from '../skate-obstacle-support.js?v=contact-escape-1';

// Finish only the authored tubes, never the concrete, paint markings or ground.
export const isSkateRail = mesh => mesh?.isMesh &&
 /^67D_SKATEPARK_/.test(mesh.name || '') &&
 /(?:COPING|ACCENT|(?:^|_)RAIL(?:_|$))/.test(mesh.name || '');

export function installSkateRailFinish(world) {
 if(!world?.ready || !world.scene)return null;
 if(world.skateRailFinish)return world.skateRailFinish;
 const saved=[],materials=new Map(),alignEnd=createCopingEndAlignment(world.scene);let caps=0,extendedEnds=0,addedTriangles=0,maxExtension=0;
 world.scene.traverse(mesh=>{
  if(!isSkateRail(mesh)||Array.isArray(mesh.material)||!mesh.material?.isMeshStandardMaterial)return;
  const original=mesh.material;
  let polished=materials.get(original);
  if(!polished){
   polished=new T.MeshPhysicalMaterial();
   // Copy maps, color space, sidedness and the original environment response.
   T.MeshStandardMaterial.prototype.copy.call(polished,original);
   polished.name=original.name+' · satin enamel';
   polished.roughness=.30;polished.metalness=.12;
   polished.clearcoat=.32;polished.clearcoatRoughness=.30;
   polished.envMap=original.envMap||world.scene.environment;
   polished.envMapIntensity=.55;
   polished.userData={...original.userData,skateRailFinish:'satin-1'};
   materials.set(original,polished);
  }
  const originalGeometry=mesh.geometry;
  const rounded=/COPING|ACCENT/.test(mesh.name)?roundRailEnds(mesh,alignEnd):null;
  if(rounded){mesh.geometry=rounded.geometry;caps+=rounded.caps;extendedEnds+=rounded.extendedEnds;addedTriangles+=rounded.addedTriangles;maxExtension=Math.max(maxExtension,rounded.maxExtension);}
  saved.push({mesh,original,polished,originalGeometry,rounded});mesh.material=polished;
 });
 const support=installSkateRailSupport(world,saved.filter(s=>s.rounded).map(s=>({mesh:s.mesh,startVertex:s.originalGeometry.attributes.position.count})));
 const obstacles=installSkateObstacleSupport(world);
 const originalDispose=world.dispose;let disposeWorld;
 const result={version:'flush-rounded-satin-2',meshes:saved.length,materials:materials.size,caps,extendedEnds,addedTriangles,maxExtension,
  geometryChanged:caps>0,transformsChanged:false,collisionChanged:!!support||!!obstacles,support:support?.stats??null,obstacles:obstacles?.stats??null,
  addedDrawCalls:0,addedTextures:0,
  dispose(){obstacles?.dispose();support?.dispose();for(const {mesh,original,polished,originalGeometry,rounded}of saved){if(mesh.material===polished)mesh.material=original;if(rounded){if(mesh.geometry===rounded.geometry)mesh.geometry=originalGeometry;rounded.geometry.dispose();}}for(const m of materials.values())m.dispose();if(world.skateRailFinish===result)delete world.skateRailFinish;if(disposeWorld&&world.dispose===disposeWorld)world.dispose=originalDispose;}
 };
 world.skateRailFinish=result;
 if(typeof originalDispose==='function'){disposeWorld=function(...args){result.dispose();return originalDispose.apply(this,args);};world.dispose=disposeWorld;}
 return result;
}
