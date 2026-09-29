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
export function openPlayerStudio(equip,openWardrobe) {
  window.dispatchEvent(new Event('park:release-controls'));
  // Keep the existing session, party and world alive while changing clothes.
  // Every base uses the same in-game studio; no detached preview navigation.
  openWardrobe(true);
}
