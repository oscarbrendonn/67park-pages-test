import * as T from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';
import {mergeGeometries} from '../island/utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from '../island/city-height-sampler58.js';
import {createApprovedParkPlants99} from '../island/approved-park-plants-v99.js';

// The existing northern lawns taper toward the coast. Each full roof envelope
// is surveyed below; neither the lawn nor the surrounding roads is enlarged.
export const northHomesLayout = [
 {id:'N01',asset:'square',x:12,z:-228,scale:[1.15,1,1.15]},
 {id:'N02',asset:'square',x:32,z:-228,scale:[1.15,.85,1.15]},
 {id:'N03',asset:'square',x:53,z:-228,scale:[1.15,1,1.15]},
 {id:'N04',asset:'square',x:88,z:-224.5,scale:[1,1,1]},
 {id:'N05',asset:'square',x:108,z:-222,scale:[1,.85,.62]},
 {id:'NE01',asset:'cottage-pink',x:167,z:-197,scale:[.92,.92,.92]},
 {id:'NE02',asset:'cottage-taupe',x:182,z:-197,scale:[.92,.92,.92]},
 {id:'NE03',asset:'cottage-annex',x:197,z:-197,scale:[.90,.90,.90]},
 {id:'NE04',asset:'cottage-taupe',x:166.8,z:-207.2,scale:[.78,.78,.78]},
 {id:'NE05',asset:'cottage-pink',x:181.5,z:-206.5,scale:[.78,.78,.78]},
].map(p=>({...p,yaw:0,grass:p.id.startsWith('NE')?'3_DOGU_SAHIL_UST_CIMEN':'3_CIMEN'}));

