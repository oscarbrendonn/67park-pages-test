import {studioSlots} from './studio-catalog.js';


const paths={shoe:'M3 16v-6l5 1 3 4 8 2c2 0 3 2 2 4H3v-5Zm0 2h17M9 13l-2 2',back:'M12 20c-1-5-9-5-9-12 5 0 8 2 9 7 1-5 4-7 9-7 0 7-8 7-9 12Zm0-5v6',top:'m8 4-5 3 3 5 2-1v10h8V11l2 1 3-5-5-3c0 5-8 5-8 0Z',hat:'M4 14c0-5 2-9 7-9s7 4 7 9M3 14h17l2 3H3Z',glasses:'M2 10h2m16 0h2M10 10h4M4 7h6v7H4Zm10 0h6v7h-6Z',hand:'M7 11V6a2 2 0 0 1 4 0v6-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 4-3 7-7 7-3 0-4-2-6-5l-3-5c-1-2 1-3 3-1l2 2',star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',ring:'M3 12a9 5 0 1 0 18 0 9 5 0 1 0-18 0M12 3v3M3 5l3 3m15-3-3 3'};

export function createStudioPanel(React){
  const h=React.createElement;
  return function StudioPanel({eq,name,nameError='',onName,setSlot,baseEquipment,partLabel,Stage,onEnter,onBack,onCancel,busy,error,entryStatus,dialog}){
    const rows=studioSlots(eq,baseEquipment,partLabel);
    return h('div',{ref:dialog,className:'wardrobe wardrobe-studio',role:'dialog','aria-modal':true,'aria-label':'Style Studio',tabIndex:-1,'data-selected-base':eq.base,onKeyUp:e=>e.stopPropagation(),onKeyDown:e=>{
      e.stopPropagation();
      if(e.key==='Tab'){
        const nodes=[...e.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),canvas[tabindex="0"]')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
      }
    }},
      h('header',{className:'studio-topbar'},h('div',{className:'studio-brand'},h('img',{src:new URL('../brand/67park-logo.png',import.meta.url).href,alt:'67Park'}),h('span',null,'STYLE STUDIO')),h('button',{type:'button',className:'studio-back',onClick:onBack,disabled:busy},'‹ Characters')),
      h('main',{className:'studio-layout'},
        h('section',{className:'wardrobe-stage studio-view','aria-label':'Your character'},h(Stage,{eq}),h('p',{className:'studio-preview-note'},'Your character · Your style')),
        h('section',{className:'studio-options','aria-label':'Dress your character'},
          h('div',{className:'studio-heading'},h('p',null,'STEP 2 · DRESS UP'),h('h1',null,'Make it yours'),h('span',null,'Tap an arrow. Try something new.')),
          h('div',{className:'studio-slots'},rows.map(row=>{
            const index=Math.max(0,row.items.findIndex(item=>item.id===(eq[row.slot]??null))),item=row.items[index];
            const step=delta=>setSlot(row.slot,row.items[(index+delta+row.items.length)%row.items.length].id);
            return h('div',{className:'studio-slot',key:row.slot},h('span',{className:'studio-slot-icon',style:{background:row.color},'aria-hidden':true},h('svg',{viewBox:'0 0 24 24'},h('path',{d:paths[row.icon]}))),h('div',{className:'studio-slot-info'},h('span',null,row.title),h('strong',{'data-studio-slot':row.slot},item.name),h('small',null,`${index+1} / ${row.items.length}`)),h('div',{className:'studio-arrows'},h('button',{type:'button','aria-label':'Previous '+row.title.toLowerCase(),onClick:()=>step(-1),disabled:busy},'‹'),h('button',{type:'button','aria-label':'Next '+row.title.toLowerCase(),onClick:()=>step(1),disabled:busy},'›')));
          })),
          h('div',{className:'studio-bottom'},h('label',{htmlFor:'studio-player-name'},'Player name'),h('input',{id:'studio-player-name',value:name,maxLength:16,required:true,'aria-invalid':!!nameError,'aria-describedby':nameError?'studio-player-name-error':undefined,onChange:e=>onName(e.target.value),onKeyDown:e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();onEnter()}},autoComplete:'nickname',disabled:busy}),nameError&&h('p',{id:'studio-player-name-error',className:'wardrobe-name-error',role:'alert',style:{color:'#9d354d',fontSize:13,fontWeight:700,margin:'6px 0'}},nameError),h('button',{type:'button',className:'studio-enter',onClick:onEnter,disabled:busy&&!error},error?'Retry loading':busy?'Preparing your character…':'Enter the park'),h('p',{className:'studio-save-note'},'Your look is saved on this browser and worn in the park.'),entryStatus,busy&&h('button',{type:'button',className:'studio-cancel',onClick:onCancel},'Keep choosing my look')))));
  };
}
