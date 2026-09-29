import {installGraphicsQuality as __installGraphicsQuality} from "../app/graphics-quality.js";
import '../app/game-viewport-guard.js?v=name-focus-1';
import {createMinigameFeedback} from "../app/minigame-feedback.js";
const feelFeedback=createMinigameFeedback();
import * as THREE from 'three';
import {PARK_TOY_PALETTE as P,parkToyFinish} from '../app/park-toy-finish.js?v=park-toy-1';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {i as createCharacter,f as equipment} from '../balloon/chunk-U4P5F7P3.js';
import {bindHeldAction} from '../app/minigame-input.js';
import {stepLaneJump} from './jump-state.js';
import {installParkControls} from './park-controls.js';
import {bindRunningLook,createRunningCamera} from '../app/running-camera.js?v=running-camera-1';
import {installRunningCameraSettings} from '../app/running-camera-settings.js?v=running-camera-1';
import {settingsOpen} from '../app/player-settings.js';
import {CHARACTER_CONTROL as profile,characterDirection} from '../app/character-control-profile.js';
import {poseCarryHands} from '../app/carry-hand-pose.js?v=carry-hands-1';
// `match` is reserved for authoritative online room codes in connection recovery.
const query=new URLSearchParams(location.search),matchMode=query.get('localMatch')==='1';
const toyPreview=matchMode||query.get('toyPreview')==='1';
const matchAPI=matchMode?await import('./match-flow.js'):null;
let savedMatch=null;try{savedMatch=JSON.parse(sessionStorage.getItem('67park.local-match.v1')||'null');}catch{}
const matchState=matchMode?matchAPI.validateMatch(savedMatch):null;
const roundState=matchMode?matchAPI.createRound(matchState):null,roundNumber=matchState?.round??1;
const toy=matchMode?(await import('./match-courses.js')).createMatchCourse(roundNumber):toyPreview?await import('./toy-course.js?v=toy-level-1'):null;
const finishZ=toy?.FINISH_Z??-112,courseEnd=toy?.DECKS[0][0]??-119,checkpoints=toy?.CHECKPOINTS??[12,-20,-54,-88];

