// ID-based selection stays on the same person when rank/order changes.
export function createWatchSelection(){
  let id=null,players=[];
  return {
    update(next){players=next;if(!players.some(p=>p.id===id))id=players[0]?.id??null;return players.find(p=>p.id===id)||null;},
    move(step){if(players.length){const at=players.findIndex(p=>p.id===id);id=players[(at+step+players.length)%players.length].id;}return players.find(p=>p.id===id)||null;},
    reset(){id=null;players=[];}
  };
}
export function installMatchWatch({root,onLeave,onChange=()=>{},blocked=()=>false,win=window}={}){
  const doc=win.document,selection=createWatchSelection();
  if(!doc.querySelector('[data-match-watch-css]')){
    const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./match-watch.css',import.meta.url).href;css.dataset.matchWatchCss='1';doc.head.append(css);
  }
  root||=doc.createElement('section');root.classList.add('park-match-watch','park-ui-panel');root.hidden=true;root.setAttribute('aria-label','Watch remaining players');
  if(!root.isConnected)doc.body.append(root);
  const reason=doc.createElement('small'),name=doc.createElement('strong'),prev=doc.createElement('button'),next=doc.createElement('button'),leave=doc.createElement('button'),info=doc.createElement('div');
  name.setAttribute('role','status');info.append(reason,name);prev.textContent='‹';next.textContent='›';leave.textContent='Back to lobby';
  prev.setAttribute('aria-label','Watch previous player');next.setAttribute('aria-label','Watch next player');
  for(const b of [prev,next,leave]){b.type='button';b.className='park-ui-control';}
  leave.classList.add('watch-leave');root.replaceChildren(prev,info,next,leave);
  let active=false,current=null,reasonText='Eliminated · Watch';
  const paint=()=>{
    const label=current?`${current.rank>0?'#'+current.rank+' · ':''}${current.name||'Player'}`:'Waiting for remaining players…',id=String(current?.id??'');
    // Called from the render loop: do not churn live-region nodes every frame.
    if(name.textContent!==label)name.textContent=label;if(root.dataset.playerId!==id)root.dataset.playerId=id;if(reason.textContent!==reasonText)reason.textContent=reasonText;
  };
  const move=step=>{if(!active||blocked())return;current=selection.move(step);onChange();paint();};
  prev.onclick=()=>move(-1);next.onclick=()=>move(1);leave.onclick=()=>{if(active&&!blocked())onLeave?.();};
  const key=e=>{if(!active||blocked()||e.target.closest?.('input,textarea,select,[contenteditable=true]')||!['ArrowLeft','ArrowRight'].includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)move(e.code==='ArrowRight'?1:-1);};
  win.addEventListener('keydown',key,true);
  return {
    update({active:show,players=[],reason:label='Eliminated · Watch'}){
      const room=win.__candyOnline?.data?.room;
      if(room?.spectating&&['countdown','playing'].includes(room.status)){show=true;label='Spectating · No player rewards';}
      if(active!==!!show){active=!!show;onChange();if(!active)selection.reset();}
      root.hidden=!active;doc.body.classList.toggle('park-match-watching',active);root.inert=blocked();
      reasonText=label;current=active?selection.update(players):null;prev.disabled=next.disabled=players.length<2;paint();return current;
    },
    get targetId(){return current?.id??null;},
    dispose(){win.removeEventListener('keydown',key,true);root.remove();doc.body.classList.remove('park-match-watching');}
  };
}
