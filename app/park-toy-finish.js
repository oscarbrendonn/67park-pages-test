// Same restrained pastel family as the main park; no extra textures or lights.
export const PARK_TOY_PALETTE=Object.freeze({mint:'#83b9b6',cream:'#f0e5cf',rose:'#dca0aa',honey:'#e7b95f',sky:'#9abfce',recess:'#65928f',ink:'#414a4b'});
export function parkToyFinish(color,{ground=false,metal=false}={}){
 return {color,roughness:ground?.88:metal?.3:.32,metalness:metal?.15:0};
}
