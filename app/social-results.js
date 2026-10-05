// Mount within each game's existing results card, never over movement controls.
export function returnToParty(win=globalThis.window) {
  // State/ping updates can arrive while the new document is still loading.
  // Replacing again on each update aborts slow navigations indefinitely.
  if(!win||win.__parkReturningToParty)return;
  win.__parkReturningToParty=true;
  win.location.replace('/67park-pages-test/play/');
}

export function installSocialResults(client, win=globalThis.window) {
  const doc=win?.document;
  if(!doc||!client.subscribe||client.__socialResults)return ()=>{};
  client.__socialResults=true;
  const initialParams=new URLSearchParams(win.location.search);
  let round=initialParams.has('round')?Number(initialParams.get('round'))||0:null,pendingReady=null;
  const originalSend=client.send;
  if(originalSend)client.send=function(message){
    if(this.data?.room?.spectating&&['input','race.input','rocket.input','sports.input','match.ready'].includes(message.t))return false;
    if(message.t==='match.ready'){
      if(round===null){pendingReady=message;return true;}
      message={...message,round};
    }
    return originalSend.call(this,message);
  };
  if(!doc.querySelector('[data-social-features]')){
    const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./social-features.css?v=friends-gifts-watch-20261005-1',import.meta.url).href;css.dataset.socialFeatures='1';doc.head.append(css);
  }
  let root,again,cancel,status,notice,error,people,changeGame,sportsWatch,signature='',navigating=false,scheduled=false;
  const update=()=>{
    scheduled=false;
    const state=client.data,room=state?.room;
    const watchingSport=room?.spectating&&['basket','penalty'].includes(room.mode)&&['countdown','playing'].includes(room.status);
    if(watchingSport&&!sportsWatch){
      sportsWatch=doc.createElement('section');sportsWatch.className='external-sports-watch park-ui-panel';sportsWatch.setAttribute('aria-label','Watch match');
      const label=doc.createElement('span');label.textContent='Spectating · Camera follows the shot';const leave=doc.createElement('button');leave.type='button';leave.className='park-ui-control';leave.textContent='Back to lobby';leave.onclick=()=>{client.act('room.leave');returnToParty(win)};sportsWatch.append(label,leave);doc.body.append(sportsWatch);
    }else if(!watchingSport){sportsWatch?.remove();sportsWatch=null;}
    if(!room){doc.body.classList.remove('park-external-spectator');root?.remove();root=null;signature='';return;}
    doc.body.classList.toggle('park-external-spectator',room.spectating===true);
    const inArena=new URLSearchParams(win.location.search).get('match')===room.code;
    if(inArena&&round===null){
      round=room.round||0;const url=new URL(win.location.href);url.searchParams.set('round',String(round));win.history.replaceState(null,'',url.href);
      if(pendingReady){const message=pendingReady;pendingReady=null;originalSend.call(client,{...message,round});}
    }
    // Each arena owns return navigation, preventing competing page loads.
    if(inArena&&['loading','countdown','playing'].includes(room.status)&&(room.round||0)!==round&&!navigating){
      navigating=true;const url=new URL(win.location.href);url.searchParams.set('round',String(room.round||0));win.location.replace(url.href);return;
    }
    if(room.status!=='results'){root?.remove();root=null;signature='';return;}
    const card=doc.querySelector('dialog.om-result[open], #sp-result:not([hidden]) .sp-result-card, #rr-result:not([hidden]) > div, #result.cr-dialog:not([hidden]) > div, #result.tt-result:not([hidden]) > .card');
    if(!card)return;
    if(!root?.isConnected){
      root=doc.createElement('section');root.className='social-round';root.setAttribute('aria-label','Play again together');
      again=doc.createElement('button');again.className='social-again';again.onclick=()=>client.act('room.play-again',{});
      cancel=doc.createElement('button');cancel.textContent='Cancel ready';cancel.onclick=()=>client.act('room.play-again',{value:false});
      status=doc.createElement('p');status.setAttribute('role','status');notice=doc.createElement('p');notice.setAttribute('role','status');notice.dataset.matchNotice='true';error=doc.createElement('p');error.setAttribute('role','alert');
      changeGame=doc.createElement('button');changeGame.textContent='Choose next game together';changeGame.onclick=()=>client.act('room.return',{});
      people=doc.createElement('section');people.setAttribute('aria-label','Match players');people.className='social-result-people';
      const leave=doc.createElement('button');leave.textContent='Leave match · Back to lobby';leave.className='park-ui-control';
      leave.classList.add('social-watch-leave');leave.onclick=()=>{win.dispatchEvent(new win.Event('park:release-controls'));client.act('room.leave',{});returnToParty(win);};
      root.append(notice,status,again,cancel,changeGame,leave,people,error);card.append(root);signature='';
      if(room.spectating){root.prepend(leave);card.prepend(root);}
    }
    const voted=room.again?.includes(state.me?.id),text=`${room.again?.length||0}/${room.mode==='tumble'?room.members.length:room.capacity} players ready for another round. Everyone must agree.`;
    const next=JSON.stringify([voted,text,state.connected,state.error,state.notice,room.host,room.members.map(p=>[p.id,p.name]),state.friendIds,state.outgoingRequests]);if(next===signature)return;signature=next;
    status.textContent=room.spectating?'Match finished · Spectators do not receive player rewards.':text;again.textContent=voted?'Waiting for your team…':'Play again together';again.disabled=!state.connected||voted;again.hidden=room.spectating===true;
    cancel.hidden=!voted||room.spectating===true;cancel.disabled=!state.connected;error.textContent=state.error||'';error.hidden=!state.error;notice.textContent=state.notice||'';notice.hidden=!state.notice;
    changeGame.hidden=room.host!==state.me?.id;changeGame.disabled=!state.connected;
    root.classList.toggle('is-spectator-result',room.spectating===true);people.hidden=room.spectating===true;people.replaceChildren();
    for(const p of room.members){if(p.id===state.me?.id)continue;
      const row=doc.createElement('div'),name=doc.createElement('span'),button=doc.createElement('button');name.textContent=p.name;
      const friend=state.friendIds?.includes(p.id),sent=state.outgoingRequests?.find(q=>q.to===p.id);
      button.textContent=friend?'Friends':sent?'Cancel friend request':'Add friend';button.setAttribute('aria-label',`${button.textContent} ${p.name}`);button.disabled=!state.connected||friend;
      button.onclick=()=>sent?client.act('friend.cancel',{id:sent.id}):client.act('friend.request',{target:p.id});
      row.append(name,button);people.append(row);
    }
  };
  const schedule=()=>{if(!scheduled){scheduled=true;queueMicrotask(update);}};
  const off=client.subscribe(schedule),offFrame=client.onFrame?.(frame=>{if(frame.over)schedule();});schedule();
  return ()=>{off?.();offFrame?.();root?.remove();sportsWatch?.remove();if(originalSend)client.send=originalSend;delete client.__socialResults;};
}
