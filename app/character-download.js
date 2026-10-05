import {assetFetch} from './entry-loading.js';

// Retry only a transient transfer failure, never corrupt GLB parsing or 404s.
// One shared character-store promise owns both attempts and decoded bytes.
export async function downloadCharacter(url,{fetcher=assetFetch,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 for(let attempt=0;attempt<2;attempt++){
  try{return await (await fetcher(url,{priority:'high'})).arrayBuffer();}
  catch(error){
   const message=String(error?.message||error);
   const transient=error instanceof TypeError||/Download interrupted|HTTP (?:408|429|5\d\d)\b/.test(message);
   if(attempt||!transient)throw error;
   await wait(500);
  }
 }
}
