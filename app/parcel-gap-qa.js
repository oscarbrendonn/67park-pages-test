import * as T from 'three';

// Local inspection UI only. Reuses the real rendered scene and floor sampler.
export function installParcelGapQA(world){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||!new URLSearchParams(location.search).has('gapQA'))return;
 const panel=document.createElement('section');panel.setAttribute('aria-label','Parcel gap inspection');
 panel.style.cssText='position:fixed;left:8px;top:72px;z-index:20000;padding:9px;background:#fff5e9ee;border-radius:12px;max-width:290px;color:#394b43;font:12px system-ui';
 const report=document.createElement('pre');report.style.cssText='max-height:130px;overflow:auto;white-space:pre-wrap';
 const inputs={};for(const [key,value] of Object.entries({x:-100,z:-95,height:13,distance:20,yaw:135})){
  const label=document.createElement('label');label.textContent=key+' ';const input=document.createElement('input');input.type='number';input.step='any';input.value=value;input.setAttribute('aria-label','Camera '+key);input.style.cssText='width:60px;margin:3px';label.append(input);panel.append(label);inputs[key]=input;
 }
 let active=null,pick=false;const before=world.scene.onBeforeRender;
 world.scene.onBeforeRender=function(...args){before?.apply(this,args);if(active){world.camera.position.fromArray(active.p);world.camera.lookAt(...active.t);world.camera.updateMatrixWorld(true);}};
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.style.cssText='margin:3px;padding:6px;border:1px solid #b7c5b8;border-radius:6px;background:white;color:#394b43';b.onclick=fn;panel.append(b);return b;};
 const inspect=(x,z)=>({x,z,ground:world.ground(x,z),terrain:world.sample(x,z)?.object?.name,water:world.water(x,z)});
 button('Inspect corner',()=>{const v=Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,Number(input.value)]));if(!Object.values(v).every(Number.isFinite))return;const a=v.yaw*Math.PI/180;active={p:[v.x+Math.sin(a)*v.distance,9.4+v.height,v.z+Math.cos(a)*v.distance],t:[v.x,9.4,v.z]};report.textContent=JSON.stringify(inspect(v.x,v.z),null,2);});
 button('Resume camera',()=>{active=null;});
 button('Pick surface',()=>{pick=true;report.textContent='Click the ground or curb to identify its actual mesh and coordinates.';});
 button('Repair report',()=>{report.textContent=world.renderer.domElement.dataset.parcelPaving||'Not applied';});
 button('Hide inspection',()=>{panel.style.display='none';});
 const canvas=world.renderer.domElement;
 const onPick=e=>{if(!pick)return;pick=false;e.stopImmediatePropagation();e.preventDefault();const r=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),world.camera);const hits=ray.intersectObjects(world.objects,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});const h=hits[0];if(!h){report.textContent='No surface';return;}inputs.x.value=h.point.x.toFixed(3);inputs.z.value=h.point.z.toFixed(3);report.textContent=JSON.stringify({mesh:h.object.name,point:h.point.toArray(),...inspect(h.point.x,h.point.z)},null,2);};
 canvas.addEventListener('pointerdown',onPick,true);panel.append(report);document.body.append(panel);
 addEventListener('pagehide',()=>{world.scene.onBeforeRender=before;canvas.removeEventListener('pointerdown',onPick,true);panel.remove();},{once:true});
}
