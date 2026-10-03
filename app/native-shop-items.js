import * as T from 'three';

const owned=Symbol.for('67park.avatar-owned-resources'),shopPart=Symbol.for('67park.native-shop-part');
const canon=name=>name.replace(/_\d+$/,'');
const outfits=Object.freeze({'shop:tshirt':{color:'#a7c8f4',sleeves:false},'shop:hoodie':{color:'#e8a0b0',sleeves:true}});
const spine=new Set(['Spine1','Spine2','Spine3']);
const shirtBones=new Set([...spine,'BiscepL','BiscepR']);
const hoodieBones=new Set([...shirtBones,'ArmL','ArmR']);
function weightFor(mesh,index,allowed){
  const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  let value=0;for(let axis=0;axis<4;axis++)if(allowed.has(canon(mesh.skeleton.bones[joints.getComponent(index,axis)]?.name||'')))value+=weights.getComponent(index,axis);
  return value;
}
function mark(object,id){Object.defineProperty(object,owned,{value:true});Object.defineProperty(object,shopPart,{value:true});object.userData.studioEquipment=id;return object;}

// Assembly can safely be repeated on one rig. Dispose only this helper's
// allocations: never the body's geometry/material or its skeleton resource.
export function clearNativeShopItems(rig){
  const parts=[];rig.traverse(object=>{if(object[shopPart])parts.push(object);});
  for(const part of parts){
    part.removeFromParent();const geometries=new Set(),materials=new Set(),skeletons=new Set();
    part.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);if(object.isSkinnedMesh)skeletons.add(object.skeleton);}});
    for(const geometry of geometries)geometry?.dispose();for(const material of materials)material?.dispose();for(const skeleton of skeletons)skeleton?.dispose();
  }
  if(outfits[rig.userData.bodySelection])delete rig.userData.bodySelection;
}

export function applyNativeShopItems(rig,equipment){
  clearNativeShopItems(rig);
  const outfit=outfits[equipment.body],wantsBag=equipment.back==='shop:bag';
  if(!outfit&&!wantsBag)return;
  const body=rig.getObjectByName('FS_Body');
  if(!body?.isSkinnedMesh||!body.geometry.index||!body.geometry.attributes.skinIndex||!body.geometry.attributes.skinWeight)throw Error('Your character outfit surface is unavailable.');
  rig.updateMatrixWorld(true);body.skeleton.update();
  if(outfit){
    const geometry=body.geometry.clone(),position=body.geometry.attributes.position,normal=body.geometry.attributes.normal,index=geometry.index,allowed=outfit.sleeves?hoodieBones:shirtBones,keep=[];
    const selected=Array.from({length:position.count},(_,i)=>weightFor(body,i,allowed)>=.5);
    for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(selected[a]&&selected[b]&&selected[c])keep.push(a,b,c);}
    if(!keep.length){geometry.dispose();throw Error('Your character outfit could not be fitted.');}
    // Decode quantized attributes into owned floats before the tiny outward
    // offset. Keep original topology, skin weights and every source attribute.
    const bounds=new T.Box3().setFromBufferAttribute(position),offset=bounds.getSize(new T.Vector3()).y*.009,points=new Float32Array(position.count*3);
    for(let i=0;i<position.count;i++){
      points[i*3]=position.getX(i)+(normal?.getX(i)||0)*offset;
      points[i*3+1]=position.getY(i)+(normal?.getY(i)||0)*offset;
      points[i*3+2]=position.getZ(i)+(normal?.getZ(i)||0)*offset;
    }
    geometry.setAttribute('position',new T.BufferAttribute(points,3));geometry.setIndex(keep);geometry.clearGroups();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=new T.MeshStandardMaterial({color:outfit.color,roughness:.86,metalness:0,side:T.DoubleSide});
    const mesh=mark(new T.SkinnedMesh(geometry,material),equipment.body);mesh.name='Studio_shop_body';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.matrix.copy(body.matrix);mesh.matrixAutoUpdate=body.matrixAutoUpdate;mesh.bindMode=body.bindMode;
    body.parent.add(mesh);mesh.bind(new T.Skeleton([...body.skeleton.bones],body.skeleton.boneInverses.map(matrix=>matrix.clone())),body.bindMatrix.clone());
    mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=true;rig.userData.bodySelection=equipment.body;
  }
  if(wantsBag){
    const anchor=body.skeleton.bones.find(bone=>canon(bone.name)==='Backpiece_Attachment')||body.skeleton.bones.find(bone=>canon(bone.name)==='Spine2');
    if(!anchor)throw Error('Your character backpack attachment is unavailable.');
    const box=new T.Box3(),vertex=new T.Vector3(),position=body.geometry.attributes.position;
    for(let i=0;i<position.count;i++)if(weightFor(body,i,spine)>=.5)box.expandByPoint(body.getVertexPosition(i,vertex).applyMatrix4(body.matrixWorld));
    if(box.isEmpty())throw Error('Your character backpack could not be fitted.');
    const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),width=size.x*.68,height=size.y*.70,depth=Math.max(size.z*.34,width*.22),inverse=new T.Matrix4().copy(anchor.matrixWorld).invert();
    const group=mark(new T.Group(),'shop:bag');group.name='Studio_shop_back';anchor.add(group);
    const part=(scale,point,color)=>{const geometry=new T.SphereGeometry(1,12,10);geometry.scale(...scale);geometry.translate(...point);geometry.applyMatrix4(inverse);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.82,metalness:0}));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);};
    const y=box.min.y+height*.63,z=box.min.z-depth*.28;
    part([width*.5,height*.5,depth*.5],[center.x,y,z],'#c8a7f4');
    part([width*.36,height*.24,depth*.3],[center.x,y-height*.16,z-depth*.38],'#a990d8');
  }
  rig.updateMatrixWorld(true);
}
