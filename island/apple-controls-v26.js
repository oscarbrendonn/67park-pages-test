const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export function installGameButtons({jump,sprint,isGame}){
  const host=document.createElement('div');host.id='hareketKontrolleri';
  host.setAttribute('role','group');host.setAttribute('aria-label','Karakter hareketleri');
  const run=document.createElement('button'),hop=document.createElement('button');
  run.type=hop.type='button';run.className='parkRun';hop.className='parkJump';
  run.innerHTML=svg('<circle cx="15" cy="4" r="1.5"/><path d="m8 9 4-2 3 4 4 1M12 7l-2 7 4 3 1 4m-5-7-4 5H3"/>')+'<span>Koş</span>';
  hop.innerHTML=svg('<path d="M12 16V4m-5 5 5-5 5 5M5 18v2h14v-2"/>')+'<span>Zıpla</span>';
  run.setAttribute('aria-label','Basılı tutarak koş');run.setAttribute('aria-pressed','false');hop.setAttribute('aria-label','Zıpla');
  host.append(run,hop);document.body.append(host);
  for(const button of [run,hop]){
    let pointer=null,keyboard=false;
    const begin=()=>{button.dataset.held='true';if(button===run){sprint(true);run.setAttribute('aria-pressed','true');}else jump();};
    const end=()=>{button.dataset.held='false';if(button===run){sprint(false);run.setAttribute('aria-pressed','false');}};
    for(const type of ['touchstart','touchmove','touchend','touchcancel'])button.addEventListener(type,e=>e.stopPropagation(),{passive:true});
    button.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();
      if(!isGame()||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
      pointer=e.pointerId;button.setPointerCapture(pointer);begin();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{
      if(pointer!==e.pointerId)return;pointer=null;end();});
    button.addEventListener('keydown',e=>{if(e.code!=='Space'&&e.code!=='Enter')return;e.preventDefault();e.stopPropagation();
      if(e.repeat||!isGame())return;keyboard=true;begin();});
    button.addEventListener('keyup',e=>{if(e.code!=='Space'&&e.code!=='Enter')return;e.preventDefault();e.stopPropagation();keyboard=false;end();});
    button.addEventListener('click',e=>{if(e.detail===0&&!keyboard&&isGame()){begin();end();}});
    const reset=()=>{pointer=null;keyboard=false;end();};
    addEventListener('blur',reset);button.addEventListener('blur',()=>{if(keyboard)reset();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
    button.resetGesture=reset;
  }
  host.resetGesture=()=>{run.resetGesture();hop.resetGesture();};
  return host;
}
