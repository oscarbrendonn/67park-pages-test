// The server's share origin includes the game path, sometimes with a trailing
// slash. Joining paths as strings produced /game//play/ and broken invites.
export function partyInviteLink(kind,code,shareOrigin){
 const base=new URL(shareOrigin);
 base.search='';base.hash='';
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 const url=new URL(kind==='room'?'play/':'',base);
 url.searchParams.set(kind==='room'?'room':'island',code);
 return url.href;
}
