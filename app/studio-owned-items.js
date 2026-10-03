import {ownedShopItems} from './studio-catalog.js';
import {subscribePlayerAccount} from './player-account-client.js?v=player-account-20261003-1';

let runtime=null,runtimePending=null;
function loadInventoryRuntime(){
  if(runtime)return Promise.resolve(runtime);
  if(!runtimePending)runtimePending=import('./chunk-G7D6MVRW.js?v=online-next-1').then(value=>runtime=value).catch(error=>{runtimePending=null;throw error;});
  return runtimePending;
}
export const getOwnedStudioItems=()=>runtime?ownedShopItems(runtime.sa,runtime.ta.owned):[];
const category=item=>item.board?'Boards':({body:'Outfits',sprout:'Headwear',back:'Back',held:'Handheld'})[item.slot]||'Accessories';
export function createStudioOwnedItems(React){
  const h=React.createElement;
  if(typeof document!=='undefined'&&!document.getElementById('park-studio-owned-style')){
    const style=document.createElement('link');style.id='park-studio-owned-style';style.rel='stylesheet';style.href=new URL('./studio-owned-items.css?v=player-account-20261003-1',import.meta.url).href;document.head.append(style);
  }
  return function StudioOwnedItems({eq,setSlot,busy=false,onInventoryChange}){
    const [expanded,setExpanded]=React.useState(true),[pending,setPending]=React.useState(''),[status,setStatus]=React.useState(''),[,refresh]=React.useState(0),inFlight=React.useRef(false),mounted=React.useRef(true);
    React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;}},[]);
    React.useEffect(()=>{let active=true;loadInventoryRuntime().then(()=>{if(active){refresh(n=>n+1);onInventoryChange?.();}}).catch(()=>{if(active)setStatus('Your items could not load. Close and reopen the Studio to retry.');});return()=>{active=false;}},[onInventoryChange]);
    React.useEffect(()=>subscribePlayerAccount(()=>{refresh(n=>n+1);onInventoryChange?.();}),[onInventoryChange]);
    const items=getOwnedStudioItems(),groups=[...new Set(items.map(category))],inventory=runtime?.ta,board=runtime?.i,equipment=runtime?.Ba,equipBoard=runtime?.ya;
    const isEquipped=item=>item.board?board.kind===item.board:eq[item.slot]===`shop:${item.id}`;
    async function choose(item){
      if(busy||inFlight.current||!inventory?.owned.includes(item.id))return;
      inFlight.current=true;setPending(item.id);setStatus('');
      try{
        if(item.board){if(await equipBoard(item.board)===false)throw Error('Your board could not be equipped. Please try again.');}
        else{const value=isEquipped(item)?null:`shop:${item.id}`;setSlot(item.slot,value);if(equipment[item.slot]!==value)throw Error('This item could not be equipped. Please try again.');}
        if(mounted.current)setStatus(`${item.name} ${item.board||equipment[item.slot]?'equipped':'removed'}.`);
      }catch(error){if(mounted.current)setStatus(error?.message||'Your item could not be updated. Please try again.');}
      finally{inFlight.current=false;if(mounted.current){setPending('');refresh(n=>n+1);}}
    }
    return h('section',{className:'studio-owned park-ui-panel','aria-label':'My purchased items','aria-busy':!!pending},
      h('button',{type:'button',className:'studio-owned-toggle park-ui-control','aria-expanded':expanded,onClick:()=>setExpanded(value=>!value)},`My items · ${items.length}`,h('span',{'aria-hidden':true},expanded?'−':'+')),
      expanded&&h('div',{className:'studio-owned-content'},items.length?groups.map(group=>h('section',{key:group,className:'studio-owned-group','aria-label':group},h('h2',null,group),h('div',{className:'studio-owned-grid'},items.filter(item=>category(item)===group).map(item=>{
        const selected=isEquipped(item);
        return h('button',{key:item.id,type:'button',className:'studio-owned-item park-ui-control','data-owned-item':item.id,'aria-pressed':selected,disabled:busy||!!pending||selected&&!!item.board,onClick:()=>choose(item)},h('span',null,item.name),h('small',null,pending===item.id?'Saving…':selected?(item.board?'Equipped':'Equipped · Remove'):'Equip'));
      })))):h('p',{className:'studio-owned-empty'},'Items you buy in the park shop appear here. Your free styles are below.')),
      status&&h('p',{className:'studio-owned-status',role:'status','aria-live':'polite'},status));
  };
}
