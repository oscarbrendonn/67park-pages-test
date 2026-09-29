import * as T from 'three';

// Presentation only: the lobby still owns location, jump/E entry and travel.
// Nothing solid surrounds this opening. Its feathered outline is light, not a
// frame, and a shallow volume keeps that light visible from oblique approaches.
const CENTER=2.65, WIDTH=2.15, HEIGHT=2.55;
const clamp=v=>Number.isFinite(v)?Math.min(1,Math.max(0,v)):0;

function portalMaterial(){
 return new T.ShaderMaterial({
  name:'67_SOFT_MAGIC_VEIL',transparent:true,depthWrite:false,side:T.FrontSide,
  // One local analytic surface: no texture, bloom, render target or light.
  uniforms:{time:{value:0},strength:{value:0},mint:{value:new T.Color('#a6e2d6')},lilac:{value:new T.Color('#cbbce9')},cream:{value:new T.Color('#fff1d9')}},
  vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 p;uniform float time,strength;uniform vec3 mint,lilac,cream;
   void main(){
    float r=length(p),a=atan(p.y,p.x+.0000001);
    float boundary=.80+.009*sin(a*3.+time*.22)+.005*sin(a*5.-time*.16);
    float d=r-boundary;
    float rim=exp(-d*d/(.031*.031));
    float aura=exp(-d*d/(.112*.112));
    float inside=1.-smoothstep(boundary-.065,boundary+.025,r);
    float feather=1.-smoothstep(.94,1.,r);
    float tide=.5+.5*sin(p.y*3.1+sin(p.x*2.4+time*.22)-time*.28);
    float ribbon=pow(.5+.5*sin(p.x*3.2-p.y*3.8+sin(p.y*2.+time*.18)),6.);
    vec3 color=mix(mint,lilac,tide*.70);
    color=mix(color,cream,rim*.78+ribbon*inside*.12);
    float alpha=feather*(inside*(.36+ribbon*.09)+aura*.20+rim*.48);
    gl_FragColor=vec4(color,strength*min(.87,alpha));
    #include <colorspace_fragment>
   }`,
 });
}

function moteMaterial(){
 return new T.ShaderMaterial({
  name:'67_SOFT_WISH_MOTE',transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
  uniforms:{strength:{value:1},color:{value:new T.Color('#fff4dc')}},
  vertexShader:`varying vec2 p;void main(){p=position.xy;vec4 local=vec4(position,1.);
   #ifdef USE_INSTANCING
    local=instanceMatrix*local;
   #endif
   gl_Position=projectionMatrix*modelViewMatrix*local;}`,
  fragmentShader:`varying vec2 p;uniform float strength;uniform vec3 color;void main(){
   float glow=exp(-dot(p,p)*5.5)*(1.-smoothstep(.65,1.,length(p)));
   gl_FragColor=vec4(color,glow*strength*.85);
   #include <colorspace_fragment>
  }`,
 });
}

function resources(root){
 let disposed=false;
 return ()=>{
  if(disposed)return;disposed=true;root.removeFromParent();
  const gs=new Set(),ms=new Set();
  root.traverse(o=>{if(!o.isMesh)return;gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);if(o.isInstancedMesh)o.dispose();});
  for(const item of [...gs,...ms])item.dispose();
 };
}

export function createMinigameGateway(world,anchor){
 const root=new T.Group();root.name='CANDY_BALLOON_DOOR';
 root.position.set(anchor.x,world.ground(anchor.x,anchor.z),anchor.z);root.rotation.y=anchor.yaw;
 const effect=new T.Group();effect.name='67_ENTRANCE_MAGIC';root.add(effect);
 const veilMaterial=portalMaterial(),veil=new T.Mesh(new T.SphereGeometry(1,64,32),veilMaterial);
 veil.name='GATE_MAGIC_SURFACE';veil.position.y=CENTER;veil.scale.set(WIDTH,HEIGHT,.26);effect.add(veil);
 const glowMaterial=moteMaterial();
 const sparkles=new T.InstancedMesh(new T.CircleGeometry(1,16),glowMaterial,12);sparkles.name='GATE_WISH_MOTES';sparkles.frustumCulled=false;effect.add(sparkles);
 const matrix=new T.Object3D();
 const putMotes=time=>{
  for(let i=0;i<12;i++){
   const lane=i%6,side=i<6?1:-1,a=lane*Math.PI/3+Math.PI/6+time*.045;
   const radius=.86+.025*Math.sin(time*.24+lane);
   // A fixed pool with continuous drift, not particles spawning or popping.
   matrix.position.set(Math.cos(a)*WIDTH*radius,CENTER+Math.sin(a)*HEIGHT*radius,side*.28);
   matrix.scale.setScalar((.085+(lane%3)*.018)*(.94+.06*Math.sin(time*.5+lane)));
   matrix.updateMatrix();sparkles.setMatrixAt(i,matrix.matrix);
  }sparkles.instanceMatrix.needsUpdate=true;
 };
 sparkles.instanceMatrix.setUsage(T.DynamicDrawUsage);putMotes(0);world.scene.add(root);
 const release=resources(root);let dead=false,lastTime=-1;
 const portal={group:effect,update(time=0,amount=.42){
  if(dead||!effect.visible)return;
  const t=Number.isFinite(time)?time:0,strength=clamp(amount/.42);
  veilMaterial.uniforms.time.value=t;veilMaterial.uniforms.strength.value=strength;glowMaterial.uniforms.strength.value=strength;
  if(t!==lastTime){putMotes(t);lastTime=t;}
 },hide(){effect.visible=false;},dispose(){if(dead)return;dead=true;release();}};
 effect.visible=false;
 return {root,portal,dispose:portal.dispose,stats:{revision:'magic-rift-2',lights:0,renderTargets:0,downloadBytes:0,textureBytes:0,particles:12}};
}

// The existing travel placement, fade and timing contract is unchanged. This
// small rift uses the same feathered surface, with no physical ring or corners.
export function createMagicTravelPortal(scene){
 const root=new T.Group();root.name='67_TRAVEL_RIFT';root.visible=false;scene.add(root);
 const material=portalMaterial(),surface=new T.Mesh(new T.SphereGeometry(1,48,24),material);
 surface.scale.set(1.64,1.64,.14);root.add(surface);
 const release=resources(root);let dead=false;
 return {group:root,place(p,yaw){if(dead)return;root.position.set(p.x,p.y+.45,p.z);root.rotation.y=yaw;root.visible=true;},update(time,alpha){if(dead)return;const a=clamp(alpha);material.uniforms.time.value=Number.isFinite(time)?time:0;material.uniforms.strength.value=a;root.scale.setScalar(.85+a*.15);},hide(){root.visible=false;},dispose(){if(dead)return;dead=true;release();}};
}
