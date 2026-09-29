import * as THREE from 'three';

// Adaptive radial grid: radial spacing is finer than the old 1400/96 m
// ocean grid. A denser outer ring makes the actual circular silhouette smooth.
export function createWaterDiskGeometry(radius=312,spacing=1400/96,edgeSegments=256){
 if(!(radius>0&&spacing>0&&Number.isInteger(edgeSegments)&&edgeSegments>=32))throw Error('Invalid water disk');
 const positions=[0,0,0],uv=[.5,.5],normals=[0,0,1],indices=[];
 const layers=Math.ceil(radius/spacing);let previous=[0];
 for(let layer=1;layer<=layers;layer++){
  const r=radius*layer/layers;
  const count=layer===layers?edgeSegments:Math.max(8,Math.ceil(2*Math.PI*r/spacing/8)*8);
  const next=[];
  for(let j=0;j<count;j++){
   const a=2*Math.PI*j/count,x=Math.cos(a)*r,y=Math.sin(a)*r;
   next.push(positions.length/3);positions.push(x,y,0);normals.push(0,0,1);uv.push(x/radius*.5+.5,y/radius*.5+.5);
  }
  if(layer===1){for(let j=0;j<count;j++)indices.push(0,next[j],next[(j+1)%count]);}
  else{
   let i=0,j=0;const n=previous.length,m=next.length;
   while(i<n||j<m){
    const a=(i+1)/n,b=(j+1)/m,pi=previous[i%n],pj=next[j%m];
    if(Math.abs(a-b)<1e-10){indices.push(pi,pj,next[(j+1)%m],pi,next[(j+1)%m],previous[(i+1)%n]);i++;j++;}
    else if(a<b){indices.push(pi,pj,previous[(i+1)%n]);i++;}
    else{indices.push(pi,pj,next[(j+1)%m]);j++;}
   }
  }
  previous=next;
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.waterDisk={radius,spacing:radius/layers,edgeSegments,triangles:indices.length/3,vertices:positions.length/3};
 return geometry;
}

// One cheap opaque mesh for the gently rounded blue edge AND the distant
// static sea. No time/player uniforms, land mask, wave trig, wake exp or textures.
export function createWaterTableBackdrop(radius=312,edgeSegments=256){
 const profile=[
  [radius-.32,-.014,1.018],[radius-.10,-.026,1.01],
  [radius+.13,-.12,.98],[radius+.30,-.35,.93],
  [radius+.36,-1.62,.87],[radius+.58,-1.86,.91],
  [radius+.85,-1.94,1],[1400,-1.94,1]
 ];
 const p=[],shade=[],ix=[];
 for(const [r,z,s] of profile)for(let j=0;j<=edgeSegments;j++){const a=j/edgeSegments*Math.PI*2;p.push(Math.cos(a)*r,Math.sin(a)*r,z);shade.push(s);}
 const row=edgeSegments+1;
 for(let i=0;i<profile.length-1;i++)for(let j=0;j<edgeSegments;j++){const a=i*row+j,b=(i+1)*row+j;ix.push(a,b,b+1,a,b+1,a+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('tableShade',new THREE.Float32BufferAttribute(shade,1));geometry.setIndex(ix);geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({
  uniforms:{uDeep:{value:new THREE.Color('#b8c2d6')},uLight:{value:new THREE.Color('#c2cbdd')},uHorizon:{value:new THREE.Color('#c4ccdd')}},
  vertexShader:'attribute float tableShade;varying float vShade;varying vec3 vWorld;void main(){vShade=tableShade;vec4 wp=modelMatrix*vec4(position,1.);vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}',
  fragmentShader:'uniform vec3 uDeep,uLight,uHorizon;varying float vShade;varying vec3 vWorld;void main(){vec3 eye=normalize(cameraPosition-vWorld);float f=1.-clamp(abs(eye.y),0.,1.);vec3 col=mix(mix(uDeep,uLight,.52),uHorizon,f*f*f*.55)*vShade;gl_FragColor=vec4(col,1.);#include <colorspace_fragment>}'.replace(';#include',';\n#include'),
  side:THREE.DoubleSide,transparent:false,depthWrite:true,depthTest:true,toneMapped:false
 });
 const mesh=new THREE.Mesh(geometry,material);mesh.name='ISLAND_WATER_TABLE_EDGE_AND_STATIC_SEA';mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=true;mesh.renderOrder=0;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData.staticWaterBackdrop=true;
 return mesh;
}

export function installWaterTable(world,{center={x:40,z:-38},radius=312}={}){
 const water=world.scene.getObjectByName('KIMI_WATERBODY_GORUNUR');
 if(!water?.isMesh||!water.material?.isShaderMaterial)throw Error('Authored ocean not found for water table');
 if(water.userData.waterTable)return water.userData.waterTable;
 const material=water.material,oldGeometry=water.geometry,oldPosition=water.position.clone(),oldCull=water.frustumCulled;
 const vertex=material.vertexShader,fragment=material.fragmentShader;
 const waveAnchor=')*.15)*uAmp;';
 if(vertex.split(waveAnchor).length!==2)throw Error('Water vertex adapter drift');
 const wakeAnchor='if(uWet>.001){';
 if(fragment.split(wakeAnchor).length!==2)throw Error('Water wake adapter drift');
 const vertexNext='uniform vec2 uTableCenter;uniform float uTableRadius;\n'+vertex.replace(waveAnchor,')*.15)*uAmp*smoothstep(0.,1.5,uTableRadius-length(q-uTableCenter));');
 // The discarded old 3 m optimization was approximate. At 8 m the authored
 // wake contribution is <1.4e-9, below this material's display precision.
 material.fragmentShader=fragment.replace(wakeAnchor,'if(uWet>.001 && dot(p-uPlayer,p-uPlayer)<64.){');
 material.vertexShader=vertexNext;material.uniforms.uTableCenter={value:new THREE.Vector2(center.x,center.z)};material.uniforms.uTableRadius={value:radius};material.needsUpdate=true;
 water.geometry=createWaterDiskGeometry(radius);water.position.set(center.x,oldPosition.y,center.z);water.frustumCulled=true;water.updateMatrix();water.updateMatrixWorld(true);
 const backdrop=createWaterTableBackdrop(radius);backdrop.position.copy(water.position);backdrop.updateMatrix();backdrop.updateMatrixWorld(true);world.scene.add(backdrop);
 const stats={version:'circular-water-table-v2',center,radius,edgeDrop:1.94,oldTriangles:oldGeometry.index.count/3,activeTriangles:water.geometry.index.count/3,staticTriangles:backdrop.geometry.index.count/3,
  oldAnimatedArea:1400*1400,activeAnimatedArea:Math.PI*radius*radius,animatedAreaReduction:1-Math.PI*radius*radius/(1400*1400),waterDrawCallsBefore:1,waterDrawCallsAfter:2,extraTextures:0,
  outsideWaveCalculations:false,outsideWakeCalculations:false,interiorGridSpacing:water.geometry.userData.waterDisk.spacing,wakeRadius:8};
 const previousDataset=world.renderer.domElement.dataset.waterTable;let disposed=false;
 const api={stats,water,backdrop,dispose(){
  if(disposed)return;disposed=true;
  water.geometry.dispose();water.geometry=oldGeometry;water.position.copy(oldPosition);water.frustumCulled=oldCull;
  material.vertexShader=vertex;material.fragmentShader=fragment;delete material.uniforms.uTableCenter;delete material.uniforms.uTableRadius;material.needsUpdate=true;
  water.updateMatrix();water.updateMatrixWorld(true);backdrop.removeFromParent();backdrop.geometry.dispose();backdrop.material.dispose();delete water.userData.waterTable;
  if(previousDataset===undefined)delete world.renderer.domElement.dataset.waterTable;else world.renderer.domElement.dataset.waterTable=previousDataset;
 }};
 water.userData.waterTable=api;world.renderer.domElement.dataset.waterTable=JSON.stringify(stats);
 return api;
}
