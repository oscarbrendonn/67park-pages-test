// A donor ID is only a namespace for clothes now, never a character download.
export function itemAssetURL(file,equipment){
 const base=file.replace(/\.glb$/,'');
 if(!/^friendsie_\d+$/.test(base))throw Error('Invalid accessory namespace');
 const parts=[...new Set(['body','head','sprout','back','kicks','held'].map(slot=>equipment?.[slot]).filter(id=>id?.startsWith(base+':')).map(id=>Number(id.split(':')[1])))].sort((a,b)=>a-b);
 if(!parts.length||parts.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('No selected accessory for '+base);
 return '/67park-pages-test/models/items/'+base+'/'+parts.join('+')+'.glb';
}
export function itemAssetParts(url){
 const match=/^(.*\/models\/items\/friendsie_\d+\/)(\d+(?:\+\d+)+)\.glb$/.exec(url);
 return match?match[2].split('+').map(ord=>match[1]+ord+'.glb'):null;
}
