import {CHARACTERS,RARITY_STYLE,defaultEquipment,sanitizeEquipment,slotOptions,partLabel,cycleEquipment,randomEquipment} from './park-equipment-v51.js';
import {loadEquipmentCharacter,disposeEquipmentCharacter} from './park-assembled-assets-v51.js';
import {createCharacterStage51} from './park-stage-v51.js';
import {EMOTES} from './park-emotes-v28.js';
import {matchGorillaNeck} from './park-neck-v30.js';

const PROFILE_KEY='67park.islands.profile.v51';
const SLOTS=[['base','Base'],['body','Body'],['head','Head'],['sprout','Sprout'],['back','Back'],['kicks','Kicks'],['held','Held'],['power','Power'],['vibe','Vibe']];
const BOARDS=[['logo','67 Logo Board','#f69fbc'],['neon','Neon Board','#a8dab2'],['klasik','Classic Board','#ebca97'],['retro','Retro Board','#b6c5eb']];
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS={character:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',bag:'<path d="M6 8h12l2 13H4L6 8Zm3 0V6a3 3 0 0 1 6 0v2"/>',maps:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16M15 5v16"/>',emotes:'<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7.5 14a5 5 0 0 0 9 0"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',board:'<rect x="3" y="8" width="18" height="6" rx="3"/><path d="M7 18h.01M17 18h.01"/>',jump:'<path d="M12 17V3m-5 5 5-5 5 5M5 18v3h14v-3"/>',run:'<circle cx="15" cy="4" r="1.5"/><path d="m8 9 4-2 3 4 4 1M12 7l-2 7 4 3 1 4m-5-7-4 5H3"/>',power:'<path d="m13 2-7 10h6l-1 6 7-10h-6l1-6ZM4 18l-2 3m18-3 2 3M7 22h10"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01"/>'};
const cleanName=n=>String(n||'').replace(/[\u0000-\u001f<>]/g,'').slice(0,16);
const defaultProfile=()=>({v:51,name:'',equipment:{...defaultEquipment('goril'),sprout:'goril:TAC',held:'goril:CICEK'},board:'logo'});
function sanitizeProfile(value){
  if(!value||typeof value!=='object'||value.v!==51)return null;
  const eq=sanitizeEquipment(value.equipment);if(!eq)return null;
  return {v:51,name:cleanName(value.name),equipment:eq,board:BOARDS.some(b=>b[0]===value.board)?value.board:'logo'};
}
function readProfile(){
  const transfer=new URLSearchParams(location.search).get('loadout');
  if(transfer&&transfer.length<=1600){try{const p=sanitizeProfile(JSON.parse(transfer));if(p)return p;}catch{}}
  try{return sanitizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)))||defaultProfile();}catch{return defaultProfile();}
}
function writeProfile(profile){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}}
function button(label,icon,cls=''){
  const b=document.createElement('button');b.type='button';b.className=cls;
  if(icon)b.innerHTML=svg(ICONS[icon]);
  if(label){const s=document.createElement('span');s.textContent=label;b.append(s);}
  return b;
}

/** Original Six Seven Park flow, adapted to the existing island renderer.
 * No old map, building, backend endpoint, purchase or token ownership is imported.
 */
