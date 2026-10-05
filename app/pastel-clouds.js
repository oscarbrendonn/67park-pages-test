import {MarchingCubes} from '../vendor/addons/objects/MarchingCubes.js';
// Build one continuous smooth cloud once, shared by eight instances.
export function createPastelClouds(T) {
 const root=new T.Group();root.name='67PARK_WEATHER_CLOUDS';root.position.y=32;
 const clusters=[[-190,34,-210,1],[70,28,-270,1.18],[310,32,-200,.94],[390,36,20,1.1],[300,30,270,1.2],[30,34,300,1],[-220,28,190,1.14],[-260,38,-20,.96]];
 const lobes=[[-10,-1,0,9,5.5,8],[0,3,0,12,8,10],[11,0,0,9,5.5,8],[-3,-1,-5,13,5,8],[3,-1,6,13,5,8]];
 const resolution=40,fieldMaterial=new T.MeshBasicMaterial(),field=new MarchingCubes(resolution,fieldMaterial,false,false,12000);field.isolation=0;
 const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
 for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const px=(x/(resolution/2)-1)*32,py=(y/(resolution/2)-1)*16,pz=(z/(resolution/2)-1)*24;let distance=100;
  for(const [cx,cy,cz,rx,ry,rz]of lobes){const d=(Math.hypot((px-cx)/rx,(py-cy)/ry,(pz-cz)/rz)-1)*Math.min(rx,ry,rz);distance=smoothMin(distance,d,2.4);}
  field.field[z*resolution*resolution+y*resolution+x]=-distance;
 }
 field.update();const geometry=new T.BufferGeometry();
 for(const name of ['position','normal'])geometry.setAttribute(name,new T.BufferAttribute(field.geometry.attributes[name].array.slice(0,field.count*3),3));
 geometry.scale(32,16,24);geometry.computeBoundingBox();field.geometry.dispose();fieldMaterial.dispose();
 // Rounded solid puffs use the same actual sun/hemisphere as the park,
 // rather than a self-lit painted gradient that reads as paper at night.
 const material=new T.MeshStandardMaterial({color:'#eeeae4',emissive:'#c9c6c2',emissiveIntensity:.06,roughness:1,metalness:0,fog:true});
 const mesh=new T.InstancedMesh(geometry,material,clusters.length);
 mesh.name='67PARK_PASTEL_CLOUD_PUFFS';mesh.castShadow=false;mesh.receiveShadow=false;
 const matrix=new T.Matrix4(),q=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
 const palette=['#f5f0e8','#eeebf2','#f3eaec','#eaf0f3'];let index=0,minY=Infinity;
 for(const [c,cluster] of clusters.entries()){
  const [x,y,z,size]=cluster;
  {
   position.set(x,y,z);scale.setScalar(size);
   matrix.compose(position,q,scale);mesh.setMatrixAt(index,matrix);mesh.setColorAt(index,new T.Color(palette[c%palette.length]));
   minY=Math.min(minY,root.position.y+position.y+geometry.boundingBox.min.y*size);index++;
  }
 }
 mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);
 root.userData.pastelClouds={revision:'matte-clouds-2',clusters:clusters.length,lobes:lobes.length*clusters.length,drawCalls:1,triangles:geometry.attributes.position.count/3*index,textures:0,minY,animated:false};
 const night=new T.Color('#adb8d5'),day=new T.Color('#eeeae4');let disposed=false;
 return {root,stats:root.userData.pastelClouds,setWeather(weather){
  const sun=Math.sin(((weather?.dayT??13/24)-.25)*Math.PI*2),light=T.MathUtils.smoothstep(sun,-.06,.28);
  root.visible=sun>0;
  material.color.copy(night).lerp(day,light);
  // Keep a soft pastel sky even during rain; never turn these into dark smoke.
  if(weather?.kind==='rain')material.color.multiplyScalar(.94);
 },dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();material.dispose();mesh.dispose();}};
}
