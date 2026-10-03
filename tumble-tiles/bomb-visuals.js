import * as T from 'three';
import {parkToyFinish} from '../app/park-toy-finish.js';

// All geometry, textures and effect slots are allocated once. Snapshots own
// the fuse: rendering must never detonate a bomb or shorten its escape time.
const MAX_BOMBS=25,MAX_BURSTS=25,MAX_PUFF_POOLS=8,PUFFS=10,BURST_SECONDS=.65,DEFAULT_RADIUS=3.6;
const finite=n=>Number.isFinite(n),validPosition=p=>p&&finite(p.x)&&finite(p.y)&&finite(p.z);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function countdownTexture(seconds){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Bomb countdown canvas is unavailable');
  context.clearRect(0,0,128,128);
  context.beginPath();context.arc(64,64,56,0,Math.PI*2);
  context.fillStyle='#fff6e7';context.fill();
  context.lineWidth=6;context.strokeStyle=seconds===1?'#c87082':'#a68db2';context.stroke();
  context.textAlign='center';context.textBaseline='middle';context.fillStyle='#503f58';
  context.font='800 76px system-ui, sans-serif';context.fillText(String(seconds),60,61);
  context.font='700 19px system-ui, sans-serif';context.fillText('s',94,83);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
  return texture;
}

