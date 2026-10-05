// Reuses the park's checked map-travel callback: no second collider or physics
// teleport implementation. Tickets originate in the authenticated social state.
export function installFriendTravelTarget(config,host=window){
 const target=point=>Array.isArray(point)&&point.length===3&&point.every(Number.isFinite)&&host.__islandWorld?.ready&&!config.blocked?.()&&config.teleport?.(point[0],point[2])===true;
 host.__parkFriendTravel=target;
 return()=>{if(host.__parkFriendTravel===target)delete host.__parkFriendTravel;};
}
export function applyFriendTravel(client,ticket,win=window){
 if(!ticket||ticket.island!==client.getSnapshot().island?.code)return false;
 // Closing the social dialog releases its existing movement lock first.
 win.document.querySelector('.online-dialog[open] button[aria-label="Close panel"]')?.click();
 win.dispatchEvent(new win.CustomEvent('park:release-controls'));
 const deadline=Date.now()+3000;
 const land=()=>{
  const current=client.getSnapshot();if(current.friendTravel?.id!==ticket.id||current.island?.code!==ticket.island||current.room)return;
  const ok=win.__parkFriendTravel?.(ticket.point)===true;
  if(!ok&&Date.now()<deadline){win.setTimeout(land,100);return;}
  client.act('friend.travel-ack',{id:ticket.id,ok});
  if(!ok)win.dispatchEvent(new win.CustomEvent('park:friend-travel-error',{detail:'Travel could not find a clear landing spot. Return to the park and try again.'}));
 };win.requestAnimationFrame(land);return true;
}
