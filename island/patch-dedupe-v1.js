// Exact-byte transport for island patch buffers (v1).
// A *.dd1.bin lists byte copies from patch buffers the island runtime already
// holds, plus the remaining literal bytes. The rebuilt ArrayBuffer must equal
// the original *.bin (length, header SHA-256, and SHA-256 of the rebuilt bytes,
// or FNV-1a where WebCrypto is unavailable) before any apply function sees it.
// Otherwise the original *.bin is downloaded exactly as before this change.
// Geometry is never interpreted here; every patch validation still runs.
const MAGIC=0x31444450,VERSION=1,HEADER=52,OP=12;
const SOURCE_NAMES=['literal','pond65','seal64','road56','side50','curb49','path57'];
const ENTRIES={
 seal64:{lite:'./road-seal-v64.dd1.bin?v=road-seal-r1',original:'./road-seal-v64.bin?v=road-seal-r1',error:'road seal64 geometry',bytes:6004688,sha256:'24cb5001dde8ae02580f8a145b118889a6ddd5d9ccae503ca7ea7201033933ee',fnv:'dbfb97bd',sources:['pond65']},
 road56:{lite:'./coastal-road-v56.dd1.bin?v=1',original:'./coastal-road-v56.bin?v=1',error:'road56 geometry',bytes:5432424,sha256:'862027c9d2b604c1a988108a3bc01a5b1799fe49e66b09a1beb55f3e6f3b3479',fnv:'8013508f',sources:['pond65','seal64']},
 side50:{lite:'./side-continuity-v50.dd1.bin?v=1',original:'./side-continuity-v50.bin?v=1',error:'Yüzey normalleri yüklenemedi',bytes:5682616,sha256:'7f050e82076b2975f598ac2ee4cd7c46b618c338da5266d7c620d71aef7788bb',fnv:'8f6a068d',sources:['pond65','seal64','road56']},
 curb49:{lite:'./curb-polish-v49.dd1.bin?v=curb6',original:'./curb-polish-v49.bin?v=curb6',error:'Kaldırım geometrisi yüklenemedi',bytes:6069528,sha256:'21171107a5e65652bfbbeb4f452b8826f828358bcc5ccc01d73f85c99a4a7d27',fnv:'b9c5d807',sources:['pond65','seal64','road56','side50']},
 path57:{lite:'./park-path-polish57.dd1.bin?v=1',original:'./park-path-polish57.bin?v=1',error:'Park path geometry',bytes:5108676,sha256:'b3e1adec86ba9022bbe356a5c0bf9aad789549a5620d9c406f8c07a2842bf410',fnv:'2223f996',sources:['pond65','seal64','road56','side50']},
 ring63:{lite:'./park-ring-v63.dd1.bin?v=L1g2',original:'./park-ring-v63.bin?v=L1g2',error:'Park ring geometry',bytes:4678900,sha256:'38fa1de1bd912adaa2fd15991f11f578edce17a70cef3b97f14f2ccdd686127a',fnv:'42b7fda1',sources:['pond65','seal64','road56','side50','path57']},
};
const PREREQUISITES=['seal64','road56','side50','curb49'];
// Bounded diagnostics only (names, never buffers).
export const islandDedupeStats={rebuilt:[],fallback:[]};
const note=(list,name)=>{list.push(name);if(list.length>32)list.shift();};

class LiteDownload{constructor(name,file,original){this.name=name;this.file=file;this.original=original;}}

