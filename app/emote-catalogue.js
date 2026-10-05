// Shared IDs only; no rig, world or renderer dependencies.
export const EXTRA_EMOTES=Object.freeze([
 {id:'clap',label:'Clap',icon:'clap',tempo:1},
 {id:'sway',label:'Sway',icon:'sway',tempo:1},
 {id:'bow',label:'Bow',icon:'bow',tempo:1},
].map(Object.freeze));
export const EMOTE_IDS=Object.freeze(['heart','sixseven','groundpunch','club','wave','bounce','spin','robot','cheer','groundsit',...EXTRA_EMOTES.map(e=>e.id)]);
export const EMOTE_FAVORITE_SLOTS=4;
export const DEFAULT_EMOTE_FAVORITES=Object.freeze(['heart','sixseven','wave','club']);
export const EMOTE_FAVORITES_REVISION='emote-favorites-20261005-1';
export function normalizeEmoteFavorites(value){
 const rows=Array.isArray(value)?value:DEFAULT_EMOTE_FAVORITES,seen=new Set();
 return Array.from({length:EMOTE_FAVORITE_SLOTS},(_,i)=>{
  const id=rows[i];if(!EMOTE_IDS.includes(id)||seen.has(id))return null;seen.add(id);return id;
 });
}
export function assignEmoteFavorite(value,slot,id){
 if(!Number.isInteger(slot)||slot<0||slot>=EMOTE_FAVORITE_SLOTS||id!==null&&!EMOTE_IDS.includes(id))throw Error('Choose a valid favorite slot and emote.');
 const rows=normalizeEmoteFavorites(value),other=id===null?-1:rows.indexOf(id);
 if(other>=0&&other!==slot)rows[other]=rows[slot];
 rows[slot]=id;return rows;
}
