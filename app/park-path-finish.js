import * as T from 'three';

const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let b=0;b<8;b++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(a){let c=0xffffffff;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))c=table[(c^b)&255]^(c>>>8);return((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}
const targets=['8_PARK_PATIKA_UST','3_CIMEN','7_KALDIRIM_TABANI','7_KALDIRIM_TABANI_ENTRY67_0','7_KALDIRIM_TABANI_ENTRY67_1'];
const precision=new WeakMap();

// Final park-only repair, after the legacy repairs AND the approved pond join.
// Validate every source first. A stale patch may not half-mutate the world.
export function applyParkPathFinish(root,patch){
 if(root.userData.parkPathFinish1)return root.userData.parkPathFinish1;
 if(patch?.version!==1||!patch.metrics||patch.metrics.coverageGap>1e-7||patch.metrics.overlap>1e-7||patch.metrics.outsideChange>1e-7||patch.meshes?.length!==targets.length||new Set(patch.meshes.map(r=>r.name)).size!==targets.length)throw Error('Invalid park path finish');
 root.updateMatrixWorld(true);
 const prepared=[];
 for(const row of patch.meshes){
  if(!targets.includes(row.name))throw Error('Unexpected park repair target');
  const mesh=root.getObjectByName(row.name),g=mesh?.geometry,e=row.expected;
  if(!g?.index||g.attributes.position.count!==e.vertices||g.index.count!==e.indices||crc(g.attributes.position.array)!==e.positionCRC)throw Error('Park path finish source changed: '+row.name);
  if(row.p.length!==row.n.length||row.p.length%3||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=row.p.length/3))throw Error('Invalid park path vertices');
  const removed=new Set(row.remove);
  if(removed.size!==row.remove.length||row.remove.some(i=>!Number.isInteger(i)||i%3||i<0||i>=g.index.count))throw Error('Invalid park path faces');
  prepared.push({mesh,g,row,removed});
 }
 for(const item of prepared){
  const {mesh,g,row,removed}=item,added=new T.BufferGeometry();added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
  const next=g.clone();
  for(const key of ['position','normal']){const a=g.attributes[key].array,b=added.attributes[key].array,values=new Float32Array(a.length+b.length);values.set(a);values.set(b,a.length);next.setAttribute(key,new T.BufferAttribute(values,3));}
  const ix=[];for(let i=0;i<g.index.count;i+=3)if(!removed.has(i))ix.push(g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2));
  for(const i of row.ix)ix.push(g.attributes.position.count+i);
  next.setIndex(ix);next.clearGroups();next.setDrawRange(0,ix.length);next.computeBoundingBox();next.computeBoundingSphere();added.dispose();item.next=next;
 }
 for(const {mesh,next} of prepared)mesh.geometry=next;
 precision.set(root,buildPrecision(prepared,patch));
 return root.userData.parkPathFinish1={version:1,scope:patch.metrics.scope,joins:patch.sites.length,originalMaterials:true};
}

// Existing broad sampler packs coefficients as Float32. On very thin shared
// triangles that can select the buried underside. Use double precision only
// inside this repair's windows, with the ACTUAL final triangles and no proxy.
function buildPrecision(prepared,patch){
 const windows=patch.sites.map(s=>{const xs=s.curve.map(p=>p[0]),zs=s.curve.map(p=>p[1]);return[Math.min(s.bounds[0],...xs)-.05,Math.min(s.bounds[1],...zs)-.05,Math.max(s.bounds[2],...xs)+.05,Math.max(s.bounds[3],...zs)+.05]});
 windows.push([114.48,56.7,116.38,58.18],[114.48,63.03,116.38,64.52]);
 const bins=new Map(),triangles=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cell=4,key=(x,z)=>Math.floor(x/cell)+','+Math.floor(z/cell);
 for(const {mesh,g,row,next}of prepared){const p=next.attributes.position,offset=g.attributes.position.count;
  for(let i=0;i<row.ix.length;i+=3){a.fromBufferAttribute(p,offset+row.ix[i]).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,offset+row.ix[i+1]).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(p,offset+row.ix[i+2]).applyMatrix4(mesh.matrixWorld);
   const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;if(det>=-1e-12||Math.min(a.y,b.y,c.y)<9.3)continue;
   const bounds=[Math.min(a.x,b.x,c.x),Math.min(a.z,b.z,c.z),Math.max(a.x,b.x,c.x),Math.max(a.z,b.z,c.z)],keys=new Set();
   for(const w of windows){const x0=Math.max(bounds[0],w[0]),z0=Math.max(bounds[1],w[1]),x1=Math.min(bounds[2],w[2]),z1=Math.min(bounds[3],w[3]);if(x0>x1||z0>z1)continue;for(let x=Math.floor(x0/cell);x<=Math.floor(x1/cell);x++)for(let z=Math.floor(z0/cell);z<=Math.floor(z1/cell);z++)keys.add(x+','+z)}
   if(!keys.size)continue;const index=triangles.length;triangles.push({mesh,v:new Float64Array([a.x,a.z,a.y,bx,bz,cx,cz,b.y-a.y,c.y-a.y,1/det])});for(const k of keys){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(index)}
  }
 }
 return {windows,triangles,bins,key};
}
export function wrapParkPathFinishSampler(base,root){
 const p=precision.get(root);if(!p)return base;let lastX=NaN,lastZ=NaN,last=null;
 return{stats:{...base.stats,parkPathFinishPrecision:{triangles:p.triangles.length,cells:p.bins.size}},sample(x,z){
  if(x===lastX&&z===lastZ)return last;lastX=x;lastZ=z;last=base.sample(x,z);
  if(!p.windows.some(w=>x>=w[0]&&x<=w[2]&&z>=w[1]&&z<=w[3]))return last;
  let y=last?.point.y??-Infinity;
  for(const i of p.bins.get(p.key(x,z))||[]){const{v,mesh}=p.triangles[i],dx=x-v[0],dz=z-v[1],u=(dx*v[6]-dz*v[5])*v[9],q=(v[3]*dz-v[4]*dx)*v[9];if(u< -1e-8||q< -1e-8||u+q>1.00000001)continue;const height=v[2]+u*v[7]+q*v[8];if(height>y){y=height;last={object:mesh,point:{x,y,z}}}}
  return last;
 }};
}
