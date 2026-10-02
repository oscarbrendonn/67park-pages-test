// Bird's-eye navigation; teleport uses the game's validated callback.
import {mapPlayers,createMapPlayerLayer} from './map-player-markers.js?v=map-player-hud-20261001-1';
import {createMapPlayerDirectory} from './map-player-directory.js?v=park-essentials-20261002-1';
const states = new WeakMap();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function transformHawkView(view, from, to, scale, viewport, limits) {
  if (![from.x, from.y, to.x, to.y, scale, viewport.width, viewport.height, viewport.fov].every(Number.isFinite) || scale <= 0 || viewport.width <= 0 || viewport.height <= 0) return view;
  const tangent = Math.tan(viewport.fov * Math.PI / 360);
  const unit = height => 2 * height * tangent / viewport.height;
  const before = unit(view.height);
  const anchorX = view.x + (from.x - viewport.width / 2) * before;
  const anchorZ = view.z + (from.y - viewport.height / 2) * before;
  view.height = clamp(view.height * scale, limits.minHeight, limits.maxHeight);
  const after = unit(view.height);
  view.x = clamp(anchorX - (to.x - viewport.width / 2) * after, limits.minX, limits.maxX);
  view.z = clamp(anchorZ - (to.y - viewport.height / 2) * after, limits.minZ, limits.maxZ);
  return view;
}

