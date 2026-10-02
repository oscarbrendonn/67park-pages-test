import {ensurePreviewGuest,currentPreviewBackend} from './preview-network.js?v=online-next-1';
import {PREVIEW_VARIANT} from './preview-network-config.js?v=mac-recovery-1';

export const PLAYER_REPORT_REASONS=Object.freeze([
 ['harassment','Harassment or bullying'],['inappropriate-name','Inappropriate name'],
 ['cheating','Cheating'],['disruptive-play','Disruptive play'],['other','Something else'],
]);
export function newReportNonce(){return crypto.randomUUID().replaceAll('-','');}
export async function submitPlayerReport(body){
 const session=await ensurePreviewGuest(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(currentPreviewBackend()+'/'+PREVIEW_VARIANT+'/api/player-report',{
   method:'POST',mode:'cors',credentials:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify(body),signal:controller.signal,
  });
  let result;try{result=await response.json();}catch{throw Error('The report service did not confirm receipt. Please retry.');}
  if(!response.ok||result.ok!==true||typeof result.id!=='string')throw Error(result.error||'The report was not confirmed. Please retry.');
  return result;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('Connection interrupted. We could not confirm receipt. Retry to check safely without sending a duplicate.');throw error;}
 finally{clearTimeout(timer);}
}
let nextId=0;
function installStyles(){
 if(document.getElementById('park-player-report-style'))return;
 const link=document.createElement('link');link.id='park-player-report-style';link.rel='stylesheet';link.href=new URL('./player-report.css?v=player-report-20261002-1',import.meta.url).href;document.head.append(link);
}
export function createPlayerReport(React,client,{submit=submitPlayerReport}={}){
 const h=React.createElement;
 function ReportPlayer({person,state}){
  const [opened,setOpened]=React.useState(false),[reason,setReason]=React.useState('harassment'),[details,setDetails]=React.useState(''),[busy,setBusy]=React.useState(false),[result,setResult]=React.useState(null),[error,setError]=React.useState('');
  const dialog=React.useRef(null),trigger=React.useRef(null),nonce=React.useRef(null),sending=React.useRef(false),wasOpened=React.useRef(false),uid=React.useRef(null);
  if(!uid.current)uid.current='player-report-'+(++nextId);
  React.useEffect(()=>{installStyles();},[]);
  React.useEffect(()=>{
   const node=dialog.current;if(!node)return;
   const release=()=>window.dispatchEvent(new Event('park:release-controls'));
   if(opened){wasOpened.current=true;release();if(!node.open)node.showModal();}
   else if(wasOpened.current){wasOpened.current=false;if(node.open)node.close();release();trigger.current?.focus({preventScroll:true});}
  },[opened]);
  React.useEffect(()=>()=>{if(dialog.current?.open)dialog.current.close();},[]);
  const open=()=>{if(!busy){setResult(null);setError('');setDetails('');setReason('harassment');nonce.current=newReportNonce();}setOpened(true);};
  const changed=()=>{nonce.current=newReportNonce();setError('');};
  const send=async event=>{
   event.preventDefault();if(sending.current||!state.connected)return;
   sending.current=true;setBusy(true);setError('');
   try{const saved=await submit({target:person.id,reason,details,nonce:nonce.current});setResult(saved);}
   catch(error){setError(error.message||'The report was not confirmed. Please retry.');}
   finally{sending.current=false;setBusy(false);}
  };
  if(person.id===state.me?.id)return null;
  return h(React.Fragment,null,
   h('button',{ref:trigger,type:'button',disabled:!state.connected,onClick:open,'aria-haspopup':'dialog','aria-label':`Report ${person.name||'player'}`},'Report'),
   h('dialog',{ref:dialog,className:'park-player-report','aria-labelledby':uid.current+'-title','aria-describedby':uid.current+'-intro',onCancel:event=>{event.preventDefault();event.stopPropagation();setOpened(false);},onClose:event=>event.stopPropagation(),onKeyDown:event=>event.stopPropagation(),onKeyUp:event=>event.stopPropagation(),onPointerDown:event=>event.stopPropagation()},
    h('div',{className:'park-player-report-heading'},h('h2',{id:uid.current+'-title'},'Report player'),h('button',{type:'button',className:'park-player-report-close','aria-label':'Close player report',onClick:()=>setOpened(false)},'×')),
    h('p',{id:uid.current+'-intro'},'Reporting ',h('strong',null,person.name||'Player')),
    result?h('section',{'aria-live':'polite'},h('h3',null,result.duplicate?'Report already received':'Report received'),h('p',null,'Saved in the park team’s private review queue. This does not automatically remove or ban the player.'),h('p',{className:'park-player-report-hint'},'You can mute or block them now in Friends. We cannot promise a review time.'),h('button',{type:'button',className:'park-player-report-primary',onClick:()=>setOpened(false)},'Done')):
    h('form',{onSubmit:send,'aria-busy':busy},
     h('p',{className:'park-player-report-hint'},'Only your selected reason, note, player names/IDs and current room are sent to the park team. Chat history is not attached. Do not include passwords or personal details.'),
     h('label',null,'Reason',h('select',{'aria-label':'Reason',value:reason,disabled:busy,onChange:event=>{changed();setReason(event.target.value);}},...PLAYER_REPORT_REASONS.map(([value,label])=>h('option',{key:value,value},label)))),
     h('label',null,'What happened?',h('textarea',{value:details,maxLength:1000,rows:4,disabled:busy,placeholder:'Describe the behavior, not personal information.',onChange:event=>{changed();setDetails(event.target.value);},required:reason==='other',minLength:reason==='other'?10:undefined})),
     h('small',{className:'park-player-report-count'},`${details.length}/1,000 · ${reason==='other'?'At least 10 characters':'Optional'}`),
     error&&h('p',{role:'alert',className:'park-player-report-error'},error),
     !state.connected&&h('p',{role:'status'},'Reconnect before sending. Your note stays here.'),
     busy&&h('p',{role:'status'},'Saving your report… You may close this window while it finishes.'),
     h('div',{className:'park-player-report-actions'},h('button',{type:'button',onClick:()=>setOpened(false)},'Cancel'),h('button',{type:'submit',className:'park-player-report-primary',disabled:busy||!state.connected||reason==='other'&&details.trim().length<10},busy?'Sending…':'Send report')))));
 }
 return {ReportPlayer};
}
