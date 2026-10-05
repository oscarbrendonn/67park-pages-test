import * as T from 'three';
import {loadMarketModel,disposeMarketModel} from './market-models.js';
import {configureStudioLighting} from './studio-lighting.js';

// A bounded offscreen pass on the park's existing renderer. No second WebGL
// context, mini-game bundle import, player/input object or live outfit mutation.
export function createMarketModelView({canvas,onThumbnail,onStatus}){
 const renderer=window.__islandWorld?.renderer;if(!renderer)throw Error('Park renderer not ready');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,20),target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});target.texture.colorSpace=T.SRGBColorSpace;
 configureStudioLighting({domElement:{dataset:{}}},scene,T);
 const context=canvas.getContext('2d'),queue=[],queued=new Set();let current=null,currentId='',wanted=null,disposed=false,running=false,frame=null,pointer=null;
 const snapshotCanvas=document.createElement('canvas');snapshotCanvas.width=snapshotCanvas.height=180;
 function draw(model=current,thumbnail=false){
  if(disposed||!model||renderer.getContext().isContextLost())return;
  const w=thumbnail?180:Math.min(640,Math.max(1,Math.round(canvas.clientWidth))),h=thumbnail?180:Math.min(640,Math.max(1,Math.round(canvas.clientHeight)));
  target.setSize(w,h);const output=thumbnail?snapshotCanvas:canvas,ctx=thumbnail?snapshotCanvas.getContext('2d'):context;output.width=w;output.height=h;
  scene.add(model);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  camera.aspect=w/h;camera.updateProjectionMatrix();const distance=Math.max(size.y,size.x/camera.aspect)/2/Math.tan(16*Math.PI/180)*1.18+size.z/2;camera.position.set(center.x,center.y+.18,center.z+distance);camera.lookAt(center);
  const saved={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadow:renderer.shadowMap.enabled,toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure};
  try{
   renderer.setRenderTarget(target);renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.autoClear=true;renderer.shadowMap.enabled=false;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
   renderer.clear();renderer.render(scene,camera);const pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);const image=ctx.createImageData(w,h);for(let y=0;y<h;y++)image.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);ctx.putImageData(image,0,0);
   if(!thumbnail)canvas.dataset.previewItem=model.userData.itemId;
  }finally{model.removeFromParent();renderer.setRenderTarget(saved.target,saved.face,saved.mip);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.color,saved.alpha);renderer.autoClear=saved.autoClear;renderer.shadowMap.enabled=saved.shadow;renderer.toneMapping=saved.toneMapping;renderer.toneMappingExposure=saved.toneMappingExposure;}
  if(thumbnail)return snapshotCanvas.toDataURL('image/png');
 }
 function redraw(){if(frame!==null||disposed)return;frame=requestAnimationFrame(()=>{frame=null;draw();});}
 async function pump(){
  if(running||disposed)return;running=true;
  try{while(!disposed){
   const item=wanted&&wanted.id!==currentId?wanted:queue.shift();if(!item)break;
   let model;
   try{model=await loadMarketModel(item);if(disposed){disposeMarketModel(model);break;}model.rotation.set(item.board?.length?.5:0,item.category==='Backpacks'?Math.PI-.4:-.4,0);onThumbnail(item.id,draw(model,true));
    if(wanted?.id===item.id){if(current)disposeMarketModel(current);current=model;currentId=item.id;model=null;draw();onStatus('ready',item.id);}
   }catch(error){if(!disposed){onThumbnail(item.id,null);if(wanted?.id===item.id){onStatus('error',item.id);wanted=null;}}}
   finally{if(model)disposeMarketModel(model);}
   await new Promise(resolve=>setTimeout(resolve,25));
  }}finally{running=false;}
 }
 const observer=new ResizeObserver(redraw);observer.observe(canvas);
 const down=e=>{if(!e.isPrimary||e.button!==0||pointer)return;e.preventDefault();canvas.focus();pointer={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);};
 const move=e=>{if(pointer?.id!==e.pointerId||!current)return;current.rotation.y+=(e.clientX-pointer.x)*.012;pointer.x=e.clientX;redraw();};
 const up=e=>{if(pointer?.id!==e.pointerId)return;pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 const key=e=>{if(current&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();current.rotation.y+=e.key==='ArrowLeft'?-.16:.16;redraw();}};
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',()=>{pointer=null;}],['keydown',key]];for(const[type,fn]of listeners)canvas.addEventListener(type,fn);
 return {select(item){wanted=item;if(!item){currentId='';if(current)disposeMarketModel(current);current=null;context.clearRect(0,0,canvas.width,canvas.height);return;}if(currentId===item.id){redraw();onStatus('ready',item.id);}else{canvas.style.visibility='hidden';onStatus('loading',item.id);pump();}},thumbnails(items){for(const item of items)if(!queued.has(item.id)){queued.add(item.id);queue.push(item);}pump();},dispose(){disposed=true;wanted=null;queue.length=0;observer.disconnect();if(frame!==null)cancelAnimationFrame(frame);for(const[type,fn]of listeners)canvas.removeEventListener(type,fn);if(current)disposeMarketModel(current);current=null;target.dispose();scene.clear();}};
}