export function installParkControls({jump,sprint,isGame,controller,chooseCharacter,chooseBoard,chooseEquipment,enterPark,resetSpawn,variant='codex',ready=()=>!!controller()}){
  let profile=readProfile(),draft={...profile.equipment},busy=false,panel='character',lastTrigger=null,firstEntry=true,appliedInitial=false;
  let profileDirty=true,disposed=false,lastEffectsAt=performance.now(),lastStatus='',previewBusy=false,previewReady=false;
  const abort=new AbortController(),on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:abort.signal});
  document.documentElement.lang='en';document.body.classList.add('parkShell51');
  const host=document.createElement('div');host.id='hareketKontrolleri';host.setAttribute('role','group');host.setAttribute('aria-label','Character actions');
  const board=button('Board','board','parkBoard'),power=button('Slam','power','parkPower'),run=button('Run','run','parkRun'),hop=button('Jump','jump','parkJump');
  host.append(board,power,run,hop);document.body.append(host);
  const resets=[];
  function bindAction(el,begin,end=()=>{}){
    let pointer=null,key=false,keyboardClick=false;
    const reset=()=>{if(pointer!==null&&el.hasPointerCapture?.(pointer))el.releasePointerCapture(pointer);pointer=null;key=false;keyboardClick=false;el.dataset.held='false';end();};
    const allowed=()=>isGame()&&el.getAttribute('aria-disabled')!=='true';
    on(el,'pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopPropagation();if(pointer!==null||!allowed())return;pointer=e.pointerId;el.setPointerCapture(pointer);el.dataset.held='true';begin();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])on(el,type,e=>{if(pointer===e.pointerId)reset();});
    on(el,'keydown',e=>{if(!['Space','Enter'].includes(e.code))return;e.preventDefault();e.stopPropagation();if(e.repeat||!allowed())return;key=true;keyboardClick=true;el.dataset.held='true';begin();});
    on(el,'keyup',e=>{if(!['Space','Enter'].includes(e.code))return;e.preventDefault();e.stopPropagation();reset();keyboardClick=true;queueMicrotask(()=>keyboardClick=false);});
    on(el,'click',e=>{e.stopPropagation();if(e.detail===0&&!key&&!keyboardClick&&allowed()){begin();end();}});
    on(el,'blur',reset);resets.push(reset);
  }
  bindAction(board,()=>controller()?.toggleBoard());bindAction(power,()=>controller()?.queuePower());
  bindAction(run,()=>{sprint(true);run.setAttribute('aria-pressed','true');},()=>{sprint(false);run.setAttribute('aria-pressed','false');});bindAction(hop,jump);
  host.resetGesture=()=>resets.forEach(f=>f());
  on(window,'blur',host.resetGesture);on(document,'visibilitychange',()=>{if(document.hidden)host.resetGesture();});

  const nav=document.createElement('nav');nav.id='parkNav51';nav.setAttribute('aria-label','Six Seven Park');
  const brand=document.createElement('div');brand.className='parkBrand51';
  brand.innerHTML='<img src="./park-brand-v51.png" alt="Six Seven Park"><div><strong>Six Seven Park</strong><small></small></div>';
  brand.querySelector('small').textContent=(variant==='kimi'?'Kimi':'Codex')+' Island · exploring';
  const navActions=document.createElement('div');navActions.className='parkNavActions51';
  const profileButton=button('Character','character'),bagButton=button('Bag','bag'),mapsButton=button('Maps','maps'),emotesButton=button('Emotes','emotes');
  for(const b of [profileButton,bagButton,mapsButton,emotesButton]){b.setAttribute('aria-haspopup','dialog');navActions.append(b);}
  nav.append(brand,navActions);document.body.append(nav);
  const mapReturn=button('Return to park','left','parkMapReturn51');mapReturn.hidden=true;document.body.append(mapReturn);
  on(mapReturn,'click',()=>document.getElementById('oyunaDon').click());
  const originalProfile=document.getElementById('tamEggyOyun');originalProfile.removeAttribute('href');originalProfile.tabIndex=-1;
  const dialog=document.createElement('dialog');dialog.id='parkMenu51';dialog.className='parkDialog51';dialog.setAttribute('aria-labelledby','parkTitle51');
  dialog.innerHTML='<header class="parkDialogHead51"><div><small>SIX SEVEN PARK</small><h1 id="parkTitle51">Your character</h1></div></header><div class="parkPanel51" data-panel="character"><div class="parkCharacterGrid51"><section class="parkCharacterVisual51"><div class="parkCharacterName51"><div><h2></h2><p></p></div><span class="parkRarity51"></span></div><div class="parkStage51" aria-label="Interactive character preview"></div><p class="parkStageHint51">Drag to turn · your exact equipped model</p><label class="parkNameField51"><span>Player name</span><input placeholder="Your name…" maxlength="16" autocomplete="nickname"></label><p class="parkCharacterNote51"></p></section><section class="parkTraits51" aria-label="Character traits"><div class="parkTraitsHeading51"><h2>Mix & match</h2><span>9 independent slots</span></div><div class="parkSlots51"></div></section></div></div><div class="parkPanel51" data-panel="inventory" hidden><p class="parkIntro51">Choose your board. Your character and equipment stay with you when you switch islands.</p><div class="parkBoards51"></div><h2>Your loadout</h2><dl class="parkLoadout51"></dl></div><div class="parkPanel51" data-panel="maps" hidden><p class="parkIntro51">One park. Two islands. The same character and controls.</p><div class="parkMaps51"></div><h2>Explore this island</h2><div class="parkMapViews51"></div></div><div class="parkPanel51" data-panel="emotes" hidden><p class="parkIntro51">The original Six Seven Park emotes. Move to stop.</p><div class="parkEmotes51"></div></div><div class="parkPanel51" data-panel="help" hidden><dl class="parkHelp51"><dt>Move</dt><dd>WASD / arrows · left joystick</dd><dt>Camera</dt><dd>Drag on the right · mouse</dd><dt>Jump / sprint</dt><dd>Space / Shift</dd><dt>Board / slam</dt><dd>V / Q</dd><dt>Emotes / bag</dt><dd>B / I</dd><dt>Bird’s eye / home</dt><dd>M / R</dd></dl><p class="parkServiceNote51">Island build · local play.<br>The original collectible IDs and traits are preserved. NFT ownership, wallet actions and online services are not connected in this local build.</p></div><footer class="parkDialogFoot51"><p class="parkStatus51" role="status" aria-live="polite"></p><div class="parkFooterActions51"></div></footer>';
  document.body.append(dialog);
  const close=button('','close','parkClose51');close.setAttribute('aria-label','Close menu');dialog.querySelector('header').append(close);
  const info=button('Controls & services','help','parkHelpButton51');dialog.querySelector('footer').prepend(info);
  const random=button('Random — reroll all slots',null,'parkRandom51');
  const enter=button('Enter the park',null,'parkEnter51');
  dialog.querySelector('.parkFooterActions51').append(random,enter);
  const status=dialog.querySelector('[role=status]'),nameInput=dialog.querySelector('input'),slotRows=new Map();
  nameInput.value=profile.name;
  const stage=createCharacterStage51(dialog.querySelector('.parkStage51'),{loadCharacter:async eq=>{
    const result=await loadEquipmentCharacter(eq);
    try{matchGorillaNeck(result.body);return result;}catch(error){disposeEquipmentCharacter(result.body);throw error;}
  },disposeCharacter:result=>disposeEquipmentCharacter(result.body)});
  const showStatus=(message,error=false)=>{if(message===lastStatus)return;lastStatus=message;status.textContent=message;status.dataset.error=String(error);};
  let stageRequest=0;
  async function refreshCharacter(){
    const def=CHARACTERS.find(c=>c.id===draft.base)||CHARACTERS[0],rarity=RARITY_STYLE[def.rarity];
    dialog.querySelector('.parkCharacterName51 h2').textContent=def.name;
    dialog.querySelector('.parkCharacterName51 p').textContent=`Garden No. ${def.no} of ${CHARACTERS.length-1}`;
    const badge=dialog.querySelector('.parkRarity51');badge.textContent=rarity.label;badge.style.background=rarity.bg;badge.style.color=rarity.fg;
    dialog.querySelector('.parkCharacterNote51').textContent=def.rarityNote+' · original Six Seven Park collection';
    for(const [slot,row] of slotRows){row.value.textContent=slot==='base'?def.name:partLabel(draft[slot]);
      const supported=slotOptions(slot,draft).length>1;for(const b of row.row.querySelectorAll('button')){b.disabled=!supported;b.title=supported?'':'Not used by this base';}}
    const request=++stageRequest;previewBusy=true;previewReady=false;showStatus('Preparing your character…');enter.disabled=true;
    try{await stage.setEquipment({...draft});if(request!==stageRequest||disposed)return;previewReady=true;showStatus('Your character is ready.');}
    catch(err){if(request!==stageRequest||disposed)return;showStatus('Preview could not load. Your current character is safe. Try another selection.',true);console.warn('Character preview unavailable',err);}
    finally{if(request===stageRequest){previewBusy=false;enter.disabled=busy||!ready()||!previewReady;}}
  }
  for(const [slot,label] of SLOTS){
    const row=document.createElement('div');row.className='parkSlot51';const title=document.createElement('span');title.className='parkSlotLabel51';title.textContent=label;
    const prev=button('','left'),next=button('','right'),value=document.createElement('span');value.className='parkSlotValue51';
    prev.setAttribute('aria-label',`Previous ${label.toLowerCase()}`);next.setAttribute('aria-label',`Next ${label.toLowerCase()}`);
    on(prev,'click',()=>{if(busy)return;draft=cycleEquipment(draft,slot,-1);profileDirty=true;void refreshCharacter();});
    on(next,'click',()=>{if(busy)return;draft=cycleEquipment(draft,slot,1);profileDirty=true;void refreshCharacter();});
    row.append(title,prev,value,next);dialog.querySelector('.parkSlots51').append(row);slotRows.set(slot,{row,value});
  }
  const footerTitles={character:'Your character',inventory:'Inventory',maps:'Maps — where to?',emotes:'Emotes',help:'Make yourself at home'};
  function openPanel(next,trigger){
    if(disposed||busy)return;panel=next;
    // Internal Help navigation must not restore focus into a closed dialog.
    if(trigger!==info)lastTrigger=trigger||lastTrigger||profileButton;
    host.resetGesture();document.exitPointerLock?.();
    for(const el of dialog.querySelectorAll('[data-panel]'))el.hidden=el.dataset.panel!==next;
    dialog.dataset.panel=next;dialog.querySelector('h1').textContent=footerTitles[next];
    random.hidden=next!=='character';enter.hidden=next!=='character';info.querySelector('span').textContent=next==='help'?'Back to character':'Controls & services';
    stage.setVisible(next==='character');
    if(!dialog.open)dialog.showModal();
    if(next==='character'){draft={...profile.equipment};nameInput.value=profile.name;void refreshCharacter();}
    else{showStatus('');if(next==='inventory')renderLoadout();}
    close.focus();
  }
  function closeMenu(){if(busy||!ready()||!appliedInitial)return;dialog.close();}
  on(close,'click',closeMenu);on(dialog,'cancel',e=>{if(busy||!ready()||!appliedInitial)e.preventDefault();});
  on(dialog,'close',()=>{stage.setVisible(false);host.resetGesture();lastTrigger?.focus();});
  on(dialog,'keydown',e=>e.stopPropagation());
  on(info,'click',()=>openPanel(panel==='help'?'character':'help',info));
  on(profileButton,'click',()=>openPanel('character',profileButton));on(bagButton,'click',()=>openPanel('inventory',bagButton));on(mapsButton,'click',()=>openPanel('maps',mapsButton));on(emotesButton,'click',()=>openPanel('emotes',emotesButton));
  on(originalProfile,'click',e=>{e.preventDefault();openPanel('character',profileButton);});
  on(random,'click',()=>{if(busy)return;draft=randomEquipment();profileDirty=true;void refreshCharacter();});
  on(nameInput,'input',()=>{profileDirty=true;});

  async function applyCharacter(){
    if(busy||!ready()||previewBusy||!previewReady)return;busy=true;enter.disabled=true;dialog.setAttribute('aria-busy','true');showStatus('Applying your character…');
    try{
      await chooseEquipment({...draft});
      profile={...profile,name:cleanName(nameInput.value),equipment:{...draft}};
      if(controller()?.boardKind!==profile.board){try{await chooseBoard(profile.board);}catch(err){profile.board=controller()?.boardKind||'logo';console.warn('Board preserved after loading error',err);}}
      writeProfile(profile);profileDirty=false;appliedInitial=true;firstEntry=false;
      const transfer=new URL(location.href);if(transfer.searchParams.has('loadout')){transfer.searchParams.delete('loadout');history.replaceState(null,'',transfer);}
      enterPark?.();dialog.close();
    }catch(err){showStatus('Could not apply this loadout. Your current character is unchanged.',true);console.warn(err);}
    finally{busy=false;enter.disabled=!ready();dialog.removeAttribute('aria-busy');}
  }
  on(enter,'click',()=>void applyCharacter());
  function renderLoadout(){
    const dl=dialog.querySelector('.parkLoadout51');dl.replaceChildren();
    for(const [slot,label] of SLOTS){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=slot==='base'?(CHARACTERS.find(c=>c.id===profile.equipment.base)?.name||'Gorilla 67'):partLabel(profile.equipment[slot]);dl.append(dt,dd);}
    for(const b of dialog.querySelectorAll('[data-board]'))b.setAttribute('aria-pressed',String(b.dataset.board===(controller()?.boardKind||profile.board)));
  }
  for(const [id,label,color] of BOARDS){
    const b=button(label,'board','parkBoardCard51');b.dataset.board=id;b.style.setProperty('--board-color',color);
    const caption=document.createElement('small');caption.textContent='Island equipment';b.append(caption);
    on(b,'click',async()=>{if(busy||!ready())return;busy=true;dialog.setAttribute('aria-busy','true');showStatus('Loading '+label+'…');
      try{await chooseBoard(id);profile.board=id;writeProfile(profile);renderLoadout();showStatus(label+' equipped.');}
      catch(err){showStatus('Board could not load. Your current board is unchanged.',true);console.warn(err);}
      finally{busy=false;dialog.removeAttribute('aria-busy');}});
    dialog.querySelector('.parkBoards51').append(b);
  }
  for(const em of EMOTES){
    const b=button(em.label,null,'parkEmoteCard51');const symbol=document.createElement('span');symbol.className='parkEmoteSymbol51';symbol.textContent=em.icon;b.prepend(symbol);
    on(b,'click',()=>{const c=controller();if(!c||busy)return;if(c.swimming||!c.grounded||c.slam.active){showStatus('Return to the ground to use an emote.');return;}c.playEmote(em.id);closeMenu();});
    dialog.querySelector('.parkEmotes51').append(b);
  }
  for(const [id,label] of [['codex','Codex Island'],['kimi','Kimi Island']]){
    const b=button(label,'maps','parkMapCard51');const caption=document.createElement('small');caption.textContent=id===variant?'You are here':'Explore with this loadout';b.append(caption);b.setAttribute('aria-current',id===variant?'location':'false');
    on(b,'click',()=>{if(busy)return;if(id===variant){closeMenu();return;}
      const url=new URL(location.href);url.port=id==='codex'?'8015':'8016';url.pathname='/calisma.html';url.search='';url.searchParams.set('view','play');url.searchParams.set('v','islands84');url.searchParams.set('loadout',JSON.stringify(profile));location.assign(url.href);});
    dialog.querySelector('.parkMaps51').append(b);
  }
  const views=dialog.querySelector('.parkMapViews51');
  for(const [id,label] of [['tamHarita','Bird’s eye'],['yakinBakis','Look closer']]){
    const original=document.getElementById(id);original.textContent=label;original.classList.add('parkView51');
    on(original,'click',()=>closeMenu());views.append(original);
  }
  const home=button('Return to small island',null,'parkView51');on(home,'click',()=>{if(!ready()||busy)return;resetSpawn?.();closeMenu();});views.append(home);
  const bas=document.getElementById('bas');bas.innerHTML='<div class="parkBoot51"><img src="./park-brand-v51.png" alt="Six Seven Park"><strong>Preparing your island</strong><p>The park will open when the map is ready.</p></div>';
  on(window,'keydown',e=>{if(dialog.open||e.repeat||e.ctrlKey||e.metaKey||e.altKey||!ready())return;
    if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const next={KeyB:'emotes',KeyI:'inventory',KeyC:'character'}[e.code];if(next){e.preventDefault();openPanel(next,next==='inventory'?bagButton:next==='emotes'?emotesButton:profileButton);}
  });
  host.menuOpen=()=>dialog.open;
  host.renderWorld=()=>!(dialog.open&&panel==='character');
  host.updateState=()=>{
    const c=controller(),available=ready();close.disabled=!available||busy||!appliedInitial;
    if(panel==='character')enter.disabled=busy||!available||previewBusy||!previewReady;
    enter.textContent=firstEntry?'Enter the park':'Save & return';
    for(const b of [bagButton,mapsButton,emotesButton])b.disabled=!available;
    const mapMode=document.getElementById('c').dataset.cameraMode;
    mapReturn.hidden=!available||dialog.open||!mapMode||mapMode==='game';
    const joy=document.querySelector('#hareketJoystick .joystickEtiket');if(joy&&joy.textContent!=='MOVE')joy.textContent='MOVE';
    const pad=document.getElementById('hareketJoystick');if(pad&&pad.getAttribute('aria-label')!=='Movement joystick')pad.setAttribute('aria-label','Movement joystick');
    const help=document.querySelector('.joystickYardim');if(help)help.textContent='Drag the joystick to move.';
    if(!c)return;
    const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-lastEffectsAt)/1000));lastEffectsAt=now;
    c.body.userData.updateEquipmentEffects?.(dt,now/1000,{reduced:c.reduced});
    board.setAttribute('aria-pressed',String(c.boardOn));board.setAttribute('aria-label',c.boardOn?'Step off skateboard':'Ride skateboard');
    board.setAttribute('aria-disabled',String(c.swimming||c.slam.active||!c.grounded));
    power.setAttribute('aria-disabled',String(c.swimming||c.slam.cooldown>0));
    const text=c.swimming?'On land':c.slam.cooldown>0?c.slam.cooldown.toFixed(1)+'s':'Slam';if(power.querySelector('span').textContent!==text)power.querySelector('span').textContent=text;
    nav.hidden=false;
  };
  host.dispose=()=>{disposed=true;abort.abort();stage.dispose();dialog.remove();nav.remove();mapReturn.remove();host.remove();};
  host.getProfile=()=>({...profile,equipment:{...profile.equipment}});
  // The source begins with an opaque character card. Keep that flow while the
  // existing world loads; no new shadow/terrain/controller code is substituted.
  if(!new URLSearchParams(location.search).has('qa'))openPanel('character',profileButton);
  return host;
}
