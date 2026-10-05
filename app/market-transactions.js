// Keep ownership and paid equipment authoritative. Never show a successful
// outfit change until durable server confirmation; free wardrobe IDs stay free.
export function createMarketTransactions({inventory,equipment,setSlot,equipBoard,purchasePlayerItem,equipPlayerItem,getPlayerAccountState}) {
 const owns=item=>item.included===true||inventory.owned.includes(item.id);
 const value=item=>item.equipmentId||`shop:${item.id}`;
 async function clearPaidSlot(slot){
  const profile=await equipPlayerItem({slot,value:null});
  if(profile.equipment?.[slot]!=null)throw Error('Your item could not be removed. Please retry.');
 }
 return {
  async buy(item){
   if(item.included)throw Error('This item is already included. Choose Equip instead.');
   const profile=await purchasePlayerItem(item.id,item.currency);
   if(!profile.inventory.owned.includes(item.id))throw Error('Your purchase could not be verified. Please retry.');
   if(item.slot){
    if(profile.equipment?.[item.slot]!==value(item))throw Error('Your item is owned, but could not be equipped. Choose it in My items.');
    setSlot(item.slot,value(item));
   }
   return true;
  },
  async equip(item){
   if(!owns(item))return false;
   if(item.board)return equipBoard(item.board);
   if(item.included){
    // A free sample may replace a paid item in the same slot. Persist that
    // removal first so the paid item cannot reappear on the next hydration.
    if(getPlayerAccountState()?.equipment?.[item.slot]?.startsWith('shop:'))await clearPaidSlot(item.slot);
   }else{
    const profile=await equipPlayerItem({itemId:item.id});
    if(profile.equipment?.[item.slot]!==value(item))throw Error('Your item could not be equipped. Please retry.');
   }
   setSlot(item.slot,value(item));return equipment[item.slot]===value(item);
  },
  async remove(item){
   if(!owns(item)||equipment[item.slot]!==value(item))return false;
   if(!item.included)await clearPaidSlot(item.slot);
   setSlot(item.slot,null);return equipment[item.slot]===null;
  },
 };
}
