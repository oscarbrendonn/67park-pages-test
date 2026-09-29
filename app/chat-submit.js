// A failed sender/overlay must not prevent the caller from releasing chat focus.
import {chatVerdict} from './chat-policy.js';
import {chatFeedback} from './social-safety.js';
const lastSent=new WeakMap();
export function submitParkChat(client,text,showSpeech){
 const verdict=chatVerdict(text);
 if(!verdict.ok){if(verdict.code!=='empty')chatFeedback(verdict.message);return {accepted:false};}
 if(client.ws?.readyState!==1){chatFeedback('Reconnecting. Your message was not sent.');return {accepted:false};}
 const now=Date.now();if(now-(lastSent.get(client)||0)<800){chatFeedback('One message at a time. Please wait a moment.');return {accepted:false};}
 lastSent.set(client,now);
 if(typeof text!=='string'||!text.trim())return {accepted:false};
 const previous=client.chat?.at(-1);let error=null;
 try{client.sendChat(text.slice(0,140));}catch(cause){error=cause;}
 const sent=client.chat?.at(-1),accepted=!!sent&&sent!==previous;
 if(accepted)try{showSpeech(sent.text);}catch(cause){error??=cause;}
 return {accepted,error};
}
