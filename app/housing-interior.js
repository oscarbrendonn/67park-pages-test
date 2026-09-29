import * as T from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';
import {HOUSES,inRoom,roomObstacle} from './housing-layout.js?v=home-social-3';

// A small, reusable dollhouse interior. No GLB, texture downloads, shadow maps,
// timers or physics world per house. Only the currently visited room is drawn.
export function createHousingInterior(world,{markers=true}={}){
 const root=new T.Group();root.name='67PARK_HOME_INTERIOR';root.visible=false;
 const geometry=new RoundedBoxGeometry(1,1,1,2,.065),materials=[],batches=new Map();
 // Wall-mounted pieces have their own batches, so the cutaway never leaves a
 // door/window floating in front of the room. Names also allow geometry QA.
 const wallDecor=[];
 const add=(color,x,y,z,sx,sy,sz,name='',wall=0)=>{const key=color+'@'+wall;if(!batches.has(key))batches.set(key,[]);batches.get(key).push([x,y,z,sx,sy,sz,name]);};
 add('#f2e9dc',0,-.17,0,14.2,.34,12.2);
 // One continuous finish under the rugs and right up to the wall trim. The old
 // inset ended beneath the living rug and made its edge look broken/sunken.
 add('#dfcdb9',0,.009,0,13.72,.018,11.72,'floor-finish');
 // Soft plaster walls with real boundaries; near walls fade out of the way
 // by side visibility, like an open dollhouse, not transparent double surfaces.
 const walls=[];
 const wallMat=new T.MeshStandardMaterial({color:'#f5eadf',roughness:.9,emissive:'#f5eadf',emissiveIntensity:.12});materials.push(wallMat);
 const ceilingGeometry=new T.PlaneGeometry(14,12),ceiling=new T.Mesh(ceilingGeometry,wallMat);
 ceiling.rotation.x=Math.PI/2;ceiling.position.y=3.96;root.add(ceiling);
 // Reuse the park lighting. Toggling an additional light with the room changes
 // shader variants for every visible material and can stall a mobile GPU.
 // A small material fill keeps the room readable without another scene light.
 for(const [x,z,sx,sz]of [[0,-6,14,.18],[0,6,14,.18],[-7,0,.18,12],[7,0,.18,12]]){
  const mesh=new T.Mesh(geometry,wallMat);mesh.position.set(x,2,z);mesh.scale.set(sx,4,sz);root.add(mesh);walls.push({mesh,x,z});
 }
 add('#fff5e7',0,.13,-5.84,13.8,.24,.1);
 add('#fff5e7',-6.84,.13,0,.1,.24,11.8);add('#fff5e7',6.84,.13,0,.1,.24,11.8);
 // Clear mint seats: no decorative cushions intersecting a seated avatar.
 add('#a6c6b8',-4.5,.48,-2.3,3.4,.58,1.3,'sofa-seat');add('#a6c6b8',-4.5,.99,-2.82,3.4,.72,.28,'sofa-back');
 for(const x of [-6,-3])add('#a6c6b8',x,.81,-2.3,.32,.62,1.3);
 add('#f7efdf',-4.5,.63,-.25,2.1,.16,1.3);add('#c8ad8e',-4.5,.3,-.25,1.5,.56,.8);
 add('#bed4cb',-4.5,.03,-.2,4.3,.024,4.2,'living-rug');
 add('#d0bddc',-4.85,.76,-.3,.52,.1,.35);add('#f0d996',-4.2,.76,-.18,.3,.16,.3);
 // Bed and side cabinet. Nothing obstructs the path between door and sofa.
 add('#c1ae97',4.55,.25,-3.55,3.2,.42,3.4,'bed-frame');add('#faf5e9',4.55,.56,-3.55,3.15,.3,3.35,'bed-mattress');
 add('#bfcce1',4.55,.75,-3.15,3.15,.16,2.4,'bed-cover');add('#e6ccba',4.55,1,-5.1,3.3,1.25,.2,'bed-headboard');
 for(const x of [3.8,5.3])add('#fff8ed',x,.83,-4.7,1,.2,.65,x<4.55?'bed-pillow-left':'bed-pillow-right');
 add('#dcc8af',2.5,.4,-4.6,.7,.8,.8);add('#f2da9e',2.5,1.15,-4.6,.55,.48,.55);
 // Kitchen, a sage splashback, sink and a window into a pastel sky.
 add('#e5d0b8',3.9,.56,4.75,4.4,1.1,1.2);add('#fff7e9',3.9,1.17,4.75,4.6,.15,1.3,'kitchen-counter');
 add('#aebfb8',4.9,1.26,4.7,1.1,.06,.8);add('#bfd7dd',4.9,1.295,4.7,.9,.015,.62);
 add('#d1b9a4',2.55,1.32,4.72,.4,.2,.45);
 add('#fff8e9',0,2.45,-5.79,2.5,1.95,.13,'window-frame',-6);add('#b8d6dd',0,2.45,-5.69,2.2,1.66,.06,'window-glass',-6);
 add('#f6efdf',0,2.45,-5.64,.06,1.66,.045,'window-mullion',-6);add('#f6efdf',0,2.45,-5.64,2.2,.06,.045,'window-bar',-6);
 add('#e2c0c3',-1.45,2.5,-5.65,.35,2.12,.15,'curtain-left',-6);add('#e2c0c3',1.45,2.5,-5.65,.35,2.12,.15,'curtain-right',-6);
 // A real three-piece frame instead of two large overlapping rounded slabs.
 // The thin mat is centred on the doorway, fully on the finished floor, with
 // 35 cm of clear floor before the threshold and 78 cm before the counter.
 for(const x of [-.88,.88])add('#fff4df',x,1.35,5.8,.16,2.66,.18,x<0?'door-jamb-left':'door-jamb-right',6);
 add('#fff4df',0,2.76,5.8,1.92,.16,.18,'door-lintel',6);
 add('#acc7b7',0,1.36,5.8,1.54,2.6,.1,'door-leaf',6);
 add('#edcf86',-.52,1.24,5.7,.095,.12,.1,'door-handle',6);
 add('#fff5e7',0,.026,5.62,1.58,.016,.24,'door-threshold');
 add('#e6c7a8',0,.03,4.73,1.64,.024,.84,'entry-mat');
 add('#ead2c0',-5.75,.25,4.65,.65,.5,.65);add('#aac28f',-5.75,.87,4.65,.95,1,.95);
 const mat4=new T.Matrix4();
 for(const [key,rows]of batches){
  const [color,side]=key.split('@'),wall=Number(side);
  const material=new T.MeshStandardMaterial({color,roughness:.78,emissive:color,emissiveIntensity:.12});materials.push(material);
  const mesh=new T.InstancedMesh(geometry,material,rows.length);
  rows.forEach(([x,y,z,sx,sy,sz],i)=>{mat4.makeScale(sx,sy,sz);mat4.setPosition(x,y,z);mesh.setMatrixAt(i,mat4);});
  mesh.userData.homeParts=rows.map(row=>row[6]);
  mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);
  if(wall)wallDecor.push({mesh,wall});
 }
 world.scene.add(root);
 let current=null,installed=false,disposed=false;
 const restores=[],installs=[];
 // Preparation can time out while shader compilation continues. Do not install
 // world hooks until the prepared room is actually used; a late discarded room
 // must not remain underneath the retry's collision/ground function chain.
 function wrap(target,key,fn){installs.push(()=>{const prev=target[key];if(typeof prev!=='function')return;const next=(...args)=>fn(prev,...args);target[key]=next;restores.push(()=>{if(target[key]===next)target[key]=prev;});});}
 const inside=(x,z)=>current&&inRoom(current,x,z,3);
 wrap(world,'ground',(old,x,z,...args)=>inside(x,z)?current.room.y:old(x,z,...args));
 wrap(world,'terrainGround',(old,x,z,...args)=>inside(x,z)?current.room.y:old(x,z,...args));
 wrap(world,'water',(old,x,z)=>inside(x,z)?false:old(x,z));
 wrap(world,'treeBlocked',(old,x,y,z)=>inside(x,z)?roomObstacle(current,x,y,z):old(x,y,z));
 wrap(world,'sample',(old,x,z)=>inside(x,z)?{point:new T.Vector3(x,current.room.y,z),object:{name:'67PARK_HOME_FLOOR'}}:old(x,z));
 wrap(world,'constrainSwimmer',(old,body,...args)=>{const p=body.translation();return inside(p.x,p.z)?false:old(body,...args);});
 if(world.swimBoundary)wrap(world.swimBoundary,'outsideRescue',(old,x,z)=>inside(x,z)?false:old(x,z));
 // Door markers share one mesh/material, eight tiny key-coloured posts.
 const signMaterial=new T.MeshStandardMaterial({color:'#f0da9d',roughness:.75});materials.push(signMaterial);
 const signs=new T.InstancedMesh(geometry,signMaterial,HOUSES.length);signs.name='67PARK_HOME_DOOR_MARKERS';
 HOUSES.forEach((h,i)=>{mat4.makeRotationY(h.yaw);mat4.scale(new T.Vector3(.35,.85,.1));mat4.setPosition(h.door[0]+Math.cos(h.yaw)*1.1,h.door[1],h.door[2]-Math.sin(h.yaw)*1.1);signs.setMatrixAt(i,mat4);});
 signs.instanceMatrix.needsUpdate=true;if(markers)world.scene.add(signs);
 return {
  prepare:()=>world.renderer?.compileAsync?.(root,world.camera,world.scene),
  show(h){if(disposed)return;if(h&&!installed){installed=true;for(const install of installs)install();}current=h||null;root.visible=!!h;signs.visible=!h;if(h)root.position.set(h.room.x,h.room.y,h.room.z);},
  step(){if(!current)return;const c=world.camera.position;for(const w of walls)w.mesh.visible=w.x?Math.sign(w.x)*(c.x-current.room.x)<6.8:Math.sign(w.z)*(c.z-current.room.z)<5.8;for(const d of wallDecor)d.mesh.visible=Math.sign(d.wall)*(c.z-current.room.z)<5.8;},
  dispose(){if(disposed)return;disposed=true;current=null;for(const f of restores.reverse())f();root.removeFromParent();signs.removeFromParent();geometry.dispose();ceilingGeometry.dispose();materials.forEach(m=>m.dispose());},
  stats:()=>({room:current?.id||null,draws:root.children.length,instances:[...batches.values()].reduce((n,a)=>n+a.length,0),newTextureBytes:0}),
 };
}
