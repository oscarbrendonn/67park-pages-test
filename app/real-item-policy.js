// Retire prototypes from new offers without deleting anyone's saved inventory.
export const RETIRED_PROTOTYPES=Object.freeze(['tshirt','hoodie','bag','kite','ball','teddy']);
export const PLAYTIME_CAP='friendsie_8:90';
export function realItemOffer(item){
 if(RETIRED_PROTOTYPES.includes(item.id))return null;
 return item.id==='cap'?{...item,name:'Playtime Cap',asset:new URL('../models/items/friendsie_8/90.glb',import.meta.url).href}:item;
}
// Render-only alias. The account still owns/equips shop:cap; no purchase or
// migration is performed and the original equipment object is never changed.
export function realItemEquipment(equipment){
 return equipment?.sprout==='shop:cap'?{...equipment,sprout:PLAYTIME_CAP}:equipment;
}
