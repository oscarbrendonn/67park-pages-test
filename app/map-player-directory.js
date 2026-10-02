// The directory consumes the active lobby's mapPlayers output. It never reads
// culled scene avatars, friends in other lobbies, or stale offline positions.
const searchKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ı/g, 'i').trim();
const compareNames = new Intl.Collator('en', {sensitivity:'base', numeric:true});
const validPosition = p => p && [p.x, p.y, p.z].every(Number.isFinite);

export function selectMapDirectoryPlayers(players = [], query = '', connected = false) {
  const rows = new Map(), needle = searchKey(query);
  for (const player of Array.isArray(players) ? players : []) {
    if (!player || !validPosition(player.p) || (!connected && player.self !== true)) continue;
    if (!['string', 'number'].includes(typeof player.id) || String(player.id).trim() === '') continue;
    const id = String(player.id), self = player.self === true;
    const row = {id, self, name:self ? 'You' : String(player.name || 'Player').trim().slice(0,32) || 'Player',
      color:/^#[0-9a-f]{6}$/i.test(player.color || '') ? player.color : self ? '#60bea5' : '#f4ba60',
      p:{x:player.p.x, y:player.p.y, z:player.p.z}};
    // A duplicate remote must not replace your own row.
    if (!rows.has(id) || (self && !rows.get(id).self)) rows.set(id, row);
  }
  return [...rows.values()]
    .filter(player => !needle || searchKey(player.name).includes(needle))
    .sort((a,b) => Number(b.self)-Number(a.self) || compareNames.compare(a.name,b.name) || a.id.localeCompare(b.id));
}

