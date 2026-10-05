import {FITTED_ITEMS} from './studio-catalog.js';

// A small, explicit selection from the existing fitted Friends wardrobe.
// These pieces were already included: browsing here must not sell them again.
const fitted=(id,equipmentId,category,color)=>Object.freeze({
 id,equipmentId,category,color,...FITTED_ITEMS[equipmentId],
 included:true,sample:true,price:0,
 asset:new URL('../models/items/'+equipmentId.replace(':','/')+'.glb',import.meta.url).href,
});
export const MARKET_SAMPLES=Object.freeze([
 fitted('studio-glasses','friendsie_26:90','Eyewear','#b3ddaf'),
 fitted('studio-playtime-cap','friendsie_8:90','Headwear','#ff9fc6'),
 fitted('studio-sweater','friendsie_2:2','Outfits','#c8b7ed'),
 fitted('studio-boots','friendsie_1:3','Shoes','#a6d7ef'),
 fitted('studio-backpack','friendsie_3333:4','Backpacks','#b9dfce'),
 fitted('studio-wings','friendsie_2:4','Wings','#f3bde1'),
 Object.freeze({id:'studio-stars',name:'Star Power',slot:'power',equipmentId:'pwr-stars',category:'Powers',color:'#ffd23f',included:true,sample:true,price:0,effect:true}),
 Object.freeze({id:'studio-glow',name:'Mint Glow',slot:'vibe',equipmentId:'vibe-mint',category:'Glows',color:'#9be08d',included:true,sample:true,price:0,effect:true}),
]);
