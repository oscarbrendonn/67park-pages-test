// Seven reference-color variants explicitly approved by the user on 2026-10-01.
// Axolotl replaces its URL only; it is not a duplicate roster entry.
export const APPROVED_CHARACTER_REVISION = 'approved-roster-20261001-2';
// Keep the approved roster/color assets immutable; replace only the repaired lid.
export const ZOMBIE_EYE_REVISION = 'zombie-eye-20261002-1';
export const APPROVED_CHARACTER_SELECTION = Object.freeze([
 {base:'cyclops67',name:'Cyclops',file:'cyclops',head:'67Park_Cyclops_Head',eyeHeight:0.4987951807228916},
 {base:'skeleton67',name:'Skeleton',file:'skeleton',head:'67Park_Skeleton_Head',eyeHeight:0.454337899543379},
 {base:'zombie67',name:'Zombie',file:'zombie',head:'67Park_Zombie_Head',eyeHeight:0.30512820512820515},
 {base:'chick67',name:'Chick',file:'chick',head:'67Park_Chick_Head',eyeHeight:0.259825327510917},
 {base:'sloth67',name:'Sloth',file:'sloth',head:'67Park_Sloth_Head',eyeHeight:0.3641025641025641},
 {base:'axolotl67',name:'Axolotl',file:'axolotl',head:'67Park_Axolotl_Head',eyeHeight:120/391},
 {base:'pig67',name:'Pig',file:'pig',head:'67Park_Pig_Head',eyeHeight:0.44029850746268656},
].map(Object.freeze));
export const approvedCharacter = base => APPROVED_CHARACTER_SELECTION.find(c=>c.base===base);
export const approvedCharacterURL = base => {
 const row=approvedCharacter(base);
 if(row?.base==='zombie67')return '/67park-pages-test/models/park-approved/zombie-eye-v2.glb?v='+ZOMBIE_EYE_REVISION;
 return row ? '/67park-pages-test/models/park-approved/'+row.file+'.glb?v='+APPROVED_CHARACTER_REVISION : null;
};
