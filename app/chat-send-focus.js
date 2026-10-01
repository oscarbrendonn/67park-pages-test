// Keep the mobile composer still between mousedown and click. Otherwise
// blurring the input restores its old position before Send receives the click.
// The existing submit handler deliberately blurs AFTER sending the message.
export function keepChatSendFocused(event){
 const button=event.target?.closest?.('.park-chat button');
 if(button?.closest('.park-chat')?.querySelector('input')&&event.cancelable)event.preventDefault();
}
if(typeof window!=='undefined'){
 // Cancelling touch pointerdown suppresses the synthesized click in WebKit.
 // mousedown still prevents focus/position changes before the native click.
 window.addEventListener('mousedown',keepChatSendFocused,{capture:true,passive:false});
}
