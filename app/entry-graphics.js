// A lost WebGL context or a never-finishing shader compile must expose Retry,
// not leave mobile Safari indefinitely on the last preparation step.
export async function compileEntryGraphics(renderer,scene,camera,{timeoutMs=60000}={}){
 const canvas=renderer.domElement;let timer,onLost;
 try{
  await Promise.race([
   Promise.resolve().then(()=>{
    if(renderer.getContext().isContextLost())throw Error('Graphics memory was interrupted. Retry loading.');
    return renderer.compileAsync(scene,camera);
   }),
   new Promise((_,reject)=>{
    onLost=()=>reject(Error('Graphics memory was interrupted. Retry loading.'));
    canvas.addEventListener('webglcontextlost',onLost);
    timer=setTimeout(()=>reject(Error('Graphics preparation took too long. Retry loading.')),timeoutMs);
   }),
  ]);
 }finally{clearTimeout(timer);canvas.removeEventListener('webglcontextlost',onLost);}
}

// Rendering/upload calls enqueue GPU work; returning from render() does not
// mean it has completed. Yield while the real entry fence is pending instead
// of handing that queue to the first player-controlled frame.
export async function waitForEntryGPU(renderer,{timeoutMs=15000,yieldTask=()=>new Promise(r=>setTimeout(r,8)),now=()=>performance.now()}={}){
 const gl=renderer.getContext();if(gl.isContextLost())throw Error('Graphics memory was interrupted. Retry loading.');
 if(typeof gl.fenceSync!=='function')return;
 const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('Graphics preparation could not finish. Retry loading.');
 const start=now();gl.flush();
 try{for(;;){
  if(gl.isContextLost())throw Error('Graphics memory was interrupted. Retry loading.');
  const state=gl.clientWaitSync(sync,0,0);
  if(state===gl.ALREADY_SIGNALED||state===gl.CONDITION_SATISFIED)return;
  if(state===gl.WAIT_FAILED||now()-start>=timeoutMs)throw Error('Graphics preparation took too long. Retry loading.');
  await yieldTask();
 }}finally{gl.deleteSync(sync);}
}
