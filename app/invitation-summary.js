const modeNames=Object.freeze({
 balloon:'Balloon Battle',basket:'Basket Shots',penalty:'Penalty Club',race:'Pocket Rally',rockets:'Candy Rockets'
});

// Align to the latest server timestamp, then advance locally between packets.
// A phone with the wrong clock must not immediately expire a fresh invitation.
export function invitationServerNow(anchor,localNow=Date.now()){
 if(!Number.isFinite(anchor?.serverNow)||!Number.isFinite(anchor?.receivedAt))return localNow;
 return anchor.serverNow+Math.max(0,localNow-anchor.receivedAt);
}

export function invitationSummary(invite={},now=Date.now()){
 const label=invite.kind==='summon'?'Summon · travel beside your friend':invite.kind==='match'?(Object.hasOwn(modeNames,invite.mode)?modeNames[invite.mode]:'Match invitation'):'Park lobby invitation';
 const timed=typeof invite.expires==='number'&&Number.isFinite(invite.expires)&&Number.isFinite(now);
 const remaining=timed?Math.max(0,Math.ceil((invite.expires-now)/1000)):null;
 const expired=timed&&invite.expires<=now;
 const duration=remaining>=60?`${Math.floor(remaining/60)}m ${remaining%60}s`:`${remaining}s`;
 return {label,expired,remaining,expiryText:timed?(expired?'Expired · ask for a new invitation':`Expires in ${duration}`):''};
}
