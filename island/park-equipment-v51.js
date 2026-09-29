import {CHARACTERS,RARITY_STYLE} from './park-source-data-v51.js';
import {defaultEquip,sanitizeV3,slotOptions as sourceOptions,partLabel} from './park-source-equipment-v51.js';
export {CHARACTERS,RARITY_STYLE,partLabel};
export const EQUIPMENT_SLOTS=Object.freeze(['base','body','head','sprout','back','kicks','held','power','vibe']);
const physical=EQUIPMENT_SLOTS.filter(s=>s!=='base');
const gorillaUnsupported=new Set(['body','head','back','kicks']);
const baseOf=eq=>typeof eq==='string'?eq:eq?.base;
export function supportedSlots(equipmentOrBase='goril'){
 return EQUIPMENT_SLOTS.filter(s=>baseOf(equipmentOrBase)!=='goril'||!gorillaUnsupported.has(s));
}
export function defaultEquipment(base='goril'){
 if(!CHARACTERS.some(c=>c.id===base))throw Error('Unknown source character');
 return defaultEquip(base);
}
export function slotOptions(slot,equipmentOrBase){
 if(!EQUIPMENT_SLOTS.includes(slot))throw Error('Unknown equipment slot');
 let out=sourceOptions(slot).filter(p=>typeof p!=='string'||!p.startsWith('shop:'));
 if(baseOf(equipmentOrBase)==='goril'){
  if(gorillaUnsupported.has(slot))return [null];
  if(slot==='sprout')out=out.filter(p=>p===null||p==='goril:TAC'||p.startsWith('spr-'));
  if(slot==='held')out=out.filter(p=>p===null||p==='goril:CICEK');
 }
 return [...out];
}
export function sanitizeEquipment(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const eq=sanitizeV3(input);if(!eq)return null;
 // Fix the original selector's inert gorilla rows: the source assembler does
 // not fit external Body/Head/Back/Kicks or oversized foreign traits to it.
 // Shop/drink ownership is NOT granted by importing a UI or static roster.
 for(const slot of physical)if(!slotOptions(slot,eq).includes(eq[slot]))eq[slot]=null;
 return eq;
}
export function cycleEquipment(input,slot,dir=1){
 const eq=sanitizeEquipment(input);if(!eq)throw Error('Invalid equipment');
 if(!Number.isFinite(dir))throw Error('Invalid cycle direction');
 const options=slotOptions(slot,eq),i=options.indexOf(eq[slot]),delta=Math.trunc(dir);
 const value=options[((i+delta)%options.length+options.length)%options.length];
 if(slot==='base')return sanitizeEquipment({...defaultEquipment(value),power:eq.power,vibe:eq.vibe});
 return sanitizeEquipment({...eq,[slot]:value});
}
export function randomEquipment(random=Math.random){
 const pick=options=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random source');return options[Math.floor(n*options.length)];};
 const eq=defaultEquipment(pick(slotOptions('base')));
 for(const slot of physical)eq[slot]=pick(slotOptions(slot,eq));
 return sanitizeEquipment(eq);
}
