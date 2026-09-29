import * as T from 'three';
import {parcelPavingData} from './parcel-paving-data.js';

const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let b=0;b<8;b++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function positionCRC(a){let c=0xffffffff;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))c=crcTable[(c^b)&255]^(c>>>8);return ((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}
const terrainName=name=>name==='6_BORDUR'||/^CENTER_WHITE71_(?:-1|1)_(?:-1|1)$/.test(name);
const countTriangles=g=>(g.index?.count??g.attributes.position.count)/3;
function validateBuriedBevel(row){
 const bevel=row.metrics?.creamBuriedBevel;if(!bevel)return;
 const domains={'5_KB_SPOR_ZEMIN':[-120.512,-178.272,-16.178,-89.461],'PLAZA83_WALKABLE_GROUND':[-3.45,24.806,102.194,115.266]};
 if(row.name!=='6_BORDUR'||row.sourceFloor!=='sports-and-lower-plaza'||!Number.isFinite(bevel.area)||bevel.area<=0||bevel.area>60||!Number.isFinite(bevel.maximumDepth)||bevel.maximumDepth<=0||bevel.maximumDepth>.065||!Array.isArray(bevel.components)||!bevel.components.length||bevel.components.length>2)throw Error('Invalid parcel paving buried bevel scope');
 for(const key of ['flatCrownOverlap','roadFacingOverlap','coplanarOverlap'])if(!Number.isFinite(bevel[key])||bevel[key]<0||bevel[key]>1e-7)throw Error('Parcel paving buried bevel reaches protected '+key);
 const seen=new Set();let area=0;
 for(const component of bevel.components){
  const domain=domains[component.sourceFloor],b=component.bounds;
  if(!domain||seen.has(component.sourceFloor)||!Number.isFinite(component.area)||component.area<=0||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]>=b[2]||b[1]>=b[3]||b[0]<domain[0]||b[1]<domain[1]||b[2]>domain[2]||b[3]>domain[3])throw Error('Invalid parcel paving buried bevel envelope');
  seen.add(component.sourceFloor);area+=component.area;
 }
 if(Math.abs(area-bevel.area)>1e-5)throw Error('Invalid parcel paving buried bevel area');
}

