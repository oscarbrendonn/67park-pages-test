import {createPartyAudio} from './party/party-audio.js';
import {playerSettings,savePlayerSettings} from './player-settings.js';
// The same short contact sounds as the park, fired by simulation events (not
// by button presses). This page has no party-pack audio graph of its own.
export function createMinigameFeedback(){
 const sfx=createPartyAudio({settings:playerSettings,saveSettings:savePlayerSettings,gameMuted:()=>{try{return localStorage.getItem('67park-feel-lab-muted')==='1'}catch{return false}}});
 const unlock=()=>sfx.ensure();
 addEventListener('pointerdown',unlock);addEventListener('keydown',unlock);
 return {play:event=>sfx.play(event),dispose(){removeEventListener('pointerdown',unlock);removeEventListener('keydown',unlock);sfx.dispose?.()}};
}
