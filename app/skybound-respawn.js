// Pick a real platform surface, outside the swept reach of hazards.
export function pickSkyboundSpawn(checkpoint,sample,spinners,obstacles){
 for(const dz of [-.8,1.5,-2.5,3]){
  for(const dx of [0,5.8,-5.8,4.8,-4.8]){
   const x=checkpoint.x+dx,z=checkpoint.z+dz,hit=sample(x,z);
   if(!hit||!/^(start|arena|runway|extension|final)/.test(hit.owner?.id??''))continue;
   if(spinners.some(h=>Math.hypot(x-h.object.position.x,z-h.object.position.z)<h.reach+1))continue;
   if(obstacles.some(h=>Math.abs(x-h.object.position.x)<h.size.x/2+.8&&Math.abs(z-h.object.position.z)<h.size.z/2+.8))continue;
   return {x,y:hit.height+.58,z};
  }
 }
 // Keep rendering if a future map revision has no matching safe candidate.
 const fallback=sample(checkpoint.x,checkpoint.z);
 return {x:checkpoint.x,y:fallback?fallback.height+.58:checkpoint.y,z:checkpoint.z};
}
