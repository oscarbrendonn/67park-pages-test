import * as T from 'three';

// Same shapes, colours and timing as the park's As/Ls equipment renderers.
// One instanced draw for power and one ring for vibe; no extra frame loop,
// lights, downloads, or unbounded particles. Root is feet-normalized here.
export const POWER_STYLE = Object.freeze({
  'pwr-stars': {color:'#ffd23f',shape:'star'},
  'pwr-hearts': {color:'#ff8ab5',shape:'heart'},
  'pwr-bolts': {color:'#ffb26b',shape:'bolt'},
});
export const VIBE_STYLE = Object.freeze({
  'vibe-pink':'#ff9fc6','vibe-mint':'#9be08d',
  'vibe-gold':'#ffd23f','vibe-sky':'#7cc4ff',
});
export function attachCharacterCosmetics(root, equipment, {
  reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,
  clock=()=>performance.now()/1000,
}={}) {
  const group=new T.Group();group.name='67PARK_SHARED_CHARACTER_COSMETICS';
  const style=POWER_STYLE[equipment?.power],vibe=VIBE_STYLE[equipment?.vibe];
  const matrix=new T.Object3D();let power=null,ring=null,disposed=false,last=-1;
  if(style){
    const geometry=style.shape==='star'?new T.OctahedronGeometry(.07):style.shape==='bolt'?new T.ConeGeometry(.05,.12,6):new T.SphereGeometry(.06,10,8);
    power=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:style.color,emissive:style.color,emissiveIntensity:.35,roughness:.4}),4);
    power.name=equipment.power;power.frustumCulled=false;power.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(power);
  }
  if(vibe){
    ring=new T.Mesh(new T.RingGeometry(.42,.62,32),new T.MeshBasicMaterial({color:vibe,transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    ring.name=equipment.vibe;ring.position.y=.025;ring.rotation.x=-Math.PI/2;group.add(ring);
  }
  function update(time=clock()){
    if(disposed)return;
    const t=reducedMotion()?0:Number.isFinite(time)?time:0;
    if(t===last)return;last=t;
    if(power){
      for(let i=0;i<4;i++){
        const angle=i/4*Math.PI*2+t*1.7;
        matrix.position.set(Math.cos(angle)*.62,.905+Math.sin(t*2.2)*.06+Math.sin(t*3+i*1.6)*.09,Math.sin(angle)*.62);
        matrix.rotation.y=t*4.2;matrix.updateMatrix();power.setMatrixAt(i,matrix.matrix);
      }
      power.instanceMatrix.needsUpdate=true;
    }
    if(ring){const pulse=(Math.sin(t*2.6)+1)/2;ring.scale.setScalar(.9+pulse*.25);ring.material.opacity=.22+pulse*.18;}
  }
  // The render callback keeps seated race drivers alive without animating
  // their driving pose or adding another requestAnimationFrame scheduler.
  if(power)power.onBeforeRender=()=>update();
  if(ring)ring.onBeforeRender=()=>update();
  if(power||ring)root.add(group);
  update(0);
  const stats={power:style?equipment.power:null,vibe:vibe?equipment.vibe:null,draws:Number(!!power)+Number(!!ring),disposed:false};
  root.userData.sharedCosmetics=stats;
  return {group,stats,update,dispose(){
    if(disposed)return;disposed=true;stats.disposed=true;group.removeFromParent();
    for(const mesh of [power,ring])if(mesh){mesh.onBeforeRender=()=>{};mesh.geometry.dispose();mesh.material.dispose();}
  }};
}
