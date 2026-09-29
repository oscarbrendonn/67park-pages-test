import * as T from 'three';

// Wind-only port of TRAVEL_WIND from the user's 67park-island reference.
// https://oscarbrendonn.github.io/67park-island/app/main.js
// Preserve its crossed ribbons, ring, emission rate, trajectories and fade.
export const WIND_BUDGET = Object.freeze({mobile:90, desktop:180});
export function createSkateWind(scene,{mobile=false,reducedMotion=false}={}) {
  const cap=WIND_BUDGET[mobile?'mobile':'desktop'];
  const flat=new T.PlaneGeometry(1,.026),cross=flat.clone().rotateX(Math.PI/2);
  const geometry=new T.BufferGeometry();
  for(const [name,size] of [['position',3],['uv',2]]) {
    const a=flat.attributes[name].array,b=cross.attributes[name].array,data=new Float32Array(a.length+b.length);
    data.set(a);data.set(b,a.length);geometry.setAttribute(name,new T.BufferAttribute(data,size));
  }
  const a=flat.index.array,b=cross.index.array,indices=new Uint16Array(a.length+b.length);
  indices.set(a);for(let i=0;i<b.length;i++)indices[a.length+i]=b[i]+flat.attributes.position.count;
  geometry.setIndex(new T.BufferAttribute(indices,1));flat.dispose();cross.dispose();
  const alpha=new T.InstancedBufferAttribute(new Float32Array(cap),1).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('aTravelAlpha',alpha);
  const material=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  material.forceSinglePass=true;
  material.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aTravelAlpha; varying float vTravelAlpha; varying vec2 vTravelUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTravelAlpha=aTravelAlpha;vTravelUV=uv;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTravelAlpha; varying vec2 vTravelUV;').replace('#include <color_fragment>','#include <color_fragment>\nvec2 q=vTravelUV*2.0-1.0;float along=1.0-smoothstep(.55,1.0,abs(q.x));diffuseColor.a*=along*.8*vTravelAlpha;if(diffuseColor.a<.003)discard;');
  };
  material.customProgramCacheKey=()=> 'kimi-reference-skate-wind-23';
  const mesh=new T.InstancedMesh(geometry,material,cap);
  mesh.name='KIMI_SKATE_WIND';mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;mesh.renderOrder=5;mesh.count=0;mesh.visible=false;
  scene.add(mesh);
  const pool=Array.from({length:cap},()=>({alive:false}));
  const dummy=new T.Object3D(),direction=new T.Vector3(),origin=new T.Vector3(),up=new T.Vector3(0,1,0),look=new T.Matrix4();
  const turn=new T.Quaternion().setFromAxisAngle(up,Math.PI/2);
  const stats={capacity:cap,live:0,emitted:0,draws:0,addedTextures:0,addedLights:0,speed:0,active:false};
  let cursor=0,sequence=0,acc=0,last=null,disposed=false;
  const jitter=n=>Math.sin(sequence*12.9898+n*78.233)*.5;
  function clear(){for(const p of pool)p.alive=false;mesh.count=0;mesh.visible=false;stats.live=stats.draws=0;stats.active=false;acc=0;last=null;}
  function update(dt,s={}){
    if(disposed)return;
    const p=s.position;
    if(s.paused||!p||![dt,p.x,p.y,p.z,s.speed,s.heading].every(Number.isFinite)||dt<0||dt>.25||Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))>1e6){clear();return;}
    dt=Math.min(dt,.05);const speed=T.MathUtils.clamp(s.speed,0,30);stats.speed=speed;
    if(last&&Math.hypot(p.x-last.x,p.z-last.z)>2)clear();
    const ground=s.ground?.(p.x,p.z),reduced=typeof reducedMotion==='function'?reducedMotion():reducedMotion;
    const active=!!s.grounded&&!!s.board&&!!s.sprinting&&!s.swimming&&!s.mounted&&Number.isFinite(ground)&&speed>=5&&!reduced;
    stats.active=active;
    if(active){
      acc+=dt*34*Math.min(1,speed/9);
      // dt is capped; at most two new particles per frame, never catch-up loops.
      const count=Math.min(2,Math.floor(acc));acc-=count;
      for(let i=0;i<count;i++){
        const w=pool[cursor++%cap];sequence++;stats.emitted++;
        const angle=sequence*2.399+jitter(1)*.8,sin=Math.sin(s.heading),cos=Math.cos(s.heading),radius=.85*(.85+jitter(2)*.3);
        Object.assign(w,{alive:true,age:0,x:p.x+cos*Math.cos(angle)*radius-sin*.2,y:ground+.62+Math.sin(angle)*radius*.9,z:p.z-sin*Math.cos(angle)*radius-cos*.2,vx:-sin*(speed*1.15+3),vz:-cos*(speed*1.15+3),life:.22+jitter(3)*.1,len:1.2+Math.min(speed,12)*.1+jitter(4)*.5,width:.7+jitter(5)*.5});
      }
    }else acc=0;
    if(reduced){clear();return;}
    let n=0;
    for(const w of pool){
      if(!w.alive)continue;w.age+=dt;if(w.age>=w.life){w.alive=false;continue;}
      const left=1-w.age/w.life,tail=left<.3?left/.3:1;
      w.x+=w.vx*dt;w.z+=w.vz*dt;direction.set(w.vx,0,w.vz).normalize();look.lookAt(origin,direction,up);
      dummy.quaternion.setFromRotationMatrix(look).multiply(turn);dummy.position.set(w.x,w.y,w.z);
      dummy.scale.set(w.len*(.6+.4*tail),Math.max(.0001,w.width*tail),Math.max(.0001,w.width*tail));dummy.updateMatrix();
      mesh.setMatrixAt(n,dummy.matrix);alpha.setX(n,.85*Math.min(1,left*1.5));n++;
    }
    mesh.count=n;mesh.visible=n>0;if(n){mesh.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;}
    stats.live=n;stats.draws=n?1:0;
    if(!last)last={x:p.x,z:p.z};else{last.x=p.x;last.z=p.z;}
  }
  function dispose(){if(disposed)return;clear();disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}
  return {update,clear,dispose,stats};
}
