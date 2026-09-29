import * as THREE from 'three';

/**
 * Plain-Three adaptation of 67park CharacterSelect.tsx StageSet/StageCanvas.
 * loadCharacter(eq) must return an exclusively owned {body, clips} preview:
 * body is 1.3m tall, centred at X/Z=0, with feet at local Y=0. Accessory bounds
 * must not be used to renormalize it. disposeCharacter receives the full result.
 * The stage starts hidden. Its caller owns panel layout and calls setVisible.
 */
export function createCharacterStage51(host,{loadCharacter,disposeCharacter}={}){
  if(!host?.appendChild||typeof loadCharacter!=='function'||typeof disposeCharacter!=='function')
    throw new TypeError('Character stage needs a host, loadCharacter and disposeCharacter');
  const doc=host.ownerDocument,win=doc?.defaultView;
  if(!win?.requestAnimationFrame||!win.ResizeObserver)throw new Error('Character stage requires a browser with ResizeObserver');

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  const canvas=renderer.domElement;
  canvas.className='park-character-stage51';
  canvas.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y pinch-zoom;cursor:grab;visibility:hidden;';
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','3D character preview. Drag horizontally or use the left and right arrow keys to turn.');
  canvas.setAttribute('aria-hidden','true');canvas.tabIndex=-1;
  canvas.dataset.stageState='empty';
  host.appendChild(canvas);

  const scene=new THREE.Scene();scene.background=new THREE.Color('#fbeaf3');scene.fog=new THREE.Fog('#fbeaf3',5.5,11);
  const camera=new THREE.PerspectiveCamera(34,1,.05,30),aim=new THREE.Vector3(0,.92,0);
  camera.position.set(0,1.25,3.6);camera.lookAt(aim);
  scene.add(new THREE.AmbientLight(0xffffff,.8));
  const key=new THREE.DirectionalLight(0xffffff,1.15);key.position.set(3,5,4);scene.add(key);
  const fill=new THREE.DirectionalLight('#ffd9e3',.35);fill.position.set(-4,3,-2);scene.add(fill);
  const stage=new THREE.Group();stage.name='67park-character-stage51';scene.add(stage);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  function part(name,geometry,color,roughness,position,rotation){
    const material=new THREE.MeshStandardMaterial({color,roughness});
    geometries.add(geometry);materials.add(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
    mesh.position.set(...position);if(rotation)mesh.rotation.set(...rotation);stage.add(mesh);return mesh;
  }
  part('pastel-ground',new THREE.CircleGeometry(9,48),'#f3e2ee',1,[0,-.02,0],[-Math.PI/2,0,0]);
  part('cream-podium',new THREE.CylinderGeometry(.92,1.02,.24,48),'#fff3dd',.9,[0,.12,0]);
  part('pink-podium-rim',new THREE.CylinderGeometry(.94,.94,.03,48),'#ffd9e3',.9,[0,.245,0]);
  part('soft-back-ring',new THREE.TorusGeometry(1.05,.07,16,64),'#ffe3ef',1,[0,1.05,-1.35]);

  // A static soft contact disc replaces drei's per-frame offscreen shadow passes.
  // No image asset, live-world shadow map or additional render target is needed.
  const resolution=128,data=new Uint8Array(resolution*resolution*4);
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const dx=(x+.5)/resolution*2-1,dz=(y+.5)/resolution*2-1,r2=dx*dx+dz*dz,k=(y*resolution+x)*4;
    data[k]=data[k+1]=data[k+2]=255;data[k+3]=r2>=1?0:Math.round(255*Math.exp(-5*r2)*(1-r2)**2);
  }
  const contactTexture=new THREE.DataTexture(data,resolution,resolution,THREE.RGBAFormat);
  contactTexture.minFilter=contactTexture.magFilter=THREE.LinearFilter;contactTexture.needsUpdate=true;textures.add(contactTexture);
  const contactGeometry=new THREE.PlaneGeometry(2.6,2.6),contactMaterial=new THREE.MeshBasicMaterial({color:'#9a7a9f',map:contactTexture,transparent:true,opacity:.38,depthWrite:false,toneMapped:false});
  geometries.add(contactGeometry);materials.add(contactMaterial);
  const contact=new THREE.Mesh(contactGeometry,contactMaterial);contact.name='soft-contact';contact.rotation.x=-Math.PI/2;contact.position.y=.262;stage.add(contact);
  const turntable=new THREE.Group();turntable.name='character-turntable51';turntable.position.y=.26;scene.add(turntable);

  let disposed=false,visible=false,width=0,height=0,raf=0,lastTime=0,elapsed=0,request=0;
  let current=null,mixer=null,idleAction=null,drag=null,manualRotation=false,contextLost=false,effectsFailed=false;
  const retiredBodies=new WeakSet(),motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=motion.matches;
  function state(name){canvas.dataset.stageState=name;canvas.setAttribute('aria-busy',name==='loading'?'true':'false');}
  function reportError(error,phase){
    host.dispatchEvent(new win.CustomEvent('park-stage-error',{detail:{error,phase}}));
  }
  function stop(){if(raf)win.cancelAnimationFrame(raf);raf=0;lastTime=0;}
  const canRender=()=>!disposed&&visible&&!contextLost&&doc.visibilityState!=='hidden'&&width>0&&height>0;
  const animated=()=>!reduced&&current&&(!manualRotation||!!idleAction||(!effectsFailed&&typeof current.body.userData.updateEquipmentEffects==='function'));
  function invalidate(){if(canRender()&&!raf)raf=win.requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(!canRender()){lastTime=0;return;}
    const dt=lastTime?Math.min(.05,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
    if(!reduced){
      elapsed+=dt;
      if(current&&!manualRotation&&!drag)turntable.rotation.y+=dt*.9; // original PreviewModel speed
      mixer?.update(dt);
    }
    if(current&&!effectsFailed){
      try{current.body.userData.updateEquipmentEffects?.(reduced?0:dt,elapsed,{reduced});}
      catch(error){effectsFailed=true;reportError(error,'equipment-effects');}
    }
    renderer.render(scene,camera);
    if(animated())invalidate();else lastTime=0;
  }
  function resize(){
    if(disposed)return;
    const box=host.getBoundingClientRect();width=Math.max(0,Math.round(box.width));height=Math.max(0,Math.round(box.height));
    if(!width||!height){stop();return;}
    renderer.setPixelRatio(Math.min(1.5,Math.max(1,win.devicePixelRatio||1)));
    renderer.setSize(width,height,false);camera.aspect=width/height;
    // Keep original camera at ordinary panel ratios; widen only for narrow hosts.
    const fit=Math.max(1,2.3/(2*3.6*Math.tan(17*Math.PI/180)*camera.aspect));
    camera.position.set(0,.92+.33*fit,3.6*fit);camera.far=Math.max(30,3.6*fit+15);
    scene.fog.near=5.5*fit;scene.fog.far=11*fit;
    camera.lookAt(aim);camera.updateProjectionMatrix();invalidate();
  }
  function releasePointer(){
    if(!drag)return;const id=drag.id;drag=null;canvas.style.cursor='grab';
    try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{}
  }
  function pointerDown(event){
    if(!canRender()||drag||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle:turntable.rotation.y,active:false};
    canvas.style.cursor='grabbing';
    try{canvas.setPointerCapture(event.pointerId);}catch{releasePointer();}
  }
  function pointerMove(event){
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.active){
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy))return;
      drag.active=true;manualRotation=true;
      drag.x+=Math.sign(dx)*10; // cross the gesture threshold without a rotation jump
    }
    turntable.rotation.y=drag.angle+(event.clientX-drag.x)*Math.PI*2/Math.max(180,width);
    event.preventDefault();invalidate();
  }
  function pointerEnd(event){if(drag?.id===event.pointerId){releasePointer();invalidate();}}
  function keyboard(event){
    if(!canRender()||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
    event.preventDefault();manualRotation=true;
    turntable.rotation.y=event.key==='Home'?0:turntable.rotation.y+(event.key==='ArrowLeft'?-1:1)*Math.PI/12;
    invalidate(); // keyboard manipulation is immediate, never tweened
  }
  function documentVisibility(){if(doc.visibilityState==='hidden'){releasePointer();stop();}else{lastTime=0;resize();}}
  function motionChange(){reduced=motion.matches;lastTime=0;stop();invalidate();}
  function contextLostHandler(event){event.preventDefault();contextLost=true;stop();state('context-lost');}
  function contextRestored(){contextLost=false;state(current?'ready':'empty');resize();}

  const resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(host);
  doc.addEventListener('visibilitychange',documentVisibility);
  win.addEventListener('resize',resize);
  if(motion.addEventListener)motion.addEventListener('change',motionChange);else motion.addListener(motionChange);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);
  canvas.addEventListener('keydown',keyboard);canvas.addEventListener('webglcontextlost',contextLostHandler);canvas.addEventListener('webglcontextrestored',contextRestored);
  resize();

  function retire(result){
    const body=result?.body;
    if(!body?.isObject3D||retiredBodies.has(body)||body===current?.body)return;
    if(body.parent&&body.parent!==turntable){reportError(new Error('Refusing to dispose a body owned by another scene'),'foreign-body');return;}
    retiredBodies.add(body);body.removeFromParent?.();
    try{Promise.resolve(disposeCharacter(result)).catch(error=>reportError(error,'dispose-character'));}
    catch(error){reportError(error,'dispose-character');}
  }
  function clearCurrent(){
    const previous=current;current=null;
    if(mixer){mixer.stopAllAction();if(previous)mixer.uncacheRoot(previous.body);}
    mixer=null;idleAction=null;retire(previous);renderer.renderLists.dispose();
  }
  async function setEquipment(eq){
    if(disposed)throw new Error('Character stage has been disposed');
    const token=++request;state('loading');
    // Equipment state is slot/string data; isolate it from caller mutations.
    const equipment={...eq};let result;
    try{result=await loadCharacter(equipment);}
    catch(error){
      if(disposed||token!==request)return {status:'superseded'};
      state('error');reportError(error,'load-character');throw error;
    }
    if(disposed||token!==request){retire(result);return {status:'superseded'};}
    if(!result?.body?.isObject3D||result.body.parent||retiredBodies.has(result.body)){
      const error=new TypeError('loadCharacter must return a fresh unparented preview body');
      retire(result);state('error');reportError(error,'load-character');throw error;
    }
    // Idle only: never auto-start jump, skate, root-motion or other game actions.
    const idle=(Array.isArray(result.clips)?result.clips:[]).find(clip=>(clip instanceof THREE.AnimationClip)&&/(^|[ _.-])(idle|stand|standing|breathing)([ _.-]|$)/i.test(clip.name));
    let nextMixer=null,nextIdle=null;
    try{if(idle){nextMixer=new THREE.AnimationMixer(result.body);nextIdle=nextMixer.clipAction(idle);nextIdle.play();nextMixer.update(0);}}
    catch(error){nextMixer?.stopAllAction();nextMixer?.uncacheRoot(result.body);retire(result);state('error');reportError(error,'idle-animation');throw error;}
    clearCurrent();current=result;mixer=nextMixer;idleAction=nextIdle;effectsFailed=false;turntable.add(result.body);
    state('ready');lastTime=0;invalidate();return {status:'ready'};
  }
  function setVisible(value){
    if(disposed)return;
    visible=!!value;canvas.style.visibility=visible?'visible':'hidden';canvas.setAttribute('aria-hidden',visible?'false':'true');canvas.tabIndex=visible?0:-1;
    if(!visible){releasePointer();stop();}else{lastTime=0;resize();}
  }
  function dispose(){
    if(disposed)return;disposed=true;visible=false;++request;releasePointer();stop();
    resizeObserver.disconnect();doc.removeEventListener('visibilitychange',documentVisibility);win.removeEventListener('resize',resize);
    if(motion.removeEventListener)motion.removeEventListener('change',motionChange);else motion.removeListener(motionChange);
    canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);
    canvas.removeEventListener('pointerup',pointerEnd);canvas.removeEventListener('pointercancel',pointerEnd);canvas.removeEventListener('lostpointercapture',pointerEnd);
    canvas.removeEventListener('keydown',keyboard);canvas.removeEventListener('webglcontextlost',contextLostHandler);canvas.removeEventListener('webglcontextrestored',contextRestored);
    clearCurrent();scene.clear();for(const texture of textures)texture.dispose();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
    renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
  return {setEquipment,setVisible,dispose,canvas};
}
