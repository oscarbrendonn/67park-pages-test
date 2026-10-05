import * as T from 'three';
import {parkClock} from '../park-clock.js';
import {fountainSite} from './fountain-launcher.js?v=fountain-1';
import {createParkNightSky} from './park-night-sky.js';

export const SHOW=Object.freeze({hour:20,duration:45,interval:3,life:3.8,particles:48,slots:2});
export function eveningState(clock){
 const age=(clock.hour-SHOW.hour)*60;
 const sun=Math.sin((clock.dayT-.25)*Math.PI*2);
 const t=T.MathUtils.clamp((sun+.06)/.34,0,1),daylight=t*t*(3-2*t);
 return {age,active:age>=0&&age<SHOW.duration,daylight};
}
// Absolute-time choreography: joining mid-show or resuming a hidden tab never
// queues old explosions. Two batches / 96 particles total, no lights or shadows.
export function createFireworks(scene,site){
 const geometry=new T.BufferGeometry(),positions=new Float32Array(SHOW.slots*SHOW.particles*3),colors=new Float32Array(positions.length);
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));
 const material=new T.PointsMaterial({size:.55,vertexColors:true,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a *= 1.0 - smoothstep(0.15, 0.5, length(gl_PointCoord - vec2(0.5)));');};
 material.customProgramCacheKey=()=> 'park-round-firework-1';
 const points=new T.Points(geometry,material);points.name='PARK_EVENING_FIREWORKS';points.frustumCulled=false;points.visible=false;scene.add(points);
 const tailPositions=new Float32Array(positions.length*2),tailColors=new Float32Array(colors.length*2),tailGeometry=new T.BufferGeometry();
 tailGeometry.setAttribute('position',new T.BufferAttribute(tailPositions,3).setUsage(T.DynamicDrawUsage));tailGeometry.setAttribute('color',new T.BufferAttribute(tailColors,3).setUsage(T.DynamicDrawUsage));
 const tailMaterial=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending});
 const tails=new T.LineSegments(tailGeometry,tailMaterial);tails.name='PARK_FIREWORK_TRAILS';tails.frustumCulled=false;tails.visible=false;scene.add(tails);
 const palette=['#ff95cf','#7ad5ff','#91edba','#bb9dff'].map(c=>new T.Color(c));let count=0;
 return {step(age,{active=true,reduced=false}={}){
  count=0;points.visible=active&&age>=0&&age<SHOW.duration;
  tails.visible=points.visible&&!reduced;
  if(!points.visible){geometry.setDrawRange(0,0);tailGeometry.setDrawRange(0,0);return;}
  const newest=Math.floor(age/SHOW.interval);
  for(let j=0;j<SHOW.slots;j++){
   const n=newest-j,t=age-n*SHOW.interval;if(n<0||t<0||t>SHOW.life)continue;
   const burst=t>=.8,elapsed=Math.max(0,t-.8),fade=Math.min(1,elapsed/.4)*Math.max(0,1-elapsed/3);
   const cx=site.x+Math.sin(n*2.4)*13,cy=site.top+33+(n%3)*4,cz=site.z-15+Math.cos(n*1.8)*9;
   const total=burst?(reduced?12:SHOW.particles):(reduced?0:1);
   for(let i=0;i<total;i++){
    const u=1-2*(i+.5)/total,a=i*2.39996323,r=Math.sqrt(1-u*u),spread=reduced?5:elapsed*7;
    const k=count++*3;
    positions[k]=cx+(burst?Math.cos(a)*r*spread:0);
    positions[k+1]=burst?cy+u*spread-(reduced?0:elapsed*elapsed*1.4):site.top+8+(cy-site.top-8)*t/.8;
    positions[k+2]=cz+(burst?Math.sin(a)*r*spread:0);
    const c=palette[n%palette.length],brightness=burst?fade:.7;
    colors[k]=c.r*brightness;colors[k+1]=c.g*brightness;colors[k+2]=c.b*brightness;
    const past=Math.max(0,elapsed-.22),short=burst?past*7:0;
    const end=k*2;tailPositions[end]=cx+(burst?Math.cos(a)*r*short:0);tailPositions[end+1]=burst?cy+u*short-past*past*1.4:positions[k+1]-3;tailPositions[end+2]=cz+(burst?Math.sin(a)*r*short:0);
    for(let axis=0;axis<3;axis++){tailPositions[end+3+axis]=positions[k+axis];tailColors[end+axis]=colors[k+axis]*.1;tailColors[end+3+axis]=colors[k+axis];}
   }
  }
  geometry.setDrawRange(0,count);geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
  tailGeometry.setDrawRange(0,reduced?0:count*2);tailGeometry.attributes.position.needsUpdate=true;tailGeometry.attributes.color.needsUpdate=true;
 },stats:()=>({particles:count,capacity:SHOW.slots*SHOW.particles,visible:points.visible}),
 dispose(){points.removeFromParent();tails.removeFromParent();geometry.dispose();material.dispose();tailGeometry.dispose();tailMaterial.dispose();}};
}

