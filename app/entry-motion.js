import {prepareClaudeGorillaEffects} from './claude-gorilla-runtime.js?v=skate-corner-recovery-1';
import {compileEntryGraphics,waitForEntryGPU} from './entry-graphics.js?v=entry-light-1';
import {cameraMeshCast} from './feel-camera-meshes.js?v=skate-corner-recovery-1';

// Preparation only: never replay held input here.
export async function prepareEntryMotion(renderer,scene,camera,world,root,{upload,cancelled=()=>false}={}){
 if(typeof upload!=='function')throw TypeError('Entry motion needs the staged scene uploader');
 // R3F's city loop is stopped during entry. Exercise its initial physics and
 // scene subscribers with controls still blocked by the wardrobe, so their
 // first-use work cannot land on the user's first movement frame.
 if(root&&document.querySelector('.wardrobe')){
  for(let i=0;i<3;i++){
   if(cancelled())return {cancelled:true};
   // R3F advance() also calls gl.render(), even with frameloop="never".
   // Only advance subscribers here: drawing the world now bypasses the
   // staged uploader and allocates all visible buffers in one blocking frame.
   const render=renderer.render;
   try{renderer.render=()=>{};root.advance(root.get().clock.elapsedTime+1/60,false);}
   finally{renderer.render=render;}
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
 }
 const fx=prepareClaudeGorillaEffects(scene),saved=[];
 globalThis.__parkTargetClub?.prepare?.(world);
 if(world?.spawn){const p=world.spawn;cameraMeshCast(world,Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:p,{x:0,y:1,z:0},1);}
 fx?.traverse(o=>{saved.push([o,o.visible,o.count]);o.visible=true;if(o.isInstancedMesh)o.count=Math.max(1,o.count);});
 try{
  if(cancelled())return {cancelled:true};
  await compileEntryGraphics(renderer,scene,camera);
  if(cancelled())return {cancelled:true};
  // Include first-use effects in the SAME bounded upload, not another
  // full-scene draw before it. Restore their visibility even on failure.
  return await upload();
 }finally{
  for(const [o,visible,count] of saved){o.visible=visible;if(o.isInstancedMesh)o.count=count;}
 }
}

export async function finishEntryMotion(renderer,root){
 if(root&&document.querySelector('.wardrobe')){
  for(let i=0;i<3;i++){
   root.advance(root.get().clock.elapsedTime+1/60,false);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
 }
 await waitForEntryGPU(renderer);
}
