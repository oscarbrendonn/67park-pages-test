import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

const IDS=['west-slot','east-slot','west-tip','east-tip'];
const SOURCES=['5_YOL','6_BORDUR','7_KALDIRIM_TABANI','8_PARK_PATIKA_UST','3_CIMEN'];
const OWNER={ 'west-slot':'7_KALDIRIM_TABANI','east-slot':'7_KALDIRIM_TABANI','west-tip':'6_BORDUR','east-tip':'6_BORDUR' };

// Four closed infills in existing orphan sidewalk recesses. Existing geometry,
// materials, street/stem levels and the map's caster policy stay untouched.
// Caller adds returned addedWalkMeshes to its walk list before both samplers.
export function applyParkEntryCaps57(root,meta,variant){
 const pathId=root.getObjectByName('8_PARK_PATIKA_UST')?.userData.parkPathPolish57;
 if(!variant)variant=pathId?.includes('-codex-')?'codex':pathId?.includes('-kimi-')?'kimi':null;
 if(meta?.version!==57||meta.revision!=='entry-caps-r1'||!meta.patchId||!meta.variants?.[variant]||!pathId||!meta.caps||meta.caps.length!==4||IDS.some(id=>meta.caps.filter(c=>c.id===id).length!==1))throw Error('entry caps57: manifest/order');
 const existing=root.userData.parkEntryCaps57;
 if(existing){if(existing.patchId!==meta.patchId||existing.variant!==variant)throw Error('entry caps57: another patch');return {...existing,addedWalkMeshes:[],addedMeshes:0};}
 root.updateMatrixWorld(true);const guard=meta.variants[variant];
 if(!guard.rootMatrix||guard.rootMatrix.length!==16||guard.rootMatrix.some((v,i)=>!Number.isFinite(v)||Math.abs(v-root.matrixWorld.elements[i])>1e-8)||guard.sources?.length!==5||SOURCES.some(name=>guard.sources.filter(s=>s.name===name).length!==1))throw Error('entry caps57: final root transform/source scope');
 for(const item of guard.sources){const m=root.getObjectByName(item.name);if(!m?.isMesh||m.geometry.attributes.position.count!==item.vertices||m.geometry.index?.count!==item.indices||sideSourceHash50(m.geometry)!==item.hash||item.matrixWorld.some((v,i)=>Math.abs(v-m.matrixWorld.elements[i])>1e-8))throw Error('entry caps57: source '+item.name);}
 const inverse=root.matrixWorld.clone().invert(),prepared=[];
 for(const cap of meta.caps){
  if(cap.owner!==OWNER[cap.id]||typeof cap.name!=='string'||!cap.name.startsWith(cap.owner+'_PARK_ENTRY57_')||root.getObjectByName(cap.name)||cap.top!==9.380085642765637||Math.abs(cap.bottom-8.992253974540243)>1e-12||!Array.isArray(cap.center)||cap.center.length!==2||!Array.isArray(cap.points)||cap.points.length<3||cap.points.length>256)throw Error('entry caps57: bounded cap');
  const contour=cap.points.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))throw Error('entry caps57: point');const x=p[0]+cap.center[0],z=p[1]+cap.center[1];if(x<167.18||x>177||z<113.49||z>116.36||(x>168.60&&x<175.59))throw Error('entry caps57: scope');return new THREE.Vector2(p[0],p[1]);});
  const owner=root.getObjectByName(cap.owner);if(!owner?.isMesh||Array.isArray(owner.material))throw Error('entry caps57: owner material');
  const p=[],n=[],ix=[],count=contour.length,depth=cap.bottom-cap.top;
  for(const q of contour){p.push(q.x,0,q.y);n.push(0,1,0);}for(const q of contour){p.push(q.x,depth,q.y);n.push(0,-1,0);}
  for(let t of THREE.ShapeUtils.triangulateShape(contour,[])){const [a,b,c]=t.map(i=>contour[i]);if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0)t=[t[0],t[2],t[1]];ix.push(...t,t[0]+count,t[2]+count,t[1]+count);}
  let area=0;for(let i=0;i<count;i++){const a=contour[i],b=contour[(i+1)%count];area+=a.x*b.y-b.x*a.y;}
  for(let i=0;i<count;i++){const a=contour[i],b=contour[(i+1)%count],dx=b.x-a.x,dz=b.y-a.y,length=Math.hypot(dx,dz);if(length<1e-8)throw Error('entry caps57: repeated boundary');const sign=area>0?1:-1,normal=[sign*dz/length,0,-sign*dx/length],start=p.length/3;for(const q of [[a.x,0,a.y],[b.x,0,b.y],[a.x,depth,a.y],[b.x,depth,b.y]]){p.push(...q);n.push(...normal);}if(area>0)ix.push(start,start+1,start+2,start+1,start+3,start+2);else ix.push(start,start+2,start+1,start+1,start+2,start+3);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geo.setIndex(ix);geo.computeBoundingBox();geo.computeBoundingSphere();
  // Share without mutation: the later map-specific profile and sidewalk-mask
  // bake update the existing owner material, including custom shader hooks.
  const material=owner.material;
  const mesh=new THREE.Mesh(geo,material);mesh.name=cap.name;mesh.matrixAutoUpdate=false;mesh.matrix.copy(inverse).multiply(new THREE.Matrix4().makeTranslation(cap.center[0],cap.top,cap.center[1]));mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.safeShadowCaster=false;mesh.userData.parkEntryCap57={id:cap.id,patchId:meta.patchId,owner:cap.owner,center:cap.center.slice(),points:contour.map(q=>[q.x,q.y]),top:cap.top,area:Math.abs(area)/2};prepared.push(mesh);
 }
 // All guards and four closed geometries are prepared before any root change.
 for(const mesh of prepared)root.add(mesh);root.updateMatrixWorld(true);
 const report={version:57,patchId:meta.patchId,variant,addedMeshes:prepared.length,addedTriangles:prepared.reduce((n,m)=>n+m.geometry.index.count/3,0),addedShadowCasters:0,area:prepared.reduce((n,m)=>n+m.userData.parkEntryCap57.area,0),top:9.380085642765637,existingGeometryUnchanged:true,names:prepared.map(m=>m.name)};
 root.userData.parkEntryCaps57=report;return {...report,addedWalkMeshes:prepared};
}

export function wrapParkEntryCapsSampler57(baseSampler,root){
 const meshes=[];root.traverse(m=>{if(m.isMesh&&m.userData.parkEntryCap57)meshes.push(m);});if(!meshes.length)return baseSampler;
 const caps=meshes.map(mesh=>{const s=mesh.userData.parkEntryCap57,p=s.points.map(q=>[q[0]+s.center[0],q[1]+s.center[1]]);return {mesh,p,top:s.top,b:[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))]};});let lastX=NaN,lastZ=NaN,last=null;
 return {stats:{...baseSampler.stats,parkEntryCaps57:{meshes:caps.length,precisePlanarCaps:true}},sample(x,z){if(x===lastX&&z===lastZ)return last;lastX=x;lastZ=z;last=baseSampler.sample(x,z);let y=last?.point.y??-Infinity;
  for(const c of caps){if(c.top<=y||x<c.b[0]-1e-8||x>c.b[2]+1e-8||z<c.b[1]-1e-8||z>c.b[3]+1e-8)continue;let inside=false,boundary=false;for(let i=0,j=c.p.length-1;i<c.p.length;j=i++){const a=c.p[j],b=c.p[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<1e-8)boundary=true;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside||boundary){y=c.top;last={object:c.mesh,point:{x,y:c.top,z}};}}
  return last;
 }};
}
