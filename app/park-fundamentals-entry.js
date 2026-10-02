import {installFirstVisitGuide} from './first-visit-guide.js?v=park-fundamentals-20261002-1';
import {installPlayerRescue} from './player-rescue.js?v=park-fundamentals-20261002-1';

const key=Symbol.for('67park.fundamentals.install');
if(typeof window!=='undefined'&&!window[key]){
 window[key]=true;
 // Optional help cannot prevent the main game from starting.
 try{installFirstVisitGuide();}catch{console.warn('Getting started guide unavailable.');}
 try{installPlayerRescue();}catch{console.warn('Player rescue unavailable.');}
}
