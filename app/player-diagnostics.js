// A small, read-only view of the existing transports. No sockets, IDs or tokens.
export const BASICS_VERSION='foundation-basics-1';
export function connectionView({online=true,worldConnected=false,socialConnected=false,displaced=false}={}){
 if(!online)return {state:'offline',label:'Device is offline',hint:'Check your internet connection. The game will try to reconnect automatically.'};
 if(displaced)return {state:'other-tab',label:'Session open in another tab',hint:'Continue in that tab, or close it before reloading this page. Your browser-saved character is not deleted.'};
 if(worldConnected&&socialConnected)return {state:'connected',label:'Connected',hint:'The park and Play & friends are connected.'};
 if(worldConnected||socialConnected)return {state:'partial',label:'Partly connected',hint:'One connection is recovering. Online actions may not reach other players yet.'};
 return {state:'reconnecting',label:'Connecting / reconnecting',hint:'Online actions are not confirmed while disconnected. Reconnection does not yet guarantee a place in your previous lobby.'};
}
export function readPlayerDiagnostics(host=globalThis){
 const social=host.__candyOnline?.getSnapshot?.()??{},world=host.__eggyNet;
 const state={online:host.navigator?.onLine!==false,worldConnected:world?.connected===true,socialConnected:social.connected===true,
  displaced:world?.displaced===true||/another tab/i.test(String(social.error??''))};
 return {...connectionView(state),worldConnected:state.worldConnected,socialConnected:state.socialConnected};
}
export function makeBugReport({host=globalThis,saveState='ready',description=''}={}){
 const connection=readPlayerDiagnostics(host),doc=host.document;
 // Deliberately omit the query/hash, names, player/room IDs, chat, errors and
 // storage contents. Invitation codes and authentication must not enter reports.
 const url=host.location;
 const page=url?url.origin+url.pathname:'Unavailable';
 const avatar=doc?.documentElement?.dataset?.gameplayAvatarState;
 const avatarState=['loading','ready','error'].includes(avatar)?avatar:'unknown';
 const errorCount=Array.isArray(host.__candyErrors)?host.__candyErrors.length:0;
 return [`67Park ${BASICS_VERSION}`,`Page: ${page}`,
  `Screen: ${host.innerWidth??0} x ${host.innerHeight??0}; DPR: ${host.devicePixelRatio??1}`,
  `Browser: ${host.navigator?.userAgent??'Unavailable'}`,
  `Connection: ${connection.state}; park: ${connection.worldConnected?'connected':'disconnected'}; social: ${connection.socialConnected?'connected':'disconnected'}`,
  `Settings storage: ${saveState}`,`Character: ${avatarState}; runtime error count: ${errorCount}`,
  '', 'Your description:',String(description).slice(0,2000)].join('\n');
}
