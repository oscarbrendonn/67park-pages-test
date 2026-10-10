// Park chat is ephemeral room conversation, not a persistent inbox.
// Keep this policy shared by the authority replay and an already-open HUD.
export const PARK_CHAT_TTL_MS=30*60*1000;
export function recentParkChat(messages,now=Date.now()){
 if(!Array.isArray(messages)||!Number.isFinite(now))return [];
 return messages.filter(m=>Number.isFinite(m?.at)&&now-m.at<PARK_CHAT_TTL_MS);
}
export function pruneParkChat(net,now=Date.now()){
 if(!Array.isArray(net?.chat))return false;
 const recent=recentParkChat(net.chat,now);if(recent.length===net.chat.length)return false;
 net.chat=recent;net.bump?.();return true;
}
