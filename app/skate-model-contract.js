import * as T from 'three';
// Visual-only wrapper. No movement state, speed, jump, collisions or input here.
export const SKATE_MODEL_CONTRACT=Object.freeze({length:1.15,nose:'+Z',ground:0});
export function prepareSkateVisual(source,kind='logo'){
 const model=source.clone(true);
 model.traverse(o=>{if(o.name==='body'&&kind==='logo')o.rotation.x=Math.PI;});
 model.rotation.y=-Math.PI/2;model.updateMatrixWorld(true);
 const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
 if(!Number.isFinite(size.z)||size.z<1e-6)throw Error('Invalid skateboard model bounds');
 model.scale.multiplyScalar(SKATE_MODEL_CONTRACT.length/size.z);
 const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
 model.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));
 const root=new T.Group();root.add(model);root.updateMatrixWorld(true);
 const meshes=[];model.traverse(o=>{if(/^wheel_\d+$/.test(o.name))meshes.push(o);});
 const wheels=meshes.map(mesh=>{const pivot=new T.Group();pivot.position.copy(new T.Box3().setFromObject(mesh).getCenter(new T.Vector3()));root.add(pivot);pivot.attach(mesh);return pivot;});
 root.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 return {root,wheels};
}
