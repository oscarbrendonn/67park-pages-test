import {playerNameError} from './player-name-policy.js?v=profile-hud-20261002-1';

let current=null;
const release=()=>window.dispatchEvent(new Event('park:release-controls'));
const element=(tag,className,text)=>{
  const node=document.createElement(tag);if(className)node.className=className;
  if(text!==undefined)node.textContent=text;return node;
};
const button=(text,className,action)=>{
  const node=element('button',className,text);node.type='button';
  if(action)node.addEventListener('click',action);return node;
};

export function openPlayerProfile(api) {
  if(current?.open){current.querySelector('.profile-close').focus({preventScroll:true});return current;}
  if(!document.getElementById('park-player-profile-style')){
    const sheet=element('link');sheet.id='park-player-profile-style';sheet.rel='stylesheet';
    sheet.href=new URL('./player-profile-panel.css?v=profile-hud-20261002-1',import.meta.url).href;document.head.append(sheet);
  }
  const origin=document.activeElement,dialog=element('dialog','park-player-profile');current=dialog;
  dialog.id='park-player-profile';dialog.setAttribute('aria-labelledby','profile-title');dialog.setAttribute('aria-modal','true');
  const head=element('header','profile-header'),heading=element('div');
  heading.append(element('small','profile-eyebrow','YOUR PARK IDENTITY'),element('h2','','My profile'));
  heading.querySelector('h2').id='profile-title';
  const closeButton=button('×','profile-close',()=>close());closeButton.setAttribute('aria-label','Close profile');
  head.append(heading,closeButton);
  const body=element('div','profile-content'),hero=element('section','profile-hero');
  const portrait=element('img','profile-character-image');portrait.draggable=false;
  const identity=element('div','profile-identity'),name=element('h3','profile-player-name'),character=element('p','profile-character-name');
  const editButton=button('Edit name','profile-edit',()=>startEditing());
  identity.append(name,character,editButton);hero.append(portrait,identity);
  const form=element('form','profile-name-form');form.hidden=true;form.noValidate=true;
  const label=element('label','','Player name');label.htmlFor='profile-player-name';
  const input=element('input');input.id='profile-player-name';input.name='playerName';input.type='text';input.maxLength=16;input.autocomplete='nickname';input.setAttribute('aria-describedby','profile-name-hint profile-name-error');
  const hint=element('small','','Up to 16 characters. Your friends and progress stay with you.');hint.id='profile-name-hint';
  const error=element('p','profile-name-error');error.id='profile-name-error';error.setAttribute('role','alert');error.hidden=true;
  const formActions=element('div','profile-form-actions'),cancel=button('Cancel edit','profile-secondary',()=>finishEditing()),save=button('Save name','profile-primary');save.type='submit';
  formActions.append(cancel,save);form.append(label,input,hint,error,formActions);
  const change=button('Change character','profile-change',()=>navigate(()=>api.openWardrobe(true)));
  const codeSection=element('section','profile-code-section'),codeHeading=element('h3','','Friend code'),codeHelp=element('p','','Share this public code so friends can find you.');
  const codeRow=element('div','profile-code-row'),code=element('input','profile-friend-code');code.readOnly=true;code.setAttribute('aria-label','Your friend code');code.autocomplete='off';
  const copy=button('Copy friend code','profile-secondary',async()=>{
    if(!code.value)return;
    try{await navigator.clipboard.writeText(code.value);status.textContent='Friend code copied.';}
    catch{code.focus();code.select();status.textContent='Select and copy your friend code above.';}
  });
  codeRow.append(code,copy);codeSection.append(codeHeading,codeHelp,codeRow);
  const links=element('nav','profile-links');links.setAttribute('aria-label','Profile shortcuts');
  const openOnline=tab=>navigate(()=>window.dispatchEvent(new CustomEvent('candy:online-open',{detail:{tab}})));
  links.append(button('Friends','',()=>openOnline('friends')),button('Account & privacy','',()=>openOnline('account')),button('Settings','',()=>navigate(()=>document.getElementById('party-settings-btn')?.click())));
  const status=element('p','profile-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  body.append(hero,form,change,codeSection,links,status);dialog.append(head,body);document.body.append(dialog);
  let editing=false,closed=false,portraitBase='',unblock=null;const unsubscribers=[];
  function refresh(){
    if(closed)return;
    name.textContent=api.getName?.()||'Choose a name';
    const base=api.equip.base,row=api.characters?.find(c=>c.id===base);
    character.textContent=row?.name||'Your character';
    dialog.dataset.character=base;
    if(portraitBase!==base){portraitBase=base;portrait.src=api.getPortrait(base);portrait.alt=(row?.name||'Your character')+' portrait';portrait.dataset.character=base;}
    if(!editing)input.value=api.getName?.()||'';
    const friendCode=window.__candyOnline?.getSnapshot?.().me?.friendCode;
    code.value=typeof friendCode==='string'?friendCode:'';code.placeholder='Available when connected';
    copy.disabled=!code.value;
  }
  function showError(message){error.textContent=message;error.hidden=!message;input.setAttribute('aria-invalid',String(!!message));}
  function startEditing(){editing=true;form.hidden=false;editButton.hidden=true;input.value=api.getName?.()||'';showError('');input.focus({preventScroll:true});input.select();}
  function finishEditing(){editing=false;form.hidden=true;editButton.hidden=false;showError('');refresh();editButton.focus({preventScroll:true});}
  function navigate(action){close(false);action();}
  function close(restore=true){
    if(closed)return;closed=true;
    for(const unsubscribe of unsubscribers)unsubscribe?.();
    window.removeEventListener('keydown',guard,true);window.removeEventListener('keyup',guard,true);
    document.documentElement.removeAttribute('data-park-profile-open');
    unblock?.();release();dialog.close();dialog.remove();if(current===dialog)current=null;
    if(restore&&origin?.isConnected)origin.focus({preventScroll:true});
  }
  function guard(event){
    if(closed)return;
    if(event.type==='keydown'){
      if(event.key==='Escape'){event.preventDefault();editing?finishEditing():close();}
      else if(event.key==='Tab'){
        const controls=[...dialog.querySelectorAll('button,input')].filter(n=>!n.disabled&&n.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
      }
    }
    event.stopImmediatePropagation();
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();const message=playerNameError(input.value);
    if(message){showError(message);input.focus({preventScroll:true});return;}
    try{
      api.setName(input.value.trim());
      if(api.getName()!==input.value.trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,16))throw Error('Name could not be saved');
      finishEditing();status.textContent='Name updated.';
    }catch{showError('Your name could not be saved. Please try again.');}
  });
  input.addEventListener('input',()=>{if(!error.hidden)showError(playerNameError(input.value));});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  dialog.addEventListener('close',()=>{if(!closed)close();});
  release();unblock=api.beginModal?.();
  unsubscribers.push(api.subscribeName?.(refresh),api.subscribeEquip?.(refresh),window.__candyOnline?.subscribe?.(refresh));
  window.addEventListener('keydown',guard,true);window.addEventListener('keyup',guard,true);
  document.documentElement.setAttribute('data-park-profile-open','');refresh();dialog.showModal();closeButton.focus({preventScroll:true});
  return dialog;
}