function apply(root,patch){
 const cache='parcelPaving';
 if(root.userData[cache])return root.userData[cache];
 if(patch?.version!==1||!Array.isArray(patch.meshes)||!patch.meshes.length||new Set(patch.meshes.map(r=>r.name)).size!==patch.meshes.length||patch.meshes.some(r=>!terrainName(r.name)))throw Error('Invalid parcel paving data');
 const rows=patch.meshes;
 root.updateMatrixWorld(true);const prepared=[],allocated=[];
 try{
  for(const row of rows){
   const mesh=root.getObjectByName(row.name),old=mesh?.geometry,e=row.expected;
   if(!mesh?.isMesh||Array.isArray(mesh.material)||!old?.index||!e||old.attributes.position?.count!==e.vertices||old.index.count!==e.indices)throw Error('Parcel paving source changed: '+row.name);
   const names=Object.keys(old.attributes).sort(),expected=[...(e.attributes??[])].sort();
   if(names.length!==expected.length||names.some((n,i)=>n!==expected[i])||!old.attributes.normal||old.attributes.position.itemSize!==3||old.attributes.normal.itemSize!==3)throw Error('Parcel paving source attributes changed: '+row.name);
   for(const attr of Object.values(old.attributes))if(attr.isInterleavedBufferAttribute||attr.count!==e.vertices||!ArrayBuffer.isView(attr.array))throw Error('Unsupported parcel paving source channel: '+row.name);
   if(Object.keys(old.morphAttributes).length)throw Error('Animated parcel paving source: '+row.name);
   if(e.positionCRC&&positionCRC(old.attributes.position.array)!==e.positionCRC)throw Error('Parcel paving geometry identity changed: '+row.name);
   if(old.drawRange.start!==0||(Number.isFinite(old.drawRange.count)&&old.drawRange.count!==old.index.count))throw Error('Partial parcel paving draw range: '+row.name);
   if(!Array.isArray(row.p)||!Array.isArray(row.n)||!Array.isArray(row.ix)||!row.p.length||row.p.length%3||row.n.length!==row.p.length||!row.ix.length||row.ix.length%3||!row.p.every(Number.isFinite)||!row.n.every(Number.isFinite)||row.ix.some(i=>!Number.isInteger(i)||i<0||i>=row.p.length/3))throw Error('Invalid parcel paving geometry: '+row.name);
   // Only the explicitly audited inner bevel may be buried by a cream cap.
   // General curb overlap stays forbidden, including crown/road-facing faces.
   validateBuriedBevel(row);
   for(const metric of ['roadOverlap','curbOverlap','grassOverlap','pathOverlap','sidewalkOverlap','originalFloorOverlap','protectedSportsOverlap'])if(row.metrics?.[metric]!=null&&(!Number.isFinite(row.metrics[metric])||row.metrics[metric]<0||row.metrics[metric]>(metric==='curbOverlap'?1e-7:.01)))throw Error('Parcel paving intersects protected surface: '+row.name+' '+metric);
   const topIndexCount=row.topIndexCount??row.ix.length;
   if(!Number.isInteger(topIndexCount)||topIndexCount<=0||topIndexCount%3||topIndexCount>row.ix.length)throw Error('Invalid parcel paving top range: '+row.name);
   for(let i=0;i<row.n.length;i+=3)if(Math.abs(Math.hypot(row.n[i],row.n[i+1],row.n[i+2])-1)>.002)throw Error('Invalid parcel paving surface normal: '+row.name);
   for(let i=0;i<row.ix.length;i+=3){
    const a=row.ix[i]*3,b=row.ix[i+1]*3,c=row.ix[i+2]*3;
    const ux=row.p[b]-row.p[a],uy=row.p[b+1]-row.p[a+1],uz=row.p[b+2]-row.p[a+2],vx=row.p[c]-row.p[a],vy=row.p[c+1]-row.p[a+1],vz=row.p[c+2]-row.p[a+2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
    if(Math.hypot(cx,cy,cz)<=1e-12)throw Error('Degenerate parcel paving face: '+row.name);
    if(i<topIndexCount&&(cy<=1e-12||[a,b,c].some(j=>row.n[j+1]<=0)))throw Error('Invalid parcel paving top winding: '+row.name);
   }
   const determinant=mesh.matrixWorld.determinant();if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)throw Error('Invalid parcel paving transform: '+row.name);
   const added=new T.BufferGeometry();allocated.push(added);added.setAttribute('position',new T.Float32BufferAttribute(row.p,3));added.setAttribute('normal',new T.Float32BufferAttribute(row.n,3));added.applyMatrix4(mesh.matrixWorld.clone().invert());
   const next=old.clone(),addedVertices=row.p.length/3;allocated.push(next);
   for(const name of names){
    const previous=old.attributes[name],values=new previous.array.constructor((e.vertices+addedVertices)*previous.itemSize);
    values.set(previous.array);
    const explicit=row.extraAttributes?.[name];
    if(explicit&&(!Array.isArray(explicit)||explicit.length!==addedVertices*previous.itemSize||!explicit.every(Number.isFinite)))throw Error('Invalid parcel paving extra channel: '+row.name+' '+name);
    if(name==='position'||name==='normal')values.set(added.attributes[name].array,previous.array.length);
    else for(let i=0;i<addedVertices;i++)for(let k=0;k<previous.itemSize;k++){
     // The untextured central caps still keep their UV channel and its planar
     // world-X/-Z convention. Other original channels retain a neutral sample.
     values[(e.vertices+i)*previous.itemSize+k]=explicit?explicit[i*previous.itemSize+k]:name==='uv'&&previous.itemSize===2?(k===0?row.p[i*3]:-row.p[i*3+2]):previous.array[k];
    }
    const attr=new T.BufferAttribute(values,previous.itemSize,previous.normalized);attr.name=previous.name;attr.setUsage(previous.usage);attr.gpuType=previous.gpuType;next.setAttribute(name,attr);
   }
   const Index=old.index.array instanceof Uint32Array||e.vertices+addedVertices>65535?Uint32Array:Uint16Array;
   const indices=new Index(old.index.count+row.ix.length);indices.set(old.index.array);
   for(let i=0;i<row.ix.length;i++)indices[old.index.count+i]=e.vertices+row.ix[i];
   const index=new T.BufferAttribute(indices,1,old.index.normalized);index.name=old.index.name;index.setUsage(old.index.usage);index.gpuType=old.index.gpuType;next.setIndex(index);
   // All supported targets use one material, so groups do not add draws. Keep
   // the complete original group prefix and label the new cap separately.
   if(old.groups.length)next.addGroup(old.index.count,row.ix.length,0);
   if(Number.isFinite(old.drawRange.count))next.setDrawRange(0,indices.length);
   next.computeBoundingBox();next.computeBoundingSphere();
   if(!Object.values(next.attributes).every(a=>a.array.every(Number.isFinite)))throw Error('Nonfinite parcel paving output: '+row.name);
   prepared.push({mesh,next,added,triangles:countTriangles(next)-countTriangles(old),area:row.metrics?.area??0});
  }
 }catch(error){for(const geometry of allocated)geometry.dispose();throw error;}
 // No source mesh is mutated unless every scoped row has passed its guards.
 for(const p of prepared){p.mesh.geometry=p.next;p.added.dispose();}
 return root.userData[cache]={version:1,meshes:prepared.map(p=>p.mesh.name),area:prepared.reduce((n,p)=>n+p.area,0),triangleDelta:prepared.reduce((n,p)=>n+p.triangles,0),addedDrawCalls:0,addedMeshes:0,originalMaterials:true,originalAttributesPreserved:true};
}

// Existing terrain sampler inputs hold these mesh references already. Invoke
// after curb joins and before the final terrain sampler; add no extra objects.
export function applyParcelPaving(root,patch=parcelPavingData){return apply(root,patch);}
