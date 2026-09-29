import * as T from 'three';

// These are the park's actual approved buffers/materials, not imitations.
// Both LODs retain vertex colours, cavity attributes and the park shader.
export function createApprovedParkPlants99({scene,placements,sample,name='APPROVED_PARK_PLANTS_99'}){
 const park=scene.getObjectByName('REFERENCE_PARK_V63');
 if(!park)throw Error('Approved park foliage must load first');
 const group=new T.Group();group.name=name;const batches=new Map(),sources=[];
 for(const kind of ['tree','shrub'])for(const level of ['near','far']){
  const key=kind+'-'+level,source=park.getObjectByName('P57_'+key+'_'+key);
  if(!source?.isInstancedMesh||!source.geometry.getAttribute('_cavity'))throw Error('Approved park source missing: '+key);
  const count=placements.filter(p=>p.asset===kind).length;
  if(!count)continue;
  const m=new T.InstancedMesh(source.geometry,source.material,count);m.name=name+'_'+key;
  m.castShadow=source.castShadow;m.receiveShadow=source.receiveShadow;m.userData.safeShadowCaster=true;m.count=0;
  group.add(m);batches.set(key,m);sources.push({key,geometry:source.geometry.uuid,material:source.material.uuid});
 }
 const rows=placements.map(p=>{
  const hit=sample(p.x,p.z);if(!hit||/DENIZ|GOLET.*SU|WATER|^1_TABAN/.test(hit.object?.name??''))throw Error('Plant has no dry support');
  return {...p,y:Math.max(hit.point.y,p.base??-Infinity)-.018};
 });
 const dummy=new T.Object3D();let clock=1;
 function update(dt=.25,camera){
  clock+=dt;if(clock<.25)return;clock=0;
  for(const m of batches.values())m.count=0;
  for(const p of rows){
   const near=camera&&Math.hypot(camera.position.x-p.x,camera.position.y-p.y,camera.position.z-p.z)<58;
   const m=batches.get(p.asset+(near?'-near':'-far'));
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw??0,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();
   m.setMatrixAt(m.count++,dummy.matrix);
  }
  for(const m of batches.values()){m.instanceMatrix.needsUpdate=true;if(m.count){m.computeBoundingBox();m.computeBoundingSphere();}}
 }
 function obstacle(x,z){for(const p of rows)if(p.asset==='tree'&&Math.hypot(x-p.x,z-p.z)<.40*p.scale)return p.y+5;return null;}
 scene.add(group);update();group.updateMatrixWorld(true);
 return {group,update,obstacle,rows,sources,stats:{source:'exact approved park v45 buffers and park v63 materials',trees:rows.filter(p=>p.asset==='tree').length,shrubs:rows.filter(p=>p.asset==='shrub').length,addedGeometryBytes:0}};
}
