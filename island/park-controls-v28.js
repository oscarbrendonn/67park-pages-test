import {CHARACTERS} from './park-roster-v28.js';
import {installGameButtons as baseButtons} from './apple-controls-v26.js';
const icon=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export function installParkControls({jump,sprint,isGame,controller,chooseCharacter,chooseBoard}){
  const host=baseButtons({jump,sprint,isGame});
  const board=document.createElement('button'),power=document.createElement('button');
  board.className='parkBoard';power.className='parkPower';board.type=power.type='button';
  board.innerHTML=icon('<rect x="3" y="8" width="18" height="6" rx="3"/><path d="M7 17h.01M17 17h.01"/>')+'<span>Kaykay</span>';
  power.innerHTML=icon('<path d="m13 2-7 10h6l-1 6 7-10h-6l1-6ZM4 18l-2 3m18-3 2 3M7 22h10"/>')+'<span>Darbe</span>';
  board.setAttribute('aria-label','Kaykaya bin veya in');power.setAttribute('aria-label','Yeşil güç: zıpla ve yere vur');
  host.prepend(board,power);
  function bind(button,action){
    let id=null;
    for(const name of ['touchstart','touchmove','touchend','touchcancel'])button.addEventListener(name,e=>e.stopPropagation(),{passive:true});
    button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
      if(!isGame()||id!==null||button.getAttribute('aria-disabled')==='true')return;
      id=e.pointerId;button.setPointerCapture(id);button.dataset.held='true';action();});
    const reset=()=>{id=null;button.dataset.held='false';};
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{if(id===e.pointerId)reset();});
    button.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.stopPropagation();e.preventDefault();
      if(!e.repeat&&isGame()&&button.getAttribute('aria-disabled')!=='true')action();}});
    button.addEventListener('click',e=>{if(e.detail===0&&isGame()&&button.getAttribute('aria-disabled')!=='true')action();});
    addEventListener('blur',reset);return reset;
  }
  const resets=[bind(board,()=>controller()?.toggleBoard()),bind(power,()=>controller()?.queuePower())];
  const oldReset=host.resetGesture;host.resetGesture=()=>{oldReset();resets.forEach(f=>f());};
  const dialog=document.createElement('dialog');dialog.id='parkWardrobe';dialog.setAttribute('aria-labelledby','parkWardrobeTitle');
  dialog.innerHTML='<header><div><small>SIX SEVEN PARK</small><h2 id="parkWardrobeTitle">Karakter & kaykay</h2></div><button type="button" data-close aria-label="Kapat">✕</button></header><p class="parkMenuStatus" role="status">21 karakter · 4 kaykay · yalnız seçilen model yüklenir</p><h3>Karakterler</h3><div class="parkRoster"></div><h3>Kaykay</h3><div class="parkBoards"></div><h3>Hareketler</h3><div class="parkEmotes"></div><p class="parkKeys">WASD hareket · Shift koş · Boşluk zıpla<br>V kaykay · Q yeşil darbe · M harita · R başlangıç</p>';
  document.body.append(dialog);const status=dialog.querySelector('[role=status]');
  const profile=document.getElementById('tamEggyOyun');
  profile.textContent='Karakter';profile.removeAttribute('href');profile.setAttribute('role','button');profile.tabIndex=0;
  const open=()=>{if(!controller())return;host.resetGesture();document.exitPointerLock?.();dialog.showModal();dialog.querySelector('[data-close]').focus();};
  profile.addEventListener('click',e=>{e.preventDefault();open();});profile.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();open();}});
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>profile.focus());
  // Do not allow dialog keystrokes to become gameplay shortcuts underneath.
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  let busy=false;
  async function select(button,task,label){if(busy)return;busy=true;status.textContent=label+' yükleniyor…';
    dialog.setAttribute('aria-busy','true');
    try{await task();status.textContent=label+' hazır';for(const b of button.parentElement.children)b.setAttribute('aria-pressed',String(b===button));}
    catch(e){status.textContent='Model yüklenemedi; mevcut karakter korundu. Tekrar deneyebilirsin.';console.error(e);}
    finally{busy=false;dialog.removeAttribute('aria-busy');}}
  for(const def of CHARACTERS){const b=document.createElement('button');b.type='button';b.textContent=def.name;
    b.setAttribute('aria-pressed',String(def.id==='goril'));b.dataset.character=def.id;
    b.onclick=()=>select(b,()=>chooseCharacter(def.id),def.name);dialog.querySelector('.parkRoster').append(b);}
  for(const [id,label] of [['logo','67 Logo'],['neon','Neon'],['klasik','Klasik'],['retro','Retro']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.board=id;b.setAttribute('aria-pressed',String(id==='logo'));
    b.onclick=()=>select(b,()=>chooseBoard(id),label);dialog.querySelector('.parkBoards').append(b);}
  for(const [id,label] of [['wave','Selam'],['club','Dans'],['cheer','Kutlama']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.onclick=()=>{controller()?.playEmote(id);dialog.close();};dialog.querySelector('.parkEmotes').append(b);}
  host.menuOpen=()=>dialog.open;
  host.updateState=()=>{const c=controller();if(!c)return;
    board.setAttribute('aria-pressed',String(c.boardOn));
    board.setAttribute('aria-disabled',String(c.swimming||c.slam.active||!c.grounded));
    power.setAttribute('aria-disabled',String(c.swimming||c.slam.cooldown>0));
    const caption=c.swimming?'Suda yok':c.slam.cooldown>0?c.slam.cooldown.toFixed(1)+' s':'Darbe';
    const span=power.querySelector('span');if(span.textContent!==caption)span.textContent=caption;
  };
  return host;
}
