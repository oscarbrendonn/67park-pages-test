import * as T from 'three';
export const northApartmentLayout=[16,36,56,94,114,134].map((x,i)=>({id:'NA'+(i+1),x,z:-204,scale:[1.25,i%3===1?.9:1.05,1.25]}));
export function createNorthApartments({scene,sample,renderer}){
 const source=scene.getObjectByName('CENTRAL_BUILDINGS_V68'),parts=source?.children.filter(m=>m.isInstancedMesh&&m.name.startsWith('CENTRAL68_TOY70_square_'));if(!parts?.length)throw Error('Approved apartment source missing');
 const group=new T.Group();group.name='ISLAND_NORTH_APARTMENTS';const local=new T.Box3();for(const m of parts){m.geometry.computeBoundingBox();local.union(m.geometry.boundingBox);}
 const rows=northApartmentLayout.map(p=>{const h=sample(p.x,p.z);if(h?.object.name!=='5_KB_SPOR_ZEMIN')throw Error('Northern apartment parcel missing: '+p.id);const y=h.point.y-.012,matrix=new T.Matrix4().compose(new T.Vector3(p.x,y,p.z),new T.Quaternion(),new T.Vector3(...p.scale)),box=local.clone().applyMatrix4(matrix);
  for(let x=box.min.x;x<=box.max.x;x+=.3)for(let z=box.min.z;z<=box.max.z;z+=.3){const hit=sample(x,z);if(hit?.object.name!=='5_KB_SPOR_ZEMIN'||Math.abs(hit.point.y-h.point.y)>.04)throw Error('Apartment crosses reserved parcel: '+p.id);}
  return{...p,y,matrix,box};});
 const cameraBlockers=[];for(const src of parts){const m=new T.InstancedMesh(src.geometry,src.material,rows.length);m.name='NORTH_APARTMENTS_'+src.name;m.castShadow=src.castShadow;m.receiveShadow=src.receiveShadow;m.userData.safeShadowCaster=src.userData.safeShadowCaster;rows.forEach((p,i)=>m.setMatrixAt(i,p.matrix));m.computeBoundingBox();m.computeBoundingSphere();group.add(m);if(!src.material.transparent)cameraBlockers.push(m);}
 scene.add(group);const stats={houses:rows.length,source:'existing approved central square toy model',plots:2,roadsModified:false,newGeometryBytes:0,placements:rows.map(({matrix,box,...p})=>({...p,bounds:[box.min.toArray(),box.max.toArray()]}))};renderer.domElement.dataset.northApartments=JSON.stringify(stats);
 return{group,rows,stats,cameraBlockers,obstacle(x,z){for(const r of rows)if(x>r.box.min.x+.15&&x<r.box.max.x-.15&&z>r.box.min.z+.15&&z<r.box.max.z-.15)return r.box.max.y;return null;}};
}
