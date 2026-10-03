import * as T from 'three';
import {installGraphicsQuality} from '../app/graphics-quality.js';
import {i as createCharacter,f as equipment} from '../balloon/chunk-U4P5F7P3.js';
import {bindHeldAction,bindMinigameLook} from '../app/minigame-input.js';
import {characterDirection} from '../app/character-control-profile.js';
import {createPartyAudio} from '../app/party/party-audio.js';
import {playerSettings,savePlayerSettings} from '../app/player-settings.js';
import {returnToParty} from '../app/social-results.js?v=tumble-1';
import {TumbleSimulation,botInput} from './rules.js?v=tumble-crowd-1';
import {createTumbleArena} from './arena.js?v=tumble-crowd-1';
import {createBombVisuals} from './bomb-visuals.js?v=tumble-crowd-1';
import {createTumbleClient} from './network.js';
import {acceptsTumbleFrame,canSendTumbleInput} from './frame-order.js?v=tumble-bombs-1';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const practice=params.get('practice')==='1'&&params.get('bots')==='1',code=params.get('match');
const practicePlayers=[4,20,25].includes(Number(params.get('players')))?Number(params.get('players')):4;
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),canvas=$('game'),avatars=new Map(),keys=new Set(),touch={x:0,z:0};
// One instance of the park's approved feedback, including character-specific
// Punch voices. Do not introduce a second audio graph or new sound assets.
const feedback=createPartyAudio({settings:playerSettings,saveSettings:savePlayerSettings,gameMuted:()=>{try{return localStorage.getItem('67park-feel-lab-muted')==='1'}catch{return false}}});
let renderer,scene,camera,arena,bombVisuals,client,sim,frame=null,localId='you',roster=[],phase='loading',loaded=false,loading=false,dead=false,modal=false;
let acc=0,previous=performance.now(),lastSend=0,lastHud=0,countdownEnd=0,lastEvent=practice?0:null,stickPointer=null,cameraYaw=0,cameraPitch=.62,spectating=0;
let latestInput={x:0,z:0,jump:false,dash:false,bomb:false},readyKey='',room=null,cameraPlaced=false,renderFrame=0,loadEpoch=0,pauseStarted=0;
let standingsKey='',activeDialog=null;
const lastPositions=new Map(),target=new T.Vector3(),desired=new T.Vector3(),projected=new T.Vector3();
const canPlay=()=>loaded&&!modal&&!document.hidden&&phase!=='unavailable'&&frame?.status==='playing'&&(practice||client?.data.connected&&canSendTumbleInput(room,code))&&frame.players.find(p=>p.id===localId)?.alive;
// `dash` is only the existing network action slot. Tumble resolves it as Punch,
// never as a speed boost, roll or Dive.
const jump=bindHeldAction($('jump'),()=>{},()=>!canPlay()),punch=bindHeldAction($('punch'),()=>{},()=>!canPlay()),bomb=bindHeldAction($('bomb'),()=>{},()=>!canPlay());
const look=bindMinigameLook(canvas,()=>loaded&&!modal&&!document.hidden);

function resetInput(){
  keys.clear();touch.x=touch.z=0;jump.reset();punch.reset();bomb.reset();look.reset();
  const pointer=stickPointer;stickPointer=null;try{if(pointer!==null&&$('stick').hasPointerCapture(pointer))$('stick').releasePointerCapture(pointer)}catch{}
  $('knob').style.transform='';$('stick').dataset.claudeStickActive='false';latestInput={x:0,z:0,jump:false,dash:false,bomb:false};
  if(client?.data.connected&&canSendTumbleInput(room,code))client.send({t:'input',seq:++client.seq,...latestInput});
}
function inputs(){
  if(!canPlay())return {x:0,z:0,jump:false,dash:false,bomb:false};
  const x=touch.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const y=-touch.z+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const length=Math.max(1,Math.hypot(x,y)),move=characterDirection(x/length,y/length,cameraYaw);
  return {x:move.x,z:move.z,jump:jump.consume()||keys.has('Space'),dash:punch.consume()||keys.has('KeyF'),bomb:bomb.consume()||keys.has('KeyB')};
}
// Match the live lobby touch joystick's 44px radius; retain Tumble's camera-relative input.
function moveStick(e){if(e.pointerId!==stickPointer)return;const rect=$('stick').getBoundingClientRect(),x=(e.clientX-rect.left-rect.width/2)/44,z=(e.clientY-rect.top-rect.height/2)/44,n=Math.max(1,Math.hypot(x,z));touch.x=x/n;touch.z=z/n;$('knob').style.transform=`translate(${touch.x*44}px,${touch.z*44}px)`}
$('stick').addEventListener('pointerdown',e=>{if(!canPlay()||stickPointer!==null||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();stickPointer=e.pointerId;$('stick').dataset.claudeStickActive='true';$('stick').setPointerCapture(e.pointerId);moveStick(e)});
$('stick').addEventListener('pointermove',moveStick);
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(name,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.z=0;$('knob').style.transform='';$('stick').dataset.claudeStickActive='false'}});
addEventListener('keydown',e=>{
  if(e.target.closest?.('input,textarea,select,[contenteditable=true]')||e.defaultPrevented)return;
  if(e.code==='Escape'){e.preventDefault();toggleMenu();return}
  if(e.target.closest?.('button,a')&&['Space','Enter'].includes(e.code))return;
  if(!canPlay())return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));
