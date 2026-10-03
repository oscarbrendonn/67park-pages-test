const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Keep the map target at the actual screen center. HUD changes may reduce the
// Fit scale, but must never push the whole island sideways or upwards.
export function mapSafeRect(viewport, obstacles=[]){
 const width=Math.max(1,viewport.width),height=Math.max(1,viewport.height),edge=12;
 const area={left:edge,top:edge,right:Math.max(edge+1,width-edge),bottom:Math.max(edge+1,height-edge)};
 const blocks=obstacles.filter(r=>[r.left,r.top,r.right,r.bottom].every(Number.isFinite)).map(r=>({left:clamp(r.left-8,area.left,area.right),right:clamp(r.right+8,area.left,area.right),top:clamp(r.top-8,area.top,area.bottom),bottom:clamp(r.bottom+8,area.top,area.bottom)})).filter(r=>r.right>r.left&&r.bottom>r.top);
 const cx=width/2,cy=height/2,maxX=Math.max(1,width/2-edge),maxY=Math.max(1,height/2-edge);
 const radii=[...new Set([maxX,...blocks.flatMap(r=>[Math.abs(r.left-cx),Math.abs(r.right-cx)])])].filter(x=>x>0&&x<=maxX);
 let best={left:cx-1,top:cy-1,width:2,height:2},score=-Infinity,bestArea=-1;
 for(const rx of radii){
  let ry=maxY;
  for(const block of blocks){
   if(block.left>=cx+rx||block.right<=cx-rx)continue;
   if(block.bottom<=cy)ry=Math.min(ry,cy-block.bottom);
   else if(block.top>=cy)ry=Math.min(ry,block.top-cy);
   else {ry=0;break;}
  }
  if(ry<=0)continue;
  const w=rx*2,h=ry*2,next=Math.min(w-24,h-24),size=w*h;
  if(next>score||next===score&&size>bestArea){score=next;bestArea=size;best={left:cx-rx,top:cy-ry,width:w,height:h};}
 }
 return best;
}

export function mapSafeProjection(viewport,rect){
 return {...viewport,centerX:viewport.width/2,centerY:viewport.height/2};
}

export function mapFitHeight(bounds,viewport,rect,minHeight=90,markers=[]){
 // Fit the island itself first, then protect actual marker/label positions.
 // Reserving a label at every unoccupied corner needlessly shrinks the map.
 const w=Math.max(1,rect.width-24),h=Math.max(1,rect.height-24);
 let units=Math.max((bounds.maxX-bounds.minX)/w,(bounds.maxZ-bounds.minZ)/h);
 const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
 for(const marker of markers){
  const p=marker.p??marker;if(!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
  units=Math.max(units,Math.abs(p.x-cx)/Math.max(1,rect.width/2-30),Math.abs(p.z-cz)/Math.max(1,rect.height/2-(p.z>=cz&&marker.self?42:22)));
 }
 return Math.max(minHeight,units*viewport.height/(2*Math.tan(viewport.fov*Math.PI/360)));
}

export function mapPointAllowed(p,bounds){
 return !!p&&[p.x,p.y,p.z].every(Number.isFinite)&&p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ;
}