const STYLE_ID = 'park-map-directory-styles';
let nextDirectoryId = 0;
function installStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.park-map-directory-trigger{min-height:44px;min-width:44px;padding:0 10px;border:1px solid #d5dfd4;border-radius:12px;background:#e3efe2;color:#35473c;font:600 13px system-ui;white-space:nowrap;touch-action:manipulation;cursor:pointer}
.park-map-directory-overlay{position:fixed;z-index:1500;inset:0 0 auto;height:100vh;height:var(--park-directory-height,100dvh);top:var(--park-directory-top,0px);display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));background:#29382f66;overscroll-behavior:contain;color:#35433b;font:14px/1.45 system-ui;isolation:isolate}
.park-map-directory-overlay[hidden]{display:none!important}
.park-map-directory-overlay *{box-sizing:border-box}
.park-map-directory-panel{width:100%;max-width:480px;max-height:100%;min-height:0;display:flex;flex-direction:column;gap:12px;padding:18px;border:1px solid #fffdf5;border-radius:24px;background:#fff9ed;box-shadow:0 12px 50px #172a3338;overflow:hidden;text-align:left}
.park-map-directory-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}
.park-map-directory-title{margin:0;font-size:20px;line-height:1.2;font-weight:750;letter-spacing:-.3px}
.park-map-directory-close{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:#eee6d4;color:#35433b;font:26px/1 system-ui;cursor:pointer;touch-action:manipulation}
.park-map-directory-intro,.park-map-directory-status{margin:0;font-size:13px;line-height:1.35;color:#647066;flex:none}
.park-map-directory-search{display:block;flex:none}
.park-map-directory-search-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.park-map-directory-input{width:100%;min-width:0;height:44px;border:1px solid #d3dacb;border-radius:13px;padding:8px 12px;background:#fffef8;color:#35433b;font:400 16px/1.4 system-ui;box-shadow:none}
.park-map-directory-list{list-style:none;display:flex;flex-direction:column;gap:7px;min-height:0;margin:0;padding:1px 2px 3px;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}
.park-map-directory-row{display:flex;align-items:center;gap:9px;flex:none;min-height:58px;padding:7px 8px;border:1px solid #e7e6d9;border-radius:15px;background:#fffdf6}
.park-map-directory-dot{flex:none;width:12px;height:12px;border-radius:50%;background:var(--directory-player-color,#f4ba60);box-shadow:0 0 0 3px #f5f1e8}
.park-map-directory-person{min-width:0;flex:1}
.park-map-directory-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700;line-height:1.3;unicode-bidi:plaintext}
.park-map-directory-detail{display:block;color:#737c70;font-size:11px;line-height:1.3}
.park-map-directory-locate{flex:none;min-height:44px;max-width:120px;border:1px solid #cdddc8;border-radius:11px;padding:6px 10px;background:#e8f2df;color:#354c35;font:650 12px/1.25 system-ui;cursor:pointer;touch-action:manipulation}
.park-map-directory-empty{padding:16px 4px;color:#647066;font-size:14px}
.park-map-directory-status:empty{display:none}
.park-map-directory-trigger:focus-visible,.park-map-directory-overlay button:focus-visible,.park-map-directory-input:focus-visible{outline:3px solid #247266;outline-offset:2px}
.park-map-directory-trigger:active,.park-map-directory-overlay button:active{background:#d6e4cb}
@media(max-height:420px){.park-map-directory-panel{padding:10px 14px;gap:7px;border-radius:18px}.park-map-directory-title{font-size:18px}.park-map-directory-intro{font-size:12px}.park-map-directory-row{min-height:52px;padding:3px 8px}}
`;
  doc.head.append(style);
}

export function createMapPlayerDirectory({doc, host = doc.defaultView, container, onLocate, canOpen = () => true}) {
  installStyle(doc);
  const uid = `park-map-directory-${++nextDirectoryId}`;
  const listeners = [], nodes = new Map();
  let players = [], connected = false, opened = false, disposed = false;
  let lastSignature = '', returnFocus = null, failure = '';
  const element = (tag, className, text) => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const listen = (target, type, fn, options) => {
    target?.addEventListener(type, fn, options);
    listeners.push(() => target?.removeEventListener(type, fn, options));
  };
  const release = () => host?.dispatchEvent(new (host.Event || Event)('park:release-controls'));
  const focus = node => node?.focus?.({preventScroll:true});
  const trigger = element('button', 'park-map-directory-trigger', 'Players');
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Find players on the map');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', uid);
  container.append(trigger);

  const overlay = element('div', 'park-map-directory-overlay');
  overlay.hidden = true;
  const panel = element('section', 'park-map-directory-panel');
  panel.id = uid;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', `${uid}-title`);
  panel.setAttribute('aria-describedby', `${uid}-intro`);
  const head = element('div', 'park-map-directory-head');
  const title = element('h2', 'park-map-directory-title', 'Players in this park');
  title.id = `${uid}-title`;
  const closeButton = element('button', 'park-map-directory-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close player finder');
  head.append(title, closeButton);
  const intro = element('p', 'park-map-directory-intro');
  intro.id = `${uid}-intro`;
  const searchLabel = element('label', 'park-map-directory-search');
  const labelText = element('span', 'park-map-directory-search-label', 'Search player names');
  const search = element('input', 'park-map-directory-input');
  search.type = 'search';
  search.placeholder = 'Search player names';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('autocapitalize', 'none');
  search.setAttribute('enterkeyhint', 'search');
  search.maxLength = 32;
  searchLabel.append(labelText, search);
  const list = element('ul', 'park-map-directory-list');
  list.setAttribute('aria-label', 'Current players');
  const status = element('p', 'park-map-directory-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.append(head, intro, searchLabel, list, status);
  overlay.append(panel);
  doc.body.append(overlay);

  const syncViewport = () => {
    if (!opened) return;
    const viewport = host.visualViewport;
    if (viewport) {
      overlay.style.setProperty('--park-directory-height', `${viewport.height}px`);
      overlay.style.setProperty('--park-directory-top', `${viewport.offsetTop}px`);
    }
  };
  function close() {
    if (!opened) return;
    opened = false;
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    doc.documentElement.removeAttribute('data-park-map-directory-open');
    release();
    focus(returnFocus?.isConnected && returnFocus !== doc.body && returnFocus !== doc.documentElement && !overlay.contains(returnFocus) ? returnFocus : trigger);
  }
  function makeRow(player) {
    const row = element('li', 'park-map-directory-row');
    row.dataset.playerId = player.id;
    const dot = element('span', 'park-map-directory-dot');
    dot.setAttribute('aria-hidden', 'true');
    const person = element('div', 'park-map-directory-person');
    const name = element('span', 'park-map-directory-name');
    const detail = element('span', 'park-map-directory-detail');
    person.append(name, detail);
    const locate = element('button', 'park-map-directory-locate', 'Show on map');
    locate.type = 'button';
    locate.addEventListener('click', () => {
      // A departure between painting the row and tapping it cannot locate a
      // stale player. The integrating callback validates again before panning.
      if (!selectMapDirectoryPlayers(players, '', connected).some(p => p.id === player.id)) {
        failure = 'This player has left the park.';
      } else if (onLocate?.(player.id) === true) {
        close();
        return;
      } else {
        failure = 'Location is not available yet. Please try again.';
      }
      render(true);
    });
    row.append(dot, person, locate);
    return {row, name, detail, locate};
  }
  function render(force = false) {
    if (!opened || disposed) return;
    const all = selectMapDirectoryPlayers(players, '', connected);
    const visible = selectMapDirectoryPlayers(all, search.value, connected);
    // Position updates are intentionally excluded: they arrive constantly, but
    // must never recreate search, disturb its caret, or churn the roster DOM.
    const signature = JSON.stringify([connected, search.value, failure, all.map(p => [p.id,p.name,p.self,p.color])]);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    const otherCount = all.filter(p => !p.self).length;
    intro.textContent = connected
      ? `${all.length} ${all.length === 1 ? 'player' : 'players'} in this park · Show on map moves the camera, not your character.`
      : 'Offline · Only your own location is available.';
    const ids = new Set(visible.map(p => p.id));
    const active = doc.activeElement;
    let removedFocus = false;
    for (const [id, entry] of nodes) if (!ids.has(id)) {
      if (entry.row.contains(active)) removedFocus = true;
      entry.row.remove();
      nodes.delete(id);
    }
    list.querySelector('.park-map-directory-empty')?.remove();
    visible.forEach((player,index) => {
      let entry = nodes.get(player.id);
      if (!entry) { entry = makeRow(player); nodes.set(player.id,entry); }
      if (entry.name.textContent !== player.name) entry.name.textContent = player.name;
      entry.detail.textContent = player.self ? 'Your location' : 'In this park';
      entry.row.style.setProperty('--directory-player-color', player.color);
      entry.locate.setAttribute('aria-label', player.self ? 'Show your location on map' : `Show ${player.name} on map`);
      if (list.children[index] !== entry.row) list.insertBefore(entry.row, list.children[index] || null);
    });
    if (!visible.length) {
      const message = search.value.trim() ? 'No player matches your search.' : connected
        ? 'Waiting for player locations…' : 'Your location is not ready yet. You are offline.';
      list.append(element('li','park-map-directory-empty',message));
    }
    status.textContent = failure || (connected && !otherCount ? 'No other players are in this park yet.' : '');
    if (removedFocus) focus(search);
  }
  const open = () => {
    if (disposed || opened || !canOpen()) return;
    returnFocus = doc.activeElement;
    opened = true;
    failure = '';
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    doc.documentElement.setAttribute('data-park-map-directory-open', '');
    release();
    syncViewport();
    render(true);
    // Avoid raising the phone keyboard merely to look at the player list.
    focus(closeButton);
  };
  listen(trigger,'click',open);
  listen(closeButton,'click',close);
  listen(search,'input',() => { failure = ''; render(); });
  listen(overlay,'click',e => { e.stopPropagation(); if (e.target === overlay) close(); });
  for (const type of ['pointerdown','pointerup','wheel']) listen(overlay,type,e => e.stopPropagation());
  listen(host,'keydown',e => {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') {
      const focusable = [closeButton,search,...visibleLocateButtons()];
      const index = focusable.indexOf(doc.activeElement);
      if (index === -1 || (e.shiftKey && index === 0) || (!e.shiftKey && index === focusable.length-1)) {
        e.preventDefault();
        focus(e.shiftKey ? focusable.at(-1) : focusable[0]);
      }
    }
    // Keep default text editing, native button activation, and scrolling. Only
    // propagation to gameplay listeners is blocked while the dialog owns input.
    e.stopImmediatePropagation();
  },true);
  listen(host,'keyup',e => { if (opened) e.stopImmediatePropagation(); },true);
  listen(doc,'focusin',e => { if (opened && !overlay.contains(e.target)) focus(closeButton); });
  listen(host.visualViewport,'resize',syncViewport);
  listen(host.visualViewport,'scroll',syncViewport);
  function visibleLocateButtons() { return [...list.querySelectorAll('button')].filter(button => !button.disabled); }
  return {
    update(nextPlayers, state = {}) {
      if (disposed) return;
      players = Array.isArray(nextPlayers) ? nextPlayers : [];
      connected = state.connected === true;
      render();
    },
    close,
    dispose() {
      if (disposed) return;
      close();
      disposed = true;
      for (const remove of listeners) remove();
      nodes.clear();
      trigger.remove();
      overlay.remove();
    }
  };
}
