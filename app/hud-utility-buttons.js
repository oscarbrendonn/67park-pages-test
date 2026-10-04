// Presentation only: preserve the original button, handlers and live labels.
const artwork={
 daily:'<rect x="5" y="5" width="14" height="16" rx="3"/><rect x="8" y="3" width="8" height="4" rx="2"/><path d="m8 12 2 2 5-5M8 17h7"/>',
 homes:'<path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-7h6v7"/>',
};
export function decorateUtilityButton(button,kind,label,badge=''){
 button.classList.add('park-ui-control','park-utility-button');button.dataset.utility=kind;
 if(!button.querySelector('.park-utility-label')){
  const text=button.ownerDocument.createElement('span');text.className='park-utility-label';
  button.innerHTML=`<svg class="park-utility-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${artwork[kind]}</svg>`;
  button.append(text);
 }
 const text=button.querySelector('.park-utility-label');if(text.textContent!==label)text.textContent=label;
 let count=button.querySelector('.park-utility-badge');
 if(badge){if(!count){count=button.ownerDocument.createElement('span');count.className='park-utility-badge';button.append(count)}if(count.textContent!==badge)count.textContent=badge}else count?.remove();
 const name=label+(badge?' · '+badge:'');if(button.getAttribute('aria-label')!==name)button.setAttribute('aria-label',name);button.title=name;
}
export function watchHomesButton(doc){
 const update=()=>{const button=doc.getElementById('park-home-button');if(button&&!button.querySelector('.park-utility-label'))decorateUtilityButton(button,'homes',button.textContent.replace(/^⌂\s*/,''))};
 update();
 const observer=new doc.defaultView.MutationObserver(records=>{
  if(records.some(r=>r.target.id==='park-home-button'||[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='park-home-button'||n.querySelector('#park-home-button')))))update();
 });
 observer.observe(doc.body,{childList:true,subtree:true});return()=>observer.disconnect();
}
