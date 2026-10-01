import {createPartyAudio} from './party/party-audio.js';
import {playerSettings,savePlayerSettings} from './player-settings.js';
// The same short contact sounds as the park, fired by simulation events (not
// by button presses). This page has no party-pack audio graph of its own.
export function createMinigameFeedback(){
 const sfx=createPartyAudio({settings:playerSettings,saveSettings:savePlayerSettings,gameMuted:()=>{try{return localStorage.getItem('67park-feel-lab-muted')==='1'}catch{return false}}});
 // The shared engine already owns gesture unlock, including iOS touchend.
 // An unconditional second ensure() bypasses mute/zero-volume/hidden guards.
 return {play:event=>sfx.play(event),dispose(){sfx.dispose?.()}};
}
