import {openPlayerProfile} from './player-profile-panel.js?v=profile-hud-20261002-1';
import {loadPlayerAccount,getPlayerAccountState,subscribePlayerAccount,claimTestCoins} from './player-account-client.js?v=player-account-20261003-1';

// A browser-local player, never an IP address. Commit only after successful entry.
const KEY = '67park-feel-lab.player-profile.v1';
export function hasChosenCharacter(base) {
  try { const p=JSON.parse(localStorage.getItem(KEY)); return p?.version===1&&p.base===base; }
  catch { return false; }
}
export function rememberCharacter(base) {
  if(typeof base!=='string'||!base) return false;
  try { localStorage.setItem(KEY,JSON.stringify({version:1,base})); return true; }
  catch { return false; }
}
export const PROFILE_PORTRAIT_BASES = Object.freeze(['goril','cat67','ninja67','frog67','cow67','shark67','axolotl67','cyclops67','skeleton67','zombie67','chick67','sloth67','pig67']);
export function getProfilePortrait(base) {
  if(!PROFILE_PORTRAIT_BASES.includes(base))return '';
  // Actual approved model thumbnails, rendered offline. Opening a profile must
  // never allocate another WebGL context or download a second character model.
  return new URL('./profile-portraits/'+base+'.png?v=profile-hud-20261002-1',import.meta.url).href;
}
export function createProfileAvatar(React) {
  return function ProfileAvatar({equip,subscribeEquip}) {
    const base=React.useSyncExternalStore(subscribeEquip,()=>equip.base);
    const src=getProfilePortrait(base);
    return src?React.createElement('img',{className:'park-profile-avatar',src,alt:'',draggable:false,'data-character':base}):null;
  };
}
export function openPlayerStudio(equip,openWardrobe,api) {
  window.dispatchEvent(new Event('park:release-controls'));
  const profileApi={equip,openWardrobe,getPortrait:getProfilePortrait,...api};
  profileApi.wallet={load:loadPlayerAccount,get:getPlayerAccountState,subscribe:subscribePlayerAccount,claim:claimTestCoins};
  profileApi.openShop=api?.openShop||(()=>import('./park-market.js?v=player-account-20261003-1')
    .then(({openParkMarket})=>openParkMarket(window,{initialMode:'shop'}))
    .catch(()=>openPlayerProfile({...profileApi,initialStatus:'The shop could not open. Please try again.'})));
  profileApi.openMyItems=api?.openMyItems||(()=>import('./park-market.js?v=player-account-20261003-1')
    .then(({openParkMarket})=>openParkMarket(window,{initialMode:'owned'}))
    .catch(()=>openPlayerProfile({...profileApi,initialStatus:'Your items could not open. Please try again.'})));
  return openPlayerProfile(profileApi);
}
