import {generateDefaultPlayerName,hasPlayerName,playerNameError,sanitizePlayerName,PLAYER_NAME_TAKEN} from './player-name-policy.js?v=player-account-20261003-1';
import {loadPlayerAccount,checkPlayerName,claimPlayerName} from './player-account-client.js?v=player-account-20261003-1';

export function ensurePlayerNameStyles(documentRef=globalThis.document){
  if(!documentRef?.head||documentRef.getElementById('park-player-name-style'))return;
  const link=documentRef.createElement('link');link.id='park-player-name-style';link.rel='stylesheet';
  link.href=new URL('./player-name-field.css?v=player-account-20261003-1',import.meta.url).href;documentRef.head.append(link);
}
ensurePlayerNameStyles();

const suggestionsFrom=value=>Array.isArray(value)?[...new Set(value.filter(name=>typeof name==='string'&&hasPlayerName(name)&&name.length<=16))].slice(0,3):[];
export function nameRequestMessage(error){
  return error?.code==='NAME_TAKEN'?PLAYER_NAME_TAKEN:(error?.message||'Could not check your name. Please try again.');
}

// UI drafts never use the network-backed legacy setter until a claim succeeds.
// The same controller drives collection, Studio and profile, including races.
export function createPlayerNameController({getName=()=>'',setName=()=>{},load=loadPlayerAccount,check=checkPlayerName,claim=claimPlayerName,generate=generateDefaultPlayerName,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=12000}={}){
  let snapshot={name:getName()||generate(),error:'',suggestions:[],pending:false,checking:false},dirty=false,active=true,checkTimer=null,checkGeneration=0,life=0,loaded=false,loadTask=null,claimTask=null;
  const listeners=new Set(),emit=patch=>{snapshot={...snapshot,...patch};for(const listener of listeners)listener();};
  const bounded=operation=>new Promise((resolve,reject)=>{
    const timer=setTimer(()=>reject(Object.assign(Error('Could not reach the name service. Please try again.'),{code:'NAME_TIMEOUT'})),timeoutMs);
    Promise.resolve().then(operation).then(resolve,reject).finally(()=>clearTimer(timer));
  });
  function stopCheck(){clearTimer(checkTimer);checkTimer=null;checkGeneration++;}
  function syncAccepted(){if(!dirty&&!snapshot.pending){const name=getName();if(hasPlayerName(name))emit({name,error:'',suggestions:[]});}}
  function initialize(){
    if(loaded)return Promise.resolve();
    if(loadTask)return loadTask;
    const generation=life;
    loadTask=bounded(()=>load()).then(profile=>{
      if(!active||generation!==life)return;
      if(!hasPlayerName(profile?.name))throw Error('Your name could not be loaded. Please try again.');
      loaded=true;setName(profile.name);
      if(!dirty)emit({name:profile.name,error:'',suggestions:[]});
      return profile;
    }).catch(error=>{
      if(active&&generation===life)emit({error:nameRequestMessage(error),suggestions:suggestionsFrom(error?.suggestions)});
      throw error;
    }).finally(()=>{loadTask=null;});
    return loadTask;
  }
  function edit(value){
    if(snapshot.pending)return;
    dirty=true;stopCheck();const name=sanitizePlayerName(value),error=playerNameError(name);
    emit({name,error,suggestions:[],checking:!error});if(error)return;
    const generation=checkGeneration;
    checkTimer=setTimer(()=>{
      checkTimer=null;
      bounded(()=>check(name)).then(result=>{
        if(!active||generation!==checkGeneration||snapshot.name!==name)return;
        emit({checking:false,error:result?.available?'':PLAYER_NAME_TAKEN,suggestions:result?.available?[]:suggestionsFrom(result?.suggestions)});
      }).catch(error=>{if(active&&generation===checkGeneration&&snapshot.name===name)emit({checking:false,error:nameRequestMessage(error),suggestions:suggestionsFrom(error?.suggestions)});});
    },300);
  }
  function commit(){
    if(claimTask)return claimTask;
    const validation=playerNameError(snapshot.name);if(validation){emit({error:validation,suggestions:[]});return Promise.resolve(false);}
    stopCheck();const generation=life;emit({pending:true,checking:false,error:'',suggestions:[]});
    claimTask=(async()=>{
      try{
        await initialize();if(!active||generation!==life)return false;
        const profile=await bounded(()=>claim(snapshot.name.trim()));
        if(!active||generation!==life)return false;
        if(!hasPlayerName(profile?.name))throw Error('Your name could not be saved. Please try again.');
        dirty=false;setName(profile.name);emit({name:profile.name,error:'',suggestions:[]});return profile;
      }catch(error){if(active&&generation===life)emit({error:nameRequestMessage(error),suggestions:suggestionsFrom(error?.suggestions)});return false;}
      finally{if(active&&generation===life)emit({pending:false});claimTask=null;}
    })();return claimTask;
  }
  return {getSnapshot:()=>snapshot,subscribe:listener=>(listeners.add(listener),()=>listeners.delete(listener)),edit,commit,initialize,syncAccepted,
    setError:error=>emit({error}),
    activate(){active=true;return initialize();},
    dispose(){active=false;life++;stopCheck();loadTask=null;claimTask=null;snapshot={...snapshot,pending:false,checking:false};}
  };
}

export function createPlayerNameFeedback(React){
  const h=React.createElement;
  return function PlayerNameFeedback({id,error='',suggestions=[],pending=false,onChoose}){
    if(!error&&!pending&&!suggestions.length)return null;
    return h('div',{className:'park-name-feedback'},
      h('p',{id,className:'wardrobe-name-error',role:error?'alert':'status','aria-live':'polite'},error||(pending?'Checking your name…':'')),
      suggestions.length>0&&h('div',{className:'park-name-suggestions','aria-label':'Available name suggestions'},suggestions.map(name=>h('button',{type:'button',className:'park-ui-control',key:name,disabled:pending,onClick:()=>onChoose?.(name)},name))));
  };
}

export function renderPlayerNameFeedback(container,{error='',suggestions=[],pending=false,onChoose}={}){
  const documentRef=container.ownerDocument;container.replaceChildren();container.hidden=!error&&!pending&&!suggestions.length;
  if(error||pending){const text=documentRef.createElement('p');text.className='wardrobe-name-error';text.setAttribute('role',error?'alert':'status');text.textContent=error||(pending?'Checking your name…':'');container.append(text);}
  if(suggestions.length){const row=documentRef.createElement('div');row.className='park-name-suggestions';row.setAttribute('aria-label','Available name suggestions');
    for(const name of suggestions){const button=documentRef.createElement('button');button.type='button';button.className='park-ui-control';button.textContent=name;button.disabled=pending;button.addEventListener('click',()=>onChoose?.(name));row.append(button);}container.append(row);}
}
