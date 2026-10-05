// 67Park adaptation, not a claim about Eggy Party's exact prices.
// Existing coins and ownership are never converted or reset.
export const ECONOMY_REVISION='two-wallets-20261005-1';
export const CURRENCIES=Object.freeze({
 coins:Object.freeze({name:'Six Seven Coins',short:'67 Coins',symbol:'67',description:'Use in the Six Seven shop. Your existing coins stay here. Real-money top-up is not available.'}),
 badges:Object.freeze({name:'Fashion Badges',short:'Badges',symbol:'FB',description:'Earn from daily tasks, check-in, mini-games and Pip’s parcel jobs. Spend in the Badge shop.'}),
});
// These are additional direct-purchase offers. Existing coin offers retain
// their original prices, including in the old world shops and old clients.
export const BADGE_OFFERS=Object.freeze({cap:25,tshirt:30,hoodie:40,bag:45,kite:30,ball:25,teddy:35});
export const currencyName=key=>CURRENCIES[key]?.name||CURRENCIES.coins.name;
export const walletBalance=(inventory,key='coins')=>Number.isSafeInteger(inventory?.[key])&&inventory[key]>=0?inventory[key]:0;
export function itemOffer(item,currency='coins'){
 if(currency==='coins')return {...item,currency,price:item.price};
 if(currency==='badges'&&Object.hasOwn(BADGE_OFFERS,item.id))return {...item,currency,price:BADGE_OFFERS[item.id]};
 return null;
}
