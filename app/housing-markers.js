import {MeshStandardMaterial,InstancedMesh,Matrix4,Vector3} from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';
import {HOUSES} from './housing-layout.js';
export function createHousingMarkers(world){
 const geometry=new RoundedBoxGeometry(1,1,1,2,.065),material=new MeshStandardMaterial({color:'#f0da9d',roughness:.75});
 const root=new InstancedMesh(geometry,material,HOUSES.length),matrix=new Matrix4();root.name='67PARK_HOME_DOOR_MARKERS';
 HOUSES.forEach((h,i)=>{matrix.makeRotationY(h.yaw);matrix.scale(new Vector3(.35,.85,.1));matrix.setPosition(h.door[0]+Math.cos(h.yaw)*1.1,h.door[1],h.door[2]-Math.sin(h.yaw)*1.1);root.setMatrixAt(i,matrix);});
 root.instanceMatrix.needsUpdate=true;world.scene.add(root);
 return {show:value=>{root.visible=value},dispose(){root.removeFromParent();geometry.dispose();material.dispose();}};
}