for(const name of ['park:release-controls','blur','orientationchange'])addEventListener(name,()=>{resetInput();if(name==='blur'&&practice&&loaded&&frame?.status==='playing')openMenu()});
document.addEventListener('visibilitychange',()=>{resetInput();if(document.hidden&&practice&&loaded)openMenu()});

function openMenu(){if(!loaded||phase==='results'||modal)return;modal=true;$('live-leaderboard').hidden=true;pauseStarted=performance.now();resetInput();$('menu').hidden=false;syncDialog();$('menu-title').textContent=practice?'Paused':'Game menu';$('menu-note').textContent=practice?'Your practice round is paused.':'Online play continues while this menu is open.';$('resume').focus();paintSound();phase=practice?'paused':frame?.status||'loading'}
function closeMenu(){$('live-leaderboard').hidden=!!frame?.over;if(practice&&frame?.status==='countdown')countdownEnd+=performance.now()-pauseStarted;modal=false;$('menu').hidden=true;previous=performance.now();acc=0;phase=frame?.status||'ready';syncDialog();canvas.focus()}
function toggleMenu(){modal?closeMenu():openMenu()}
$('pause-button').onclick=toggleMenu;$('help-button').onclick=openMenu;$('resume').onclick=closeMenu;
// Keep keyboard focus inside the current dialog; the live HUD is inert behind it.
function syncDialog(){
  const dialog=['result','menu','intro'].map($).find(el=>!el.hidden)||null;
  for(const el of [canvas,document.querySelector('.topbar'),$('live-leaderboard'),$('controls'),$('spectate')])el.inert=!!dialog;
  if(dialog===activeDialog)return;activeDialog=dialog;
  if(dialog)(dialog.querySelector('button:not([hidden]):not(:disabled),a[href]')||dialog).focus();
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!activeDialog)return;
  const items=[...activeDialog.querySelectorAll('button:not([hidden]):not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
  if(!items.length){e.preventDefault();return}
  // Safari's system keyboard preference may otherwise skip links entirely.
  e.preventDefault();const index=items.indexOf(document.activeElement),step=e.shiftKey?-1:1;
  items[index<0?(e.shiftKey?items.length-1:0):(index+step+items.length)%items.length].focus();
});
function paintSound(){let muted=false;try{muted=localStorage.getItem('67park-feel-lab-muted')==='1'}catch{}$('sound-toggle').textContent=playerSettings.sfx<=0||muted?'Sound off · Tap to enable':'Sound on · Tap to mute'}
$('sound-toggle').onclick=()=>{let muted=false;try{muted=localStorage.getItem('67park-feel-lab-muted')==='1';localStorage.setItem('67park-feel-lab-muted','0')}catch{}playerSettings.sfx=muted||playerSettings.sfx<=0?.8:0;savePlayerSettings();paintSound()};
function leave(e){if(!practice&&client?.data.connected&&room?.status!=='results'){e.preventDefault();resetInput();client.act('room.leave');location.assign('../play/?online=1&game=tumble')}}
for(const id of['leave','menu-lobby','result-lobby'])$(id).addEventListener('click',leave);
$('spectate-next').onclick=()=>{spectating++;cameraPlaced=false};