async function downloadOriginal(entry,fetcher){
 const response=await fetcher(entry.original);
 if(!response.ok)throw Error(entry.error);
 return response.arrayBuffer();
}
async function downloadLite(entry,fetcher){
 try{const response=await fetcher(entry.lite);return response.ok?await response.arrayBuffer():null;}
 catch{return null;}
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

// Returns the rebuilt ArrayBuffer, or null for any structural mismatch.
export function rebuildDedupe(name,file,sources){
 const entry=ENTRIES[name];
 if(!entry||!(file instanceof ArrayBuffer)||file.byteLength<HEADER)return null;
 const view=new DataView(file),bytes=new Uint8Array(file);
 if(view.getUint32(0,true)!==MAGIC||view.getUint32(4,true)!==VERSION||view.getUint32(8,true)!==entry.bytes)return null;
 if(hex(bytes.subarray(20,52))!==entry.sha256)return null;
 const count=view.getUint32(12,true),literalLength=view.getUint32(16,true),literalBase=HEADER+count*OP;
 if(!count||literalBase+literalLength!==file.byteLength)return null;
 const out=new Uint8Array(entry.bytes);let position=0;
 for(let k=0;k<count;k++){
  const at=HEADER+k*OP,id=view.getUint32(at,true),offset=view.getUint32(at+4,true),length=view.getUint32(at+8,true);
  if(!length||position+length>entry.bytes)return null;
  let source;
  if(id===0){
   if(offset+length>literalLength)return null;
   source=bytes.subarray(literalBase+offset,literalBase+offset+length);
  }else{
   const sourceName=SOURCE_NAMES[id],buffer=sourceName&&entry.sources.includes(sourceName)?sources?.[sourceName]:null;
   if(!(buffer instanceof ArrayBuffer)||offset+length>buffer.byteLength)return null;
   source=new Uint8Array(buffer,offset,length);
  }
  out.set(source,position);position+=length;
 }
 return position===entry.bytes?out.buffer:null;
}

export async function matchesOriginal(name,buffer,subtle=globalThis.crypto?.subtle){
 const entry=ENTRIES[name];
 if(!entry||!(buffer instanceof ArrayBuffer)||buffer.byteLength!==entry.bytes)return false;
 if(subtle?.digest){
  try{return hex(new Uint8Array(await subtle.digest('SHA-256',buffer)))===entry.sha256;}catch{}
 }
 let h=2166136261;const b=new Uint8Array(buffer);
 for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0')===entry.fnv;
}

async function resolve(name,file,sources,fetcher){
 let buffer=null;
 try{buffer=rebuildDedupe(name,file,sources);if(buffer&&!(await matchesOriginal(name,buffer)))buffer=null;}
 catch{buffer=null;}
 if(buffer){note(islandDedupeStats.rebuilt,name);return buffer;}
 note(islandDedupeStats.fallback,name);
 console.warn('Island patch transport fallback: '+ENTRIES[name].original);
 return downloadOriginal(ENTRIES[name],fetcher);
}

// Prerequisite queue job: download only the .dd1.bin (original on HTTP/network failure).
export async function pdFetchLite(name,fetcher){
 const entry=PREREQUISITES.includes(name)?ENTRIES[name]:null;
 if(!entry)throw Error('Island patch transport: unknown prerequisite '+name);
 const file=await downloadLite(entry,fetcher);
 return file?new LiteDownload(name,file,null):new LiteDownload(name,null,await downloadOriginal(entry,fetcher));
}

// After the prerequisite queue settles: replace each LiteDownload slot with
// the exact original ArrayBuffer, in dependency order. pond65 is the untouched
// original buffer from the same queue.
export async function pdPrereqs(results,fetcher,pond65){
 const slots=new Map();
 results.forEach((value,index)=>{
  if(!(value instanceof LiteDownload))return;
  if(slots.has(value.name))throw Error('Island patch transport: duplicate '+value.name);
  slots.set(value.name,index);
 });
 const sources={pond65};
 for(const name of PREREQUISITES){
  const index=slots.get(name);if(index===undefined)continue;
  const item=results[index];
  results[index]=sources[name]=item.original??await resolve(name,item.file,sources,fetcher);
 }
 return results;
}

// GLB-callback download (path57/ring63) with explicit in-scope source buffers.
export async function pdRebuild(name,fetcher,sources){
 const entry=PREREQUISITES.includes(name)?null:ENTRIES[name];
 if(!entry)throw Error('Island patch transport: unknown patch '+name);
 const file=await downloadLite(entry,fetcher);
 return file?resolve(name,file,sources,fetcher):downloadOriginal(entry,fetcher);
}
