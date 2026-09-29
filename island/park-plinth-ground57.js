import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

const NAME='3_CIMEN_PARK_APRON_V57';
const MATRIX=[179.45658377779,0,0,0,0,179.45658377779,0,0,0,0,179.45658377779,0,8.131652123901338,9.5505694420122,-2.1953011248415946,1];

// Reuse the existing closed hill pedestal as grass support around the new
// circular plinth. Only height/material/name change; exact XZ and topology stay.
// Call after terrain57 and before profile/relief-mask/final sampler construction.
// Exclude hidden HILL_DOME from the final sampler, but retain the renamed apron.
export function applyParkPlinthGround57(root){
 const done=root.getObjectByName(NAME);if(done?.userData.parkPlinthGround57)return done.userData.parkPlinthGround57;
 const mesh=root.getObjectByName('9_PARK_TEPE'),dome=root.getObjectByName('67D_REF_HILL_DOME'),grass=root.getObjectByName('3_CIMEN');
 if(!mesh?.isMesh||!dome?.isMesh||!grass?.isMesh||!grass.userData.parkTerrain57||Array.isArray(grass.material))throw Error('plinth57: prerequisites');
 root.updateMatrixWorld(true);
 if(mesh.geometry.attributes.position.count!==16054||mesh.geometry.index?.count!==75924||sideSourceHash50(mesh.geometry)!=='9c2cef19'||sideSourceHash50(dome.geometry)!=='161392d5')throw Error('plinth57: source geometry');
 if(mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-MATRIX[i])>1e-8))throw Error('plinth57: world transform');
 const next=mesh.geometry.clone(),p=next.attributes.position,old=mesh.geometry.attributes.position;
 const topBefore=9.5505694420122,bottom=8.868634245025952,topAfter=9.398031270658546+.004,scale=(topAfter-bottom)/(topBefore-bottom),bottomLocal=(bottom-topBefore)/MATRIX[5];
 const change=new THREE.Matrix4().makeScale(1,scale,1);change.setPosition(0,bottomLocal*(1-scale),0);next.applyMatrix4(change);
 // A height-only affine compression preserves the closed shell and smooth
 // millimetre edge bevel. Four mm above adjacent grass avoids coplanar surfaces.
 for(let i=0;i<p.count;i++)if(p.getX(i)!==old.getX(i)||p.getZ(i)!==old.getZ(i)||!Number.isFinite(p.getY(i)))throw Error('plinth57: footprint mutation');
 next.deleteAttribute('color');next.computeBoundingBox();next.computeBoundingSphere();
 const material=grass.material.clone();material.name='Park apron — current light grass';material.vertexColors=false;
 material.onBeforeCompile=grass.material.onBeforeCompile;material.customProgramCacheKey=grass.material.customProgramCacheKey;
 const report={version:57,name:NAME,originalName:'9_PARK_TEPE',topBefore,topAfter,bottom,footprintUnchanged:true,topologyUnchanged:true,addedTriangles:0,addedDrawCalls:0,plinthFloorClearance:9.718031-topAfter,hiddenTerrain:['67D_REF_HILL_DOME']};
 mesh.geometry=next;mesh.material=material;mesh.name=NAME;mesh.visible=true;mesh.userData.parkPlinthGround57=report;
 mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.safeShadowCaster=false;
 // Rename is essential: the live profile styles PARK_TEPE tan, while CIMEN
 // receives the current map's grass finish. The cloned material is scoped.
 dome.visible=false;return report;
}
