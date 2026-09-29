import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// An opt-in art/gameplay sample. No downloaded textures, no new character rig.
export const TOY_LANES=['#f3a2cc','#ffe59a','#91e3c2','#97d8f5','#ccb1ed'];
export const LANE_CENTERS=[-8.56,-4.28,0,4.28,8.56];
// Full reference Cpy6RLLRyOk, 01:05–01:40: five lanes, hurdles, sweepers,
// staggered bridge gaps, then results (58.90s). The edit cuts time; 389 world
// units is our timing calibration, NOT a claimed measurement of their map.
// A complete normal-run input test took 51.68s at 340 units. Add 49 / 6.8 =
// 7.21s of bridge distance, preserving speed, jump scale and obstacle timing.
export const FINISH_Z=-374;
export const DECKS=[[-381,-341],[-210,-112],[-110,20]];
export const CHECKPOINTS=[12,-50,-118,-175,-216,-347];
export const SLIDER_ROWS=[];
export const SPINNER_ROWS=[-132,-164,-196];
export const HURDLE_ROWS=[-9,-28,-47,-66,-85];
export const BRIDGES=LANE_CENTERS.flatMap((x,lane)=>{
 const edge=-235-lane*8;
 return [{x,lane,a:edge,b:-212},{x,lane,a:-341,b:edge-2.4}];
});
export function sectionAt(z){return z>-112?'Jump rails':z>-212?'Sweepers':'Sky bridges';}
export function supported(x,z){
 return (Math.abs(x)<=10.6&&DECKS.some(([a,b])=>z>=a&&z<=b))||BRIDGES.some(p=>Math.abs(x-p.x)<=2.08&&z>=p.a&&z<=p.b);
}
export function jumpAhead(z,x=0){return supported(x,z)&&!supported(x,z-1.7);}
export function punchTarget(attacker,others){
 let best=null,nearest=1.95;
 for(const target of others){
  if(target===attacker||target.finished||target.eliminated||target.carriedBy||target.immune>0||target.y<-.2)continue;
  const dx=target.root.position.x-attacker.root.position.x,dz=target.root.position.z-attacker.root.position.z,d=Math.hypot(dx,dz);
  if(d<nearest&&Math.abs(target.y-attacker.y)<1.1&&(d<.05||(dx*Math.sin(attacker.root.rotation.y)+dz*Math.cos(attacker.root.rotation.y))/d>.25)){best=target;nearest=d;}
 }
 return best;
}

