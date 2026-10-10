import {vehicleMapPoints,questMapPoints} from './park-map-points.js';
import {getPlayerAccountState} from './player-account-client.js';
import {projectMapPlayer} from './map-player-markers.js?v=entry-map-recovery-20261003-1';
import {minimapPoint} from './park-minimap-math.js?v=minimap-20261003-1';

// Presentation only: never move a vehicle, start a quest, claim a coin or send
// network input from the map. Stale/disconnected vehicle positions disappear.
export function currentParkMapPoints(host=window){
 return [
  ...vehicleMapPoints({connected:host.__candyOnline?.data?.connected===true,snapshot:host.__candyOnline?.world,
   trafficCars:host.__islandWorld?.traffic?.cars,now:host.performance?.now()}),
  ...questMapPoints(getPlayerAccountState(),host.Date?.now()??Date.now()),
 ];
}
const glyphs={car:'M4 14V9l2-4h12l2 4v5M4 10h16M7 14v3M17 14v3M7 7h10',bus:'M5 15V4h14v11M5 10h14M8 15v3M16 15v3M8 6h8',boat:'M3 14h18l-4 5H7zM12 3v11M14 4l5 7h-5',coin:'M15 5h-4a6 6 0 1 0 6 6h-6v7M16 5h4l-3 6',pickup:'M4 7l8-4 8 4v12H4zM4 7l8 4 8-4M12 11v8',dropoff:'M4 7l8-4 8 4v12H4zM8 14l3 3 5-6'};
function icon(doc,kind){
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 if(kind==='coin'){const text=doc.createElementNS(svg.namespaceURI,'text');for(const [key,value] of Object.entries({x:12,y:16,'text-anchor':'middle','font-size':13,'font-weight':800,fill:'currentColor'}))text.setAttribute(key,value);text.textContent='67';svg.append(text);return svg;}
 const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',glyphs[kind]||glyphs.car);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
export function drawMinimapVehicles(ctx,points,self,size=256){
 let drawn=0;
 for(const point of points){
  if(point.category!=='vehicles')continue;
  const p=minimapPoint(point.p,self,size);if(!p?.visible)continue;
  ctx.save();ctx.translate(p.x,p.y);ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fillStyle=point.occupied?'#e0d3ed':'#d4eee4';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#45675f';ctx.fillStyle='#45675f';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(point.kind==='boat'){ctx.moveTo(-7,3);ctx.lineTo(7,3);ctx.lineTo(4,7);ctx.lineTo(-4,7);ctx.closePath();ctx.moveTo(0,3);ctx.lineTo(0,-8);ctx.lineTo(6,-1);ctx.lineTo(0,-1);}
  else if(point.kind==='bus'){ctx.rect(-7,-7,14,13);ctx.moveTo(-7,-1);ctx.lineTo(7,-1);ctx.moveTo(-2,-7);ctx.lineTo(-2,-1);ctx.moveTo(3,-7);ctx.lineTo(3,-1);ctx.moveTo(-4,6);ctx.lineTo(-4,8);ctx.moveTo(4,6);ctx.lineTo(4,8);}
  else {ctx.rect(-7,-3,14,7);ctx.moveTo(-6,-3);ctx.lineTo(-4,-7);ctx.lineTo(4,-7);ctx.lineTo(6,-3);ctx.moveTo(-4,4);ctx.lineTo(-4,7);ctx.moveTo(4,4);ctx.lineTo(4,7);}
  ctx.stroke();ctx.restore();drawn++;
 }
 return drawn;
}
export function clusterMapPoints(points,view,viewport,planeY=10){
 const groups=[];
 // Active delivery wins the cluster icon. Coins close together stay legible
 // at Fit scale, and separate naturally when the player zooms in.
 for(const point of [...points].sort((a,b)=>Number(b.active)-Number(a.active))){
  const screen=projectMapPlayer(point.p,view,viewport,planeY);if(!screen?.visible)continue;
  const group=groups.find(g=>Math.hypot(g.screen.x-screen.x,g.screen.y-screen.y)<42);
  if(group)group.points.push(point);else groups.push({screen,points:[point]});
 }
 return groups;
}
const css=`
#park-map-points{position:fixed;inset:0;z-index:85;pointer-events:none}
.park-map-point{position:absolute;left:0;top:0;width:44px;height:44px;padding:6px;border:0;background:none;color:var(--park-ui-mint-ink);pointer-events:auto;touch-action:none;font:600 12px var(--park-ui-font)}
.park-map-point[hidden]{display:none}.park-map-point-disc{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--park-ui-mint);border:2px solid var(--park-ui-card);box-shadow:var(--park-ui-button-shadow)}
.park-map-point svg{width:23px;height:23px}.park-map-point[data-category=quests] .park-map-point-disc{background:var(--park-ui-gold);color:var(--park-ui-gold-ink)}
.park-map-point[data-active=true] .park-map-point-disc{background:var(--park-ui-blue);color:var(--park-ui-ink)}.park-map-point[data-occupied=true] .park-map-point-disc{background:var(--park-ui-lilac);color:var(--park-ui-ink)}
.park-map-point-count{position:absolute;right:1px;top:0;border-radius:8px;background:var(--park-ui-card);color:var(--park-ui-ink);padding:0 3px;font-size:10px}
.park-map-point-label{display:none;position:absolute;left:50%;top:44px;transform:translateX(-50%);width:max-content;max-width:170px;padding:6px 9px;border-radius:10px;background:var(--park-ui-card);color:var(--park-ui-ink);box-shadow:var(--park-ui-button-shadow);white-space:normal;pointer-events:none;line-height:1.35}
.park-map-point.is-selected{z-index:2}.park-map-point.is-selected .park-map-point-label{display:block}
.park-map-point:focus-visible .park-map-point-disc{outline:3px solid var(--park-ui-focus);outline-offset:2px}
#hawk-map-navigation .park-map-finders{display:flex;gap:5px;flex:none}
#hawk-map-navigation .park-map-find{width:65px;min-width:0;height:44px;border-radius:12px;font:600 12px var(--park-ui-font);padding:0 3px;touch-action:manipulation}
#hawk-map-navigation .park-map-find:focus-visible{outline:3px solid var(--park-ui-focus);outline-offset:1px}
#hawk-map-navigation:has(.park-map-finders){width:460px;box-sizing:border-box}
#hawk-map-navigation:has(.park-map-finders) .park-map-legend{min-width:0;flex:1;font-size:11px;text-align:left}
@media(max-width:360px){#hawk-map-navigation .park-map-find{width:57px}#hawk-map-navigation:has(.park-map-finders)>div:first-child{gap:4px!important}}
@media(orientation:landscape) and (max-height:550px){html body.park-unified-ui:not(:has(.wardrobe,.return-entry)) #hawk-map-navigation:has(.park-map-finders){width:700px}}
`;
export function createParkMapPointLayer({doc,container,onLocate}){
 if(!doc.getElementById('park-map-point-style')){const style=doc.createElement('style');style.id='park-map-point-style';style.textContent=css;doc.head.append(style);}
 const layer=doc.createElement('div');layer.id='park-map-points';layer.setAttribute('role','group');layer.setAttribute('aria-label','Vehicles and your tasks');doc.body.append(layer);
 const finders=doc.createElement('div');finders.className='park-map-finders';container.append(finders);
 const nodes=new Map(),selects=new Map();let points=[],selected=null,disposed=false;
 for(const [category,title] of [['vehicles','Cars'],['quests','Tasks']]){
  const select=doc.createElement('select');select.className='park-map-find park-ui-control';select.setAttribute('aria-label',category==='vehicles'?'Find a vehicle':'Find a task');select.dataset.category=category;
  select.addEventListener('change',()=>{const point=points.find(p=>p.id===select.value);select.value='';if(point){selected=point.id;onLocate(point.p,90);}});finders.append(select);selects.set(category,{select,title,key:''});
 }
 return {
  update(next,view,viewport,planeY){
   if(disposed)return;points=next;
   if(!points.some(p=>p.id===selected))selected=null;
   for(const [category,state] of selects){
    const list=points.filter(p=>p.category===category),key=list.map(p=>p.id+p.name+p.detail).join('|');
    if(state.key!==key||!state.select.children.length){state.key=key;state.select.replaceChildren();
     const heading=doc.createElement('option');heading.value='';heading.textContent=state.title;state.select.append(heading);
     for(const point of list){const option=doc.createElement('option');option.value=point.id;option.textContent=point.name+' · '+point.detail;state.select.append(option);}
     state.select.disabled=!list.length;
    }
   }
   const groups=clusterMapPoints(points,view,viewport,planeY),kept=new Set();
   const obstacles=[...doc.querySelectorAll('#hawk-map-navigation,.park-toolbar>button,.park-toolbar>span,#park-minimap-coins,.online-toggle,#park-home-button,.park-weather,.park-hud>div.absolute.right-4.top-4,.park-chat')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
   for(const group of groups){
    const point=group.points.find(p=>p.id===selected)||group.points[0],key=group.points[0].id;kept.add(key);let node=nodes.get(key);
    if(!node){node=doc.createElement('button');node.type='button';node.className='park-map-point';node.addEventListener('click',event=>{event.stopPropagation();if(event.defaultPrevented)return;const g=node.mapGroup;if(!g)return;if(node.mapCanZoom){onLocate(g.points[0].p,Math.max(24,node.mapHeight*.4));}else selected=selected===g.points[0].id?null:g.points[0].id;});layer.append(node);nodes.set(key,node);}
    node.mapGroup=group;node.mapHeight=view.height;node.mapCanZoom=view.height>24&&group.points.some(p=>Math.hypot(p.p.x-group.points[0].p.x,p.p.z-group.points[0].p.z)>.5);node.dataset.pointId=point.id;node.dataset.category=point.category;node.dataset.kind=point.kind;node.dataset.occupied=String(!!point.occupied);node.dataset.active=String(point.active);node.dataset.x=String(point.p.x);node.dataset.z=String(point.p.z);
    const label=group.points.map(p=>p.name+' · '+p.detail).join('; '),contentKey=point.id+'|'+point.kind+'|'+label+'|'+group.points.length+'|'+node.mapCanZoom;
    if(node.dataset.content!==contentKey){node.dataset.content=contentKey;node.replaceChildren();const disc=doc.createElement('span');disc.className='park-map-point-disc';disc.append(icon(doc,point.kind));node.append(disc);
     if(group.points.length>1){const count=doc.createElement('span');count.className='park-map-point-count';count.textContent=String(group.points.length);node.append(count);}
     const text=doc.createElement('span');text.className='park-map-point-label';text.textContent=point.name+' · '+point.detail;node.append(text);node.setAttribute('aria-label',label+(node.mapCanZoom?'; zoom to separate':''));
    }
    node.classList.toggle('is-selected',group.points.some(p=>p.id===selected));
    const x=group.screen.x+(viewport.left||0),y=group.screen.y+(viewport.top||0);node.style.transform='translate('+(x-22)+'px,'+(y-22)+'px)';
    // Map markers never cover live HUD/navigation buttons.
    node.hidden=obstacles.some(r=>x+22>r.left&&x-22<r.right&&y+22>r.top&&y-22<r.bottom);
    const text=node.lastElementChild;const maxX=(viewport.left||0)+viewport.width-90,minX=(viewport.left||0)+90;
    text.style.marginLeft=(Math.max(minX,Math.min(maxX,x))-x)+'px';text.style.top=y+90>(viewport.top||0)+viewport.height?'-56px':'44px';
   }
   for(const [key,node] of nodes)if(!kept.has(key)){node.remove();nodes.delete(key);}
   layer.dataset.count=String(points.length);layer.dataset.vehicles=String(points.filter(p=>p.category==='vehicles').length);layer.dataset.quests=String(points.filter(p=>p.category==='quests').length);
  },
  dispose(){disposed=true;nodes.clear();layer.remove();finders.remove();},
 };
}
