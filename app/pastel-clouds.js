// City-only sky decoration: no textures, shadows, lights, timers or frame work.
// Forty lobes share one geometry/material and one instanced draw call.
export function createPastelClouds(T) {
 const root=new T.Group();root.name='67PARK_WEATHER_CLOUDS';root.position.y=50;
 const clusters=[[-190,34,-210,1],[70,28,-270,1.18],[310,32,-200,.94],[390,36,20,1.1],[300,30,270,1.2],[30,34,300,1],[-220,28,190,1.14],[-260,38,-20,.96]];
 const lobes=[[-10,-1,0,9,4.5,7],[0,3,0,12,7,8],[11,0,0,9,5,7],[-3,-1,-4,13,4,7],[3,-1,5,13,4,6]];
 const geometry=new T.SphereGeometry(1,16,8);
 const material=new T.MeshBasicMaterial({color:'#ffffff',fog:true});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vCloudLight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCloudLight = normal.y * 0.5 + 0.5;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCloudLight;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(0.84,0.85,0.91),vec3(1.0),smoothstep(0.0,0.85,vCloudLight));');
 };
 material.customProgramCacheKey=()=> '67park-pastel-clouds-1';
 const mesh=new T.InstancedMesh(geometry,material,clusters.length*lobes.length);
 mesh.name='67PARK_PASTEL_CLOUD_PUFFS';mesh.castShadow=false;mesh.receiveShadow=false;
 const matrix=new T.Matrix4(),q=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
 const palette=['#fff8ed','#f4effa','#fbeef0','#edf4fb'];let index=0,minY=Infinity;
 for(const [c,cluster] of clusters.entries()){
  const [x,y,z,size]=cluster;
  for(const [dx,dy,dz,sx,sy,sz] of lobes){
   position.set(x+dx*size,y+dy*size,z+dz*size);scale.set(sx*size,sy*size,sz*size);
   matrix.compose(position,q,scale);mesh.setMatrixAt(index,matrix);mesh.setColorAt(index,new T.Color(palette[c%palette.length]));
   minY=Math.min(minY,root.position.y+position.y-scale.y);index++;
  }
 }
 mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);
 root.userData.pastelClouds={revision:'pastel-clouds-1',clusters:clusters.length,lobes:index,drawCalls:1,triangles:geometry.index.count/3*index,textures:0,minY,animated:false};
 const night=new T.Color('#adb8d5'),day=new T.Color('#ffffff');let disposed=false;
 return {root,stats:root.userData.pastelClouds,setWeather(weather){
  const sun=Math.sin(((weather?.dayT??13/24)-.25)*Math.PI*2),light=T.MathUtils.smoothstep(sun,-.06,.28);
  material.color.copy(night).lerp(day,light);
  // Keep a soft pastel sky even during rain; never turn these into dark smoke.
  if(weather?.kind==='rain')material.color.multiplyScalar(.94);
 },dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();material.dispose();mesh.dispose();}};
}
