import * as T from 'three';
import {coast20Data as data} from './kimi-coast20-data.js?v=coast-24';

// Only missing southern shoreline strips of the right island. Reuse the pavement mesh
// and material so visual geometry and the final floor sampler stay identical.
export function applyKimiCoast20(root){
 if(root.userData.kimiCoast20)return root.userData.kimiCoast20;
 const mesh=root.getObjectByName(data.name),old=mesh?.geometry;
 if(!old?.index||old.attributes.position.count!==data.expected.vertices||old.index.count!==data.expected.indices)return root.userData.kimiCoast20={skipped:'coast source changed'};
 if(data.version!==20||data.p.length!==data.n.length||!data.p.every(Number.isFinite)||!data.n.every(Number.isFinite)||Object.values(data.metrics).some(v=>v>1e-7))return {skipped:'invalid coast data'};
 const buried=new Set(data.removeFaces.map(f=>f.join(','))),retained=[];let removed=0;
 for(let k=0;k<old.index.count;k+=3){const ids=[old.index.getX(k),old.index.getX(k+1),old.index.getX(k+2)];if(buried.has(ids.join(',')))removed++;else retained.push(...ids);}
 if(removed!==buried.size||Array.isArray(mesh.material))return {skipped:'buried cap source changed'};
 root.updateMatrixWorld(true);
 const added=new T.BufferGeometry();
 added.setAttribute('position',new T.Float32BufferAttribute(data.p,3));
 added.setAttribute('normal',new T.Float32BufferAttribute(data.n,3));
 added.applyMatrix4(mesh.matrixWorld.clone().invert());
 const next=old.clone(),count=data.p.length/3,offset=old.attributes.position.count;
 for(const [name,a]of Object.entries(old.attributes)){
  const values=new a.array.constructor(a.array.length+count*a.itemSize);values.set(a.array);
  if(added.attributes[name])values.set(added.attributes[name].array,a.array.length);
  else for(let i=0;i<count;i++)for(let k=0;k<a.itemSize;k++)values[a.array.length+i*a.itemSize+k]=name==='uv'?(k===0?data.p[i*3]:-data.p[i*3+2]):a.array[k];
  next.setAttribute(name,new T.BufferAttribute(values,a.itemSize,a.normalized));
 }
 const ix=new Uint32Array(retained.length+data.ix.length);ix.set(retained);
 for(let i=0;i<data.ix.length;i++)ix[retained.length+i]=offset+data.ix[i];
 next.setIndex(new T.BufferAttribute(ix,1));
 if(old.groups.length){next.clearGroups();next.addGroup(0,ix.length,0);}
 if(Number.isFinite(old.drawRange.count))next.setDrawRange(0,ix.length);
 next.computeBoundingBox();next.computeBoundingSphere();
 mesh.geometry=next;added.dispose();
 return root.userData.kimiCoast20={version:20,revision:data.revision,area:data.area,triangles:data.ix.length/3,buriedCapFacesRemoved:removed,addedDrawCalls:0,grassUnchanged:true,roadUnchanged:true,referenceWidth:data.referenceWidth,referenceBevel:data.referenceBevel};
}