export function createParkEvening({world,clock=()=>parkClock.read(),syncClock=t=>parkClock.sync(t),network=()=>globalThis.window?.__candyOnline?.world,enabled=()=>true,reducedMotion=()=>false}){
 let owner=null,fx=null,sky=null,site=null,lights=[],before=null,hook=null,last=null,disposed=false,sign=null,originalSky=null,originalFog=null,lastSnapshot=null;
 const nightSky=new T.Color('#252e51'),daySky=new T.Color('#c4ccdd'),moon=new T.Color('#becfff');
 function clear(){
  if(owner?.scene?.onBeforeRender===hook)owner.scene.onBeforeRender=before;
  for(const row of lights){row.light.intensity=row.intensity;row.light.color.copy(row.color);}
  if(originalSky&&owner?.scene?.background?.isColor)owner.scene.background.copy(originalSky);
  if(originalFog&&owner?.scene?.fog)owner.scene.fog.color.copy(originalFog);
  if(sign){sign.removeFromParent();sign.material.map.dispose();sign.material.dispose();sign=null;}
  fx?.dispose();sky?.dispose();owner=null;fx=null;sky=null;site=null;lights=[];
 }
 function render(camera){
  if(!owner||disposed)return;
  const time=clock(),s=eveningState(time),active=enabled();last={...time,...s,enabled:active};
  // Only the authored island sun/hemisphere, never character/shop preview rigs.
  for(const row of lights){row.light.intensity=row.intensity*(.23+.77*s.daylight);row.light.color.copy(row.color).lerp(moon,(1-s.daylight)*.55);}
  owner.scene.background?.isColor&&owner.scene.background.copy(nightSky).lerp(daySky,s.daylight);
  owner.scene.fog?.color.copy(nightSky).lerp(daySky,s.daylight);
  fx?.step(s.age,{active:active&&s.active,reduced:reducedMotion()});
  sky?.step(s.daylight,camera||owner.camera,active);
  if(sign)sign.visible=active&&!!owner.camera&&owner.camera.position.distanceTo(sign.position)<55;
 }
 return {step(){
  if(disposed)return;
  const snapshot=network();if(snapshot&&snapshot!==lastSnapshot&&Number.isFinite(snapshot.now)){lastSnapshot=snapshot;syncClock(snapshot.now);}
  const w=world();if(w!==owner){clear();if(!w?.ready||!enabled())return;
   owner=w;sky=createParkNightSky(w.scene);site=fountainSite(w.scene);if(site)fx=createFireworks(w.scene,site);
   originalSky=w.scene.background?.isColor?w.scene.background.clone():null;originalFog=w.scene.fog?.color.clone()??null;
   if(site&&typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=112;
    const ctx=canvas.getContext('2d'),tokens=getComputedStyle(document.documentElement);
    ctx.fillStyle=tokens.getPropertyValue('--park-ui-surface').trim()||'#f6f9ff';ctx.beginPath();ctx.roundRect(2,2,636,108,36);ctx.fill();
    ctx.fillStyle=tokens.getPropertyValue('--park-ui-ink').trim()||'#344651';ctx.font='600 32px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Fireworks · 20:00',320,56);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    sign=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sign.name='PARK_FIREWORKS_VIEWING_AREA';sign.scale.set(5.2,.91,1);sign.position.set(site.x+site.radius+3,site.top+1.3,site.z+site.radius+2);w.scene.add(sign);
   }
   w.scene.traverse(light=>{if(light.isHemisphereLight||(light.isDirectionalLight&&light.shadow?.bias===-.00002))lights.push({light,intensity:light.intensity,color:light.color.clone()});});
   before=w.scene.onBeforeRender;hook=function(...args){before?.apply(this,args);render(args[2]);};w.scene.onBeforeRender=hook;
   const original=w.dispose;w.dispose=function(...args){clear();return original?.apply(this,args);};
  }
 },debug:()=>({installed:!!owner,site,clock:last,lights:lights.length,fireworks:fx?.stats()??null,sky:sky?.stats()??null}),
 dispose(){disposed=true;clear();}};
}
