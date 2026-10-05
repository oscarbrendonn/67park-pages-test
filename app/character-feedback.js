// Cosmetic identities only. Never change force, hit timing or the shared rig.
export const CHARACTER_FEEDBACK=Object.freeze({
 goril:{sound:'punch-gorilla',id:'gorilla-punch',effect:'star',colors:['#ffcf61','#fff5cc']},
 cat67:{sound:'punch-cat',id:'cat-scratch',effect:'paw',colors:['#e993bd','#b69cdd']},
 frog67:{sound:'punch-frog',id:'frog-palm',effect:'webbed',colors:['#a8c879','#fff0bb']},
 ninja67:{sound:'punch-ninja',id:'ninja-strike',effect:'slash',colors:['#9684d5','#83d6e7']},
 cow67:{sound:'punch-cow',id:'cow-horns',effect:'horns',colors:['#ece8ee','#89818f']},
 shark67:{sound:'punch-shark',id:'shark-teeth',effect:'teeth',colors:['#9eddea','#f5fbff']},
 cyclops67:{sound:'punch-cyclops',id:'cyclops-eye',effect:'eye',colors:['#c0b5ef','#fff3be']},
 skeleton67:{sound:'punch-skeleton',id:'skeleton-bones',effect:'bones',colors:['#eee8db','#c4b6d2']},
 zombie67:{sound:'punch-zombie',id:'zombie-drops',effect:'drops',colors:['#adbf7b','#dfd3a4']},
 chick67:{sound:'punch-chick',id:'chick-feathers',effect:'feathers',colors:['#ffe292','#f4b699']},
 sloth67:{sound:'punch-sloth',id:'sloth-claws',effect:'claws',colors:['#cbbca6','#eee4d4']},
 axolotl67:{sound:'punch-axolotl',id:'axolotl-gills',effect:'gills',colors:['#f1aac9','#b9dfeb']},
 pig67:{sound:'punch-pig',id:'pig-snout',effect:'snout',colors:['#f0acc4','#b37596']},
});
export function feedbackBase(base){return Object.hasOwn(CHARACTER_FEEDBACK,base)?base:null;}
