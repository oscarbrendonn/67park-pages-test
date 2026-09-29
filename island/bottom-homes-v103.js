import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {createApprovedParkPlants99} from './approved-park-plants-v99.js';

export const bottomLayout103={version:103,revision:3,houses:[
 ['B01','cottage-pink',6,142,1.12],['B02','cottage-taupe',25,142,1.12],
 ['B03','cottage-annex',58,142,1.12],['B04','cottage-pink',76,142,1.12],['B05','cottage-taupe',94,142,1.12],
 ['B06','cottage-pink',125,142,1.12],['B07','cottage-annex',144,142,1.12],
 ['B08','cottage-taupe',178,142,1.12],['B09','cottage-pink',198,142,1.12],
 ['B10','cottage-pink',226.5,136.5,1.0]
].map(([id,asset,x,z,scale])=>({id,asset,x,z,scale,yaw:Math.PI}))};

export function createBottomHomes103({scene,terrainRoot,renderer,sample,variant}){
 const approved=scene.getObjectByName('SMALL_ISLAND_PROPS_V62');
 if(!approved)throw Error('Approved detached houses must finish loading first');
 const group=new T.Group();group.name='BOTTOM_HOMES_V103';const assets=new Map(),bounds=[];
 approved.traverse(m=>{const key=m.userData.houseAsset62;if(!key)return;if(!assets.has(key))assets.set(key,[]);assets.get(key).push(m);});
 // Kimi keeps its existing inset garden dividers; only these placements vary.
 // The last garden is a smaller triangular coastal plot in that map.
 const adjustments=variant==='kimi'?{B04:{x:82.2},B05:{x:95.4},B10:{x:229.5,z:135.4,scale:.80}}:{};
 const rows=bottomLayout103.houses.map(original=>{
  const p={...original,...adjustments[original.id]};
  const parts=assets.get(p.asset);if(!parts?.length)throw Error('Approved house missing: '+p.asset);
  const h=sample(p.x,p.z);if(!h||h.object.name!=='3_CIMEN')throw Error('Bottom house center outside lawn: '+p.id);
  const box=new T.Box3();for(const m of parts){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}
  const y=h.point.y-.018,transform=new T.Matrix4().compose(new T.Vector3(p.x,y,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3().setScalar(p.scale)),world=box.clone().applyMatrix4(transform);
  // Survey the complete roof envelope, not merely the building's center point.
  let min=Infinity,max=-Infinity,samples=0;
  const nx=Math.ceil((world.max.x-world.min.x)/.3),nz=Math.ceil((world.max.z-world.min.z)/.3);
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const x=T.MathUtils.lerp(world.min.x,world.max.x,i/nx),z=T.MathUtils.lerp(world.min.z,world.max.z,j/nz);
   const hit=sample(x,z);if(hit?.object.name!=='3_CIMEN')throw Error('House/roof crossed lawn: '+p.id+' '+x+','+z+' '+hit?.object.name);
   min=Math.min(min,hit.point.y);max=Math.max(max,hit.point.y);samples++;
  }
  // The approved foundation extends 36 cm below its origin. Keep that footing
  // embedded everywhere, including the last gently sloping coastal garden.
  if(min<y+box.min.y*p.scale+.04||max>y+.06)throw Error('House foundation lacks ground contact: '+p.id);
  const b={id:p.id,min:world.min.toArray(),max:world.max.toArray(),groundRange:[min,max],samples};bounds.push(b);
  return {...p,y,matrix:transform,bounds:b,local:box};
 });
 for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];if(a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[2]<b.max[2]&&a.max[2]>b.min[2])throw Error('Bottom house roofs overlap');}
 let triangles=0,draws=0;const blockers=[];
 // Reuse exact approved buffers, recessed windows, curtains and material finish.
 // No extra GLB downloads and no new house or foliage style.
 for(const [asset,parts]of assets){const places=rows.filter(p=>p.asset===asset);if(!places.length)continue;
  for(const src of parts){
   const batch=new T.InstancedMesh(src.geometry,src.material,places.length);batch.name='BOTTOM103_'+src.name;batch.castShadow=src.castShadow;batch.receiveShadow=src.receiveShadow;batch.userData.safeShadowCaster=src.userData.safeShadowCaster;batch.userData.approvedSource103=src.name;
   places.forEach((p,i)=>batch.setMatrixAt(i,p.matrix));batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();group.add(batch);
   triangles+=(src.geometry.index?.count??src.geometry.attributes.position.count)/3*places.length;draws++;if(!src.material.transparent)blockers.push(batch);
  }
 }
 const grey=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material.color;
 if(!grey)throw Error('Approved grey material missing');
 const pathMaterial=new T.MeshStandardMaterial({name:'BOTTOM103_WARM_GREY_PATH',color:grey,roughness:.78}),paths=[],pathBounds=[];
 for(const p of rows){
  // A short, level garden approach stops at the existing sidewalk edge.
  const south=p.bounds.min[2]+.05,north=131.22;
  if(south-north<.4)continue;
  const geo=new RoundedBoxGeometry(1.95,.10,south-north,2,.045);geo.translate(p.x,p.y+.035,(north+south)/2);paths.push(geo);pathBounds.push({x:p.x,z1:north,z2:south});
 }
 const pathMesh=new T.Mesh(mergeGeometries(paths),pathMaterial);pathMesh.name='BOTTOM103_SHORT_GARDEN_APPROACHES';pathMesh.receiveShadow=true;group.add(pathMesh);for(const g of paths)g.dispose();
 triangles+=(pathMesh.geometry.index?.count??pathMesh.geometry.attributes.position.count)/3;draws++;
 const plantRows=[
  ...[[15.5,150.5],[68,151],[85,151],[134,153.3],[188,153.3]].map(([x,z],i)=>({asset:'tree',x,z,scale:1.15,yaw:i*1.4})),
  ...rows.filter(p=>p.id!=='B10').flatMap((p,i)=>[-1,1].map(sign=>({asset:'shrub',x:p.x+sign*3.1,z:p.bounds.min[2]-.9,scale:.68,yaw:i*.65+sign})))
 ];
 for(const p of plantRows)if(sample(p.x,p.z)?.object.name!=='3_CIMEN')throw Error('Garden foliage crossed the lawn');
 group.updateMatrixWorld(true);const floors=createCityHeightSampler58([pathMesh],{cellSize:2});
 const plants=createApprovedParkPlants99({scene,sample,name:'BOTTOM103_APPROVED_PARK_PLANTS',placements:plantRows});
 function obstacle(x,z){let top=floors.height(x,z);for(const p of rows){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw),lx=(dx*c-dz*s)/p.scale,lz=(dx*s+dz*c)/p.scale;
   // Conservative house footprint; roof overhangs do not become walkable ledges.
   if(lx>p.local.min.x+.20&&lx<p.local.max.x-.20&&lz>p.local.min.z+.20&&lz<p.local.max.z-.20)top=Math.max(top??-Infinity,p.bounds.max[1]);
  }const plant=plants.obstacle(x,z);return top===null?plant:plant===null?top:Math.max(top,plant);}
 const stats={version:103,revision:3,variant,houses:rows.length,source:'exact approved detached house v62 buffers and materials',draws,triangles,trees:plants.stats.trees,shrubs:plants.stats.shrubs,
  grassPreserved:true,roadsModified:false,curbsModified:false,newGLBDownloads:0,placements:rows.map(({matrix,local,...p})=>p)};
 if(draws>42||triangles>300000)throw Error('Bottom homes render budget exceeded');
 scene.add(group);renderer.domElement.dataset.bottomHomes103=JSON.stringify(stats);
 return {group,stats,rows,bounds,pathBounds,plants,cameraBlockers:blockers,ground:floors.height,obstacle,update:(dt,camera)=>plants.update(dt,camera)};
}