function setupScene(){
  renderer=installGraphicsQuality(new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}));renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1;
  scene=new T.Scene();scene.background=new T.Color('#d9e1ee');scene.fog=new T.Fog('#d9e1ee',48,100);camera=new T.PerspectiveCamera(50,1,.1,150);
  scene.add(new T.HemisphereLight('#fff6e9','#a9c5c2',2));const sun=new T.DirectionalLight('#fff4e3',2.1);sun.position.set(-15,28,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:65});sun.shadow.bias=-.00025;scene.add(sun);
  arena=createTumbleArena(scene);bombVisuals=createBombVisuals(scene);camera.position.set(17,20,24);camera.lookAt(0,0,0);resize();renderer.setAnimationLoop(tick);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();resetInput();renderer.setAnimationLoop(null);$('intro').hidden=false;$('intro-title').textContent='Graphics paused';$('load').textContent='The browser released the graphics context. Reload this page to rejoin.';$('start').hidden=false;$('start').textContent='Reload game';$('start').onclick=()=>location.reload()});
}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();cameraPlaced=false;resetInput()}
addEventListener('resize',resize);
function selectedCombo(value){try{const eq=typeof value==='string'?JSON.parse(value):value;if(eq&&typeof eq.base==='string')return {...eq,held:null,power:null}}catch{}return {...equipment,held:null,power:null}}
function playerName(){try{return localStorage.getItem('67park.name')||'You'}catch{return 'You'}}
async function loadRoster(members){
  if(loading||loaded)return;loading=true;const epoch=++loadEpoch;roster=members;document.body.dataset.crowd=String(members.length>4);
  try{
    // Sequential loading bounds peak decode memory on mobile; shared asset
    // loaders still deduplicate the common rig and matching bot models.
    for(const [index,member] of members.entries()){
      $('load').textContent=`Preparing players · ${index+1} / ${members.length}`;
      const combo=selectedCombo(member.combo),character=await createCharacter(combo);
      if(dead||epoch!==loadEpoch){character.dispose();return}
      await character.animator.ready;
      if(dead||epoch!==loadEpoch){character.dispose();return}
      const root=new T.Group(),pivot=new T.Group();root.add(pivot);pivot.add(character.root);pivot.position.y=.65;character.root.position.y=-.65;scene.add(root);
      const color=arena.playerColors[index%4],ring=new T.Mesh(new T.RingGeometry(.43,.53,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;root.add(ring);
      const label=document.createElement('span');label.className='name-tag'+(member.id===localId?' me':'');label.textContent=member.name+(member.id===localId&&member.name!=='You'?' · You':'');label.style.setProperty('--player-color',color);$('labels').append(label);
      avatars.set(member.id,{root,pivot,character,ring,label,base:combo.base,ready:true,placed:false,grounded:true});
    }
    loaded=true;loading=false;
    if(practice){resetPractice();$('load').textContent=`Practice · You + ${members.length-1} clearly marked bots`;$('start').textContent=`Practice with ${members.length-1} bots →`;$('start').hidden=false;$('start').onclick=startPractice;phase='ready'}
    else{$('intro').hidden=true;sendReady();if(frame?.over)showResults()}
  }catch(error){loading=false;console.error(error);$('load').textContent='A character could not load. Your party is safe; reload to retry.';$('start').hidden=false;$('start').textContent='Retry loading';$('start').onclick=()=>location.reload()}
}
function resetPractice(){sim=new TumbleSimulation(roster);bombVisuals.reset();lastEvent=0;acc=0;cameraPlaced=false;lastPositions.clear();frame={...sim.snapshot(),status:'ready'};$('result').hidden=true;$('spectate').hidden=true;$('controls').hidden=false;resetInput();for(const a of avatars.values()){a.placed=false;a.outAge=0;a.character.animator.reset()}phase='ready'}
function startPractice(){if(!loaded)return;resetPractice();modal=false;$('menu').hidden=true;$('intro').hidden=true;$('live-leaderboard').hidden=false;syncDialog();paintStandings();countdownEnd=performance.now()+3000;frame.status='countdown';phase='countdown';canvas.focus();previous=performance.now()}
function sendReady(){if(!loaded||!client?.data.connected||!room||!['loading','countdown'].includes(room.status))return;const key=`${room.code}:${room.round||0}`;if(readyKey!==key&&!room.ready?.includes(localId)){readyKey=key;client.send({t:'match.ready',code,round:room.round||0})}}
function acceptFrame(next){
  if(!acceptsTumbleFrame(frame,next))return;
  frame=next;if(!modal)phase=next.status||'playing';
  // The first online/reconnect snapshot is current state plus historical events,
  // not a request to replay explosions and audio that happened while absent.
  if(lastEvent===null)lastEvent=Math.max(0,...(next.events||[]).map(e=>Number.isSafeInteger(e.n)?e.n:0));
  for(const e of next.events||[]){
    if(e.n<=lastEvent)continue;lastEvent=e.n;
    if(e.type==='bomb-explode'){bombVisuals.explode(e,reduced.matches);feedback.play('land',true)}
    else if((e.type==='hit'||e.type==='bomb-hit')&&(e.id===localId||e.by===localId)){feedback.play('hit')}
    else if(e.id===localId){if(e.type==='jump')feedback.play('jump');if(e.type==='punch')feedback.punch(avatars.get(e.id)?.base);if(e.type==='land'||e.type==='bomb-place')feedback.play('land')}
  }
  paintStandings();
  if(next.over&&loaded&&$('result').hidden)showResults();
}
function paintStandings(){
  const alive=(frame?.players||[]).filter(p=>p.alive),rows=alive.map(p=>({id:p.id,name:roster.find(r=>r.id===p.id)?.name||'Player'}));
  if(roster.length>4)rows.sort((a,b)=>Number(b.id===localId)-Number(a.id===localId));
  const key=JSON.stringify(rows);
  $('survivors').textContent=`${alive.length} left`;
  if(key===standingsKey)return;standingsKey=key;
  $('live-players').replaceChildren(...rows.map(p=>{
    const li=document.createElement('li'),name=document.createElement('span');li.dataset.playerId=p.id;li.dataset.self=String(p.id===localId);
    li.style.setProperty('--player-color',arena.playerColors[Math.max(0,roster.findIndex(r=>r.id===p.id))%4]);
    name.textContent=p.name;li.title=p.name;li.append(name);if(p.id===localId){const you=document.createElement('small');you.textContent='YOU';li.append(you)}return li;
  }));
}
function showResults(){
  phase='results';modal=false;$('live-leaderboard').hidden=true;resetInput();$('menu').hidden=true;$('spectate').hidden=true;$('controls').hidden=true;$('result').hidden=false;$('results-list').replaceChildren();
  const me=frame.players.find(p=>p.id===localId),winners=frame.players.filter(p=>p.placement===1),tied=winners.length>1;
  $('result-title').textContent=tied?'A shared finish!':me?.placement===1?'Last one standing!':'Nice tumbling!';$('result-note').textContent=practice?'Practice complete · Bot results are not online scores.':tied?'The remaining players share first place.':'Stay together and play another round.';
  for(const p of [...frame.players].sort((a,b)=>a.placement-b.placement)){const li=document.createElement('li'),name=document.createElement('span'),place=document.createElement('b');li.dataset.playerId=p.id;li.dataset.self=String(p.id===localId);name.textContent=roster.find(r=>r.id===p.id)?.name||'Player';place.textContent=`#${p.placement||'—'}`;li.append(name,place);$('results-list').append(li)}
  $('again').hidden=!practice;$('again').onclick=startPractice;syncDialog();
}
function updateAvatars(dt){
  for(const p of frame?.players||[]){const a=avatars.get(p.id);if(!a)continue;const position=p.p||[0,0,0];a.outAge=p.alive?0:(a.outAge||0)+dt;const direct=!a.placed||practice;desired.fromArray(position);if(!p.alive)desired.y-=a.outAge*4;a.root.position.lerp(desired,direct?1:1-Math.exp(-20*dt));a.root.visible=p.alive||a.outAge<.5;a.ring.visible=p.alive&&p.grounded;
    // Eliminated rigs no longer spend animation work after their short fall.
    if(!a.root.visible)continue;
    a.root.rotation.y=p.yaw;a.pivot.rotation.x=0;a.character.animator.update(dt,{speed:Math.hypot(p.v?.[0]||0,p.v?.[2]||0),grounded:p.grounded,verticalVelocity:p.v?.[1]||0,punchT:p.punchT||0});
    if(a.placed&&a.grounded&&!p.grounded&&(p.v?.[1]||0)>0)a.character.animator.signal('jump');if(a.placed&&!a.grounded&&p.grounded)a.character.animator.signal('land');a.grounded=p.grounded;a.placed=true;
  }
}
function updateCamera(dt){
  const me=frame?.players.find(p=>p.id===localId),alive=frame?.players.filter(p=>p.alive)||[],follow=me?.alive?me:alive[spectating%Math.max(1,alive.length)];
  const a=avatars.get(follow?.id);if(!a)return;
  const delta=look.poll();cameraYaw+=delta.lookYaw;cameraPitch=T.MathUtils.clamp(cameraPitch+delta.lookPitch,.3,1.12);
  target.copy(a.root.position);target.y=Math.max(-1,target.y)+1.2;
  // Mobile framing changes the camera, never the physics or control scale.
  const distance=camera.aspect<.8?18:15,flat=Math.cos(cameraPitch)*distance;
  desired.set(target.x+Math.sin(cameraYaw)*flat,target.y+Math.sin(cameraPitch)*distance,target.z+Math.cos(cameraYaw)*flat);
  camera.position.lerp(desired,cameraPlaced?1-Math.exp(-10*dt):1);camera.lookAt(target);cameraPlaced=true;
}
function updateLabels(){
  const hudBottom=Math.max(document.querySelector('.topbar').getBoundingClientRect().bottom,document.querySelector('.scorebar').getBoundingClientRect().bottom,$('live-leaderboard').hidden?0:$('live-leaderboard').getBoundingClientRect().bottom,$('warning').textContent?$('warning').getBoundingClientRect().bottom:0);
  for(const [id,a] of avatars){
    projected.copy(a.root.position);projected.y+=1.7;projected.project(camera);
    const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
    a.label.hidden=!frame?.players.find(p=>p.id===id)?.alive||!a.root.visible||projected.z>1||projected.z<0||phase==='loading'||y<hudBottom+28||y>innerHeight-16||x<0||x>innerWidth;
    if(!a.label.hidden)a.label.style.transform=`translate(${Math.max(65,Math.min(innerWidth-65,x))}px,${y}px) translate(-50%,-100%)`;
  }
}
function hud(now){
  syncDialog();if(!frame)return;const me=frame.players.find(p=>p.id===localId),alive=frame.players.filter(p=>p.alive).length;
  $('survivors').textContent=`${alive} left`;const seconds=Math.max(0,Math.ceil(frame.left));$('timer').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  $('status').textContent=practice?`Practice · ${roster.length-1} bots`:!client?.data.connected?'Reconnecting · Controls paused':client.data.error||`${frame.players.length} players · Online`;
  $('stage').textContent=frame.progression?.label||'Warm-up';
  $('punch-cooldown').textContent=me?.punchCd>0?`${me.punchCd.toFixed(1)}s`:me&&!me.grounded?'LAND':'F';$('punch').setAttribute('aria-disabled',String(me?.punchCd>0||me&&!me.grounded));
  const armed=frame.bombs?.find(b=>b.ownerId===localId);
  $('bomb-cooldown').textContent=armed?`${Math.ceil(armed.remaining)}s · RUN`:me?.bombCd>0?`${me.bombCd.toFixed(1)}s`:me&&!me.grounded?'LAND':'B · 3s';$('bomb').setAttribute('aria-disabled',String(!!armed||me?.bombCd>0||me&&!me.grounded));
  $('warning').textContent=frame.status==='playing'&&frame.tiles.some(t=>t.warning)?'Striped tiles are about to drop!':'';
  $('countdown').textContent=frame.status==='countdown'?String(Math.max(1,Math.ceil((practice?countdownEnd-now:frame.startAt-Date.now()-(client?.offset||0))/1000))):'';
  const out=me&&!me.alive&&!frame.over;$('spectate').hidden=!out;$('controls').hidden=out||frame.over||phase==='unavailable';
  $('live-leaderboard').hidden=!$('intro').hidden||modal||frame.over||phase==='unavailable';paintStandings();
}
function tick(now){
  if(dead)return;const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;renderFrame++;
  if(practice&&loaded&&!modal&&!document.hidden){
    if(frame.status==='countdown'&&now>=countdownEnd)frame.status='playing';
    if(frame.status==='playing'){
      acc+=dt;let steps=0;while(acc>=1/60&&steps++<4){latestInput=inputs();const control=new Map([[localId,latestInput]]);for(const p of sim.players)if(p.id!==localId)control.set(p.id,botInput(sim,p));sim.step(control);acc-=1/60}
      acceptFrame({...sim.snapshot(),status:sim.over?'results':'playing'});
    }
  }else if(!practice&&client?.data.connected&&canSendTumbleInput(room,code)&&now-lastSend>40){latestInput=inputs();client.send({t:'input',seq:++client.seq,...latestInput});lastSend=now}
  updateAvatars(dt);arena.update(frame,dt,reduced.matches);bombVisuals.update(frame,practice&&modal?0:dt,reduced.matches);updateCamera(dt);updateLabels();
  if(now-lastHud>80){hud(now);lastHud=now}renderer.render(scene,camera);
}
window.__tumbleReadState=()=>({phase,frame,localId,practice,controls:{...latestInput},bombVisuals:bombVisuals?.readState?.(),arena:arena?.readState?.(),render:{frame:renderFrame,calls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,memory:renderer?.info.memory?{...renderer.info.memory}:null},avatars:[...avatars].map(([id,a])=>{const p=frame?.players.find(p=>p.id===id),clip=a.character.animator.mixer?._actions?.find(action=>action.getClip().name==='previewPunch');return {id,base:a.base,ready:a.ready,position:a.root.position.toArray(),tiltX:a.pivot.rotation.x,punchT:p?.punchT||0,punchSerial:p?.punchSerial||0,animation:a.character.animator.stats,punchClip:clip?{running:clip.isRunning(),weight:clip.getEffectiveWeight(),time:clip.time}:null}}),camera:camera?.position.toArray()});

async function boot(){
  try{setupScene();
    if(practice){roster=[{id:'you',name:playerName(),combo:JSON.stringify(equipment)},...Array.from({length:practicePlayers-1},(_,i)=>({id:`bot-${i}`,name:`${['Mint','Honey','Sky'][i%3]}${i<3?'':' '+(i+1)} BOT`,combo:JSON.stringify({...equipment,base:['cat67','frog67','ninja67'][i%3],held:null,power:null})}))];await loadRoster(roster)}
    else if(!code){$('load').textContent='Join a survival room for up to 25 players, or try a local bot round.';$('start').hidden=false;$('start').onclick=()=>location.assign('?practice=1&bots=1')}
    else{
      client=createTumbleClient();client.onFrame(m=>{if(m.code===code)acceptFrame(m)});
      client.subscribe(()=>{
        const data=client.data;if(!data.connected){resetInput();readyKey='';lastEvent=null;return}localId=data.me?.id;room=data.room;
        if(!room||room.code!==code||room.mode!=='tumble'){phase='unavailable';$('intro').hidden=false;$('controls').hidden=true;$('load').textContent='This room is no longer available. Return to the lobby to start a new round.';resetInput();return}
        if(['waiting','queued'].includes(room.status)){returnToParty();return}
        if(room.snapshot)acceptFrame({...room.snapshot,status:room.status,startAt:room.startAt});
        if(!loaded&&!loading)loadRoster(room.members);else sendReady();
      });await client.connect();
    }
  }catch(error){console.error(error);$('load').textContent='The arena could not start. Reload to retry or return to the lobby.';$('start').hidden=false;$('start').textContent='Reload arena';$('start').onclick=()=>location.reload()}
}
addEventListener('pagehide',()=>{dead=true;loadEpoch++;resetInput();client?.dispose();renderer?.setAnimationLoop(null);for(const a of avatars.values()){a.character.dispose();a.ring.geometry.dispose();a.ring.material.dispose()}bombVisuals?.dispose();arena?.dispose();feedback.dispose?.();renderer?.dispose();renderer?.forceContextLoss()});
// Safari may restore a disposed WebGL document from its back/forward cache.
// Reboot only that explicit history restoration, never a healthy live match.
addEventListener('pageshow',event=>{if(event.persisted&&dead)location.reload()});
boot();
