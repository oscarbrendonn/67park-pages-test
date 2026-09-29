import * as T from 'three';
export function cleanLowerPark(root){
 if(root.userData.lowerParkClean)return;root.updateMatrixWorld(true);
 const curb=root.getObjectByName('6_BORDUR');if(!curb)return;
 root.traverse(m=>{if(m.isMesh&&/^67D_REF_ABUTMENT_ALT_[AB]$/.test(m.name)){m.visible=false;m.geometry=m.geometry.clone();m.geometry.setIndex([]);}});
 curb.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,ix=g.index;if(!ix)return;const keep=[];for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],v=ids.map(id=>new T.Vector3().fromBufferAttribute(p,id).applyMatrix4(m.matrixWorld));if(v.every(p=>p.x>160&&p.x<184&&p.z>102&&p.z<111))continue;keep.push(...ids);}g.setIndex(keep);g.computeBoundingBox();g.computeBoundingSphere();});root.userData.lowerParkClean=true;
}
