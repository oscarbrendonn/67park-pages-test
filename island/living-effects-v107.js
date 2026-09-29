import * as T from 'three';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
import {createCandyMotionFX} from './candy-motion-fx.js';

// Contact feedback, not a UI transition: physical velocity/drag controls the
// leaves and water. Fixed pools, no textures, lights, workers or render targets.
// The original terrain, approved foliage buffers, collisions and inputs stay
// unchanged. Reduced motion keeps quiet contact marks but removes ambient sway.
export const EFFECT_BUDGET107=Object.freeze({
 desktop:{leaves:16,grass:18,marks:72,drops:24,ripples:8},
 mobile:{leaves:12,grass:12,marks:48,drops:16,ripples:6},
 radius:10,footLife:7,trackLife:5,splashLife:.7
});
const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
const hash=(x,z,k=0)=>{const n=Math.sin(x*127.1+z*311.7+k*74.7)*43758.5453;return n-Math.floor(n);};
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

export function surfaceKind107(name=''){
 if(/WATER|DENIZ|GOLET.*SU|MAIN_WATER|^1_TABAN/.test(name))return 'water';
 if(/KUM|KIYI_TOPRAK|KURU_IC_ZEMIN_KIYI|STADIUM99_sand/.test(name))return 'sand';
 if(/CIM|LAWN_\d+$/.test(name)&&!/RIM|TASIYICI|DESTEK|HALKASI/.test(name))return 'grass';
 if(/TIMBER|timber|ISKELE|KOPRU/.test(name))return 'wood';
 return 'hard';
}

export function createEffectSurface107({scene,sample,ground,water,sea}){
 const beach=scene.getObjectByName('S99_floor:STADIUM99_sand');
 const extra=beach?createCityHeightSampler58([beach],{cellSize:3}):null;
 return (x,z)=>{
  if(water(x,z))return {kind:'water',y:sea(x,z)};
  const original=sample(x,z),sand=extra?.sample(x,z);
  const hit=sand&&(!original||sand.point.y>original.point.y)?sand:original;
  const support=ground(x,z);
  if(!hit||!Number.isFinite(support))return null;
  // A boardwalk, pool deck, building or raised prop over sand/grass is NOT
  // that substrate. Never draw footprints on a roof or grass through a deck.
  const covered=support>hit.point.y+.10;
  return {kind:covered?'hard':surfaceKind107(hit.object?.name),y:support,name:hit.object?.name};
 };
}

export function leafGeometry107(){
 // One continuous, softly inflated leaf. Rounded canopy-green lobes replace
 // the flat angular autumn-confetti triangles, without altering any tree.
 const g=new T.SphereGeometry(1,24,14),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  p.setXYZ(i,x*.34*(.96+.10*z),y*.18+.185+z*z*.03,z*.5);
 }
 g.computeVertexNormals();
 const stem=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.12,-.37),new T.Vector3(.015,.075,-.53),new T.Vector3(.08,.045,-.64)]),5,.026,8,false);
 const tip=new T.SphereGeometry(.026,8,6);tip.translate(.08,.045,-.64);
 const leaf=mergeGeometries([g,stem,tip]);g.dispose();stem.dispose();tip.dispose();return leaf;
}
function grassGeometry107(){
 const parts=[];
 for(let i=0;i<3;i++){
  const angle=i*2.2,c=Math.cos(angle),s=Math.sin(angle),h=.13+i*.025;
  const end=new T.Vector3(c*.055,h,s*.055),path=new T.CatmullRomCurve3([new T.Vector3(0,.014,0),new T.Vector3(c*.028,h*.54,s*.028),end]);
  parts.push(new T.TubeGeometry(path,3,.020,5,false));
  const cap=new T.SphereGeometry(.020,6,4);cap.translate(end.x,end.y,end.z);parts.push(cap);
 }
 const g=mergeGeometries(parts);for(const part of parts)part.dispose();
 const pos=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,.5,clamp(pos.getY(i)/.20,0,1));return g;
}

