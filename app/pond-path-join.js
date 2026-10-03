import * as T from 'three';

const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let b=0;b<8;b++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(a){let c=0xffffffff;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))c=table[(c^b)&255]^(c>>>8);return((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}

// Final, bounded shared contour. Must run AFTER legacy continuity repairs and
// BEFORE the final terrain sampler/shadow refresh. Never replace the whole park.
export function applyPondPathJoin(root,patch){
 if(root.userData.pondPathJoin1)return root.userData.pondPathJoin1;
 if(patch?.version!==1||patch.metrics.coverageGap>1e-7||patch.metrics.overlap>1e-7||patch.metrics.outsideChange>1e-7||patch.meshes.length!==2)throw Error('Invalid pond path join');
 root.updateMatrixWorld(true);
 const prepared=[];
 for(const row of patch.meshes){
  if(!['8_PARK_PATIKA_UST','3_CIMEN'].includes(row.name))throw Error('Unexpected pond repair target');
  const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
  if(!g?.index||g.attributes.position.count!==e.vertices||g.index.count!==e.indices||crc(g.attributes.position.array)!==e.positionCRC)throw Error('Pond path join source changed: '+row.name);
  if(row.p.length!==row.n.length||row.p.length%3||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=row.p.length/3))throw Error('Invalid pond path vertices');
  const removed=new Set(row.remove);
  if(removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid pond path faces');
  const added=new T.BufferGeometry();added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
  const next=g.clone();
  for(const key of ['position','normal']){const a=g.attributes[key].array,b=added.attributes[key].array,values=new Float32Array(a.length+b.length);values.set(a);values.set(b,a.length);next.setAttribute(key,new T.BufferAttribute(values,3));}
  const ix=[];for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))ix.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
  for(const i of row.ix)ix.push(g.attributes.position.count+i);
  next.setIndex(ix);next.clearGroups();next.setDrawRange(0,ix.length);next.computeBoundingBox();next.computeBoundingSphere();added.dispose();prepared.push({mesh,next});
 }
 for(const {mesh,next} of prepared)mesh.geometry=next;
 return root.userData.pondPathJoin1={version:1,scope:patch.metrics.scope,originalMaterials:true};
}
