// The exact selected-avatar assembly and animation pipeline used by Balloon.
// Skybound retains ownership of collision, gravity and checkpoint state.
import {i as createSelectedCharacter,f as equipment} from '../balloon/chunk-U4P5F7P3.js';
export async function createSkyboundAvatar(){
 const selected={...equipment};
 const avatar=await createSelectedCharacter(selected);
 const ready=await avatar.animator.ready;
 if(!ready){avatar.dispose();throw new Error('Selected character animation failed to load');}
 document.documentElement.dataset.skyboundAvatar=selected.base;
 document.documentElement.dataset.skyboundEquipment=JSON.stringify(selected);
 return avatar;
}
