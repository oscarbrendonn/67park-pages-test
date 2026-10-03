// A waiting party or matchmaking queue is still in the park. Rescue must not
// leave either one, and must never become a teleport during a competition.
export function rescueRoomAllowsPark(room){
 return room==null||((room.status==='waiting'||room.status==='queued')&&!room.sim&&!room.snapshot);
}
export const RESCUE_MATCH_MESSAGE='Rescue is unavailable during a mini-game. Finish returning to the park first.';
