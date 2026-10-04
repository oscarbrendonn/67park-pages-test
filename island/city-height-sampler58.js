import * as THREE from 'three';

// Immutable, source-derived upward triangles. Float64 interpolation preserves
// small bevel/roof edges without inventing a separate box-shaped walk floor.
export function createCityHeightSampler58(meshes,{cellSize=3,minHeight=-Infinity,precision='float64',cacheSize=0}={}){
 if(!Array.isArray(meshes)||!meshes.length||!(cellSize>0))throw Error('City height58: inputs');
 const values=[],owners=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(let owner=0;owner<meshes.length;owner++){
  const mesh=meshes[owner];if(!mesh?.isMesh||!mesh.geometry?.attributes.position)throw Error('City height58: mesh');
  mesh.updateWorldMatrix(true,false);
  const pos=mesh.geometry.attributes.position,ix=mesh.geometry.index,count=ix?.count??pos.count;
  for(let k=0;k<count;k+=3){
   a.fromBufferAttribute(pos,ix?ix.getX(k):k).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(pos,ix?ix.getX(k+1):k+1).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(pos,ix?ix.getX(k+2):k+2).applyMatrix4(mesh.matrixWorld);
   if(Math.max(a.y,b.y,c.y)<minHeight)continue;
   const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
   if(![...a.toArray(),...b.toArray(),...c.toArray(),det].every(Number.isFinite))throw Error('City height58: finite geometry');
   if(det>=-1e-10)continue;
   owners.push(owner);values.push(a.x,a.z,a.y,bx,bz,cx,cz,b.y-a.y,c.y-a.y,1/det);
   bounds[0]=Math.min(bounds[0],a.x,b.x,c.x);bounds[1]=Math.min(bounds[1],a.z,b.z,c.z);
   bounds[2]=Math.max(bounds[2],a.x,b.x,c.x);bounds[3]=Math.max(bounds[3],a.z,b.z,c.z);
  }
 }
 if(!owners.length)throw Error('City height58: no upward faces');
 const data=precision==='float32'?new Float32Array(values):new Float64Array(values),ids=new Uint16Array(owners),cols=Math.max(1,Math.ceil((bounds[2]-bounds[0])/cellSize)),rows=Math.max(1,Math.ceil((bounds[3]-bounds[1])/cellSize));
 if(cols*rows>1000000||meshes.length>65535)throw Error('City height58: unreasonable scene bounds');
 // Exact-key, bounded numeric cache for repeated stationary vehicle probes.
 // The hash selects a slot only; all coordinates and the ceiling must match.
 const cacheCount=Math.max(0,Math.min(4096,Math.floor(cacheSize))),cache=new Float64Array(cacheCount*5),valid=new Uint8Array(cacheCount);
 const cells=Array.from({length:cols*rows},()=>[]),gx=x=>Math.max(0,Math.min(cols-1,Math.floor((x-bounds[0])/cellSize))),gz=z=>Math.max(0,Math.min(rows-1,Math.floor((z-bounds[1])/cellSize)));
 for(let k=0;k<data.length;k+=10){
  const xs=[data[k],data[k]+data[k+3],data[k]+data[k+5]],zs=[data[k+1],data[k+1]+data[k+4],data[k+1]+data[k+6]];
  for(let z=gz(Math.min(...zs));z<=gz(Math.max(...zs));z++)for(let x=gx(Math.min(...xs));x<=gx(Math.max(...xs));x++)cells[z*cols+x].push(k);
 }
 const bins=cells.map(v=>Uint32Array.from(v));let lastX=NaN,lastZ=NaN,lastCeiling=NaN,last=null,lastHeight=null,lastOwner=-1;
 const stats={version:58,triangles:ids.length,meshCount:meshes.length,cellSize,cells:bins.length,bytes:data.byteLength+ids.byteLength+bins.reduce((n,b)=>n+b.byteLength,0)+cache.byteLength+valid.byteLength,bounds};
 // Numeric vehicle probes need no hit objects. Materialize the object/point
 // only for callers of sample(), retaining the exact triangles and arithmetic.
 function height(x,z,ceiling=Infinity){
  if(x===lastX&&z===lastZ&&ceiling===lastCeiling)return lastHeight;lastX=x;lastZ=z;lastCeiling=ceiling;last=null;lastHeight=null;lastOwner=-1;
  if(!Number.isFinite(x+z)||x<bounds[0]-1e-8||x>bounds[2]+1e-8||z<bounds[1]-1e-8||z>bounds[3]+1e-8)return null;
  const slot=cacheCount?((Math.floor(x*7919)^Math.floor(z*104729)^Math.floor(ceiling*13))>>>0)%cacheCount:0,offset=slot*5;
  if(cacheCount&&valid[slot]&&cache[offset]===x&&cache[offset+1]===z&&cache[offset+2]===ceiling){lastOwner=cache[offset+4];lastHeight=lastOwner<0?null:cache[offset+3];return lastHeight;}
  let y=-Infinity;
  for(const k of bins[gz(z)*cols+gx(x)]){
   const dx=x-data[k],dz=z-data[k+1],u=(dx*data[k+6]-dz*data[k+5])*data[k+9],v=(data[k+3]*dz-data[k+4]*dx)*data[k+9];
   if(u< -1e-8||v< -1e-8||u+v>1.00000001)continue;
   const height=data[k+2]+u*data[k+7]+v*data[k+8];
   if(height<=ceiling+1e-6&&height>y){y=height;lastHeight=y;lastOwner=ids[k/10];}
  }
  if(cacheCount){valid[slot]=1;cache[offset]=x;cache[offset+1]=z;cache[offset+2]=ceiling;cache[offset+3]=lastHeight??0;cache[offset+4]=lastOwner;}
  return lastHeight;
 }
 function sample(x,z,ceiling=Infinity){
  const y=height(x,z,ceiling);if(y===null)return null;
  return last??(last={object:meshes[lastOwner],point:{x,y,z}});
 }
 return {sample,height,stats};
}
