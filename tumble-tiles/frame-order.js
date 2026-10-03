// A pong/state notification can carry an older cached room snapshot. Never
// rewind a running document's simulation, fuse, avatar or effect pool for it.
export function acceptsTumbleFrame(current,next){
  return !!next&&next.kind==='tumble'&&Number.isSafeInteger(next.tick)&&next.tick>=0
    &&(!current||!Number.isSafeInteger(current.tick)||next.tick>=current.tick);
}
export function canSendTumbleInput(room,code){
  return !!room&&room.code===code&&room.mode==='tumble'
    &&(room.status==='countdown'||room.status==='playing');
}
