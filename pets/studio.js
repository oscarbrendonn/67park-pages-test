import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPetModels} from '../app/pets/pet-model.js?v=pets-soft-2';

const canvas=document.querySelector('#pets-canvas'),status=document.querySelector('#pet-loading');
try {
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xf8f3eb,0);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.87;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,40),turn=new T.Group();scene.add(turn);
  const pmrem=new T.PMREMGenerator(renderer),env=new RoomEnvironment();const environment=pmrem.fromScene(env,.06);scene.environment=environment.texture;env.dispose();pmrem.dispose();
  scene.environmentIntensity=.65;scene.add(new T.HemisphereLight('#fff9ed','#a38c82',.55));
  const key=new T.DirectionalLight('#fff5e5',2.15);key.position.set(-3,5,5);scene.add(key);
  const fill=new T.DirectionalLight('#dbe8ff',.30);fill.position.set(4,2,-3);scene.add(fill);
  const models=createPetModels(),cat=models.create('cat',{scale:1}),dog=models.create('dog',{scale:1});
  cat.root.position.x=-.83;dog.root.position.x=.83;cat.root.rotation.y=.12;dog.root.rotation.y=-.12;turn.add(cat.root,dog.root);
  let mode='walk',yaw=-.30,pitch=.18,zoom=1,last=performance.now(),frames=0,raf=0,drag=null,pinch=0,contextLost=false;
  const pointers=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  function resize(){const box=canvas.getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  function view(){const distance=(camera.aspect<1.4?4.85:3.7)*zoom;camera.position.set(0,.75+Math.sin(pitch)*distance,Math.cos(pitch)*distance);camera.lookAt(0,.64,0);turn.rotation.y=yaw;}
  function render(now){raf=0;const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;cat.update(dt,{speed:mode==='walk'?1.05:0,sitting:mode==='idle',reducedMotion:reduce.matches});dog.update(dt,{speed:mode==='walk'?1.05:0,sitting:mode==='idle',reducedMotion:reduce.matches});view();renderer.render(scene,camera);frames++;raf=requestAnimationFrame(render);}
  const resume=()=>{if(!document.hidden&&!raf&&!contextLost){last=performance.now();raf=requestAnimationFrame(render);}};document.addEventListener('visibilitychange',resume);resize();resume();status.hidden=true;
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  document.querySelector('#pet-play').addEventListener('click',()=>{cat.play();dog.play();});
  document.querySelector('#pet-reset').addEventListener('click',()=>{yaw=-.30;pitch=.18;zoom=1;});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom=T.MathUtils.clamp(zoom*pinch/d,.75,1.4);pinch=d;}else if(drag){yaw+=(e.clientX-drag.x)*.009;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*.003,-.04,.5);}drag={x:e.clientX,y:e.clientY};});
  function release(e){pointers.delete(e.pointerId);drag=null;pinch=0;}for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.001,.75,1.4);},{passive:false});
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.12:.12;}if(e.key==='+'||e.key==='-'){e.preventDefault();zoom=T.MathUtils.clamp(zoom+(e.key==='+'?-.08:.08),.75,1.4);}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(raf);raf=0;status.hidden=false;status.textContent='Restoring the 3D preview… Reload if this message stays.';});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;status.hidden=true;resume();});
  // QA and export use these same skinned meshes, not a separate hero render.
  window.__petStudio={cat,dog,models,scene,camera,renderer,turn,stats:()=>({frames,...models.stats()}),setMode(value){if(['walk','idle'].includes(value))mode=value;},setView(value=0){yaw=value;},thumbnail(kind){const chosen=kind==='cat'?cat:dog,other=kind==='cat'?dog:cat;const position=chosen.root.position.clone();other.root.visible=false;chosen.root.position.x=0;const previous=camera.position.clone(),aspect=camera.aspect;renderer.setSize(256,256,false);camera.aspect=1;camera.position.set(1.8,1.15,3.0);camera.lookAt(0,.65,0);camera.updateProjectionMatrix();chosen.update(.05,{speed:0});renderer.render(scene,camera);const data=canvas.toDataURL('image/png');other.root.visible=true;chosen.root.position.copy(position);camera.position.copy(previous);camera.aspect=aspect;resize();return data;}};
} catch(error){status.textContent='This browser could not start the 3D preview. Try another tab or browser.';console.error(error);}