const $=s=>document.querySelector(s),canvas=$('#game'),placeEl=$('#place'),timerEl=$('#timer'),hint=$('#hint'),countdown=$('#countdown'),restart=$('#restart');
const renderer=__installGraphicsQuality(new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}));
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c5cddd');scene.fog=new THREE.Fog('#c5cddd',65,160);
const camera=new THREE.PerspectiveCamera(profile.fov,1,.1,220);
scene.add(new THREE.HemisphereLight('#fff6ed','#82917e',1.6));
const sun=new THREE.DirectionalLight('#fff4e5',2.1);sun.position.set(-22,38,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-28,right:28,top:38,bottom:-38});sun.shadow.bias=-.0002;scene.add(sun);scene.add(sun.target);
const course=new THREE.Group();scene.add(course);const obstacles=[],racers=[],particles=[],reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,lanes=toy?.LANE_CENTERS??[-7.5,-2.5,2.5,7.5],colors=[P.rose,P.cream,P.mint,P.sky];
const mat=(color,ground)=>new THREE.MeshStandardMaterial(parkToyFinish(color,{ground}));function box(w,h,d,color,x,y,z,group=course){const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.18,h*.18,w*.1,d*.1)),mat(color,y<=.2));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o}
let toyArt=null,hitStars=null;
if(toyPreview){
 document.body.classList.add('toy-preview');scene.background.set('#c5e9ff');scene.fog.color.set('#c5e9ff');renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.12;
 scene.children.find(o=>o.isHemisphereLight).groundColor.set('#b9c9e7');sun.color.set('#ffffff');sun.intensity=1.65;
 toyArt=toy.createToyCourse(scene,course);hitStars=toy.createHitStars(scene);
 const button=document.createElement('button');button.id='punch';button.type='button';button.setAttribute('aria-label','Punch');$('.actions').prepend(button);
 button.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button===0){e.preventDefault();punchPending=true;}});
 button.addEventListener('click',e=>{if(e.detail===0)punchPending=true;});
 const badge=document.createElement('div');badge.className='preview-badge';badge.textContent=matchMode?`ROUND ${roundNumber} / 4 · LOCAL BOT MATCH`:'LEVEL 1 · 3 BOTS · LOCAL PREVIEW';document.body.append(badge);
 const intro=document.createElement('div');intro.id='level-intro';intro.innerHTML=matchMode?`<strong>ROUND ${roundNumber} / 4</strong><span>${roundState.rule.name}</span><small>${roundState.active.length} players · ${roundNumber===4?'1 winner':`${roundState.rule.qualify} qualify`} · Local bots</small>`:'<strong>LEVEL 1</strong><span>Pastel Sprint</span><small>Jump rails · Sweepers · Sky bridges</small>';document.body.append(intro);
}else{
box(22,.7,142,'#fff5df',0,-.42,-48);lanes.forEach((x,i)=>{box(4.7,.12,136,colors[i],x,.02,-48);for(let z=17;z>-116;z-=7)box(4.2,.025,.08,'#ffffff',x,.095,z)});box(.65,1.15,142,'#f7f0e4',-11.3,.35,-48);box(.65,1.15,142,'#f7f0e4',11.3,.35,-48);for(let z=18;z>-117;z-=12){box(.35,.35,.35,'#f4b7cd',-11.25,1.2,z);box(.35,.35,.35,'#9cd9e8',11.25,1.2,z)}
}
(toy?.SLIDER_ROWS??[-9,-43,-78]).forEach((z,row)=>{for(let i=0;i<2;i++){const mesh=box(3.8,1.9,2.5,row%2?'#a8d7ef':'#ffc09b',0,1,z);obstacles.push({kind:'slider',mesh,z,row,phase:i*Math.PI,speed:.65+row*.09})}});(toy?.SPINNER_ROWS??[-26,-61,-96]).forEach((z,row)=>{const g=new THREE.Group();g.position.set(0,.55,z);course.add(g);box(1.1,2.7,1.1,'#fff1c8',0,1.05,0,g);box(18,.62,.78,row%2?'#f493b8':'#8bd4b3',0,.18,0,g);obstacles.push({kind:'spinner',mesh:g,z,row,speed:(row%2?-.7:.78)+row*.08})});
if(toyPreview)obstacles.push(...toy.createHurdles(course));
if(!matchMode||roundNumber<=2){box(22,.12,1.1,'#fff',0,.12,finishZ);for(let x=-10;x<10;x+=2)box(1.05,.14,1.2,((x+10)/2)%2?'#32474f':'#fff',x+.55,.19,finishZ);box(1.1,6,1.1,'#ffedb8',-10.5,3,finishZ-1);box(1.1,6,1.1,'#ffedb8',10.5,3,finishZ-1);box(22,1,1,'#f08eb4',0,6,finishZ-1);if(!toyPreview)[12,-20,-54,-88].forEach((z,i)=>box(21.3,.035,.45,['#fff0ba','#c7f0d0','#c6e8fa','#f7bfd4'][i],0,.14,z));}


