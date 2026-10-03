import {ensurePreviewGuest,currentPreviewBackend,currentPreviewGuest} from './preview-network.js?v=online-next-1';
import {PREVIEW_VARIANT} from './preview-network-config.js?v=mac-recovery-1';

const shared=Symbol.for('67park.player-account.v1');
const state=globalThis[shared]??={profile:null,pending:null,listeners:new Set(),epoch:0};
state.tail??=Promise.resolve();
const read=(key)=>{try{return globalThis.localStorage?.getItem(key)}catch{return null}};
function legacyInventory(id){
  const owner=read('67park.inventory.owner.v1');
  if(owner&&owner!==id)return undefined;
  try{const value=JSON.parse(read('67park.inventory.v1'));return value&&typeof value==='object'?value:undefined}catch{return undefined}
}
function accept(profile){
  if(!profile||typeof profile.id!=='string'||typeof profile.name!=='string'||!Array.isArray(profile.inventory?.owned)||!Number.isFinite(profile.inventory.coins))throw Error('Your profile could not be verified. Please retry.');
  state.profile=profile;
  for(const listener of state.listeners)try{listener(profile)}catch{}
  return profile;
}
export const getPlayerAccountState=()=>state.profile;
export function subscribePlayerAccount(listener){state.listeners.add(listener);return()=>state.listeners.delete(listener)}
export function resetPlayerAccount(){state.epoch++;state.pending=null;state.profile=null;}
function currentIdentity(){
  const guest=currentPreviewGuest();
  if(guest&&state.profile&&guest.id!==state.profile.id)resetPlayerAccount();
  return guest;
}

async function performRequest(action,body,epoch,expectedId){
  const session=currentPreviewGuest()||await ensurePreviewGuest();
  if(epoch!==state.epoch)throw Error('Your account changed. Please retry.');
  if(expectedId&&session.id!==expectedId)throw Error('Your account changed. Please retry.');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
    const response=await fetch(currentPreviewBackend()+'/'+PREVIEW_VARIANT+'/api/player',{
      method:'POST',mode:'cors',credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},
      body:JSON.stringify({action,...body,...(action==='profile'?{legacy:legacyInventory(session.id)}:{})}),signal:abort.signal,
    });
    let data;try{data=await response.json()}catch{throw Error('Your profile service is unavailable. Please retry.')}
    if(!response.ok)throw Object.assign(Error(data.error||'Your change could not be saved. Please retry.'),{code:data.code,suggestions:Array.isArray(data.suggestions)?data.suggestions:[]});
    if(epoch!==state.epoch||currentPreviewGuest()?.id!==session.id)throw Error('Your account changed. Please retry.');
    if(data.profile){if(data.profile.id!==session.id)throw Error('Your account changed. Please retry.');accept(data.profile);}
    return data;
  }catch(error){
    if(error.name==='AbortError')throw Object.assign(Error('The server took too long. Please retry; nothing has been charged twice.'),{code:'ACCOUNT_TIMEOUT'});
    throw error;
  }finally{clearTimeout(timer)}
}
function request(action,body={}){
  const guest=currentIdentity(),epoch=state.epoch;
  const run=()=>performRequest(action,body,epoch,guest?.id);
  // Keep confirmed snapshots in commit order even when the network reorders
  // replies. Availability checks do not mutate or replace profile state.
  if(action==='name-check')return run();
  const result=state.tail.then(run);state.tail=result.catch(()=>{});return result;
}
export function loadPlayerAccount(){
  currentIdentity();
  if(state.profile)return Promise.resolve(state.profile);
  if(state.pending)return state.pending;
  const pending=request('profile').then(data=>data.profile);state.pending=pending;
  void pending.finally(()=>{if(state.pending===pending)state.pending=null}).catch(()=>{});
  return pending;
}
export const checkPlayerName=name=>request('name-check',{name});
export async function claimPlayerName(name){await loadPlayerAccount();return (await request('name-claim',{name})).profile;}
export async function purchasePlayerItem(itemId){await loadPlayerAccount();return (await request('purchase',{itemId})).profile;}
export async function equipPlayerItem(selection){await loadPlayerAccount();return (await request('equip',selection)).profile;}