export function createNorthHomes({scene,terrainRoot,renderer,sample}){
 if(scene.getObjectByName('ISLAND_NORTH_HOMES'))throw Error('Northern homes already exist');
 const houses=scene.getObjectByName('SMALL_ISLAND_PROPS_V62'),central=scene.getObjectByName('CENTRAL_BUILDINGS_V68');
 if(!houses||!central)throw Error('Approved houses and central buildings must load first');
 const assets=new Map([['square',central.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('CENTRAL68_TOY70_square_'))]]);
 for(const mesh of houses.children){const key=mesh.userData.houseAsset62;if(!key)continue;if(!assets.has(key))assets.set(key,[]);assets.get(key).push(mesh);}
 const group=new T.Group();group.name='ISLAND_NORTH_HOMES';
 // Codex has a 22 cm rounded lawn shoulder, unlike Kimi's flat lawn.
 // Keep the last apartment on its flat crown, without touching the terrain.
 const layout=northHomesLayout.map(p=>p.id==='N05'&&terrainRoot.userData.roundedGrass35
  ?{...p,x:106,z:-222.2,scale:[1,.85,.56]}:p);
 const rows=layout.map(p=>{
  const parts=assets.get(p.asset);if(!parts?.length)throw Error('Approved northern house missing: '+p.asset);
  const local=new T.Box3();for(const mesh of parts){mesh.geometry.computeBoundingBox();local.union(mesh.geometry.boundingBox);}
  const hit=sample(p.x,p.z);if(hit?.object.name!==p.grass)throw Error('Northern home is not on its lawn: '+p.id);
  const y=hit.point.y-.022,matrix=new T.Matrix4().compose(new T.Vector3(p.x,y,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3(...p.scale));
  const box=local.clone().applyMatrix4(matrix),nx=Math.ceil((box.max.x-box.min.x)/.25),nz=Math.ceil((box.max.z-box.min.z)/.25);
  let min=Infinity,max=-Infinity;
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const x=T.MathUtils.lerp(box.min.x,box.max.x,i/nx),z=T.MathUtils.lerp(box.min.z,box.max.z,j/nz),h=sample(x,z);
   if(h?.object.name!==p.grass)throw Error('Northern roof crosses its lawn: '+p.id+' at '+x+','+z);
   min=Math.min(min,h.point.y);max=Math.max(max,h.point.y);
  }
  if(max-min>.07||min<box.min.y-.01||max>y+.065)throw Error('Northern home foundation is not grounded: '+p.id);
  return {...p,y,local,box,matrix,groundRange:[min,max],samples:(nx+1)*(nz+1)};
 });
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i].box,b=rows[j].box;
  if(a.min.x<b.max.x&&a.max.x>b.min.x&&a.min.z<b.max.z&&a.max.z>b.min.z)throw Error('Northern roofs overlap: '+rows[i].id+' / '+rows[j].id);
 }
 let draws=0,triangles=0;const cameraBlockers=[];
 for(const [key,parts] of assets){const placements=rows.filter(p=>p.asset===key);if(!placements.length)continue;
  for(const src of parts){
   const mesh=new T.InstancedMesh(src.geometry,src.material,placements.length);
   mesh.name='NORTH_HOMES_'+src.name;mesh.castShadow=src.castShadow;mesh.receiveShadow=src.receiveShadow;
   mesh.userData.safeShadowCaster=src.userData.safeShadowCaster;mesh.userData.approvedSource=src.name;
   placements.forEach((p,i)=>mesh.setMatrixAt(i,p.matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
   if(!src.material.transparent)cameraBlockers.push(mesh);
   draws++;triangles+=(src.geometry.index?.count??src.geometry.attributes.position.count)/3*placements.length;
  }
 }
 // Short front approaches stop at the current lawn edge; no road is repainted.
 const grey=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material.color;
 if(!grey)throw Error('Approved warm-grey material missing');
 const approaches=[];
 for(const row of rows.filter(p=>!['NE04','NE05'].includes(p.id))){
  const end=row.grass==='3_CIMEN'?-218.64:-191.15,start=row.box.max.z-.10;
  if(end-start<.4)continue;
  const geo=new RoundedBoxGeometry(1.65,.065,end-start,2,.027);geo.translate(row.x,row.y+.046,(start+end)/2);approaches.push(geo);
 }
 const path=new T.Mesh(mergeGeometries(approaches),new T.MeshStandardMaterial({name:'NORTH_HOMES_APPROVED_GREY_PATH',color:grey,roughness:.78}));
 path.name='NORTH_HOMES_GARDEN_APPROACHES';path.receiveShadow=true;group.add(path);for(const g of approaches)g.dispose();
 draws++;triangles+=(path.geometry.index?.count??path.geometry.attributes.position.count)/3;
 group.updateMatrixWorld(true);const ground=createCityHeightSampler58([path],{cellSize:2}).height;
 // Reuse only the park's approved tree buffers, shaders and LODs. Keep the
 // compact corner garden free of extra trees where the roof gaps are narrow.
 const plants=createApprovedParkPlants99({scene,sample,name:'NORTH_HOMES_APPROVED_PLANTS',placements:[
  {asset:'tree',x:23,z:-236,scale:1.12,yaw:1.1},
  {asset:'tree',x:43,z:-237,scale:1.08,yaw:2.7},
  {asset:'tree',x:195,z:-205.6,scale:.95,yaw:.4},
 ]});
 function obstacle(x,z){
  let h=ground(x,z);
  for(const p of rows)if(x>p.box.min.x+.22&&x<p.box.max.x-.22&&z>p.box.min.z+.22&&z<p.box.max.z-.22)h=Math.max(h??-Infinity,p.box.max.y);
  const tree=plants.obstacle(x,z);return h===null?tree:tree===null?h:Math.max(h,tree);
 }
 if(draws>60||triangles>500000)throw Error('Northern house render budget exceeded: '+draws+'/'+triangles);
 const stats={revision:1,houses:rows.length,apartments:5,cottages:5,newGLBDownloads:0,newHouseGeometryBytes:0,source:'exact approved v62 cottages and v70 toy square building',draws,triangles,grassPreserved:true,roadsModified:false,curbsModified:false,trees:plants.stats.trees,
  placements:rows.map(({matrix,local,box,...p})=>({...p,bounds:[box.min.toArray(),box.max.toArray()]}))};
 scene.add(group);renderer.domElement.dataset.northHomes=JSON.stringify(stats);
 return {group,rows,stats,ground,obstacle,cameraBlockers,plants,update:plants.update};
}
