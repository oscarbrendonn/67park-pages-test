// Local-only views of the real world. No duplicate scene, model or renderer.
export function installParcelCornerQA(world){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||!new URLSearchParams(location.search).has('parcelQA'))return;
 const panel=document.createElement('section');panel.setAttribute('aria-label','Parcel corner inspection');
 panel.style.cssText='position:fixed;left:10px;top:85px;z-index:20000;padding:10px;background:#fff5e9ed;border-radius:14px;max-width:380px;color:#394b43;font:12px system-ui';
 const report=document.createElement('pre');report.style.cssText='max-height:150px;overflow:auto;white-space:pre-wrap';
 let active=null;const before=world.scene.onBeforeRender;
 world.scene.onBeforeRender=function(...args){before?.apply(this,args);if(active){world.camera.position.fromArray(active.p);world.camera.lookAt(...active.t);world.camera.updateMatrixWorld(true);}};
 const views={
  'Coast boardwalk corner':{p:[234,14.5,18],t:[210,9.4,3]},
  'Coast corner overview':{p:[236,48,27],t:[220,9.4,2]},
  'Stadium south corner':{p:[210,16,23],t:[191,9.8,4]},
  'Stadium west corner':{p:[104,18,15],t:[127,9.7,-2]},
 };
 for(const [label,view] of Object.entries(views)){const b=document.createElement('button');b.textContent=label;b.style.cssText='margin:4px;padding:7px;border:1px solid #c2cabb;border-radius:7px;background:white;color:#394b43';b.onclick=()=>{active=view;const stats=JSON.parse(world.renderer.domElement.dataset.stadiumCoast99||'{}');report.textContent=JSON.stringify({camera:label,paving:stats.islandWidth?.paving,coast:stats.coastBoardwalk},null,2);};panel.append(b);}
 const inspect=document.createElement('button');inspect.textContent='Probe repaired edges';inspect.onclick=()=>{report.textContent=JSON.stringify([[116,0],[195,11],[200,8],[215.2,0],[215.5,5],[216.1,8],[217,10],[219,11.8],[112,0],[204,0]].map(([x,z])=>({x,z,ground:world.ground(x,z),surface:world.sample(x,z)?.object?.name})),null,2);};panel.append(inspect,report);document.body.append(panel);
 addEventListener('pagehide',()=>{world.scene.onBeforeRender=before;panel.remove();},{once:true});
}