// Preserve every existing foliage shader hook and material finish. Only near
// LODs bend, and the shadow uses exactly the same deformation. Roots stay fixed.
export function installWind107(scene,uniforms){
 const rows=[],materials=new Map();
 const targets=[];scene.traverse(m=>{if(m.isInstancedMesh&&m.geometry.getAttribute('_cavity')&&/(tree|shrub)-near/.test(m.name))targets.push(m);});
 for(const mesh of targets){
  const original=mesh.material,geometry=mesh.geometry;geometry.computeBoundingBox();
  const min=geometry.boundingBox.min.y,span=Math.max(.01,geometry.boundingBox.max.y-min);
  const key=original.uuid+':'+min+':'+span;let pair=materials.get(key);
  if(!pair){
   const material=original.clone(),before=original.onBeforeCompile,cache=original.customProgramCacheKey.bind(original);
   const declaration='uniform float uWindTime107; uniform float uWindGain107; uniform vec3 uWindCamera107;';
   const deformation=`
    vec4 anchor107 = vec4(0.0,0.0,0.0,1.0);
    float scale107 = 1.0;
    #ifdef USE_INSTANCING
     anchor107 = instanceMatrix * anchor107;
     scale107 = max(.01,length(instanceMatrix[0].xyz));
    #endif
    anchor107 = modelMatrix * anchor107;
    float nearby107 = 1.0-smoothstep(28.0,46.0,distance(anchor107.xyz,uWindCamera107));
    float crown107 = smoothstep(.20,.88,(position.y-(${min.toFixed(7)}))/${span.toFixed(7)});
    float phase107 = anchor107.x*.19+anchor107.z*.23;
    float breeze107 = sin(uWindTime107*1.15+phase107)+.25*sin(uWindTime107*1.91+phase107*1.7);
    transformed.xz += vec2(1.0,.42)*breeze107*(.055/scale107)*crown107*nearby107*uWindGain107;
   `;
   const inject=shader=>{
    shader.uniforms.uWindTime107=uniforms.time;shader.uniforms.uWindGain107=uniforms.wind;shader.uniforms.uWindCamera107=uniforms.camera;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+declaration).replace('#include <begin_vertex>','#include <begin_vertex>\n'+deformation);
   };
   material.onBeforeCompile=(shader,renderer)=>{before.call(material,shader,renderer);inject(shader);};
   material.customProgramCacheKey=()=>cache()+'-wind107-'+min+'-'+span;
   const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'wind107-depth-'+min+'-'+span;
   pair={material,depth};materials.set(key,pair);
  }
  rows.push({mesh,original,depth:mesh.customDepthMaterial});mesh.material=pair.material;mesh.customDepthMaterial=pair.depth;
 }
 return {count:rows.length,dispose(){for(const r of rows){r.mesh.material=r.original;r.mesh.customDepthMaterial=r.depth;}for(const p of materials.values()){p.material.dispose();p.depth.dispose();}}};
}

function batch107(group,name,geometry,capacity,color,{double=false,fragment='',extra=false,rounded=false}={}){
 const alpha=new T.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(T.DynamicDrawUsage);
 const types=extra?new T.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(T.DynamicDrawUsage):null;
 geometry.setAttribute('aAlpha107',alpha);if(types)geometry.setAttribute('aType107',types);
 const params={color,transparent:true,depthWrite:false,side:double?T.DoubleSide:T.FrontSide};
 const material=rounded?new T.MeshStandardMaterial({...params,roughness:.40,metalness:0,envMapIntensity:.45}):new T.MeshLambertMaterial(params);
 material.forceSinglePass=true;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aAlpha107; varying float vAlpha107;'+(extra?'attribute float aType107; varying float vType107; varying vec2 vUV107;':''))
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvAlpha107=aAlpha107;'+(extra?'vType107=aType107; vUV107=uv;':''));
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vAlpha107;'+(extra?'varying float vType107; varying vec2 vUV107;':''))
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vAlpha107;\n'+fragment+'\nif(diffuseColor.a<.004)discard;');
 };
 material.customProgramCacheKey=()=> 'living107-'+name;
 const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name='LIVING107_'+name;
 mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;group.add(mesh);
 const dummy=new T.Object3D();let count=0;
 return {mesh,alpha,types,begin(){count=0;},put(p,opacity=1,type=0){
  if(count>=capacity)return;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();
  mesh.setMatrixAt(count,dummy.matrix);alpha.setX(count,opacity);if(types)types.setX(count,type);if(p.color)mesh.setColorAt(count,p.color);count++;
 },end(){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;if(types)types.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;},dispose(){geometry.dispose();material.dispose();}};
}

