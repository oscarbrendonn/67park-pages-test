// One panel stylesheet for the island and standalone /play/ entry.
export const FRIENDS_PANEL_STYLE='friends-white-46';
if(typeof document!=='undefined'){
 const link=document.querySelector('link[href*="/app/friends-panel.css"]')||document.createElement('link');
 link.rel='stylesheet';link.href=new URL('./friends-panel.css?v='+FRIENDS_PANEL_STYLE,import.meta.url).href;
 link.dataset.friendsPanel=FRIENDS_PANEL_STYLE;
 if(!link.isConnected)document.head.append(link);
}
