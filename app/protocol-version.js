// Change the protocol range only when the wire contract is incompatible.
// A visual release does not invalidate everybody's saved guest identity.
export const CLIENT_PROTOCOL = 1;
export const CLIENT_BUILD = 'recovery-graphics-1';
export const SERVER_PROTOCOL = Object.freeze({min:1,max:1,build:CLIENT_BUILD});
export function compatibleProtocol(value,protocol=CLIENT_PROTOCOL){
 return !!value && Number.isSafeInteger(value.min) && Number.isSafeInteger(value.max)
  && value.min<=value.max && protocol>=value.min && protocol<=value.max;
}
export function requestedProtocol(url){
 const value=new URL(url,'http://park.local').searchParams.get('protocol');
 // Older clients speak v1. Keep them working while that protocol is supported.
 return value===null?1:/^\d{1,5}$/.test(value)?Number(value):NaN;
}
