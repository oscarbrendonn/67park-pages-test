import {DEFS,ICONS} from '../app/party/action-icons.js';
export function installRocketJump(button,action='jump'){
 if(!document.getElementById('party-defs')){const d=document.createElement('div');d.id='party-defs';d.innerHTML=DEFS;document.body.prepend(d);}
 button.classList.add('party-eggy',action==='sprint'?'cream':'party-eggy-pink');
 if(action==='sprint')button.classList.add('park-action');
 button.innerHTML=ICONS[action]+'<span>'+(action==='sprint'?'Sprint':'Jump')+'</span>';
}
