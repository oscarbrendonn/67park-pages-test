export const MINIMAP_BOUNDS=Object.freeze({minX:-240,maxX:320,minZ:-317,maxZ:243});
export const MINIMAP_SPAN=150;
export function minimapPoint(position,self,size,span=MINIMAP_SPAN){
 if(!position||!self||![position.x,position.z,self.x,self.z,size,span].every(Number.isFinite)||size<=0||span<=0)return null;
 const x=size/2+(position.x-self.x)*size/span,y=size/2+(position.z-self.z)*size/span;
 return {x,y,visible:Math.hypot(x-size/2,y-size/2)<size/2-6};
}
export function minimapImageRect(self,size,bounds=MINIMAP_BOUNDS,span=MINIMAP_SPAN){
 const origin=minimapPoint({x:bounds.minX,z:bounds.minZ},self,size,span);
 return origin?{x:origin.x,y:origin.y,width:(bounds.maxX-bounds.minX)*size/span,height:(bounds.maxZ-bounds.minZ)*size/span}:null;
}
export function minimapCoins(value){return Number.isFinite(value)&&value>=0?Math.floor(value).toLocaleString('en-US'):'—';}
