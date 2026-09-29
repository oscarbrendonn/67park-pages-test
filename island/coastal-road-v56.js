import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

// Replaces v54, directly against the same post-v50 source geometry.
export function applyCoastalRoad56(root,meta,buffer){
 if(meta?.version!==56||buffer.byteLength!==meta.byteLength)throw Error('road56: manifest');
 const names=['6_BORDUR','5_YOL','5_PARSEL_ZEMIN'];
 if(meta.meshes.length!==3||names.some(n=>meta.meshes.filter(m=>m.name===n).length!==1))throw Error('road56: scope');
 const prepared=[];
 for(const item of meta.meshes){
  const mesh=root.getObjectByName(item.name);if(!mesh?.isMesh)throw Error('road56: missing '+item.name);
  if(mesh.userData.coastalRoad56===meta.patchId)continue;
  const old=mesh.geometry;
  if(old.attributes.position.count!==item.sourceVertices||old.index.count!==item.sourceIndexCount||sideSourceHash50(old)!==item.sourceHash)throw Error('road56: source '+item.name);
  const read=(d,C)=>{if(d.byteOffset%4||d.count<0||d.byteOffset<0||d.byteOffset+d.count*4>buffer.byteLength)throw Error('road56: range');return new C(buffer,d.byteOffset,d.count);};
  const p=read(item.positions,Float32Array),n=read(item.normals,Float32Array),ix=read(item.index,Uint32Array);
  if(p.length!==item.vertices*3||n.length!==p.length||ix.length%3)throw Error('road56: shape');
  for(const v of p)if(!Number.isFinite(v))throw Error('road56: position');
  for(let i=0;i<n.length;i+=3)if(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.002)throw Error('road56: normal');
  for(const i of ix)if(i>=item.vertices)throw Error('road56: index');
  const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(p.slice(),3));next.setAttribute('normal',new THREE.Float32BufferAttribute(n.slice(),3));next.setIndex(new THREE.BufferAttribute(ix.slice(),1));next.computeBoundingBox();next.computeBoundingSphere();
  prepared.push({mesh,next});
 }
 for(const {mesh,next}of prepared){mesh.geometry=next;mesh.userData.coastalRoad56=meta.patchId;}
 return {version:56,patchId:meta.patchId,meshes:prepared.length};
}
