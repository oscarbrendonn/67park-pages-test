export const STORAGE_KEY='friends-item-studio-drafts-v1';
const finite=(v,d,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):d;
export function cleanSettings(value={}) {
  const v=value&&typeof value==='object'?value:{};
  const materials={};
  for(const [key,m] of Object.entries(v.materials||{})){
    if(!/^\d{1,3}$/.test(key)||!m||typeof m!=='object')continue;
    materials[key]={mode:['original','tint','solid'].includes(m.mode)?m.mode:'original',color:/^#[0-9a-f]{6}$/i.test(m.color)?m.color:'#ffffff',roughness:finite(m.roughness,1,0,1),metalness:finite(m.metalness,0,0,1)};
  }
  return {scale:finite(v.scale,1,.25,2),rotation:finite(v.rotation,0,-180,180),offset:[0,1,2].map(i=>finite(v.offset?.[i],0,-2,2)),speed:finite(v.speed,1,0,3),materials};
}
export const settingsEqual=(a,b)=>JSON.stringify(cleanSettings(a))===JSON.stringify(cleanSettings(b));
export function readDrafts(storage){
  try{const data=JSON.parse(storage.getItem(STORAGE_KEY)||'{}');if(!data||typeof data!=='object'||Array.isArray(data))return {};return Object.fromEntries(Object.entries(data).filter(([id])=>/^(friendsie_\d+:\d+|pwr-(stars|hearts|bolts)|vibe-(pink|mint|gold|sky))$/.test(id)).map(([id,value])=>[id,cleanSettings(value)]));}catch{return {};}
}
