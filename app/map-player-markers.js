// Read only the active lobby roster, never the distance-culled scene avatars.
const valid = p => p && [p.x,p.y,p.z].every(Number.isFinite);
export function mapPlayers(state = {}) {
  const result = [];
  if (valid(state.self)) result.push({id:state.id || 'self',name:'You',self:true,p:state.self,color:'#60bea5'});
  if (!state.connected) return result;
  for (const [id,remote] of state.remotes || []) {
    if (id === state.id || result.length >= 50) continue;
    const a = remote.targetP || remote.p;
    if (!Array.isArray(a) || a.length < 3 || !a.every(Number.isFinite)) continue;
    // Join packets arrive before the first actual world position.
    if (a[0] === 179 && a[1] === 12 && a[2] === 121) continue;
    result.push({id,name:String(remote.name || 'Player').slice(0,32),self:false,
      p:{x:a[0],y:a[1],z:a[2]},color:/^#[0-9a-f]{6}$/i.test(remote.color) ? remote.color : '#f4ba60'});
  }
  return result;
}

export function projectMapPlayer(p, view, viewport, planeY = 10) {
  const distance = planeY + view.height - p.y;
  const unit = 2 * distance * Math.tan(viewport.fov * Math.PI / 360) / viewport.height;
  if (!valid(p) || !Number.isFinite(unit) || unit <= 0) return null;
  const x = viewport.width / 2 + (p.x - view.x) / unit;
  const y = viewport.height / 2 + (p.z - view.z) / unit;
  return {x,y,visible:x>=22 && y>=22 && x<=viewport.width-22 && y<=viewport.height-22};
}

export function createMapPlayerLayer(doc) {
  const layer = doc.createElement('div'), nodes = new Map();
  layer.id = 'park-map-players';layer.setAttribute('role','group');layer.setAttribute('aria-label','Players in this park');
  doc.body.append(layer);
  return {
    update(players,view,viewport,planeY) {
      const ids = new Set(players.map(p=>p.id));
      const projectedPlayers=players.map(player=>({player,point:projectMapPlayer(player.p,view,viewport,planeY)}));
      for (const [id,node] of nodes) if (!ids.has(id)) {node.remove();nodes.delete(id);}
      for (const player of players) {
        let node = nodes.get(player.id);
        if (!node) {
          node = doc.createElement('button');node.type='button';node.className='park-map-player';node.dataset.playerId=player.id;
          const dot=doc.createElement('span');dot.className='park-map-player-dot';dot.setAttribute('aria-hidden','true');
          const name=doc.createElement('span');name.className='park-map-player-name';
          const count=doc.createElement('span');count.className='park-map-player-count';count.setAttribute('aria-hidden','true');node.append(dot,count,name);
          // A marker is information, not a world-teleport target.
          node.addEventListener('click',e=>{e.stopPropagation();for(const other of nodes.values())if(other!==node)other.classList.remove('is-selected');node.classList.toggle('is-selected');});
          layer.append(node);nodes.set(player.id,node);
        }
        const projected=projectMapPlayer(player.p,view,viewport,planeY);
        node.hidden=!projected?.visible;
        node.classList.toggle('is-self',player.self);
        const nearby=projected?.visible?projectedPlayers.filter(p=>p.point?.visible&&p.player.id!==player.id&&Math.hypot(p.point.x-projected.x,p.point.y-projected.y)<24):[];
        const names=[player.name,...nearby.map(p=>p.player.name)].join(' · ');
        node.classList.toggle('is-cluster-member',!player.self&&nearby.some(p=>p.player.self));
        const label=(player.self?'You — your location':player.name+' — in this park')+(nearby.length?'; nearby: '+nearby.map(p=>p.player.name).join(', '):'');
        if(node.getAttribute('aria-label')!==label){node.setAttribute('aria-label',label);node.lastElementChild.textContent=names;}
        const badge=node.children[1];badge.hidden=!nearby.length;badge.textContent=nearby.length?'+'+nearby.length:'';
        node.style.setProperty('--player-color',player.color);
        if(projected)node.style.transform=`translate(${projected.x+(viewport.left||0)-22}px,${projected.y+(viewport.top||0)-22}px)`;
      }
    },
    dispose(){nodes.clear();layer.remove();}
  };
}
