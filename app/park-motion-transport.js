// Motion is replaced every frame/input tick; it is never a command queue.
// Keep at most a small flight of bytes behind a slow mobile uplink. Once it
// drains, the next tick sends CURRENT input (including released gas/brake).
// Do not retain/replay a pending throttle after a blur or a disconnect.
export const PARK_MOTION_QUEUE_LIMIT=1024;
export function allowParkMotionWire(wire,bufferedAmount){
 if(typeof wire!=='string')return true;
 let message;try{message=JSON.parse(wire);}catch{return true;}
 if(message?.t!=='s'&&message?.t!=='island.drive')return true;
 return Number.isFinite(bufferedAmount)&&bufferedAmount>=0&&bufferedAmount<PARK_MOTION_QUEUE_LIMIT;
}
export function vehicleConnectionHint(connected,fresh){
 if(fresh)return '';
 return connected?'Connection delayed · vehicle safely paused':'Reconnecting · vehicle safely paused';
}
