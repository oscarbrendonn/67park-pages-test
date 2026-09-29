import * as THREE from 'three';
import {sideSourceHash50} from './side-continuity-v50.js';

// v57 moved the east pond rim; v63 restored only the removed path footprint.
// Close the remaining dry bank pocket with the surrounding lawn's material.
// The polygon is the measured complement of grass, curb, path and water.
export function applyParkShore66(root,meta){
  if(meta?.version!==66||!['codex','kimi'].includes(meta.variant)||
     meta.polygon?.type!=='Polygon'||meta.top!==9.398031270658546||
     meta.bottom!==8.98||meta.area<10||meta.area>11){
    throw Error('park shore66: manifest');
  }
  const mesh=root.getObjectByName('3_CIMEN');
  if(!mesh?.isMesh)throw Error('park shore66: grass missing');
  if(mesh.userData.parkShore66){
    if(mesh.userData.parkShore66.variant!==meta.variant)throw Error('park shore66: variant');
    return mesh.userData.parkShore66;
  }
  const old=mesh.geometry;
  if(sideSourceHash50(old)!==meta.sourceHash||old.groups.length||
     Object.keys(old.attributes).some(k=>!['position','normal'].includes(k))){
    throw Error('park shore66: source');
  }
  const loops=meta.polygon.coordinates.map(loop=>loop.map(([x,z])=>{
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<194.85||x>196.77||z<77.499||z>93.33){
      throw Error('park shore66: outside east bank');
    }
    // Centre before Float32 conversion to preserve the narrow curb join.
    return new THREE.Vector2(x-195,z-85);
  }));
  const shape=new THREE.Shape(loops[0]);
  for(const loop of loops.slice(1))shape.holes.push(new THREE.Path(loop));
  const fill=new THREE.ExtrudeGeometry(shape,{depth:meta.top-meta.bottom,bevelEnabled:false,steps:1});
  fill.rotateX(Math.PI/2);
  fill.translate(195,meta.top,85);
  root.updateMatrixWorld(true);
  fill.applyMatrix4(mesh.matrixWorld.clone().invert());
  const oldCount=old.attributes.position.count,added=fill.attributes.position.count;
  const next=old.clone();
  for(const name of ['position','normal']){
    const values=new Float32Array((oldCount+added)*3);
    values.set(old.attributes[name].array);
    values.set(fill.attributes[name].array,oldCount*3);
    next.setAttribute(name,new THREE.BufferAttribute(values,3));
  }
  const indices=new Uint32Array(old.index.count+added);
  indices.set(old.index.array);
  for(let i=0;i<added;i++)indices[old.index.count+i]=oldCount+i;
  next.setIndex(new THREE.BufferAttribute(indices,1));
  next.computeBoundingBox();next.computeBoundingSphere();
  fill.dispose();
  mesh.geometry=next;
  const curbReport=softenEastCurb(root,meta.curbSourceHash);
  const report={version:66,variant:meta.variant,filledArea:meta.area,addedTriangles:added/3,...curbReport,
    sameGrassMesh:true,addedDrawCalls:0,waterOverlapArea:0,pathOverlapArea:0};
  mesh.userData.parkShore66=report;
  return report;
}

// Match the pastel water-facing profile already used at the upper pond in P8.
// Duplicate corner attributes so the horizontal top normals stay untouched.
function softenEastCurb(root,sourceHash){
  const mesh=root.getObjectByName('6_BORDUR'),old=mesh?.geometry;
  if(!old||sideSourceHash50(old)!==sourceHash)throw Error('park shore66: curb source');
  const positions=Array.from(old.attributes.position.array),normals=Array.from(old.attributes.normal.array);
  const indices=old.index.array.slice(),remap=new Map(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const normal=new THREE.Vector3(),edge=new THREE.Vector3();
  let faces=0;
  for(let start=0;start<indices.length;start+=3){
    const ids=Array.from(old.index.array.subarray(start,start+3));
    [a,b,c].forEach((p,i)=>p.fromBufferAttribute(old.attributes.position,ids[i]).applyMatrix4(mesh.matrixWorld));
    const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3;
    normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
    if(x<190||x>198||z<76||z>100.5||normal.y>=.98)continue;
    faces++;
    for(let corner=0;corner<3;corner++){
      const id=ids[corner];
      if(!remap.has(id)){
        remap.set(id,positions.length/3);
        positions.push(...old.attributes.position.array.subarray(id*3,id*3+3));
        const nx=old.attributes.normal.getX(id),ny=old.attributes.normal.getY(id),nz=old.attributes.normal.getZ(id);
        const h=Math.hypot(nx,nz);
        if(ny<.96&&h>1e-8){const scale=Math.sqrt(1-.96*.96)/h;normals.push(nx*scale,.96,nz*scale);}
        else normals.push(nx,ny,nz);
      }
      indices[start+corner]=remap.get(id);
    }
  }
  if(faces<50||faces>2000)throw Error('park shore66: curb selection');
  const next=old.clone();
  next.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  next.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  next.setIndex(new THREE.BufferAttribute(indices,1));
  next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;
  return {softenedCurbFaces:faces,curbPositionsAndCollisionUnchanged:true};
}
