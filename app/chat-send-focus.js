// Keep the mobile composer still between pointerdown and click. Otherwise
// blurring the input restores its old position before Send receives the click.
// The existing submit handler deliberately blurs AFTER sending the message.
export function keepChatSendFocused(event){
 const button=event.target?.closest?.('.park-chat button');
 if(button?.closest('.park-chat')?.querySelector('input')&&event.cancelable)event.preventDefault();
}
if(typeof window!=='undefined'){
 window.addEventListener('pointerdown',keepChatSendFocused,{capture:true,passive:false});
 window.addEventListener('mousedown',keepChatSendFocused,{capture:true,passive:false});
}
