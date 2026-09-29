import * as THREE from 'three';

export const SIDE_CONTINUITY_TARGETS50=['5_YOL','3_CIMEN','3_CIMEN_KOYU','5_PARSEL_ZEMIN','8_PARK_PATIKA_UST','4_KIYI_TOPRAK_TABANI','3_MERKEZ_CIMEN','5_SAHIL_GRI_ZEMIN','5_DOGU_SAHIL_MEYDAN_ZEMIN','3_DOGU_SAHIL_KAVSAK_CIMEN','3_DOGU_SAHIL_HALKASI','8_DOGU_SAHIL_MERKEZ_DISK','8_DOGU_SAHIL_BANKLAR','8_DOGU_SAHIL_GIRIS','8_DOGU_SAHIL_ISKELE_UST','5_KB_SPOR_ZEMIN','7_KB_SPOR_CIM_TASIYICI','3_KB_SPOR_CIMEN','8_KB_ATLETIZM_ZEMIN','8_KB_BEYZBOL_KIL_ZEMIN','4_DOGU_SAHIL_UST_TOPRAK','3_DOGU_SAHIL_UST_CIMEN','67D_SKATEPARK_BASE','67D_SKATEPARK_INNER_OUTER_SURFACE','67D_SKATEPARK_LOWER_C_SURFACE','67D_SKATEPARK_QUARTER_C_SURFACE','67D_SKATEPARK_LOWER_RETURN_SURFACE'];

export function sideSourceHash50(g){
  let h=2166136261;
  for(const array of [g.attributes.position.array,g.attributes.normal.array,g.index?.array??new Uint32Array(0)]){
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    for(let i=0;i<bytes.length;i++){h^=bytes[i];h=Math.imul(h,16777619);}
  }
  return (h>>>0).toString(16).padStart(8,'0');
}

// No position payload exists: new vertices can only copy an original vertex.
// Every remapped triangle corner is proven to retain its original source id.
export function applySideContinuity50(root,meta,buffer){
  if(meta?.version!==50||!(buffer instanceof ArrayBuffer)||meta.byteLength!==buffer.byteLength)throw Error('side50: invalid manifest/buffer');
  if(!Array.isArray(meta.meshes)||meta.meshes.length!==SIDE_CONTINUITY_TARGETS50.length)throw Error('side50: target count');
  const names=new Set(meta.meshes.map(m=>m.name));
  if(names.size!==meta.meshes.length||SIDE_CONTINUITY_TARGETS50.some(n=>!names.has(n)))throw Error('side50: target scope');
  const read=(d,Type)=>{
    if(!d||!Number.isSafeInteger(d.byteOffset)||!Number.isSafeInteger(d.count)||d.byteOffset<0||d.count<0||d.byteOffset%4||d.byteOffset+d.count*4>buffer.byteLength)throw Error('side50: binary range');
    return new Type(buffer,d.byteOffset,d.count);
  };
  const prepared=[];
  for(const item of meta.meshes){
    const matches=[];root.traverse(m=>{if(m.isMesh&&m.name===item.name)matches.push(m);});
    if(matches.length!==1)throw Error('side50: missing/duplicate '+item.name);
    const mesh=matches[0],old=mesh.geometry;
    if(mesh.userData.sideContinuity50){
      if(mesh.userData.sideContinuity50.patchId!==meta.patchId)throw Error('side50: different patch already applied');
      continue;
    }
    const p=old.attributes.position,n=old.attributes.normal,index=old.index,sourceCount=index?.count??p.count;
    if(p.count!==item.sourceVertices||sourceCount!==item.sourceIndexCount||sideSourceHash50(old)!==item.sourceHash)throw Error('side50: source mismatch '+item.name);
    const duplicates=read(item.duplicateSources,Uint32Array),normals=read(item.normals,Float32Array),nextIndex=read(item.index,Uint32Array);
    const count=p.count+duplicates.length;
    if(count!==item.vertices||normals.length!==count*3||nextIndex.length!==sourceCount)throw Error('side50: attribute counts '+item.name);
    for(const id of duplicates)if(id>=p.count)throw Error('side50: duplicate source outside geometry');
    for(let i=0;i<normals.length;i+=3){const length=Math.hypot(normals[i],normals[i+1],normals[i+2]);if(!Number.isFinite(length)||Math.abs(length-1)>.001)throw Error('side50: invalid normal');}
    for(let i=0;i<nextIndex.length;i++){
      const id=nextIndex[i];if(id>=count)throw Error('side50: index outside geometry');
      const source=id<p.count?id:duplicates[id-p.count];
      if(source!==(index?index.getX(i):i))throw Error('side50: indexed position/attribute mutation');
    }
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
    for(let k=0;k<sourceCount;k+=3){
      const ids=[0,1,2].map(j=>index?index.getX(k+j):k+j);
      a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
      const face=ab.subVectors(b,a).cross(ac.subVectors(c,a));
      if(face.lengthSq()<1e-30)continue;face.normalize();
      for(let j=0;j<3;j++){
        const o=3*nextIndex[k+j],id=ids[j],x=normals[o],y=normals[o+1],z=normals[o+2];
        if(x===n.getX(id)&&y===n.getY(id)&&z===n.getZ(id))continue;
        if(face.x*x+face.y*y+face.z*z<=0)throw Error('side50: opposed changed shading normal');
      }
    }
    const next=old.clone();
    for(const [name,attribute]of Object.entries(old.attributes)){
      if(name==='normal')continue;
      if(attribute.isInterleavedBufferAttribute)throw Error('side50: interleaved source unsupported');
      if(!duplicates.length){next.setAttribute(name,attribute);continue;}
      const values=new attribute.array.constructor(count*attribute.itemSize);values.set(attribute.array);
      for(let i=0;i<duplicates.length;i++)for(let j=0;j<attribute.itemSize;j++)values[(p.count+i)*attribute.itemSize+j]=attribute.array[duplicates[i]*attribute.itemSize+j];
      next.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize,attribute.normalized).setUsage(attribute.usage));
    }
    next.setAttribute('normal',new THREE.Float32BufferAttribute(normals.slice(),3));
    const Type=index?.array?.constructor===Uint16Array&&count<=65535?Uint16Array:Uint32Array;
    next.setIndex(new THREE.BufferAttribute(new Type(nextIndex),1));
    next.computeBoundingBox();next.computeBoundingSphere();prepared.push({mesh,old,next,item});
  }
  // Mutate only after every target and triangle corner has been validated.
  for(const {mesh,next,item}of prepared){mesh.geometry=next;mesh.userData.sideContinuity50={version:50,patchId:meta.patchId,changedCorners:item.changedCorners,addedVertices:item.vertices-item.sourceVertices};}
  return {version:50,patchId:meta.patchId,meshes:prepared.length,addedTriangles:0,addedVertices:prepared.reduce((n,p)=>n+p.item.vertices-p.item.sourceVertices,0)};
}
