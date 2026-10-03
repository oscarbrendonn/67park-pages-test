import {loadPlayerAccount,purchasePlayerItem,equipPlayerItem,getPlayerAccountState,subscribePlayerAccount} from './player-account-client.js?v=player-account-20261003-1';

// Bind the existing wallet/render state to the stable player identity. The
// browser cache is a mirror, never the authority for a new purchase or price.
export function createPlayerInventoryBridge({inventory,board,items,setSlot,getEquipment,save,notify=()=>{}}){
  const catalogue=new Map(items.map(item=>[item.id,item]));
  const pending=new Map();let hydrated=false,owner=null;
  function apply(profile){
    const owned=profile.inventory.owned.filter(id=>catalogue.has(id));
    inventory.owned=owned;inventory.coins=profile.inventory.coins;
    if(typeof profile.inventory.board==='string')board.kind=profile.inventory.board;
    const equipment=getEquipment();
    for(const [slot,value]of Object.entries(equipment))if(typeof value==='string'&&value.startsWith('shop:')&&!owned.includes(value.slice(5)))setSlot(slot,null);
    if(!hydrated||owner!==profile.id)for(const [slot,value]of Object.entries(profile.equipment||{})){
      const item=typeof value==='string'&&value.startsWith('shop:')?catalogue.get(value.slice(5)):null;
      if(item?.slot===slot&&owned.includes(item.id))setSlot(slot,value);
    }
    try{globalThis.localStorage?.setItem('67park.inventory.owner.v1',profile.id)}catch{}
    hydrated=true;owner=profile.id;save();notify();
  }
  subscribePlayerAccount(apply);
  if(getPlayerAccountState())apply(getPlayerAccountState());
  const ready=()=>loadPlayerAccount().then(profile=>{if(!hydrated)apply(profile);return profile});
  const toast=message=>{inventory.toast=message;inventory.toastAt=performance.now();};
  function run(key,action){
    if(pending.has(key))return pending.get(key);
    const task=(async()=>{try{await ready();await action();return true}catch(error){toast(error.message||'Your item could not be saved. Please retry.');return false}})();
    pending.set(key,task);void task.finally(()=>pending.delete(key));return task;
  }
  return {
    ready,
    buy(item){return run('buy:'+item.id,async()=>{
      if(!catalogue.has(item.id))throw Error('This item is not in the shop.');
      await purchasePlayerItem(item.id);
      if(!item.board&&item.slot)setSlot(item.slot,'shop:'+item.id);
      save();notify();toast(item.name+' purchased and equipped.');
    })},
    equipBoard(kind){return run('board:'+kind,async()=>{
      const item=items.find(item=>item.board===kind);if(!item)throw Error('Choose a board from My items.');
      await equipPlayerItem({itemId:item.id});save();notify();toast(item.name+' equipped.');
    })},
  };
}
