import * as T from 'three';

// One immutable star buffer and one moon. Camera-relative sky only: no world
// meshes, colliders, lights, textures or per-frame particle allocations.
export function createParkNightSky(scene){
 const count=320,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const height=.10+.89*((i+.5)/count),angle=i*2.399963229728653,r=Math.sqrt(1-height*height);
  positions.set([Math.cos(angle)*r,height,Math.sin(angle)*r],i*3);
  const brightness=.48+.52*((i*73%101)/100);colors.set([brightness*.88,brightness*.94,brightness],i*3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const material=new T.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a *= 1.0 - smoothstep(0.08, 0.5, length(gl_PointCoord - vec2(0.5)));');};
 material.customProgramCacheKey=()=> 'park-night-stars-1';
 const stars=new T.Points(geometry,material);stars.name='PARK_NIGHT_STARS';stars.frustumCulled=false;stars.visible=false;scene.add(stars);
 const moonGeometry=new T.SphereGeometry(1,20,12),moonMaterial=new T.MeshBasicMaterial({color:'#fff0cf',transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
 const moon=new T.Mesh(moonGeometry,moonMaterial);moon.name='PARK_NIGHT_MOON';moon.visible=false;scene.add(moon);
 let opacity=0,disposed=false;
 return {step(daylight,camera,enabled=true){
  opacity=enabled&&Number.isFinite(daylight)?T.MathUtils.clamp((.55-daylight)/.55,0,1):0;
  stars.visible=moon.visible=!disposed&&opacity>0&&!!camera;
  if(!stars.visible)return;
  const radius=Math.min(700,Math.max(1,camera.far*.72));camera.getWorldPosition(stars.position);stars.scale.setScalar(radius);material.opacity=opacity*.88;
  moon.position.copy(stars.position);moon.position.x+=radius*.54;moon.position.y+=radius*.56;moon.position.z-=radius*.46;moon.scale.setScalar(radius*.026);moonMaterial.opacity=opacity;
 },stats:()=>({stars:count,visible:stars.visible,opacity,drawCalls:stars.visible?2:0}),
 dispose(){if(disposed)return;disposed=true;stars.removeFromParent();moon.removeFromParent();geometry.dispose();material.dispose();moonGeometry.dispose();moonMaterial.dispose();}};
}
