// Approved original playable characters, one existing 20-bone movement family.
// Friends remain asset donors; they are not added back to the playable roster.
import {loadCharacterAsset} from './character-assets.js?v=entry-light-1';
import {APPROVED_CHARACTER_SELECTION,approvedCharacter,approvedCharacterURL} from './approved-character-selection.js?v=approved-roster-20261001-2';
export const CAT_BASE = 'cat67';
export const NINJA_BASE = 'ninja67';
export const FROG_BASE = 'frog67';
export const COW_BASE = 'cow67';
export const SHARK_BASE = 'shark67';
export const NEXT_CHARACTERS = Object.freeze([
 {base:'axolotl67',name:'Axolotl',file:'axolotl',head:'67Park_Axolotl_Head',eyeHeight:120/391},
]);
export const NEW_APPROVED_CHARACTERS = Object.freeze(APPROVED_CHARACTER_SELECTION.filter(c=>!NEXT_CHARACTERS.some(n=>n.base===c.base)));
export const nextCharacter = base => approvedCharacter(base) || NEXT_CHARACTERS.find(c=>c.base===base);
export const NATIVE_BASES = Object.freeze(['goril', CAT_BASE, NINJA_BASE, FROG_BASE, COW_BASE, SHARK_BASE,...NEXT_CHARACTERS.map(c=>c.base),...NEW_APPROVED_CHARACTERS.map(c=>c.base)]);
export const isNativeCharacter = base => NATIVE_BASES.includes(base);
export const nativeCharacterFile = base => nextCharacter(base) ? base+'.glb' : base === SHARK_BASE ? 'shark67.glb' : base === COW_BASE ? 'cow67.glb' : base === FROG_BASE ? 'frog67.glb' : base === CAT_BASE ? 'cat67.glb' : base === NINJA_BASE ? 'ninja67.glb' : 'goril-v1.glb';
export const nativeCharacterURL = base => approvedCharacterURL(base) || (nextCharacter(base) ? '/67park-pages-test/models/park-originals/'+nextCharacter(base).file+'.glb?v=next-characters-1' : base === SHARK_BASE ? '/67park-pages-test/models/park-originals/shark.glb?v=shark-release-1' : base === COW_BASE ? '/67park-pages-test/models/park-originals/cow.glb?v=cow-release-1' : base === FROG_BASE ? '/67park-pages-test/models/park-originals/frog.glb?v=frog-release-1' : base === CAT_BASE || base === NINJA_BASE
  ? '/67park-pages-test/models/park-originals/'+(base===CAT_BASE?'cat.glb?v=cat-silver-1':'ninja.glb?v=lossless-2')
  : '/67park-pages-test/models/goril-motion-v3.glb');
export function registerNativeCharacters(catalog) {
  if (!catalog.some(c => c.id === CAT_BASE)) catalog.splice(1, 0, {
    id:CAT_BASE, name:'Cat 67', file:null, no:67, rarity:'Original',
    rarityNote:'a soft grey park friend',
    traits:[{cat:'Fur',icon:'',value:'Soft Grey'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  if (!catalog.some(c => c.id === NINJA_BASE)) catalog.splice(2, 0, {
    id:NINJA_BASE, name:'Ninja 67', file:null, no:68, rarity:'Original',
    rarityNote:'a little shadow with a friendly face',
    traits:[{cat:'Suit',icon:'',value:'Midnight'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  if (!catalog.some(c => c.id === FROG_BASE)) catalog.splice(3, 0, {
    id:FROG_BASE, name:'Frog 67', file:null, no:69, rarity:'Original',
    rarityNote:'a green park friend with a warm smile',
    traits:[{cat:'Skin',icon:'',value:'Leaf Green'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  if (!catalog.some(c => c.id === COW_BASE)) catalog.splice(4, 0, {
    id:COW_BASE, name:'Cow 67', file:null, no:70, rarity:'Original',
    rarityNote:'a spotted park friend with a friendly moo',
    traits:[{cat:'Coat',icon:'',value:'Black & White'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  if (!catalog.some(c => c.id === SHARK_BASE)) catalog.splice(5, 0, {
    id:SHARK_BASE, name:'Shark', file:null, no:71, rarity:'Original',
    rarityNote:'a blue-grey park friend with a toothy smile',
    traits:[{cat:'Skin',icon:'',value:'Blue Grey'},{cat:'Style',icon:'',value:'Mix & Match'}],
  });
  for(const [i,c]of [...NEXT_CHARACTERS,...NEW_APPROVED_CHARACTERS].entries())if(!catalog.some(row=>row.id===c.base))catalog.splice(6+i,0,{id:c.base,name:c.name,file:null,no:72+i,rarity:'Original',rarityNote:'an original park friend',traits:[{cat:'Style',icon:'',value:'Mix & Match'}]});
  return catalog;
}
export function loadNativeCharacter(base, loadGorilla) {
  if (base === 'goril' || !isNativeCharacter(base)) return loadGorilla();
  return loadCharacterAsset(nativeCharacterURL(base));
}
