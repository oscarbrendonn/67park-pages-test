import * as T from 'three';
import {createEmoteFX} from './emote-fx.js';
// One bounded world-space landing ring. No camera-sized flashes or extra loop.
export function createParkPresentationFX(scene,options={}){
 const fx=createEmoteFX(scene,options),geometry=new T.RingGeometry(.78,1,32);
 const material=new T.MeshBasicMaterial({color:'#f0e3cc',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
 const ring=new T.Mesh(geometry,material);ring.name='SKATE_LANDING_RING';ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 let life=0,dead=false;
 const land=event=>{const p=event.detail;if(!p||![p.x,p.y,p.z].every(Number.isFinite))return;ring.position.set(p.x,p.y+.025,p.z);life=options.reducedMotion?.12:.28;};
 if(typeof window!=='undefined')window.addEventListener('candy:skate-land',land);
 return {stats:fx.stats,update(dt,state){fx.update(dt,state);if(dead)return;life=state?.paused?0:Math.max(0,life-Math.max(0,Math.min(.05,dt||0)));ring.visible=life>0;const t=life/.28;ring.scale.setScalar(.4+(1-t)*1.3);material.opacity=t*.38;},dispose(){if(dead)return;dead=true;window.removeEventListener('candy:skate-land',land);fx.dispose();ring.removeFromParent();geometry.dispose();material.dispose();}};
}
