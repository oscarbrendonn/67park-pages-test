// Tab hints are optional. Private mode/quota/security restrictions must never
// prevent a game module from evaluating, including a throwing storage getter.
export function readSessionItem(key,scope=globalThis){
 try{return scope.sessionStorage?.getItem(key)??null;}catch{return null;}
}
export function writeSessionItem(key,value,scope=globalThis){
 try{const storage=scope.sessionStorage;if(!storage)return false;storage.setItem(key,value);return true;}catch{return false;}
}
export function removeSessionItem(key,scope=globalThis){
 try{const storage=scope.sessionStorage;if(!storage)return false;storage.removeItem(key);return true;}catch{return false;}
}
// Compiled legacy entries can bind this facade without regenerating their
// unrelated gameplay bundle or changing any existing storage keys/values.
export const safeSessionStorage=Object.freeze({getItem:readSessionItem,setItem:writeSessionItem,removeItem:removeSessionItem});