export function installHawkMapControls(camera, hawk, config, host = window) {
  states.get(camera)?.dispose();
  const doc = host.document, pointers = new Map(), listeners = [];
  let canvas = null, oldTouchAction = '', panel = null, output = null, view = null, enabled = false, frame = null;
  let tap=null,lastTap=null,hint=null,playerLayer=null,legend=null,lastPlayersAt=0,directory=null,panelObserver=null;
  const blocked=()=>config.blocked?.()||doc.documentElement.hasAttribute('data-park-map-directory-open');
  const requestRender = () => {
    if(doc.hidden || config.blocked?.())return;
    config.requestRender?.();
    if(frame!==null)host.cancelAnimationFrame?.(frame);
    frame=host.requestAnimationFrame?.(()=>{frame=null;if(!doc.hidden&&!config.blocked?.())config.requestRender?.();})??null;
  };
  const viewport = () => {
    const rect = canvas?.getBoundingClientRect() ?? {left:0, top:0, width:host.innerWidth, height:host.innerHeight};
    return {...rect, width:rect.width, height:rect.height, fov:camera.fov};
  };
  const limits = () => ({minHeight:12, maxHeight:Math.max(180, config.fitHeight(camera.fov, camera.aspect) * 1.5), minX:config.center.x-config.halfX, maxX:config.center.x+config.halfX, minZ:config.center.z-config.halfZ, maxZ:config.center.z+config.halfZ});
  const report = () => {
    if (!panel || !view) return;
    panel.dataset.state = JSON.stringify(view);
    if(hint)hint.textContent=view.height<(config.fitHeight(camera.fov,camera.aspect)-config.planeY)*.98?'Drag to explore · Double-tap to travel':'Drag to explore · Tap to travel';
    output.textContent = `${Math.round((config.fitHeight(camera.fov,camera.aspect)-config.planeY)/view.height*100)}%`;
  };
  const release = () => {
    for (const id of pointers.keys()) { try { canvas?.releasePointerCapture(id); } catch {} }
    pointers.clear();tap=null;lastTap=null;
  };
  const render = () => {
    if (!view || !enabled) return;
    camera.up.set(0,0,-1);
    camera.position.set(view.x, config.planeY + view.height, view.z);
    camera.lookAt(view.x, config.planeY, view.z);
    const now=host.performance?.now()??Date.now();
    if(playerLayer && now-lastPlayersAt>=80){
      lastPlayersAt=now;
      const state=config.players?.()||{},players=mapPlayers(state);
      playerLayer.update(players,view,viewport(),config.planeY);
      directory?.update(players,{connected:!!state.connected});
      const count=players.filter(p=>!p.self).length;
      const text=state.connected?`You · ${count} other ${count===1?'player':'players'} in this park`:'You · Offline';
      if(legend.textContent!==text)legend.textContent=text;
    }
  };
  const reset = () => {
    if(config.blocked?.())return;
    release();
    view = {x:config.center.x,z:config.center.z,height:Math.max(90,config.fitHeight(camera.fov,camera.aspect)-config.planeY)};
    lastPlayersAt=-Infinity;render();report();requestRender();
  };
  const change = (from,to,scale=1) => {
    if (!enabled || blocked()) { release(); return; }
    transformHawkView(view,from,to,scale,viewport(),limits());
    lastPlayersAt=-Infinity;render();report();requestRender();
  };
  const zoom = scale => { const vp=viewport(),p={x:vp.width/2,y:vp.height/2}; change(p,p,scale); };
  const sync = () => {
    const next = !!hawk.on;
    if (enabled === next) return;
    enabled=next; camera.userData.parkOverview=enabled; release();
    if (enabled) {
      canvas=doc.querySelector('canvas');
      if(canvas){oldTouchAction=canvas.style.touchAction;canvas.style.touchAction='none';}
      panel=doc.createElement('section');panel.id='hawk-map-navigation';panel.setAttribute('aria-label','Bird’s-eye map navigation');
      panel.style.cssText='position:fixed;z-index:90;bottom:max(18px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:10px;border-radius:20px;background:#fff8ecef;color:#424943;box-shadow:0 4px 18px #0002;font:13px system-ui;max-width:calc(100vw - 24px);text-align:center;pointer-events:auto;';
      hint=doc.createElement('div');hint.textContent='Drag to explore · Pinch to zoom · Double-tap to travel';panel.append(hint);
      legend=doc.createElement('div');legend.className='park-map-legend';panel.prepend(legend);
      const directorySlot=doc.createElement('div');directorySlot.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px';
      panel.prepend(directorySlot);directorySlot.append(legend);panel.dataset.playerDirectory='true';
      directory=createMapPlayerDirectory({doc,host,container:directorySlot,canOpen:()=>!config.blocked?.(),onLocate:id=>{
        if(!enabled||config.blocked?.())return false;
        const player=mapPlayers(config.players?.()).find(p=>p.id===id);if(!player)return false;
        release();view.x=player.p.x;view.z=player.p.z;view.height=Math.min(view.height,150);
        lastPlayersAt=-Infinity;render();report();requestRender();return true;
      }});
      playerLayer=createMapPlayerLayer(doc);
      const controls=doc.createElement('div');controls.style.cssText='display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px';panel.append(controls);
      const button=(label,text,action)=>{const b=doc.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.textContent=text;b.style.cssText='min-width:44px;min-height:44px;border:1px solid #d5dfd4;border-radius:12px;background:#f6f1e6;color:inherit;font:600 15px system-ui;touch-action:manipulation;';b.addEventListener('click',action);controls.append(b);};
      button('Zoom out map','−',()=>zoom(1.3));
      output=doc.createElement('output');output.setAttribute('aria-label','Map zoom');controls.append(output);
      button('Zoom in map','+',()=>zoom(1/1.3));button('Fit whole map','Fit',reset);
      button('Find my location','Me',()=>{
        if(blocked())return;
        const self=mapPlayers(config.players?.()).find(p=>p.self);if(!self)return;
        release();view.x=self.p.x;view.z=self.p.z;view.height=Math.min(view.height,150);
        lastPlayersAt=-Infinity;render();report();requestRender();
      });
      button('Return to player','Back',()=>hawk.set(false));
      doc.body.append(panel);
      if(!doc.getElementById('park-map-discovery-layout')){
        const style=doc.createElement('style');style.id='park-map-discovery-layout';
        style.textContent='body.park-unified-ui:has(#hawk-map-navigation[data-player-directory]) .park-chat:not([data-chat-keyboard=true]){bottom:calc(var(--park-map-navigation-height,150px) + max(18px,env(safe-area-inset-bottom)) + 8px)!important}';doc.head.append(style);
      }
      const measurePanel=()=>doc.documentElement.style.setProperty('--park-map-navigation-height',panel.getBoundingClientRect().height+'px');
      if(host.ResizeObserver){panelObserver=new host.ResizeObserver(measurePanel);panelObserver.observe(panel);}
      reset();measurePanel();
    } else {
      if(canvas)canvas.style.touchAction=oldTouchAction;
      playerLayer?.dispose();playerLayer=null;legend=null;
      directory?.dispose();directory=null;panelObserver?.disconnect();panelObserver=null;doc.documentElement.style.removeProperty('--park-map-navigation-height');
      panel?.remove();panel=null;output=null;view=null;canvas=null;
      requestRender();
    }
  };
  const local = e => {const vp=viewport();return {x:e.clientX-(vp.left||0),y:e.clientY-(vp.top||0)};};
  const pair = () => {const a=[...pointers.values()];return a.length===1?{center:a[0],distance:0}:{center:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};};
  const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  on(host,'pointerdown',e=>{
    if(!enabled||blocked()||e.target!==canvas||pointers.size>=2||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();tap=pointers.size===0?{id:e.pointerId,p:local(e),at:Date.now()}:null;if(pointers.size)lastTap=null;pointers.set(e.pointerId,local(e));try{canvas.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  on(host,'pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    if(!enabled||blocked()){release();return;}
    if(tap&&Math.hypot(local(e).x-tap.p.x,local(e).y-tap.p.y)>8){tap=null;lastTap=null;}
    e.preventDefault();const before=pair();pointers.set(e.pointerId,local(e));const after=pair();
    change(before.center,after.center,before.distance>1&&after.distance>1?before.distance/after.distance:1);
  },{passive:false});
  const up=e=>{
    const candidate=tap;tap=null;
    pointers.delete(e.pointerId);try{canvas?.releasePointerCapture(e.pointerId);}catch{}
    if(e.type!=='pointerup'||!candidate||candidate.id!==e.pointerId||!enabled||blocked()||Date.now()-candidate.at>500)return;
    const p=local(e);if(Math.hypot(p.x-candidate.p.x,p.y-candidate.p.y)>8)return;
    const now=Date.now(),fit=config.fitHeight(camera.fov,camera.aspect)-config.planeY;
    const zoomed=view.height<fit*.98;
    const double=lastTap&&now-lastTap.at<550&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<24;
    if(zoomed&&!double){lastTap={p,at:now};return;}
    lastTap=null;
    const vp=viewport(),unit=2*view.height*Math.tan(vp.fov*Math.PI/360)/vp.height;
    const x=view.x+(p.x-vp.width/2)*unit,z=view.z+(p.y-vp.height/2)*unit;
    const homeTravel=host.__parkHousing?.travelFromMap?.(()=>config.teleport?.(x,z));
    if(homeTravel===true||(homeTravel===undefined&&config.teleport?.(x,z)===true))hawk.set(false);
  };
  on(host,'pointerup',up);on(host,'pointercancel',()=>release());
  on(host,'lostpointercapture',e=>{pointers.delete(e.pointerId);});
  on(host,'blur',release);on(doc,'visibilitychange',release);on(host,'resize',release);
  on(host,'park:release-controls',release);
  on(host,'wheel',e=>{if(!enabled||e.target!==canvas||blocked())return;e.preventDefault();const p=local(e);change(p,p,Math.exp(clamp(e.deltaY,-240,240)*.003));},{passive:false});
  const unsub=hawk.sub(sync);
  const dispose=()=>{unsub();release();delete camera.userData.parkOverview;if(frame!==null)host.cancelAnimationFrame?.(frame);for(const remove of listeners)remove();if(canvas)canvas.style.touchAction=oldTouchAction;playerLayer?.dispose();directory?.dispose();panelObserver?.disconnect();doc.documentElement.style.removeProperty('--park-map-navigation-height');panel?.remove();states.delete(camera);};
  states.set(camera,{render,dispose});sync();return dispose;
}

export function renderHawkMap(camera) { states.get(camera)?.render(); }
