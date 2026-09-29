// Vehicle forward is +Z, so the driver's left is +X (not screen-left
// in a front-facing preview). The renderer and authority share this order.
export const VEHICLE_DRIVER_X=.61;
export function vehicleSeatLayout(kind='car',scale=1){
 const bus=kind==='bus',rows=bus?[1.80,.66,-.48,-1.62]:[.11,-1.12];
 return rows.flatMap((z,row)=>[VEHICLE_DRIVER_X,-VEHICLE_DRIVER_X].map((x,column)=>({
  index:row*2+column,role:row===0&&column===0?'driver':'passenger',
  side:column===0?'left':'right',row,
  label:(row===0?'front':bus?'row-'+(row+1):'rear')+'-'+(column===0?'left':'right'),
  x:x*scale,y:(bus?.89:.50)*scale,z:z*scale
 })));
}