export function createToyCourse(scene,course){
 const materials=new Map(),geometries=new Map(),batches=new Map();
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.48,metalness:0}));return materials.get(color)};
 function block(w,h,d,color,x,y,z,r=.18){
  const key=[w,h,d,r].join(':'),g=geometries.get(key)||new RoundedBoxGeometry(w,h,d,2,Math.min(r,h*.48));geometries.set(key,g);
  if(!batches.has(color))batches.set(color,[]);
  batches.get(color).push(g.clone().translate(x,y,z));
 }
 // All lane caps share the same height; the cream seams are inlaid, not ridges.
 for(const [a,b]of DECKS){const length=b-a,center=(a+b)/2;
  block(22,.85,length,'#79afd8',0,-.58,center,.28);
  block(21.8,.3,length,'#fff6e9',0,-.16,center,.14);
  for(let i=0;i<5;i++)block(4.2,.14,length-.12,TOY_LANES[i],LANE_CENTERS[i],.01,center,.06);
  for(const x of [-10.87,10.87])block(.18,.12,length-.1,'#ffffff',x,.06,center,.055);
  // Contrasting end caps make the two actual gaps readable well before jumping.
  for(const z of [a+.22,b-.22])block(21.4,.025,.25,'#fff9e8',0,.095,z,.01);
 }
 for(const {x,lane,a,b}of BRIDGES){const length=b-a,center=(a+b)/2;
  block(4.16,.85,length,'#79afd8',x,-.58,center,.2);
  block(4.16,.3,length,'#fff6e9',x,-.16,center,.12);
  block(4.16,.14,length,TOY_LANES[lane],x,.01,center,.06);
  for(const z of [a+.22,b-.22])block(4.1,.025,.25,'#fff9e8',x,.095,z,.01);
 }
 // Static patches merge by color: exact rounded silhouette, fewer draw calls.
 for(const [color,parts]of batches){const mesh=new T.Mesh(mergeGeometries(parts),material(color));mesh.receiveShadow=true;mesh.castShadow=true;course.add(mesh);parts.forEach(g=>g.dispose());}
 geometries.forEach(g=>g.dispose());
 // Instanced white chevrons: two draws for the whole course, no image textures.
 const marks=[];
 for(let z=14;z>FINISH_Z;z-=5)for(const x of LANE_CENTERS)if(supported(x,z)&&supported(x,z-.7))marks.push({x,z});
 const markGeo=new T.PlaneGeometry(1.5,.18),markMat=new T.MeshBasicMaterial({color:'#fff9ee',transparent:true,opacity:.38,depthWrite:false});
 const dummy=new T.Object3D();
 for(const side of [-1,1]){const mesh=new T.InstancedMesh(markGeo,markMat,marks.length);marks.forEach((p,i)=>{dummy.position.set(p.x+side*.5,.084,p.z);dummy.rotation.set(-Math.PI/2,0,-side*.4);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;course.add(mesh)}
 // Light geometry under the course gives falls a depth cue without a skybox file.
 const cloudGeo=new T.SphereGeometry(1,20,12),cloudMat=new T.MeshStandardMaterial({color:'#edf8ff',roughness:1,metalness:0}),clouds=new T.InstancedMesh(cloudGeo,cloudMat,36);
 for(let i=0;i<36;i++){const cluster=Math.floor(i/3),lobe=i%3,side=cluster%2?-1:1;dummy.position.set(side*(18+(cluster%3)*3)+(lobe-1)*2.3,-7+(lobe===1?1:0),22-cluster*36+(lobe===1?-.6:0));dummy.rotation.set(0,0,0);dummy.scale.set(lobe===1?3:2.4,lobe===1?2:1.3,2.8);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix)}clouds.instanceMatrix.needsUpdate=true;scene.add(clouds);
 // Flat checkpoint markers, never hidden forces or collision steps.
 const cp=new T.InstancedMesh(new T.BoxGeometry(21.2,.024,.4),material('#ffffff'),CHECKPOINTS.length);
 dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
 CHECKPOINTS.forEach((z,i)=>{dummy.position.set(0,.096,z);dummy.updateMatrix();cp.setMatrixAt(i,dummy.matrix)});course.add(cp);
 return {version:'toy-level-1',textures:0,decks:DECKS,bridges:BRIDGES,colors:TOY_LANES,finishZ:FINISH_Z,length:15-FINISH_Z,checkpoints:CHECKPOINTS,referenceSeconds:58.9};
}

// Soft jump rails are separated by lane: one open lane per row, changing each
// time, so a player can jump or weave rather than hit an unavoidable wall.
export function createHurdles(course){
 const bar=new T.CylinderGeometry(.27,.27,2.7,16).toNonIndexed();bar.rotateZ(Math.PI/2);
 const cap=new RoundedBoxGeometry(.65,.82,.7,2,.2),left=cap.clone().translate(-1.45,0,0),right=cap.clone().translate(1.45,0,0);
 const geo=mergeGeometries([bar,left,right]),materials=TOY_LANES.map(color=>new T.MeshStandardMaterial({color,roughness:.55}));
 for(const part of [bar,cap,left,right])part.dispose();
 return HURDLE_ROWS.flatMap((z,row)=>TOY_LANES.flatMap((_,lane)=>{
  if(lane===row%5)return [];
  const mesh=new T.Mesh(geo,materials[lane]);mesh.position.set(LANE_CENTERS[lane],.51,z);mesh.castShadow=true;mesh.receiveShadow=true;course.add(mesh);
  return [{kind:'hurdle',mesh,z,row}];
 }));
}

export function createHitStars(scene){
 const root=new T.Group();scene.add(root);
 const geo=new T.OctahedronGeometry(.10),mat=new T.MeshBasicMaterial({color:'#fff3a4'}),pieces=[];
 for(let i=0;i<8;i++){const mesh=new T.Mesh(geo,mat);root.add(mesh);pieces.push(mesh)}
 let remaining=0;root.visible=false;
 return {burst(position){root.position.copy(position);root.position.y+=.85;remaining=.28;root.visible=true},update(dt,reduced){remaining=Math.max(0,remaining-dt);root.visible=remaining>0;const t=(.28-remaining)/.28;pieces.forEach((p,i)=>{const a=i*Math.PI/4,r=reduced?.35:.25+t*.65;p.position.set(Math.cos(a)*r,Math.sin(a)*r,0);p.scale.setScalar(1-t*.6);p.rotation.z=a+t});},face(camera){root.quaternion.copy(camera.quaternion)}};
}
