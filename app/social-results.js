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
    if(message.t==='match.ready'){
      if(round===null){pendingReady=message;return true;}
      message={...message,round};
    }
    return originalSend.call(this,message);
  };
  if(!doc.querySelector('[data-social-features]')){
    const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./social-features.css?v=social-1',import.meta.url).href;css.dataset.socialFeatures='1';doc.head.append(css);
  }
  let root,again,cancel,status,error,people,changeGame,signature='',navigating=false,scheduled=false;
  const update=()=>{
    scheduled=false;
    const state=client.data,room=state?.room;
    if(!room){root?.remove();root=null;signature='';return;}
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
    const card=doc.querySelector('dialog.om-result[open], #sp-result:not([hidden]) .sp-result-card, #rr-result:not([hidden]) > div, #result.cr-dialog:not([hidden]) > div');
    if(!card)return;
    if(!root?.isConnected){
      root=doc.createElement('section');root.className='social-round';root.setAttribute('aria-label','Play again together');
      again=doc.createElement('button');again.className='social-again';again.onclick=()=>client.act('room.play-again',{});
      cancel=doc.createElement('button');cancel.textContent='Cancel ready';cancel.onclick=()=>client.act('room.play-again',{value:false});
      status=doc.createElement('p');status.setAttribute('role','status');error=doc.createElement('p');error.setAttribute('role','alert');
      changeGame=doc.createElement('button');changeGame.textContent='Choose next game together';changeGame.onclick=()=>client.act('room.return',{});
      people=doc.createElement('section');people.setAttribute('aria-label','Match players');people.className='social-result-people';
      root.append(status,again,cancel,changeGame,people,error);card.append(root);signature='';
    }
    const voted=room.again?.includes(state.me?.id),text=`${room.again?.length||0}/${room.capacity} players ready for another round. Everyone must agree.`;
    const next=JSON.stringify([voted,text,state.connected,state.error,room.host,room.members.map(p=>[p.id,p.name]),state.friendIds,state.outgoingRequests]);if(next===signature)return;signature=next;
    status.textContent=text;again.textContent=voted?'Waiting for your team…':'Play again together';again.disabled=!state.connected||voted;
    cancel.hidden=!voted;cancel.disabled=!state.connected;error.textContent=state.error||'';error.hidden=!state.error;
    changeGame.hidden=room.host!==state.me?.id;changeGame.disabled=!state.connected;
    people.replaceChildren();
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
  return ()=>{off?.();offFrame?.();root?.remove();if(originalSend)client.send=originalSend;delete client.__socialResults;};
}
