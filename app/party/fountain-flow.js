import * as T from 'three';
// Reuse the actual park pond shader/palette. Never mutate its material or clock.
export function createFountainBasinWater(scene,site){
 const source=scene.getObjectByName('67D_PARK_WATER_UNIFIED_V65')?.material;
 if(!source?.isShaderMaterial)return null;
 const material=source.clone();material.name='PARTY_fountain-basin-water';
 material.uniforms={...source.uniforms,uAmp:{value:.008},uWet:{value:0}};
 const geometry=new T.CircleGeometry(site.radius*1.06,96);geometry.rotateX(-Math.PI/2);
 const mesh=new T.Mesh(geometry,material);mesh.name='PARTY_fountain-basin-water';
 mesh.position.y=site.waterY-site.top-.03;mesh.castShadow=false;mesh.receiveShadow=false;
 return mesh;
}
export function fountainPhase(seconds){
 const t=Number.isFinite(seconds)?seconds:0,cycle=Math.floor(t/15),phase=((t%15)+15)%15;
 const high=phase>=10,warning=phase>=8&&phase<10;
 // Smoothstep is a physical water-pressure ramp, not a UI transition.
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 const pressure=high?smooth((phase-10)/.5)*smooth((15-phase)/.5):0;
 return {cycle,phase,high,warning,pressure};
}
export function createFountainFlow(scene,site){
 const root=new T.Group();root.name='PARTY_fountain-flow';root.position.set(site.x,site.top+.03,site.z);
 const geo=new T.CylinderGeometry(1,1,1,6),dropGeo=new T.SphereGeometry(1,6,4);
 const mat=new T.MeshBasicMaterial({color:'#bce9ef',transparent:true,opacity:.58,depthWrite:false});
 const streams=new T.InstancedMesh(geo,mat,8*24),drops=new T.InstancedMesh(dropGeo,mat,32);
 streams.frustumCulled=drops.frustumCulled=false;root.add(streams,drops);scene.add(root);
 let basin=createFountainBasinWater(scene,site);if(basin)root.add(basin);
 // The fountain can install before the pond's shared shader adapter. Do not
 // permanently keep an empty basin because the first material was not ready.
 let basinCheckedAt=-Infinity;
 const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3();
 const fall=site.waterY-site.top-.03,radius=site.radius*.8;
 function point(out,angle,u,height){return out.set(Math.cos(angle)*radius*u,4*height*u*(1-u)+fall*u,Math.sin(angle)*radius*u)}
 let last=null;
 return {step(seconds,reduced=false){
  const phase=fountainPhase(seconds);last=phase;root.visible=true;
  const basinClock=Number.isFinite(seconds)?seconds:0;
  if(!basin&&(basinClock-basinCheckedAt>=1||basinClock<basinCheckedAt)){
   basinCheckedAt=basinClock;basin=createFountainBasinWater(scene,site);if(basin)root.add(basin);
  }
  const height=.85+phase.pressure*4.5+(phase.warning?.12:0);
  for(let j=0;j<8;j++)for(let i=0;i<24;i++){
   const angle=j*Math.PI/4;point(a,angle,i/24,height);point(b,angle,(i+1)/24,height);
   direction.subVectors(b,a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());
   const width=.035+phase.pressure*.035;dummy.scale.set(width,direction.length()+.008,width);dummy.updateMatrix();streams.setMatrixAt(j*24+i,dummy.matrix);
  }streams.instanceMatrix.needsUpdate=true;drops.visible=!reduced;
  if(!reduced){for(let i=0;i<32;i++){
   const u=((seconds*.65+i/32)%1+1)%1;point(dummy.position,(i%8)*Math.PI/4,u,height);dummy.quaternion.identity();dummy.scale.setScalar(.055+phase.pressure*.025);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
  }drops.instanceMatrix.needsUpdate=true;}
  return phase;
 },clear(){root.visible=false;},stats:()=>({flow:true,basinWater:!!basin,active:last?.high?1:0,phase:last,drawCalls:basin?3:2}),dispose(){root.removeFromParent();geo.dispose();dropGeo.dispose();mat.dispose();streams.dispose();drops.dispose();basin?.geometry.dispose();basin?.material.dispose();}};
}