export function createLivingEffects107({scene,renderer,sample,ground,water,sea,plants=[],mobile=false,surfaceAt=null,reducedMotion=null}){
 const budget=EFFECT_BUDGET107[mobile?'mobile':'desktop'],surface=surfaceAt||createEffectSurface107({scene,sample,ground,water,sea});
 const media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 let reduce=reducedMotion??media?.matches??false,enabled=true,disposed=false;
 const uniforms={time:{value:0},wind:{value:0},camera:{value:new T.Vector3()},player:{value:new T.Vector4(0,0,0,0)}};
 const group=new T.Group();group.name='LIVING_WORLD_EFFECTS_V107';scene.add(group);
 const motion=createCandyMotionFX({scene:group,mobile,reducedMotion:reduce});
 const wind=installWind107(scene,uniforms);
 const colors=['#98a980','#a6b58c','#8fa176'].map(c=>new T.Color(c));
 const leaf=batch107(group,'pastel-leaves',leafGeometry107(),budget.leaves,'#ffffff',{rounded:true});
 const grass=batch107(group,'soft-grass',grassGeometry107(),budget.grass,'#a8b68d');
 grass.mesh.material.emissive.set('#9dad87');grass.mesh.material.emissiveIntensity=.10;
 const grassBefore=grass.mesh.material.onBeforeCompile;
 grass.mesh.material.onBeforeCompile=(shader,r)=>{
  grassBefore(shader,r);shader.uniforms.uBreeze107=uniforms.time;shader.uniforms.uGrassWind107=uniforms.wind;shader.uniforms.uPlayer107=uniforms.player;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uBreeze107; uniform float uGrassWind107; uniform vec4 uPlayer107;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 root107=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
    vec2 delta107=root107.xz-uPlayer107.xy;
    float near107=1.-smoothstep(.20,1.45,length(delta107));
    vec2 push107=delta107/max(.15,length(delta107))*near107*uPlayer107.z*.045;
    vec2 breeze107=vec2(1.,.42)*sin(uBreeze107*1.3+root107.x*.8+root107.z*.6)*.009*uGrassWind107;
    transformed.xz+=(push107+breeze107)*pow(uv.y,2.);
   `);
 };
 const plane=new T.PlaneGeometry(2,2);plane.rotateX(-Math.PI/2);
 const marks=batch107(group,'sand-marks',plane,budget.marks,'#8e795e',{extra:true,fragment:`
  vec2 q107=vec2(vUV107.x*2.-1.,1.-vUV107.y*2.);float mask107;
  if(vType107<.5){
   float toe107=length((q107-vec2(0.,.28))/vec2(.70,.68));
   float heel107=length((q107-vec2(0.,-.48))/vec2(.53,.37));
   mask107=1.-smoothstep(.79,1.,min(toe107,heel107));
  }else{
   mask107=(1.-smoothstep(.075,.18,abs(abs(q107.x)-.68)))*(1.-smoothstep(.86,1.,abs(q107.y)));
  }
  diffuseColor.a*=mask107;
 `});
 const drops=batch107(group,'water-droplets',new T.SphereGeometry(1,6,4),budget.drops,'#b3d6df');
 const ring=new T.RingGeometry(.83,1,24);ring.rotateX(-Math.PI/2);
 const ripples=batch107(group,'water-rings',ring,budget.ripples,'#d4e9e9');
 const batches=[leaf,grass,marks,drops,ripples];
 const leaves=Array.from({length:budget.leaves},()=>({alive:false})),tufts=Array.from({length:budget.grass},()=>({alive:false}));
 const prints=Array.from({length:budget.marks},()=>({alive:false})),droplets=Array.from({length:budget.drops},()=>({alive:false})),rings=Array.from({length:budget.ripples},()=>({alive:false}));
 let markIndex=0,dropIndex=0,ringIndex=0,leafIndex=0,grassIndex=0,seed=0,seedClock=0,stepDistance=0,trackDistance=0,swimClock=0,side=1,last=null,lastController=null;
 let statClock=0,cpuTotal=0,cpuFrames=0,elapsed=0;
 let sprintActive=false,burstCooldown=0,trailClock=0;
 const stats={version:107,leafStyle:'rounded-canopy-green-v108',budget:{...budget},mobile,reduced:reduce,addedLights:0,addedTextures:0,addedRenderTargets:0,windMeshes:wind.count,leaves:0,airborne:0,grass:0,marks:0,drops:0,ripples:0,kicks:0,entries:0,footprints:0,tracks:0,cpuMs:0};
 const nearPlant=(x,z)=>plants.some(p=>(p.asset==='tree'||p.asset==='shrub')&&(p.x-x)**2+(p.z-z)**2<(p.asset==='tree'?60:16));
 function plantCandidate(x,z,type){
  if(!nearPlant(x,z))return null;
  const r=surface(x,z);if(!r||r.kind==='water'||r.kind==='sand'||r.kind==='wood')return null;
  if(type==='grass'&&r.kind!=='grass')return null;return r;
 }
 function seedNearby(p){
  // Fixed attempt budget, not one raycast per leaf per frame. Fade newly
  // encountered patches in; do not produce an endless stream from the player.
  for(let i=0;i<8;i++){
   const k=seed++,angle=hash(k,31)*Math.PI*2,radius=1.2+hash(k,19)*8.0;
   const x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
   if(i<3){
    const a=leaves[leafIndex%leaves.length];if(a.alive)continue;const r=plantCandidate(x,z,'leaf');if(!r)continue;
    if(leaves.some(b=>b.alive&&(b.x-x)**2+(b.z-z)**2<.8))continue;
    Object.assign(a,{alive:true,x,y:r.y+.018,z,base:r.y+.018,vx:0,vy:0,vz:0,age:0,cool:0,ry:angle,rx:0,rz:0,size:.30+hash(k,10)*.13,color:colors[k%colors.length]});leafIndex++;
   }else{
    const a=tufts[grassIndex%tufts.length];if(a.alive)continue;const r=plantCandidate(x,z,'grass');if(!r)continue;
    if(tufts.some(b=>b.alive&&(b.x-x)**2+(b.z-z)**2<3.0))continue;
    Object.assign(a,{alive:true,x,y:r.y+.012,z,age:0,ry:angle,size:.68+hash(k,13)*.48});grassIndex++;
   }
  }
 }
 function clear(){for(const list of [leaves,tufts,prints,droplets,rings])for(const p of list)p.alive=false;last=null;stepDistance=trackDistance=swimClock=0;leafIndex=grassIndex=0;sprintActive=false;burstCooldown=trailClock=0;motion.clear();for(const b of batches){b.mesh.count=0;b.mesh.visible=false;}}
 // Both the body and the sampled surface must agree on contact. This keeps
 // feedback off water, beneath bridges, and away from ledges/airborne feet.
 function motionContact(x,z,p,heading,size,speed){
  const r=surface(x,z);
  return r&&r.kind!=='water'&&Number.isFinite(r.y)&&Math.abs(p.foot-r.y)<.24
   ?{x,y:r.y,z,heading,size,speed,kind:r.kind}:null;
 }
 function print(x,z,heading,type,size,length){
  const r=surface(x,z);if(r?.kind!=='sand')return;
  const p=prints[markIndex++%prints.length];
  Object.assign(p,{alive:true,x,y:r.y+.018,z,ry:heading,age:0,life:type?EFFECT_BUDGET107.trackLife:EFFECT_BUDGET107.footLife,type,sx:(type?.19:.12)*size,sy:1,sz:type?length/2:.20*size});
  if(type)stats.tracks++;else stats.footprints++;
 }
 function addRing(x,y,z,strength=1){const p=rings[ringIndex++%rings.length];Object.assign(p,{alive:true,x,y:y+.026,z,age:0,life:.78,strength});}
 function splash(p){
  const y=sea(p.x,p.z);if(!Number.isFinite(y))return;stats.entries++;
  addRing(p.x,y,p.z,reduce?.50:1);
  if(reduce)return;
  const count=mobile?6:9;
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2+hash(i,stats.entries),speed=.5+hash(i,13)*.6,d=droplets[dropIndex++%droplets.length];
   Object.assign(d,{alive:true,x:p.x+Math.cos(a)*.13,y:y+.04,z:p.z+Math.sin(a)*.13,base:y+.02,age:0,life:EFFECT_BUDGET107.splashLife,vx:Math.cos(a)*speed,vy:1.15+hash(i,4)*.7,vz:Math.sin(a)*speed,size:.032+hash(i,8)*.024});
  }
 }
 function update(dt,{controller=null,camera=null,active=true,paused=false,mounted=false}={}){
  if(disposed)return;const start=performance.now();
  if(!Number.isFinite(dt)||dt<0){clear();return;}
  if(dt>.25)clear(); // Never replay stale speed trails after a suspended frame.
  dt=clamp(dt,0,.05);
  const run=enabled&&active&&!paused&&!mounted&&!!controller?.body?.visible;
  if(camera)uniforms.camera.value.copy(camera.position);
  uniforms.wind.value=run&&!reduce?1:0;
  group.visible=run;
  if(!run){if(last)clear();uniforms.player.value.z=0;return;}
  if(lastController!==controller){clear();lastController=controller;}
  elapsed+=dt;uniforms.time.value=elapsed;
  const c=controller,p={x:c.body.position.x,z:c.body.position.z,foot:c.foot,swimming:!!c.swimming,grounded:!!c.grounded,board:!!(c.boardOn&&c.board&&!c.swimming),sprinting:!!c.sprinting,height:c.height||1.6};
  if(!Number.isFinite(p.x+p.z+p.foot)){clear();return;}
  const distance=last?Math.hypot(p.x-last.x,p.z-last.z):0,teleport=distance>Math.max(2,dt*35);
  if(teleport)clear();
  const speed=last&&!teleport?distance/Math.max(.001,dt):0;
  burstCooldown=Math.max(0,burstCooldown-dt);trailClock=Math.max(0,trailClock-dt);
  const contactSurface=p.grounded&&!p.swimming?surface(p.x,p.z):null;
  if(!contactSurface||contactSurface.kind==='water'||!Number.isFinite(contactSurface.y)||Math.abs(p.foot-contactSurface.y)>=.24){motion.clear();trailClock=0;}
  uniforms.player.value.set(p.x,p.z,p.grounded?clamp(speed*.16,0,1)*(reduce?.25:1):0,0);
  seedClock-=dt;if(seedClock<=0){seedClock=.22;seedNearby(p);}
  if(last&&!teleport){
   if(p.swimming&&!last.swimming)splash(p);
   if(p.swimming){swimClock+=dt;if(speed>.3&&swimClock>.65){addRing(p.x,sea(p.x,p.z),p.z,reduce?.25:.48);swimClock=0;}}
   else swimClock=0;
   const contact=p.grounded&&last.grounded&&!p.swimming&&!last.swimming;
   if(contact&&speed>.2){
    const heading=Math.atan2(p.x-last.x,p.z-last.z),size=clamp(p.height/1.6,.7,1.35);
    const at=motionContact(p.x,p.z,p,heading,size,speed);
    // Sprint input alone is insufficient: pushing into a wall stays quiet.
    // The pulse is cosmetic sprint-start feedback, not a new power-up system.
    const sprint=p.sprinting&&speed>2&&!!at;
    if(sprint&&!sprintActive&&burstCooldown===0){motion.burst(at);burstCooldown=1.2;}
    sprintActive=sprint;
    if(at&&(sprint||(p.board&&speed>3))&&trailClock===0){motion.trail(at);trailClock=mobile?.075:.055;}
    if(p.board){
     stepDistance=0;if(!last.board)trackDistance=0;trackDistance+=distance;
     if(trackDistance>=.23){const length=Math.min(trackDistance,.6),mx=p.x-Math.sin(heading)*length/2,mz=p.z-Math.cos(heading)*length/2;print(mx,mz,heading,1,size,length+.04);trackDistance=0;}
    }else{
     trackDistance=0;if(last.board)stepDistance=0;stepDistance+=distance;
     if(stepDistance>=.48*size){
      side*=-1;const x=p.x+Math.cos(heading)*.105*side*size,z=p.z-Math.sin(heading)*.105*side*size;
      print(x,z,heading,0,size,0);
      const foot=motionContact(x,z,p,heading,size,speed);if(foot)motion.step(foot);
      stepDistance%=.48*size;
     }
    }
   }else{stepDistance=trackDistance=0;if(!p.sprinting||speed<.2)sprintActive=false;}
  }
  motion.update(dt,{camera});
  const vx=last&&!teleport?(p.x-last.x)/Math.max(dt,.001):0,vz=last&&!teleport?(p.z-last.z)/Math.max(dt,.001):0;
  leaf.begin();grass.begin();marks.begin();drops.begin();ripples.begin();let airborne=0;
  for(const a of leaves){
   if(!a.alive)continue;const d=Math.hypot(a.x-p.x,a.z-p.z);if(d>12){a.alive=false;continue;}
   a.age+=dt;a.cool=Math.max(0,a.cool-dt);
   if(p.grounded&&!p.swimming&&speed>.6&&d<(p.board?1.05:.7)&&a.cool===0&&Math.abs(p.foot-a.base)<.45){
    const amount=reduce?.15:1,dx=(a.x-p.x)/Math.max(.15,d),dz=(a.z-p.z)/Math.max(.15,d);
    a.vx=(dx*.75+vx*.23)*amount;a.vz=(dz*.75+vz*.23)*amount;a.vy=reduce?0:.65+Math.min(speed,10)*.09;a.cool=1.15;stats.kicks++;
   }
   if(Math.abs(a.vx)+Math.abs(a.vz)+Math.abs(a.vy)>.015||a.y>a.base+.002){
    a.x+=a.vx*dt;a.z+=a.vz*dt;a.y+=a.vy*dt;a.vy-=3.4*dt;a.vx*=Math.exp(-2.4*dt);a.vz*=Math.exp(-2.4*dt);
    if(a.y<=a.base){const r=surface(a.x,a.z);if(!r||r.kind==='water'||Math.abs(r.y-a.base)>.5){a.alive=false;continue;}a.base=r.y+.025;a.y=a.base;a.vy=0;a.vx*=.65;a.vz*=.65;}
    const lift=clamp((a.y-a.base)*4,0,1);a.rx=Math.sin(elapsed*7+a.ry)*.4*lift;a.rz=Math.cos(elapsed*5+a.ry)*.4*lift;if(lift>.01)airborne++;
   }
   leaf.put({...a,sx:a.size,sy:a.size,sz:a.size},smooth(a.age/.7)*(1-smooth((d-9)/3)));
  }
  for(const a of tufts){if(!a.alive)continue;const d=Math.hypot(a.x-p.x,a.z-p.z);if(d>12){a.alive=false;continue;}a.age+=dt;grass.put({...a,sx:a.size,sy:a.size,sz:a.size},smooth(a.age/.8)*(1-smooth((d-9)/3)));}
  for(const a of prints){if(!a.alive)continue;a.age+=dt;if(a.age>=a.life||Math.hypot(a.x-p.x,a.z-p.z)>26){a.alive=false;continue;}marks.put(a,.28*(1-smooth(a.age/a.life)),a.type);}
  for(const a of droplets){if(!a.alive)continue;a.age+=dt;a.x+=a.vx*dt;a.z+=a.vz*dt;a.y+=a.vy*dt;a.vy-=5.2*dt;if(a.age>=a.life||a.y<a.base){a.alive=false;continue;}drops.put({...a,sx:a.size,sy:a.size*1.3,sz:a.size},.72*(1-smooth(a.age/a.life)));}
  for(const a of rings){if(!a.alive)continue;a.age+=dt;if(a.age>=a.life){a.alive=false;continue;}const s=lerp(.18,.95,a.age/a.life)*a.strength;ripples.put({...a,sx:s,sy:1,sz:s},.46*(1-smooth(a.age/a.life)));}
  for(const b of batches)b.end();last=p;
  Object.assign(stats,{leaves:leaf.mesh.count,airborne,grass:grass.mesh.count,marks:marks.mesh.count,drops:drops.mesh.count,ripples:ripples.mesh.count});
  cpuTotal+=performance.now()-start;cpuFrames++;statClock+=dt;
  if(statClock>=1){stats.cpuMs=+(cpuTotal/cpuFrames).toFixed(3);statClock=cpuTotal=cpuFrames=0;renderer.domElement.dataset.livingEffects107=JSON.stringify(stats);}
 }
 const onReduced=()=>{reduce=reducedMotion??media?.matches??false;stats.reduced=reduce;motion.setReducedMotion(reduce);clear();};media?.addEventListener?.('change',onReduced);
 renderer.domElement.dataset.livingEffects107=JSON.stringify({...stats,status:'ready'});
 return {group,stats,surface,update,clear,
  setEnabled(value){enabled=!!value;clear();uniforms.wind.value=0;group.visible=enabled;return enabled;},
  get enabled(){return enabled;},
  inspect:()=>({enabled,reduced:reduce,stats:{...stats},motion:motion.inspect(),leaves:leaves.filter(p=>p.alive).map(p=>({x:p.x,y:p.y,z:p.z,base:p.base})),marks:prints.filter(p=>p.alive).map(p=>({x:p.x,y:p.y,z:p.z,type:p.type,age:p.age})),triangles:batches.reduce((n,b)=>n+(b.mesh.geometry.index?.count??b.mesh.geometry.attributes.position.count)/3*b.mesh.count,0),draws:batches.filter(b=>b.mesh.visible&&group.visible).length+motion.inspect().draws}),
  dispose(){if(disposed)return;disposed=true;media?.removeEventListener?.('change',onReduced);wind.dispose();motion.dispose();for(const b of batches)b.dispose();scene.remove(group);}
 };
}
