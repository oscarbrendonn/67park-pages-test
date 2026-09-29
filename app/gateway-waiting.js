// Preview only authenticated room members while matchmaking runs. These are
// stationary waiting poses, never bots, authoritative gameplay or scored play.
export function gatewayWaitingPlayers(room){
 if(!room||!['waiting','queued'].includes(room.status))return [];
 return room.members.map((member,index)=>{
  const a=index*2*Math.PI/room.capacity,x=Math.sin(a)*8,z=Math.cos(a)*8;
  return {id:member.id,p:[x,0,z],v:[0,0,0],yaw:Math.atan2(-x,-z),alive:true,grounded:true,balloons:3,jumpSerial:0,dash:0,shield:false,cd:0};
 });
}
export function gatewayWaitingMessage(room){
 return room?.status==='queued'?`Waiting for players · ${room.members.length}/${room.capacity}`:'Waiting for your party host';
}