export function createBombVisuals(scene){
  const root=new T.Group();root.name='tumble-bomb-visuals';scene.add(root);
  const owned=new Set(),bombs=[],bursts=[],puffPools=[],transform=new T.Object3D();let disposed=false,burstCursor=0,puffCursor=0,lastTick=-1;
  const own=resource=>(owned.add(resource),resource);
  const solid=color=>own(new T.MeshStandardMaterial(parkToyFinish(color)));
  const lavender=solid('#b7a0c7'),rose=solid('#dca0aa'),cream=solid('#f0e5cf');
  const sphere=own(new T.SphereGeometry(.43,24,16));
  const seam=own(new T.TorusGeometry(.429,.013,6,32));
  const stem=own(new T.CylinderGeometry(.033,.033,.22,8));
  const loop=own(new T.TorusGeometry(.079,.026,6,12));
  const ringGeometry=own(new T.RingGeometry(.97,1,64));
  const puffGeometry=own(new T.SphereGeometry(1,8,6));
  const warningMaterial=own(new T.MeshBasicMaterial({color:'#c57987',transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false}));
  const textures=[null,...[1,2,3].map(seconds=>own(countdownTexture(seconds)))];
  const badges=textures.map(texture=>texture?own(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false})):null);
  const add=(parent,geometry,material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh};

  for(let i=0;i<MAX_BOMBS;i++){
    const group=new T.Group();group.visible=false;root.add(group);
    const body=add(group,sphere,i%2?rose:lavender,0,.44);body.castShadow=true;
    const belt=add(group,seam,cream,0,.44);belt.rotation.x=Math.PI/2;
    const key=new T.Group();key.position.y=.93;group.add(key);
    add(key,stem,cream,0,-.065);
    add(key,loop,cream,-.088,.058);add(key,loop,cream,.088,.058);
    const ring=add(group,ringGeometry,warningMaterial,0,.032);ring.rotation.x=-Math.PI/2;ring.renderOrder=1;
    // Keep the number above the character's 1.7-unit name label. A freshly
    // planted bomb is at the planter's feet, so a low badge hides behind it.
    const badge=new T.Sprite(badges[3]);badge.position.y=2.8;badge.scale.set(1.04,1.04,1);badge.renderOrder=2;group.add(badge);
    bombs.push({group,key,ring,badge,id:null,seconds:3,remaining:3,radius:DEFAULT_RADIUS,seen:false});
  }

  for(let i=0;i<MAX_BURSTS;i++){
    const group=new T.Group();group.visible=false;root.add(group);
    const material=own(new T.MeshBasicMaterial({color:'#f8d7ae',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));
    const ring=add(group,ringGeometry,material,0,.05);ring.rotation.x=-Math.PI/2;
    bursts.push({group,ring,puffPool:null,age:BURST_SECONDS,radius:DEFAULT_RADIUS,reduced:false,eventNumber:null});
  }

  // Every simultaneous explosion retains a complete danger-radius cue. Only
  // the decorative puffs are recycled when a crowded round exceeds8 bursts.
  for(let i=0;i<MAX_PUFF_POOLS;i++){
    const puffMaterial=own(new T.MeshBasicMaterial({transparent:true,opacity:.8,depthWrite:false}));
    const puffs=own(new T.InstancedMesh(puffGeometry,puffMaterial,PUFFS));puffs.instanceMatrix.setUsage(T.DynamicDrawUsage);puffs.frustumCulled=false;
    const colors=['#f0e5cf','#dca0aa','#c1aed1'];
    for(let j=0;j<PUFFS;j++){puffs.setColorAt(j,new T.Color(colors[j%3]));transform.position.set(0,0,0);transform.scale.setScalar(.12);transform.updateMatrix();puffs.setMatrixAt(j,transform.matrix)}
    puffs.visible=false;root.add(puffs);puffPools.push({puffs,owner:null});
  }

  function releasePuffs(burst){
    if(!burst.puffPool)return;
    burst.puffPool.puffs.visible=false;burst.puffPool.owner=null;burst.puffPool=null;
  }

  function clear(){
    for(const view of bombs){view.id=null;view.seen=false;view.group.visible=false}
    for(const burst of bursts){releasePuffs(burst);burst.group.visible=false;burst.age=BURST_SECONDS;burst.eventNumber=null}
    burstCursor=0;puffCursor=0;lastTick=-1;
  }

  function update(frame,dt,reduced=false){
    if(disposed)return;
    if(finite(frame?.tick)&&frame.tick<lastTick)clear();
    if(finite(frame?.tick))lastTick=frame.tick;
    const step=finite(dt)?clamp(dt,0,.1):0;
    // Release stale slots before assigning new ids, including a snapshot in
    // which all25 bombs were replaced at once.
    for(const view of bombs){
      view.seen=false;
      for(const bomb of frame?.bombs||[])if(view.id===bomb.id&&validPosition(bomb)&&finite(bomb.remaining)&&bomb.remaining>0){view.seen=true;break}
      if(!view.seen){view.id=null;view.group.visible=false}
    }
    for(const bomb of frame?.bombs||[]){
      if(!validPosition(bomb)||!finite(bomb.remaining)||bomb.remaining<=0||bomb.id==null)continue;
      let view=null;
      for(const candidate of bombs)if(candidate.id===bomb.id){view=candidate;break}
      if(!view)for(const candidate of bombs)if(candidate.id===null){view=candidate;break}
      if(!view)continue;
      view.id=bomb.id;view.seen=true;view.group.visible=true;
      view.group.position.set(bomb.x,bomb.y,bomb.z);
      view.remaining=bomb.remaining;view.seconds=clamp(Math.ceil(bomb.remaining),1,3);
      view.badge.material=badges[view.seconds];
      view.radius=finite(bomb.radius)?clamp(bomb.radius,.2,12):DEFAULT_RADIUS;
      view.ring.scale.setScalar(view.radius);
      // A restrained wind-up movement makes the object readable as a timer.
      // Reduced motion keeps the key still and uses the same numeric warning.
      view.key.rotation.y=reduced?0:(3-clamp(bomb.remaining,0,3))*Math.PI*2;
    }
    for(const view of bombs)if(!view.seen){view.id=null;view.group.visible=false}
    for(const burst of bursts){
      if(!burst.group.visible)continue;
      burst.age+=step;
      if(burst.age>=BURST_SECONDS){burst.group.visible=false;releasePuffs(burst);continue}
      const progress=burst.age/BURST_SECONDS,fade=1-progress,quiet=burst.reduced||reduced;
      burst.ring.scale.setScalar(quiet?burst.radius:Math.max(.3,burst.radius*progress));
      burst.ring.material.opacity=(quiet?.45:.85)*fade;
      const puffs=burst.puffPool?.puffs;
      if(puffs){puffs.visible=!quiet;puffs.material.opacity=.8*fade}
      if(quiet||!puffs)continue;
      for(let i=0;i<PUFFS;i++){
        const angle=i/PUFFS*Math.PI*2,distance=progress*burst.radius*(.42+(i%3)*.1);
        transform.position.set(Math.cos(angle)*distance,.18+Math.sin(progress*Math.PI)*(.45+i%3*.18),Math.sin(angle)*distance);
        const size=(.17+(i%3)*.04)*(.9+progress*.7);
        transform.scale.set(size,size*.8,size);transform.updateMatrix();puffs.setMatrixAt(i,transform.matrix);
      }
      puffs.instanceMatrix.needsUpdate=true;
    }
  }

  function explode(event,reduced=false){
    if(disposed||!validPosition(event))return;
    // Duplicate delivery of a server event must not multiply visual effects.
    if(event.n!=null)for(const burst of bursts)if(burst.eventNumber===event.n)return;
    const burst=bursts[burstCursor];burstCursor=(burstCursor+1)%MAX_BURSTS;
    releasePuffs(burst);
    burst.age=0;burst.reduced=!!reduced;burst.eventNumber=event.n??null;
    burst.radius=finite(event.radius)?clamp(event.radius,.2,12):DEFAULT_RADIUS;
    burst.group.position.set(event.x,event.y,event.z);burst.group.visible=true;
    burst.ring.scale.setScalar(reduced?burst.radius:.3);burst.ring.material.opacity=reduced?.45:.85;
    if(!reduced){
      const pool=puffPools[puffCursor];puffCursor=(puffCursor+1)%MAX_PUFF_POOLS;
      if(pool.owner)releasePuffs(pool.owner);
      pool.owner=burst;burst.puffPool=pool;pool.puffs.visible=false;burst.group.add(pool.puffs);
    }
  }

  return {root,update,explode,
    reset(){if(!disposed)clear()},
    readState(){return {disposed,bombCapacity:MAX_BOMBS,burstCapacity:MAX_BURSTS,puffPoolCapacity:MAX_PUFF_POOLS,countdownTextures:3,
      bombs:bombs.filter(view=>view.group.visible).map(view=>({id:view.id,seconds:view.seconds,remaining:view.remaining,position:view.group.position.toArray(),radius:view.radius,billboard:view.badge.isSprite})),
      bursts:bursts.filter(burst=>burst.group.visible).map(burst=>({age:burst.age,radius:burst.radius,reduced:burst.reduced,puffs:burst.puffPool?.puffs.visible?PUFFS:0}))}},
    dispose(){if(disposed)return;clear();disposed=true;root.removeFromParent();for(const resource of owned)resource.dispose();owned.clear()},
  };
}
