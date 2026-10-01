import * as T from 'three';

// Standalone 67Park procedural cosmetics. These are not extracted Friends GLBs.
// Use an import map for "three" (the studio uses its bundled Three.js version).
// const fx = createEffect(preset.id, preset.settings);
// scene.add(fx.root); // root is centered; attach/position it as required.
// Each frame: fx.update(elapsedSeconds * (preset.settings.speed ?? 1));
// When finished: scene.remove(fx.root); fx.dispose();
export const EFFECTS = [
  {id:'pwr-stars',name:'Gold sparkles',shape:'star',color:'#ffd23f'},
  {id:'pwr-hearts',name:'Pink particles',shape:'orb',color:'#ff8ab5'},
  {id:'pwr-bolts',name:'Amber sparks',shape:'bolt',color:'#ffb26b'},
  {id:'vibe-pink',name:'Rose aura',shape:'ring',color:'#ff9fc6'},
  {id:'vibe-mint',name:'Mint aura',shape:'ring',color:'#9be08d'},
  {id:'vibe-gold',name:'Golden aura',shape:'ring',color:'#ffd23f'},
  {id:'vibe-sky',name:'Sky aura',shape:'ring',color:'#7cc4ff'},
];
export function createEffect(id, settings={}) {
  const spec=EFFECTS.find(e=>e.id===id);
  if(!spec)throw new Error('Unknown effect: '+id);
  const root=new T.Group();root.name=id;
  const ring=spec.shape==='ring';
  const material=ring?new T.MeshBasicMaterial({color:spec.color,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide}):new T.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:.35,roughness:.4,metalness:0});
  const geometry=ring?new T.RingGeometry(.42,.62,48):spec.shape==='star'?new T.OctahedronGeometry(.07):spec.shape==='bolt'?new T.ConeGeometry(.05,.12,6):new T.SphereGeometry(.06,12,10);
  const meshes=[];
  for(let i=0;i<(ring?1:4);i++){const mesh=new T.Mesh(geometry,material);if(ring)mesh.rotation.x=-Math.PI/2;root.add(mesh);meshes.push(mesh);}
  function update(t=0){
    if(ring){const pulse=(Math.sin(t*2.6)+1)/2;meshes[0].scale.setScalar(.9+pulse*.25);material.opacity=.22+pulse*.18;}
    else meshes.forEach((mesh,i)=>{const a=i/4*Math.PI*2+t*1.7;mesh.position.set(Math.cos(a)*.62,Math.sin(t*2.2)*.06+Math.sin(t*3+i*1.6)*.09,Math.sin(a)*.62);mesh.rotation.y=t*4.2;});
  }
  const s=settings.materials?.[0];
  if(s?.color&&/^#[0-9a-f]{6}$/i.test(s.color)){material.color.set(s.color);material.emissive?.set(s.color);}
  if(Number.isFinite(s?.roughness)&&'roughness'in material)material.roughness=T.MathUtils.clamp(s.roughness,0,1);
  if(Number.isFinite(s?.metalness)&&'metalness'in material)material.metalness=T.MathUtils.clamp(s.metalness,0,1);
  root.scale.setScalar(T.MathUtils.clamp(Number(settings.scale)||1,.25,2));
  root.rotation.y=T.MathUtils.degToRad(T.MathUtils.clamp(Number(settings.rotation)||0,-180,180));
  // Effects use a fixed 1.4-unit reference span, matching the studio.
  if(Array.isArray(settings.offset))root.position.fromArray(settings.offset.map(n=>T.MathUtils.clamp(Number(n)||0,-2,2)*1.4));
  update(0);
  return {root,update,dispose(){geometry.dispose();material.dispose();}};
}
