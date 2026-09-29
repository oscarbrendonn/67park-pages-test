import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {finishCityMaterial60} from './city-props-v60.js';
import {installCentralBuildingContacts} from '../app/building-footprint.js?v=corner-contact-1';

// Existing grass islands, world-space metres. No terrain is replaced.
export const centralLayout68 = [
  ['NW','round',4.426,-68.433,1,0],
  ['N1','square',22.802,-68.433,1,0],
  ['N2','square',75.942,-68.433,1,0],
  ['NE','round',94.318,-68.433,1,0],
  ['W1','square',4.426,-48.7,.75,Math.PI/2],
  ['E1','square',94.318,-48.7,.75,-Math.PI/2],
  ['W2','square',4.426,-16.2,.75,Math.PI/2],
  ['E2','square',94.318,-16.2,.75,-Math.PI/2],
  ['N3','square',38,-68.433,1,0],
  ['N4','square',60.744,-68.433,1,0],
  ['SW','round',4.426,3.778,1,Math.PI],
  ['S1','square',22.802,3.778,1,Math.PI],
  ['S2','square',75.942,3.778,1,Math.PI],
  ['S3','square',38,3.778,1,Math.PI],
  ['S4','square',60.744,3.778,1,Math.PI],
  ['SE','round',94.318,3.778,1,Math.PI]
].map(([id,kind,x,z,scale,yaw])=>({id,kind,x,z,scale,yaw}));

export async function loadCentralBuildings68({scene,renderer,sample,variant}){
  const loader=new GLTFLoader();
  const [round,square,toyRound,toySquare]=await Promise.all([
    './central-round-v68.glb','./central-square-v68.glb',
    './central-round-toy-v70.glb','./central-square-toy-v70.glb'
  ].map(url=>loader.loadAsync(url)));
  const group=new THREE.Group();group.name='CENTRAL_BUILDINGS_V68';
  const exposure={value:1},placements=[],cameraBlockers=[];
  for(const p of centralLayout68){
    const heights=[];
    // Check the actual lawn beneath each footprint before adding anything.
    const radius=4.7*p.scale*1.15;
    for(const dx of [-radius,0,radius])for(const dz of [-radius,0,radius]){
      if(p.kind==='round'&&dx&&dz)continue;
      const hit=sample(p.x+dx,p.z+dz);
      if(!hit||!/^3_MERKEZ_CIMEN|^CENTER_WHITE71_|^CENTER73_LAWN/.test(hit.object?.name??''))throw Error('Central building outside plaza: '+p.id);
      heights.push(hit.point.y);
    }
    placements.push({...p,y:Math.min(...heights)-.025,height:14.4*p.scale,radius});
  }
  let draws=0;
  const toyIds=new Set(['NW','N1']);
  for(const [kind,asset,toy] of [['round',round,false],['square',square,false],['round',toyRound,true],['square',toySquare,true]]){
    asset.scene.updateMatrixWorld(true);
    const entries=placements.filter(p=>p.kind===kind&&toyIds.has(p.id)===toy);
    asset.scene.traverse(source=>{
      if(!source.isMesh)return;
      const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
      const material=finishCityMaterial60(source.material,exposure);
      const mesh=new THREE.InstancedMesh(geometry,material,entries.length);
      mesh.name='CENTRAL68_'+(toy?'TOY70_':'')+kind+'_'+material.name;
      const seam=/joint/i.test(material.name),glass=material.userData.cityGlass60;
      mesh.castShadow=!glass&&!seam;mesh.receiveShadow=!glass&&!seam;
      mesh.userData.safeShadowCaster=mesh.castShadow;
      entries.forEach((p,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().compose(
        new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw),new THREE.Vector3(p.scale*1.15,p.scale,p.scale*1.15))));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
      group.add(mesh);draws++;
      // Simple invisible volumes keep camera queries off the detailed glass.
    });
  }
  const collisionMaterial=new THREE.MeshBasicMaterial({visible:false});
  for(const p of placements){
    const geometry=p.kind==='round'?new THREE.CylinderGeometry(p.radius,p.radius,p.height,16):new THREE.BoxGeometry(p.radius*2,p.height,p.radius*2);
    const collider=new THREE.Mesh(geometry,collisionMaterial);collider.name='CENTRAL68_COLLIDER_'+p.id;
    collider.position.set(p.x,p.y+p.height/2,p.z);group.add(collider);cameraBlockers.push(collider);
  }
  function obstacle(x,z){
    for(const p of placements){const dx=Math.abs(x-p.x),dz=Math.abs(z-p.z);
      if(p.kind==='round'?dx*dx+dz*dz<=p.radius*p.radius:dx<=p.radius&&dz<=p.radius)return p.y+p.height;
    }
    return null;
  }
  function update(){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);}
  update();scene.add(group);group.updateMatrixWorld(true);
  Object.assign(renderer.domElement.dataset,{centralBuildings68:'ready',centralCount68:String(placements.length),centralDraws68:String(draws),centralLayout68:JSON.stringify(placements),toyBuildings70:'NW,N1'});
  return installCentralBuildingContacts({group,placements,cameraBlockers,obstacle,update},renderer);
}