const parkControls=installParkControls();
const keys=new Set(),touch={x:0,z:0};let phase='loading',elapsed=0,raceTime=0,worldTime=0,frameNumber=0,cameraYaw=0,cameraPitch=profile.pitch,stickPointer=null,actionPending=false,actionCooldown=0,jumpUntil=0,punchPending=false;
const runningCamera=createRunningCamera();
const look=bindRunningLook(canvas,()=>phase==='racing'||phase==='ready',(yaw,pitch)=>{cameraYaw+=yaw;cameraPitch=THREE.MathUtils.clamp(cameraPitch+pitch,-.15,1.05);});
installRunningCameraSettings();
const jump=bindHeldAction($('#jump')),sprint=bindHeldAction($('#sprint'));
const start=$('#start'),stick=$('#stick'),knob=$('#knob');
function clearInput(){keys.clear();touch.x=touch.z=0;stickPointer=null;stick.dataset.claudeStickActive='false';knob.style.transform='translate(0,0)';jump.reset();sprint.reset();look.reset();actionPending=false;punchPending=false;jumpUntil=0;}
addEventListener('park:release-controls',clearInput);
addEventListener('blur',clearInput);addEventListener('pagehide',clearInput);addEventListener('orientationchange',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(e.target.closest('button')&&['Space','Enter'].includes(e.code))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.code==='Space')jumpUntil=performance.now()+180;if(!e.repeat&&(e.code==='KeyE'||(!toyPreview&&e.code==='KeyF')))actionPending=true;if(toyPreview&&!e.repeat&&['KeyF','KeyQ'].includes(e.code))punchPending=true;
});
addEventListener('keyup',e=>keys.delete(e.code));
function moveStick(e){const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.36),dy=(e.clientY-r.top-r.height/2)/(r.height*.36),n=Math.max(1,Math.hypot(dx,dy));touch.x=dx/n;touch.z=-dy/n;stick.dataset.claudeStickActive='true';knob.style.transform=`translate(${touch.x*28}px,${-touch.z*28}px)`;}
stick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.z=0;stick.dataset.claudeStickActive='false';knob.style.transform='translate(0,0)'}});
$('#grab').addEventListener('click',()=>{actionPending=true;});
start.addEventListener('click',()=>{if(phase!=='ready')return;clearInput();phase='countdown';elapsed=0;start.blur();start.hidden=true;if($('#level-intro'))$('#level-intro').hidden=true;canvas.tabIndex=0;canvas.focus();hint.textContent=matchMode?`ROUND ${roundNumber} · Get ready`:toyPreview?'LEVEL 1 · Get ready':'Get ready';});
restart.addEventListener('click',()=>{
 if(matchMode){const next=roundState.result?.retry?matchState:roundState.advance();try{if(next&&next.champion===null)sessionStorage.setItem('67park.local-match.v1',JSON.stringify(next));else sessionStorage.removeItem('67park.local-match.v1');}catch{}}
 location.reload();
});
function racer(name,lane,id=racers.length){
 const root=new THREE.Group(),pivot=new THREE.Group(),visual=new THREE.Group();
 root.add(pivot);pivot.position.y=.65;pivot.add(visual);visual.position.y=-.65;
 const spawnIndex=matchMode?Math.max(0,roundState.active.indexOf(id)):id;
 const angle=spawnIndex*Math.PI*2/(roundState?.active.length||4)+(roundNumber===4?Math.PI/8:0);
 const spawn=matchMode?(roundNumber<=2?{x:lanes[id%5],z:15-Math.floor(id/5)*2.2}:{x:Math.cos(angle)*8.5,z:Math.sin(angle)*8.5}):[{x:-.2,z:11},{x:-1.2,z:15},{x:-1.7,z:8},{x:.3,z:6.6}][lane];
 root.position.set(spawn.x,.15,spawn.z);root.rotation.y=Math.PI;scene.add(root);
 const label=document.createElement('span');label.className='racer-name';label.textContent=name;$('#labels').append(label);
 if(matchMode&&roundNumber===3){label.style.background=roundState.teams.get(id)===0?'#b9e6fa':'#ffd1e3';label.textContent+=roundState.teams.get(id)===0?' · Blue':' · Pink';}
 const r={id,name,lane,root,pivot,visual,label,avatar:null,y:0,vx:0,vz:0,vy:0,grounded:true,stun:0,immune:0,carry:null,carriedBy:null,carryAge:0,checkpoint:matchMode&&roundNumber>=3?0:15,finished:false,finishTime:0,punchT:0,punchCooldown:0,respawns:0,hits:0,eliminated:false};racers.push(r);return r;
}
const player=racer('You',1,0);
if(matchMode){for(const id of roundState.active)if(id!==0)racer(`Bot ${id}`,id%5,id);if(!roundState.active.includes(0)){player.eliminated=true;player.root.visible=false;player.label.hidden=true;}}
else{racer('Mint',0);racer('Sky',2);racer('Honey',3);}
async function loadCharacters(){
 const ids=['friendsie_1','friendsie_100','friendsie_404'];
 await Promise.all(racers.map(async(r,i)=>{
  const selected=i===0?{...equipment}:{base:matchMode?['cat67','ninja67','frog67'][i%3]:ids[i-1],body:null,head:null,sprout:null,back:null,kicks:null,held:null,power:null,vibe:null};
  const avatar=await createCharacter(selected);r.avatar=avatar;r.visual.add(avatar.root);r.root.userData.equipment=selected;
  await avatar.animator.ready;
  r.labelHeight=new THREE.Box3().setFromObject(avatar.root).getSize(new THREE.Vector3()).y+.18;
 }));
 phase='ready';start.hidden=false;start.textContent=matchMode?(player.eliminated?'Watch round':'Start round'):'Start race';countdown.textContent='';hint.textContent=matchMode?(roundNumber===3?'Blue vs pink · Step on tiles':roundNumber===4?'Last player on the arena wins':`Finish in the first ${roundState.rule.qualify}`):toyPreview?'3 bots · Jump gaps · Punch or grab':'Race with 3 bots · Move, jump and grab';
}
function release(r,throwing=false){
 const target=r.carry;if(!target)return;
 if(r===player&&throwing)feelFeedback.play("throw");r.carry=null;target.carriedBy=null;target.y=Math.max(0,target.root.position.y-.15);target.vy=throwing?5:0;
 target.vx=throwing?Math.sin(r.root.rotation.y)*10:0;target.vz=throwing?Math.cos(r.root.rotation.y)*10:0;
 target.stun=throwing?.55:0;target.immune=1.1;target.grounded=false;target.pivot.rotation.set(0,0,0);
}
function grab(){
 if(actionCooldown>0||player.stun>0||player.carriedBy||player.finished||player.eliminated)return;
 actionCooldown=.32;
 if(player.carry){release(player,true);return}
 let target=null,best=2.1;
 for(const r of racers){if(r===player||r.carriedBy||r.carry||r.finished||r.eliminated)continue;const distance=player.root.position.distanceTo(r.root.position);if(distance<best){target=r;best=distance}}
 if(target){feelFeedback.play("grab");player.carry=target;target.carriedBy=player;player.carryAge=0;target.pickupFrom=target.root.position.clone();target.stun=0;target.vx=target.vz=target.vy=0;}
}
function hit(r,x,z){if(r.immune>0||r.carriedBy||r.finished)return;release(r);if(r===player)feelFeedback.play("hit");r.stun=.58;r.immune=1.05;r.vx=x*5;r.vz=z*5;r.vy=3.8;r.grounded=false;}
function punch(r){
 if(!toyPreview||r.punchCooldown>0||r.stun>0||r.carriedBy||r.carry||r.finished||r.eliminated||!r.grounded)return;
 r.punchT=.28;r.punchCooldown=.7;
 const target=toy.punchTarget(r,racers);if(!target)return;
 let dx=target.root.position.x-r.root.position.x,dz=target.root.position.z-r.root.position.z,len=Math.hypot(dx,dz);
 if(len<.05){dx=Math.sin(r.root.rotation.y);dz=Math.cos(r.root.rotation.y);len=1;}
 hit(target,dx/len,dz/len);r.hits++;hitStars.burst(target.root.position);if(r===player)feelFeedback.play('hit');
}
function respawn(r){
 release(r);if(r.carriedBy)release(r.carriedBy);
 const spawn=matchMode&&roundNumber>=3?{x:roundState.teams.get(r.id)===0?-9.6:9.6,z:0}:{x:lanes[r.lane],z:r.checkpoint};
 r.root.position.set(spawn.x,.15,spawn.z);r.y=0;r.vx=r.vz=r.vy=0;r.stun=0;r.immune=1.2;r.grounded=true;r.jumpHeld=false;r.airJumps=1;r.pivot.rotation.set(0,0,0);r.avatar.animator.reset();r.respawns++;
 if(r===player)clearInput();
}
function collisions(r){
 if(r.stun>0||r.carriedBy)return;
 for(const o of obstacles){
  const dx=r.root.position.x-o.mesh.position.x,dz=r.root.position.z-o.z;
  if(o.kind==='hurdle'){
   if(r.y<.94&&r.y+1.35>.1&&Math.abs(dx)<2.08&&Math.abs(dz)<.65)hit(r,0,Math.sign(dz)||1);
  }else if(o.kind==='slider'){
   if(r.y<1.9&&Math.abs(dx)<2.35&&Math.abs(dz)<1.8)hit(r,Math.sign(dx)||1,.45);
  }else{
   const a=o.mesh.rotation.y,c=Math.cos(a),s=Math.sin(a),lx=dx*c-dz*s,lz=dx*s+dz*c;
   if(Math.hypot(dx,dz)<1.1&&r.y<2.5){hit(r,Math.sign(dx)||1,1);continue}
   if(r.y<1.05&&Math.abs(lx)<9.4&&Math.abs(lz)<.8)hit(r,Math.sin(a)*Math.sign(lx||1),Math.cos(a)*Math.sign(lx||1));
  }
 }
}
function move(r,dt){
 if(r.eliminated)return;
 r.immune=Math.max(0,r.immune-dt);
 r.punchT=Math.max(0,r.punchT-dt);r.punchCooldown=Math.max(0,r.punchCooldown-dt);
 if(r.carriedBy)return;
 if(r.finished){r.avatar.animator.update(dt,{speed:0,grounded:true});return}
 let direction={x:0,z:0},speed=profile.run,wantsJump=false;
 if(r===player){
  let x=touch.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  let z=touch.z+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  direction=characterDirection(x,z,cameraYaw);speed=keys.has('ShiftLeft')||keys.has('ShiftRight')||sprint.held()?profile.sprint:profile.run;
  wantsJump=keys.has('Space')||performance.now()<jumpUntil||jump.consume();
 }else{
  direction.x=THREE.MathUtils.clamp((lanes[r.lane]-r.root.position.x)*.65,-1,1);direction.z=-1;
  for(const o of obstacles){const ahead=r.root.position.z-o.z;if(ahead>0&&ahead<5){
   if(o.kind==='spinner')wantsJump=true;
   else if(o.kind==='hurdle'){if(ahead<2.6&&Math.abs(r.root.position.x-o.mesh.position.x)<2.1)wantsJump=true;}
   else if(Math.abs(r.root.position.x-o.mesh.position.x)<3)direction.x=Math.sign(r.root.position.x-o.mesh.position.x)||1;
  }}
  const len=Math.hypot(direction.x,direction.z);direction.x/=len;direction.z/=len;speed=5.8+r.lane*.12;
  if(toyPreview){if(toy.jumpAhead(r.root.position.z,r.root.position.x))wantsJump=true;if(r.punchCooldown===0&&toy.punchTarget(r,racers))punch(r);}
  if(matchMode&&roundNumber>=3){
   const target=roundNumber===3?toy.botTarget(r.id,roundState.teams.get(r.id),raceTime):{x:Math.cos(r.id+raceTime*.25)*Math.max(.2,toy.radius*.55),z:Math.sin(r.id+raceTime*.25)*Math.max(.2,toy.radius*.55)};
   const dx=target.x-r.root.position.x,dz=target.z-r.root.position.z,d=Math.hypot(dx,dz);
   direction={x:d>.3?dx/d:0,z:d>.3?dz/d:0};
   const ahead=toy.heightAt(r.root.position.x+direction.x*1.6,r.root.position.z+direction.z*1.6);
   wantsJump=ahead===null||(roundNumber===4&&Math.hypot(r.root.position.x,r.root.position.z)<9&&Math.sin(raceTime*2+r.id)>.8);
  }
 }
 if(r.stun>0)r.stun=Math.max(0,r.stun-dt);
 else{
  const acceleration=r.grounded?profile.groundAcceleration:profile.airAcceleration;
  const approach=(a,b)=>a+THREE.MathUtils.clamp(b-a,-acceleration*dt,acceleration*dt);
  r.vx=approach(r.vx,direction.x*speed);r.vz=approach(r.vz,direction.z*speed);
  if(Math.hypot(direction.x,direction.z)>.05){
   const target=Math.atan2(direction.x,direction.z),difference=Math.atan2(Math.sin(target-r.root.rotation.y),Math.cos(target-r.root.rotation.y));r.root.rotation.y+=difference*Math.min(1,dt*18);
  }
 }
 if(stepLaneJump(r,wantsJump,{bot:r!==player,blocked:r.stun>0})){r.avatar.animator.signal('jump');if(r===player){jumpUntil=0;feelFeedback.play('jump');}}
 const previousGround=r.grounded,previousY=r.y,previousX=r.root.position.x,previousZ=r.root.position.z;r.vy-=profile.gravity*(r.vy<0?profile.fallGravityScale:1)*dt;r.y+=r.vy*dt;
 r.root.position.x=toyPreview?r.root.position.x+r.vx*dt:THREE.MathUtils.clamp(r.root.position.x+r.vx*dt,-10.1,10.1);
 r.root.position.z=THREE.MathUtils.clamp(r.root.position.z+r.vz*dt,courseEnd,20);
 const proposedHeight=toy?.heightAt?.(r.root.position.x,r.root.position.z);
 if(matchMode&&proposedHeight!==null&&proposedHeight!==undefined&&proposedHeight>r.y+.08){r.root.position.x=previousX;r.root.position.z=previousZ;r.vx=r.vz=0;}
 if(toyPreview&&previousY<0&&r.y>-.98&&!toy.supported(previousX,previousZ)&&toy.supported(r.root.position.x,r.root.position.z)){r.root.position.x=previousX;r.root.position.z=previousZ;r.vx=r.vz=0;}
 const support=!toyPreview||toy.supported(r.root.position.x,r.root.position.z);
 const floor=matchMode?(toy.heightAt(r.root.position.x,r.root.position.z)??0):0;
 if(support&&r.y<=floor&&(!toyPreview||previousY>=floor-.001)){
  r.y=floor;r.vy=0;r.grounded=true;if(!previousGround){r.avatar.animator.signal('land');if(r===player)feelFeedback.play('land');}
 }else if(!support)r.grounded=false;
 else if(matchMode&&r.y>floor+.001)r.grounded=false;
 if(toyPreview&&r.y< -9){if(matchMode&&roundNumber===4){release(r);if(r.carriedBy)release(r.carriedBy);r.eliminated=true;r.root.visible=false;r.label.hidden=true;}else respawn(r);return;}
 r.root.position.y=r.y+.15;
 r.avatar.animator.update(dt,{speed:Math.hypot(r.vx,r.vz),grounded:r.grounded,verticalVelocity:r.vy,punchT:r.punchT});
 // Rotate about the torso, never about the feet or through the floor.
 r.pivot.rotation.x=r.stun>0?(reduced?-.18:Math.sin((.58-r.stun)/.58*Math.PI)*-.85):0;
 r.pivot.rotation.z=r.stun>0?(reduced?0:Math.sin((.58-r.stun)*15)*.18):0;
 if(!toyPreview||r.y>=0)collisions(r);
 for(const cp of checkpoints)if(r.root.position.z<cp&&(!toyPreview||(support&&r.grounded&&Math.abs(r.root.position.z-cp)<4)))r.checkpoint=Math.min(cp,r.checkpoint);
 if(r.carry){r.carryAge+=dt;if(r.carryAge>3.5)release(r,true);}
 if(matchMode&&roundNumber===3&&r.grounded)toy.paint(r.root.position.x,r.root.position.z,roundState.teams.get(r.id));
 if(r.root.position.z<finishZ&&(!toyPreview||(support&&r.grounded))){release(r);r.finished=true;r.finishTime=raceTime;if(matchMode){roundState.finish(r.id,raceTime);if(r===player)clearInput();}else if(r===player){phase='finished';clearInput();restart.hidden=false;const rank=racers.filter(p=>p.finished).length;countdown.textContent=toyPreview?`LEVEL 1 CLEARED\n#${rank} · ${raceTime.toFixed(2)}s`:`Finished #${rank}`;countdown.classList.remove('out');hint.textContent=toyPreview?'Practice race · 3 bots · Your time is above':hint.textContent;}}
}
function settleMatch(){
 const result=roundState.result;if(!result||phase!=='racing')return;
 phase='finished';clearInput();for(const r of racers)release(r);restart.hidden=false;
 if(result.retry){countdown.textContent='DRAW\nPlay this round again';restart.textContent='Replay round';}
 else if(roundNumber===4){countdown.textContent=result.champion===0?'CHAMPION\nYou won the match!':`CHAMPION\nBot ${result.champion}`;restart.textContent='New match';}
 else{const qualified=result.qualified.includes(0);countdown.textContent=qualified?`QUALIFIED\n${result.qualified.length} advance`:`ELIMINATED\n${result.qualified.length} advance`;restart.textContent=qualified?'Next round':'Watch next round';}
 countdown.classList.remove('out');hint.textContent='Local bot match · No online score submitted';
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
const position=new THREE.Vector3(),clock=new THREE.Clock();
function frame(){
 const dt=Math.min(.033,clock.getDelta());worldTime+=dt;frameNumber++;
 runningCamera.restore();
 if(phase==='countdown'&&!settingsOpen()){elapsed+=dt;countdown.textContent=String(Math.max(1,3-Math.floor(elapsed)));if(elapsed>=3){phase='racing';countdown.classList.add('out');hint.textContent=matchMedia('(pointer:coarse)').matches?(toyPreview?'Jump · Punch · Grab':'Move · Jump · Grab'):(toyPreview?'Space / Jump · F / Punch · E / Grab':'WASD · Space / Jump · E / Grab');}}
 if(phase==='racing'&&!settingsOpen()){
  raceTime+=dt;actionCooldown=Math.max(0,actionCooldown-dt);
  toy?.update?.(raceTime);
  for(const o of obstacles){if(o.kind==='slider')o.mesh.position.x=Math.sin(worldTime*o.speed+o.phase+o.row)*6.9;else if(o.kind==='spinner')o.mesh.rotation.y=worldTime*o.speed;}
  if(actionPending){actionPending=false;grab();}
  if(punchPending){punchPending=false;punch(player);}
  for(const r of racers)move(r,dt);
  if(matchMode){
   if(roundNumber<=2&&raceTime>=roundState.rule.seconds)roundState.raceTimeout();
   if(roundNumber===3&&raceTime>=roundState.rule.seconds)roundState.teamResult(toy.scores());
   if(roundNumber===4)roundState.eliminate(racers.filter(r=>r.eliminated).map(r=>r.id));
   settleMatch();
  }
  if(toyPreview&&phase==='racing')hint.textContent=matchMode&&roundNumber===3?`Blue ${toy.scores()[0]} · Pink ${toy.scores()[1]}${raceTime>=90?' · Overtime':''}`:matchMode&&player.finished?'Qualified · Waiting for remaining places':`LEVEL ${roundNumber} · ${toy.sectionAt(player.root.position.z)}`;
  for(const r of racers)if(r.carriedBy){
   const carrier=r.carriedBy,heading=carrier.root.rotation.y;
   // Mini-game roots are at the feet; the island root is 0.555 m higher.
   // Keep the same hand-supported height without the old 1.8 m teleport.
   const t=reduced?1:Math.min(1,carrier.carryAge/.2),blend=t*t*(3-2*t);
   position.set(carrier.root.position.x+Math.sin(heading)*.36,carrier.root.position.y+.595,carrier.root.position.z+Math.cos(heading)*.36);
   r.root.position.copy(r.pickupFrom).lerp(position,blend);
   r.y=Math.max(0,r.root.position.y-.15);r.root.rotation.y=heading;
   r.pivot.rotation.set(0,0,0);
   r.avatar.animator.update(dt,{speed:0,grounded:true,verticalVelocity:0});
  }
 }else for(const r of racers){
  if(phase==='finished'&&!matchMode){
   release(r);r.vy-=profile.gravity*dt;r.y=Math.max(0,r.y+r.vy*dt);r.root.position.y=r.y+.15;r.pivot.rotation.set(0,0,0);
   if(r.y===0)r.vy=0;
  }
  r.avatar?.animator.update(dt,{speed:0,grounded:r.y===0,verticalVelocity:r.vy});
 }
 for(const r of racers)poseCarryHands(r.root,r.carry?.root.position||null,r.root.rotation.y,dt);
 parkControls.setCarrying(!!player.carry);
 document.body.classList.toggle('match-spectating',matchMode&&(player.finished||player.eliminated||phase==='finished'));
 const focus=matchMode&&(player.finished||player.eliminated)?racers.find(r=>!r.finished&&!r.eliminated)||player:player;
 const view=runningCamera.update(camera,focus.visual,focus.root.position,cameraYaw,cameraPitch);camera.updateMatrixWorld();
 if(hitStars){hitStars.update(dt,reduced);hitStars.face(camera);}
 sun.position.set(focus.root.position.x-22,38,focus.root.position.z+20);sun.target.position.copy(focus.root.position);
 for(const r of racers){position.copy(r.root.position);position.y+=r.labelHeight||1.5;position.project(camera);r.label.hidden=r.eliminated||(matchMode&&r!==focus&&r.root.position.distanceToSquared(focus.root.position)>144)||(r===focus&&view.avatarHidden)||position.z>1||position.z< -1;r.label.style.transform=`translate(${(position.x*.5+.5)*innerWidth}px,${(-position.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`;}
 const sorted=[...racers].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:a.root.position.z-b.root.position.z);
 placeEl.textContent=matchMode?(roundNumber<=2?`${roundState.finished.length} / ${roundState.rule.qualify}`:roundNumber===3?'Teams':`${roundState.active.length-roundState.fallen.size} left`):`${sorted.indexOf(player)+1} / 4`;timerEl.textContent=(matchMode&&roundNumber>=3?Math.max(0,roundState.rule.seconds-raceTime):raceTime).toFixed(1)+'s';
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
window.__rushReadState=()=>({phase,frames:frameNumber,time:raceTime,yaw:cameraYaw,match:matchMode?{round:roundNumber,active:roundState.active,rule:roundState.rule,result:roundState.result,finished:roundState.finished,scores:toy.scores?.()}:null,toy:toyArt,render:renderer.info.render,cameraSettings:camera.userData.runningCamera,otherAvatars:racers.slice(1).map(r=>r.visual.visible),player:{x:player.root.position.x,y:player.y,z:player.root.position.z,facing:player.root.rotation.y,carry:player.carry?.name,stun:player.stun,respawns:player.respawns,hits:player.hits,punchT:player.punchT},racers:racers.map(r=>({id:r.id,name:r.name,finished:r.finished,eliminated:r.eliminated,grounded:r.grounded,finishTime:r.finishTime,checkpoint:r.checkpoint,base:r.avatar?.root.userData.equipment?.base,clip:r.avatar?.animator.stats?.clip,action:r.avatar?.animator.stats?.animation?.action,x:r.root.position.x,y:r.root.position.y,carriedBy:r.carriedBy?.name,z:r.root.position.z,hands:r.root.userData.carryHands,hits:r.hits,respawns:r.respawns})),touch:{...touch}});
countdown.textContent='Loading characters';frame();loadCharacters().catch(error=>{console.error(error);phase='error';countdown.textContent='Could not load characters';hint.textContent='Please reload to retry';restart.hidden=false;restart.textContent='Reload'});
