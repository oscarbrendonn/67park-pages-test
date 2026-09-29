import * as THREE from 'three';

const TARGETS={
  codex:['5_YOL','8_PARK_PATIKA_UST'],
  kimi:['5_YOL','8_PARK_PATIKA_UST','7_KALDIRIM_TABANI'],
};
const CAP_IDS=['west-slot','east-slot','west-tip','east-tip'];

function hashBuffer(buffer){
  let hash=2166136261;
  for(const value of new Uint8Array(buffer)){
    hash^=value;
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

function geometryHash(geometry){
  let hash=2166136261;
  for(const array of [geometry.attributes.position.array,geometry.attributes.normal.array,geometry.index?.array??new Uint32Array(0)]){
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    for(const value of bytes){hash^=value;hash=Math.imul(hash,16777619);}
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

function onlyMesh(root,name){
  const matches=[];
  root.traverse(object=>{if(object.isMesh&&object.name===name)matches.push(object);});
  if(matches.length!==1)throw Error('road seal64: missing/duplicate '+name);
  return matches[0];
}

function sameMatrix(actual,expected){
  return Array.isArray(expected)&&expected.length===16&&
    expected.every((value,index)=>Number.isFinite(value)&&Math.abs(value-actual.elements[index])<=1e-8);
}

function applyTagGuard(mesh,item){
  const required=item.requires||{};
  for(const [name,value] of Object.entries(required)){
    const actual=name==='parkEntryCap57Patch'?mesh.userData.parkEntryCap57?.patchId:mesh.userData[name];
    if(actual!==value)throw Error('road seal64: source tag '+item.name+' '+name);
  }
}

export function applyRoadSeal64(root,meta,buffer){
  if(meta?.version!==64||meta.revision!=='road-seal-r1'||!TARGETS[meta.variant]||
     !(buffer instanceof ArrayBuffer)||buffer.byteLength!==meta.byteLength||
     hashBuffer(buffer)!==meta.bufferHash){
    throw Error('road seal64: manifest/binary');
  }
  const existing=root.userData.roadSeal64;
  if(existing){
    if(existing.patchId!==meta.patchId||existing.variant!==meta.variant)throw Error('road seal64: another patch');
    return {...existing,addedWalkMeshes:[]};
  }
  if(!sameMatrix(root.matrixWorld,meta.rootMatrix))throw Error('road seal64: root transform');
  if(!Array.isArray(meta.meshes)||meta.meshes.length!==TARGETS[meta.variant].length||
     TARGETS[meta.variant].some(name=>meta.meshes.filter(item=>item.name===name).length!==1)||
     !Array.isArray(meta.caps)||meta.caps.length!==4||
     CAP_IDS.some(id=>meta.caps.filter(item=>item.id===id).length!==1)){
    throw Error('road seal64: target scope');
  }
  if(meta.policy?.roadRouteUnchanged!==true||meta.policy?.pathUnderLowerBridge!==false||
     meta.policy?.entryOverlapMetres!==0.0005||meta.policy?.outsideEditedRegionsByteIdentical!==true){
    throw Error('road seal64: policy');
  }
  const read=(descriptor,Type)=>{
    if(!descriptor||!Number.isSafeInteger(descriptor.byteOffset)||!Number.isSafeInteger(descriptor.count)||
       descriptor.byteOffset<0||descriptor.count<0||descriptor.byteOffset%4||
       descriptor.byteOffset+descriptor.count*4>buffer.byteLength){
      throw Error('road seal64: binary range');
    }
    return new Type(buffer,descriptor.byteOffset,descriptor.count);
  };
  const makeGeometry=item=>{
    const positions=read(item.positions,Float32Array);
    const normals=read(item.normals,Float32Array);
    const index=read(item.index,Uint32Array);
    if(positions.length!==item.vertices*3||normals.length!==positions.length||index.length!==item.indices||
       index.length%3||!positions.every(Number.isFinite)||!index.every(id=>id<item.vertices)){
      throw Error('road seal64: geometry shape '+item.name);
    }
    for(let offset=0;offset<normals.length;offset+=3){
      if(Math.abs(Math.hypot(normals[offset],normals[offset+1],normals[offset+2])-1)>.002){
        throw Error('road seal64: normal '+item.name);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions.slice(),3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals.slice(),3));
    geometry.setIndex(new THREE.BufferAttribute(index.slice(),1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    if(geometryHash(geometry)!==item.outputHash)throw Error('road seal64: output hash '+item.name);
    return geometry;
  };

  root.updateMatrixWorld(true);
  const prepared=[];
  for(const item of meta.meshes){
    const mesh=onlyMesh(root,item.name),old=mesh.geometry;
    if(!sameMatrix(mesh.matrixWorld,item.matrixWorld)||old.attributes.position.count!==item.sourceVertices||
       old.index?.count!==item.sourceIndices||geometryHash(old)!==item.sourceHash){
      throw Error('road seal64: source '+item.name);
    }
    applyTagGuard(mesh,item);
    const next=makeGeometry(item);
    if(item.operation==='snap-road-seam'){
      if(next.index.count!==old.index.count||next.attributes.position.count!==old.attributes.position.count||
         item.changedVertices!==7||item.maxWorldDelta>0.000011){
        throw Error('road seal64: road scope');
      }
    }else if(item.operation==='remove-park-path-sliver'){
      if(item.removedTriangles!==128||next.attributes.position.count!==old.attributes.position.count||
         next.index.count!==old.index.count-item.removedTriangles*3){
        throw Error('road seal64: path scope');
      }
    }else if(item.operation==='split-kimi-sidewalk-shells'){
      if(meta.variant!=='kimi'||item.splitTriangles!==1350||next.attributes.position.count!==old.attributes.position.count||
         next.index.count!==old.index.count-item.splitTriangles*3){
        throw Error('road seal64: sidewalk scope');
      }
    }else throw Error('road seal64: operation '+item.name);
    prepared.push({mesh,old,next,item});
  }

  const capPrepared=[];
  for(const item of meta.caps){
    const mesh=onlyMesh(root,item.name),old=mesh.geometry;
    if(mesh.userData.parkEntryCap57?.id!==item.id||!sameMatrix(mesh.matrixWorld,item.matrixWorld)||
       old.attributes.position.count!==item.sourceVertices||old.index?.count!==item.sourceIndices||
       geometryHash(old)!==item.sourceHash||item.overlap!==0.0005||
       !Array.isArray(item.points)||item.points.length<3){
      throw Error('road seal64: cap source '+item.id);
    }
    applyTagGuard(mesh,item);
    capPrepared.push({mesh,old,next:makeGeometry(item),item});
  }

  let helperPrepared=null;
  if(meta.helper){
    if(meta.variant!=='kimi'||root.getObjectByName(meta.helper.name))throw Error('road seal64: helper scope');
    const source=prepared.find(entry=>entry.mesh.name===meta.helper.sourceName)?.mesh;
    if(!source||meta.helper.triangles!==1350)throw Error('road seal64: helper source');
    helperPrepared={source,next:makeGeometry(meta.helper),item:meta.helper};
  }

  // Commit only after every source, range, transform, tag and output hash passed.
  for(const entry of prepared){
    entry.mesh.geometry=entry.next;
    entry.mesh.userData.roadSeal64={patchId:meta.patchId,operation:entry.item.operation};
  }
  for(const entry of capPrepared){
    entry.mesh.geometry=entry.next;
    entry.mesh.userData.parkEntryCap57={
      ...entry.mesh.userData.parkEntryCap57,
      points:entry.item.points.map(point=>point.slice()),
      area:entry.item.outputArea,
      overlap64:entry.item.overlap,
    };
    entry.mesh.userData.roadSeal64={patchId:meta.patchId,operation:'overlap-entry-cap'};
  }
  const addedWalkMeshes=[];
  if(helperPrepared){
    const {source,next,item}=helperPrepared;
    const helper=new THREE.Mesh(next,source.material);
    helper.name=item.name;
    helper.matrixAutoUpdate=false;
    helper.matrix.copy(source.matrix);
    helper.castShadow=source.castShadow;
    helper.receiveShadow=source.receiveShadow;
    helper.frustumCulled=source.frustumCulled;
    helper.renderOrder=source.renderOrder;
    helper.visible=source.visible;
    helper.layers.mask=source.layers.mask;
    helper.customDepthMaterial=source.customDepthMaterial;
    helper.customDistanceMaterial=source.customDistanceMaterial;
    helper.onBeforeRender=source.onBeforeRender;
    helper.onAfterRender=source.onAfterRender;
    helper.onBeforeShadow=source.onBeforeShadow;
    helper.onAfterShadow=source.onAfterShadow;
    helper.userData.roadSeal64={patchId:meta.patchId,operation:'split-kimi-sidewalk-shells',sourceName:item.sourceName};
    source.parent.add(helper);
    addedWalkMeshes.push(helper);
  }
  root.updateMatrixWorld(true);
  const replaced=[...prepared,...capPrepared].map(entry=>entry.old);
  for(const geometry of new Set(replaced)){
    let shared=false;
    root.traverse(object=>{if(object.isMesh&&object.geometry===geometry)shared=true;});
    if(!shared)geometry.dispose();
  }
  const report={
    version:64,revision:'road-seal-r1',variant:meta.variant,patchId:meta.patchId,
    roadSeamClosed:true,pathSliverTrianglesRemoved:128,entryOverlapMetres:0.0005,
    sidewalkNonmanifoldEdges:0,addedMeshes:addedWalkMeshes.length,addedTriangles:0,
    changedMeshes:prepared.length+capPrepared.length,
  };
  root.userData.roadSeal64=report;
  return {...report,addedWalkMeshes};
}
