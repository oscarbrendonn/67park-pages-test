import {getPlayerAccountState,subscribePlayerAccount,refreshPlayerProgression,equipProfileIdentity,loadCareerLeaderboard} from './player-account-client.js?v=player-account-20261003-1';

export function ensureCareerStyle(){
 if(document.getElementById('park-career-style'))return;
 const link=document.createElement('link');link.id='park-career-style';link.rel='stylesheet';link.href=new URL('./profile-career.css',import.meta.url).href;document.head.append(link);
}
export function createProfileCareer({portrait,onTitle}){
 ensureCareerStyle();
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const n=el('button','park-ui-control',text);n.type='button';n.addEventListener('click',fn);return n;};
 const root=el('section','profile-career'),heading=el('h3','','Your park story'),stats=el('div','career-stats'),note=el('p','career-caption','Records start with this update. Coins do not affect your rank.');
 const actions=el('div','career-actions'),identity=el('div','career-identity'),board=el('div','career-board'),status=el('p','career-status');status.setAttribute('role','status');
 identity.id='career-identity';board.id='career-board';identity.hidden=board.hidden=true;
 const identityButton=button('Titles & frames',()=>toggle('identity')),boardButton=button('Leaderboard',()=>toggle('board'));
 for(const [b,id]of [[identityButton,identity.id],[boardButton,board.id]]){b.setAttribute('aria-controls',id);b.setAttribute('aria-expanded','false');}
 const refresh=button('Refresh rankings',()=>loadBoard());
 const boardCaption=el('p','career-caption','All parks on this server · Most wins · Equal wins share a rank.');
 const list=el('ol','career-ranking'),mine=el('p','career-mine');list.setAttribute('aria-label','Park wins leaderboard');
 board.append(boardCaption,list,mine,refresh);actions.append(identityButton,boardButton);root.append(heading,stats,note,actions,identity,board,status);
 let disposed=false,pending=false,boardPending=false,tab='',lastCareer='',lastOwner='';
 function toggle(next){
  tab=tab===next?'':next;identity.hidden=tab!=='identity';board.hidden=tab!=='board';
  identityButton.setAttribute('aria-expanded',String(!identity.hidden));boardButton.setAttribute('aria-expanded',String(!board.hidden));
  if(tab==='board')void loadBoard();
 }
 function render(){
  if(disposed)return;
  const profile=getPlayerAccountState(),career=profile?.career;
  if(profile?.id!==lastOwner){list.replaceChildren();mine.textContent='';lastOwner=profile?.id||'';}
  identityButton.disabled=boardButton.disabled=!career;
  if(!career){stats.textContent='Connect to load your park records.';return;}
  portrait.dataset.frame=career.frame;onTitle(career.titles.find(t=>t.id===career.title)?.label||'');
  const signature=JSON.stringify(career)+pending;
  if(signature===lastCareer)return;lastCareer=signature;
  stats.replaceChildren();
  for(const [label,value]of [['Wins',career.wins],['Matches finished',career.matches]]){const card=el('div','career-stat');card.append(el('strong','',String(value)),el('span','',label));stats.append(card);}
  const focused=identity.contains(document.activeElement)?document.activeElement?.dataset.choice:null;
  identity.replaceChildren();
  for(const [slot,rows]of [['title',career.titles],['frame',career.frames]]){
   const group=el('section','career-choice-group'),title=el('h4','',slot==='title'?'Titles':'Avatar frames'),choices=el('div','career-choices');group.append(title,choices);
   for(const row of rows){
    const selected=career[slot]===row.id,b=button('',()=>select(slot,row.id));b.dataset.choice=slot+':'+row.id;b.setAttribute('aria-pressed',String(selected));
    b.setAttribute('aria-label',`${slot==='title'?'Title':'Frame'}: ${row.label}`);b.disabled=pending||!row.unlocked;
    if(slot==='frame'){const swatch=el('span','career-frame-swatch');swatch.dataset.frame=row.id;swatch.setAttribute('aria-hidden','true');b.append(swatch);}
    b.append(el('strong','',row.label),el('small','',!row.unlocked?row.requirement:selected?'Equipped':'Use'));
    choices.append(b);
   }
   identity.append(group);
  }
  if(focused)[...identity.querySelectorAll('button')].find(b=>b.dataset.choice===focused&&!b.disabled)?.focus({preventScroll:true});
 }
 async function select(slot,id){
  if(pending||disposed)return;pending=true;status.textContent='Saving…';render();
  try{await equipProfileIdentity(slot,id);if(!disposed)status.textContent='Profile updated.';}
  catch(e){if(!disposed)status.textContent=e.message;}
  finally{pending=false;if(!disposed){render();identity.querySelector(`[data-choice="${slot}:${id}"]`)?.focus({preventScroll:true});}}
 }
 async function loadBoard(){
  if(boardPending||disposed)return;boardPending=true;refresh.disabled=true;list.setAttribute('aria-busy','true');status.textContent='Loading rankings…';
  try{
   const data=await loadCareerLeaderboard();if(disposed)return;
   if(data?.revision!=='park-career-20261005-1'||!Array.isArray(data.rows))throw Error('Rankings are not available on this server yet.');
   list.replaceChildren();
   const id=getPlayerAccountState()?.id;
   for(const row of data.rows){const li=el('li','career-ranking-row');li.dataset.me=String(row.id===id);
    const name=el('span','career-ranking-name',row.name+(row.id===id?' · You':''));
    li.append(el('span','career-rank','#'+row.rank),name,el('strong','',`${row.wins} ${row.wins===1?'win':'wins'}`));list.append(li);
   }
   mine.textContent=data.me?`Your rank: #${data.me.rank} · ${data.me.wins} ${data.me.wins===1?'win':'wins'}`:'Finish a mini-game to join the leaderboard.';
   status.textContent=data.rows.length?'Rankings updated.':'No recorded matches yet.';
  }catch(e){if(!disposed)status.textContent=e.message;}
  finally{boardPending=false;if(!disposed){refresh.disabled=false;list.setAttribute('aria-busy','false');}}
 }
 const unsubscribe=subscribePlayerAccount(render);render();
 void refreshPlayerProgression().then(()=>{if(!disposed&&!getPlayerAccountState()?.career)status.textContent='Park records are not available on this server yet.';}).catch(e=>{if(!disposed)status.textContent=e.message;});
 return {element:root,dispose(){disposed=true;unsubscribe();}};
}
