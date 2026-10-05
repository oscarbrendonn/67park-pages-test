import {DEFS,ICONS} from './action-icons.js';
import {createParkLaunchers} from "./park-launchers.js?v=hatch-ends-1";
import {createParkPets} from '../pets/park-pets.js?v=pet-motion-3';
import {createHousing} from '../housing.js?v=rail-corner-1';
import '../chat-send-focus.js?v=homes-1';
import {createParkSocialToys} from "./park-social-toys.js?v=balloon-lift-2";
import {installSkateRailFinish} from './skate-rail-finish.js?v=flush-ends-2';
// 67 Park party pack. Adds an Eggy Party style feel on top of the island without touching its
// systems: springy jump and landing squash, punches and throws that reach other players,
// jump pads, synthesized sounds, haptics and a settings panel.
// Every hook is guarded: a fault here disables the pack and never stops the game.
// Loaded after app/main.js. Config: window.__partyConfig = {runtime: "<runtime ?v>", carry: "<carry ?v>"}.
import * as THREE from 'three';
import {playerSettings as settings,savePlayerSettings as saveSettings} from '../player-settings.js';
import {installPlayerSettings} from './settings-panel.js?v=recovery-graphics-1';
import { createPartyAudio } from './party-audio.js?v=vehicle-audio-3&sound-pack=9';
import {readVehicleFeedbackInput} from '../chunk-OZ77422N.js?v=contact-escape-1';
import {createFeatureBoundary} from '../feature-boundary.js';
import {createVehicleHorn} from './vehicle-horn.js?v=horn-hold-1';
import {createTargetClub} from './target-club.js?v=target-club-1';
import {createWaterEntryFeedback} from './water-entry-feedback.js?v=water-contact-1';
import {createFountainLauncher} from './fountain-launcher.js?v=fountain-1';
import {createParkSwings} from './park-swings.js?v=swings-1';
import {createParkEvening} from './park-evening.js?v=evening-1';

const BASE = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const CFG = Object.assign({runtime: '', carry: ''}, (typeof window !== 'undefined' && window.__partyConfig) || {});
const VERSION = 'party-1';
const isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = v => Number.isFinite(v);
const log = (...a) => { try { console.log('[party]', ...a); } catch {} };
let disabled = false;
let settingsUI = null;
let guardId=0;
const features=createFeatureBoundary({onFault:record=>{log('feature paused',record.key,record.message);try{const errors=window.__candyErrors||=[];errors.push('party '+record.key+': '+record.message);if(errors.length>32)errors.splice(0,errors.length-32);}catch{}}});
function guard(fn,key='hook-'+(++guardId)) {
  return function (...args) {
    return features.run(key,()=>fn.apply(this,args));
  };
}

// ---------- settings ----------
const gameMuted = () => { try { return localStorage.getItem('67park-feel-lab-muted') === '1'; } catch { return false; } };

// ---------- sound (shared graph, recorded vehicle and movement foley) ----------
const sfx = createPartyAudio({settings, saveSettings, gameMuted});
window.addEventListener('candy:portal-travel', () => sfx.play('portal'));
const buzz = pattern => { if (!settings.haptics || !isTouch) return; try { navigator.vibrate?.(pattern); } catch {} };

// ---------- world access ----------
const player = {body: null, visual: null, map: 'city'};
const housing = createHousing({sound:name=>sfx.play(name)});
window.__parkHousing = housing;
const world = () => window.__islandWorld || null;
const scene = () => window.__eggyScene || null;
// Do not add materials while entry-graphics is compiling its fixed warmup set.
const swings=createParkSwings({world,scene,canInstall:()=>!document.querySelector('.wardrobe')});
window.__parkSwings=swings;
const evening=createParkEvening({world,reducedMotion,enabled:()=>player.map==='city'&&!document.hidden&&!world()?.homeScene?.active&&!document.querySelector('.wardrobe')});
window.__parkEvening=evening;
const net = () => window.__eggyNet || null;
// This release adds local driver feedback only. Replicating a horn would need
// a server-approved vehicle event: mounted position packets are deliberately
// ignored by the authoritative server, so never smuggle it through chat/emotes.
const horn = createVehicleHorn({
  driver:()=>{
    const n=net();
    return player.map==='city'&&!!n?.connected&&!!n.id&&
      !!world()?.traffic?.cars?.some(car=>car.ownerAt?.(0)===n.id);
  },
  blocked:()=>!!document.querySelector('.wardrobe,dialog[open],#party-settings:not([hidden]),.park-chat input:focus,.park-chat textarea:focus'),
  play:()=>sfx.play('horn'), start:()=>sfx.startHorn(), stop:()=>sfx.stopHorn()
});
let stateApi = null, carryApi = null; // the game's own modules (same instances as main.js: exact same URLs)
const state = () => { try { return stateApi ? stateApi() : null; } catch { return null; } };
const targetClub=createTargetClub({world,state,reducedMotion,sound:name=>sfx.play(name)});
window.__parkTargetClub=targetClub;
const pets = createParkPets({world,net,heading:()=>player.visual?.rotation.y??state()?.heading??0,reducedMotion,sound:name=>sfx.play(name),resting:()=>housing.isResting(),canCare:()=>!heldId()&&!housing.isResting()&&!window.__candy?.state?.().mounted});
window.__parkPets = pets;
(async () => {
  try { stateApi = (await import(`${BASE}/app/claude-gorilla-runtime.js${CFG.runtime ? '?v=' + CFG.runtime : ''}`)).claudeGorillaState; }
  catch (e) { log('runtime import failed', e); }
  try { carryApi = await import(`${BASE}/app/park-carry.js${CFG.carry ? '?v=' + CFG.carry : ''}`); }
  catch (e) { log('carry import failed', e); }
})();
const groundAt = (x, z) => { const w = world(); let y = null; try { y = w?.ground?.(x, z); } catch {} return finite(y) ? y : null; };
const heldId = () => { try { return carryApi?.carryPacket?.() || ''; } catch { return ''; } };

// ---------- springy scale (jump, land, hits) ----------
const spring = {v: 0, vel: 0, k: 190, c: 15};
function kick(amount) { spring.v += amount; }
function stepSpring(dt) { const a = -spring.k * spring.v - spring.c * spring.vel; spring.vel += a * dt; spring.v += spring.vel * dt; spring.v = clamp(spring.v, -0.42, 0.45); }
let prevPunchT = 0, ballStrikeSeq = 0, wasEnabled = false, hitTumble = 0, tumbleDir = 0;
let previousHeld = '';
let previousMounted = null;
const waterEntry=createWaterEntryFeedback({world,scene,reducedMotion,sound:(name,strength)=>sfx.play(name,strength)});
window.__parkWaterEntry=waterEntry;


function vehicleAndWaterAudio(st) {
  const vehicleState = window.__candy?.state?.() || null;
  const mounted = vehicleState?.mounted || null;
  const id=net()?.id,mount=window.__candyOnline?.world?.mounts?.[id];
  const car=mounted==='car'&&id?(world()?.traffic?.cars||[]).find(c=>c.id===mount?.id||c.ownerAt?.(0)===id):null;
  const roadVehicle=car&&(car.kind==='car'||car.kind==='bus');
  if(roadVehicle){
    const driver=car.ownerAt?.(0)===id;
    const input=driver?readVehicleFeedbackInput():{throttle:0,brake:false};
    sfx.updateVehicleEngine(Number(car.physics?.speed)||0,{kind:car.kind,throttle:input.throttle,brake:input.brake,ignition:previousMounted!==car.id});
  }else if(previousMounted!==null)sfx.stopVehicleEngine(true);
  previousMounted=roadVehicle?car.id:null;
}

// ---------- hooks called by main.js ----------
window.__partyStep = guard((body, input, dt, map) => {
  player.body = body || null; player.map = map;
  features.run('target-club',()=>targetClub.step(body,dt,map));
  features.run('housing-step',()=>housing.step(body,input,dt,map));
  features.run('pets-step',()=>pets.step(body,dt,map));
  dt = clamp(finite(dt) ? dt : 0, 0, 0.05);
  features.run('network',()=>netHook.step());
  features.run('vehicle-horn',()=>horn.step());
  features.run('knockback',()=>knockStep(dt));
  features.run('footsteps',()=>footsteps(state(), dt));
  features.run('vehicle-water-audio',()=>vehicleAndWaterAudio(state()));
  features.run('water-dive-fx',()=>waterEntry.step({position:body?.translation?.(),velocityY:body?.linvel?.().y,dt,enabled:map==='city'&&!window.__candy?.state?.().mounted}));
  const held = heldId();
  if (held && !previousHeld) sfx.play('grab');
  previousHeld = held;
  features.run('toys-step',()=>toys.step(body,input,dt,map==='city'&&!!world()&&!world()?.homeScene?.active));
  if (map !== 'city' || !world()) return;
  features.run('swings',()=>swings.step());
  features.run('evening',()=>evening.step());
  features.run('rails',()=>{if(world().ready&&!world().skateRailFinish)installSkateRailFinish(world());});
  features.run('launchers',()=>items.step(body,dt));
  features.run('fountain',()=>fountain.step(body,dt));
  features.run('rings',()=>stepRings(dt));
  features.run('remote-pops',()=>remotePops.step(dt));
});
window.__partyVisual = guard((group, dt) => {
  features.run('housing-visual',()=>housing.visual(group,dt));
  features.run('carry-visual',()=>carryApi?.updateLocalCarryHands?.(group,dt));
  features.run('toys-visual',()=>toys.visual(group,dt));
  features.run('pets-visual',()=>pets.visual(group,dt));
  features.run('swim-visual',()=>{if(player.map==='city')world()?.parkSwimVisual?.(group);});
  features.run('water-entry-visual',()=>{if(player.map==='city')waterEntry.visual(group,player.body?.translation?.());});
  player.visual = group || null;
  dt = clamp(finite(dt) ? dt : 0, 0, 0.05);
  const st = state();
  if (!group) return;
  const punchStarted = st?.punchT > 0 && prevPunchT === 0;
  if(punchStarted&&st?.enabled&&player.map==='city'&&world()?.lobbyCourts?.canStrike(st.heading))netHook.flag(`pk1b:${++ballStrikeSeq%100000}`);
  // Sound and haptics follow actions even when visual bounce or reduced-motion effects are off.
  if (st?.enabled && player.map === 'city') {
    const base=document.documentElement.dataset.gameplayAvatarBase;
    if (st.jumped === 1) { sfx.play('jump'); sfx.play('character-jump', base); buzz(8); }
    else if (st.jumped === 2) { sfx.play('double'); sfx.play('character-jump', base); buzz([8, 30, 8]); }
    if (st.landed) { const hard=st.landed>9; sfx.play('land', hard); sfx.play('character-land', {hard,base}); buzz(hard ? 22 : 10); }
    if (punchStarted) sfx.punch(document.documentElement.dataset.gameplayAvatarBase);
  }
  prevPunchT = st?.punchT || 0;
  if (!st || !st.enabled || player.map !== 'city' || !settings.juice || reducedMotion()) {
    if (wasEnabled) { group.scale.x = group.scale.z = 1; wasEnabled = false; }
    return;
  }
  wasEnabled = true;
  if (st.jumped === 1) { kick(0.16); }
  else if (st.jumped === 2) { kick(0.22); }
  if (st.landed) { kick(-0.30 * clamp(st.landed / 10, 0.5, 1)); }
  if (punchStarted) kick(0.07);
  if (st.punchImpact) { st.shake = Math.max(st.shake || 0, 0.22); hits.punch(); }
  stepSpring(dt);
  const vy = finite(st.verticalVelocity) ? st.verticalVelocity : 0;
  const air = st.grounded ? 0 : clamp(Math.abs(vy) / 11, 0, 1) * 0.11;
  const s = spring.v + air;
  group.scale.y = clamp(1 + s, 0.62, 1.4);
  group.scale.x = group.scale.z = clamp(1 - s * 0.55, 0.75, 1.25);
  if (hitTumble > 0) {
    hitTumble = Math.max(0, hitTumble - dt);
    const w = Math.sin((hitTumble / 0.7) * Math.PI);
    group.rotation.x += -0.55 * w * Math.cos(tumbleDir - group.rotation.y);
    group.rotation.z += 0.55 * w * Math.sin(tumbleDir - group.rotation.y);
  }
  dizzyStars.update(group, dt);
});

// ---------- hit channel: punches and throws reach other characters ----------
// Rides on the emote field of the position packet, which the server relays as a 40 char string.
// pk1h:<victim id prefix>:<nonce>:<angle deg>:<power>
const netHook = (() => {
  let ws = null, listener=null,outgoing = null, until = 0; const seen = new Map();
  const listen = () => {
    const n = net(); const sock = n?.ws; if (!sock || sock === ws) return;
    if(ws&&listener)ws.removeEventListener('message',listener);
    ws = sock;
    listener=ev => {
      if (typeof ev.data !== 'string' || ev.data.indexOf('"pk1') < 0) return;
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m?.t !== 's' || typeof m.e !== 'string' || !m.e.startsWith('pk1')) return;
      if(m.e.startsWith('pk1t:'))features.run('toys-receive',()=>toys.receive(m));else features.run('hits-receive',()=>hits.receive(m));
    };
    sock.addEventListener('message',listener);
    if (!sock.__partySend) {
      sock.__partySend = true;
      const raw = sock.send.bind(sock);
      sock.send = data => {
        try {
          if (typeof data === 'string' && data.startsWith('{"t":"s"')) {
            if (performance.now() > until) outgoing = null;
            const flag=outgoing||toys.packet();
            if(flag){ const o = JSON.parse(data); o.e = flag; data = JSON.stringify(o); }
          }
        } catch {}
        return raw(data);
      };
    }
  };
  return {
    step() { listen(); },
    // Put a flag into the next position packets for `ms` milliseconds and push one packet now.
    flag(text, ms = 240) {
      outgoing = text; until = performance.now() + ms;
      const n = net(); if (!n?.ws || n.ws.readyState !== 1) return;
      try {
        const p = player.body?.translation?.(); const st = state();
        if (p) { n.lastSend = 0; n.sendState([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], finite(st?.heading) ? st.heading : 0); }
      } catch {}
    },
    dedupe(key) { const now = performance.now(); for (const [k, t] of seen) if (now - t > 4000) seen.delete(k); if (seen.has(key)) return false;if(seen.size>=256)seen.delete(seen.keys().next().value); seen.set(key, now); return true; },
  };
})();
const shortId = id => String(id || '').replace(/-/g, '').slice(0, 8);
const dizzyStars = (() => {
  let sprite = null, life = 0;
  const make = () => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const star = (x, y, r, col) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); };
    star(30, 40, 16, '#ffd54a'); star(66, 26, 13, '#ff8fb8'); star(100, 44, 15, '#7fd6ff');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false})); s.scale.set(1.3, 1.3, 1); s.name = 'PARTY_dizzy'; return s;
  };
  return {
    show(group, seconds = 1.1) { if (!group) return; if (!sprite) sprite = make(); if (sprite.parent !== group) group.add(sprite); life = seconds; sprite.visible = true; },
    update(group, dt) { if (!sprite || !sprite.visible) return; life -= dt; if (life <= 0) { sprite.visible = false; return; } const t = performance.now() / 1000; sprite.position.set(Math.sin(t * 6) * 0.25, 2.05 + Math.sin(t * 9) * 0.05, Math.cos(t * 6) * 0.25); sprite.material.rotation = t * 2.2; sprite.material.opacity = Math.min(1, life * 3); },
  };
})();
// Quick scale pop on another player's avatar so a hit reads instantly on the attacker's screen too.
const remotePops = (() => {
  const pops = new Map(); let cacheAt = 0; const roots = new Map();
  const refresh = () => {
    const now = performance.now(); if (now - cacheAt < 800) return; cacheAt = now; roots.clear();
    const s = scene(); if (!s) return;
    s.traverse(o => { const tag = o.userData?.claudeRemoteCharacter; if (tag?.id && !roots.has(tag.id)) { let g = o; for (let i = 0; i < 4 && g.parent && g.parent !== s && !(g.parent.position.x || g.parent.position.z); i++) g = g.parent; roots.set(tag.id, g); } });
  };
  return {
    pop(id) { refresh(); const g = roots.get(id); if (!g) return null; pops.set(id, {g, t: 0, sx: g.scale.x, sy: g.scale.y, sz: g.scale.z}); return g; },
    step(dt) { for (const [id, p] of pops) { p.t += dt; const k = p.t / 0.35; if (k >= 1 || !p.g.parent) { p.g.scale.set(p.sx, p.sy, p.sz); pops.delete(id); continue; } const w = Math.sin(k * Math.PI); p.g.scale.set(p.sx * (1 + 0.28 * w), p.sy * (1 - 0.22 * w), p.sz * (1 + 0.28 * w)); } },
  };
})();
// Footsteps: the park has no walking sounds for this character, so play soft pats by speed.
let stepPhase = 0, stepLeft = false;
function footsteps(st, dt) {
  if (!st?.enabled || !st.grounded) { stepPhase = 0; return; }
  const sp = finite(st.speed) ? Math.abs(st.speed) : 0;
  if (sp < 1.2) { stepPhase = 0; return; }
  const cadence = sp > 7 ? 4.6 : sp > 4 ? 3.6 : 2.6; // steps per second
  stepPhase += cadence * dt;
  if (stepPhase >= 1) { stepPhase -= 1; stepLeft = !stepLeft; sfx.play('step', stepLeft); }
}
let knockState = null;
function knockStep(dt) {
  const k = knockState; if (!k) return; const st = state(); if (!st?.enabled) { knockState = null; return; }
  k.t += dt;
  if (k.t > 1.6 || (k.t > 0.3 && st.grounded)) { knockState = null; return; }
  k.speed = Math.max(0, k.speed - (st.grounded ? 22 : 2.2) * dt);
  st.speed = k.speed; st.heading = k.ang; st.sprint = 0;
}
const hits = (() => {
  let nonce = 0, lastRemoteHit = 0;
  const remotesInFront = (p, heading, range, cone) => {
    const n = net(); const out = [];
    if (!n?.remotes) return out;
    for (const [id, r] of n.remotes) {
      const q = r.targetP || r.p; if (!q || id === n.id) continue;
      const dx = q[0] - p.x, dz = q[2] - p.z, d = Math.hypot(dx, dz);
      if (d > range || Math.abs(q[1] - p.y) > 1.8) continue;
      if (d > 0.35 && (dx * Math.sin(heading) + dz * Math.cos(heading)) / d < cone) continue;
      out.push({id, d, dx, dz, q});
    }
    return out.sort((a, b) => a.d - b.d);
  };
  const knock = (st, body, ang, power) => {
    // The runtime owns the body's velocity each frame and brakes hard, so the launch is re-applied
    // every frame (see knockStep) until the character lands again; the hop itself goes through the body.
    const speed = power === 3 ? 13 : 10.5, up = power === 3 ? 9 : 7.2;
    knockState = {speed, ang, t: 0};
    st.speed = speed; st.heading = ang; st.sprint = 0; st.grounded = false; st.hover = false; st.airT = 0; st.fallPeak = 0; st.jumpsLeft = 0;
    try { const lv = body.linvel?.() || {x: 0, y: 0, z: 0}; body.setLinvel({x: Math.sin(ang) * speed, y: Math.max(lv.y, up), z: Math.cos(ang) * speed}, true); } catch {}
    st.shake = Math.max(st.shake || 0, 0.35);
  };
  return {
    punch() {
      const st = state(); const body = player.body; const p = body?.translation?.();
      if (!st || !p) return;
      const targets = remotesInFront(p, st.heading, 2.2, 0.45);
      if (targets.length) {
        const v = targets[0];
        const ang = Math.round(((Math.atan2(v.dx, v.dz) * 180 / Math.PI) % 360 + 360) % 360);
        nonce = (nonce + 1) % 90;
        netHook.flag(`pk1h:${shortId(v.id)}:${nonce}:${ang}:2`);
        sfx.play('hit'); buzz(25); fxRing(v.q, '#ffd54a'); remotePops.pop(v.id);
        return;
      }
    },
    throwHeld() {
      const st = state(); const body = player.body; const id = heldId();
      if (!st || !body || !id || !carryApi?.toggleParkCarry) return false;
      if (!carryApi.toggleParkCarry()) return false; // release first so the carry packet is empty when the throw lands
      const ang = Math.round(((st.heading * 180 / Math.PI) % 360 + 360) % 360);
      nonce = (nonce + 1) % 90;
      netHook.flag(`pk1h:${shortId(id)}:${nonce}:${ang}:3`);
      sfx.play('throw'); buzz([10, 20, 30]); kick(0.12); remotePops.pop(id);
      return true;
    },
    selfTest(angDeg = 0, power = 2) { // test hook: apply a hit to ourselves without the network
      return hits.receive({t: 's', id: 'test', e: `pk1h:self:${Math.floor(Math.random() * 90)}:${angDeg}:${power}`}, true);
    },
    receive(m, force = false) {
      const n = net(); const parts = String(m.e).split(':');
      if (parts[0] !== 'pk1h') return;
      const [, target, nn, angS, powS] = parts;
      const mine = force || !!(n?.id && shortId(n.id) === target);
      if (!mine) { // someone else got hit: show a ring at them
        if (n?.remotes && netHook.dedupe('v:' + m.id + ':' + nn)) for (const [id, r] of n.remotes) if (shortId(id) === target) { const q = r.targetP || r.p; if (q) fxRing(q, '#ffd54a'); remotePops.pop(id); break; }
        return;
      }
      if (!netHook.dedupe(m.id + ':' + nn)) return;
      const body = player.body; const st = state(); if (!body || !st || !st.enabled) return;
      const now = performance.now(); if (now - lastRemoteHit < 350) return; lastRemoteHit = now;
      const ang = (+angS || 0) * Math.PI / 180, power = clamp(+powS || 2, 1, 3);
      knock(st, body, ang, power);
      kick(-0.2); hitTumble = 0.7; tumbleDir = ang;
      sfx.play('hit'); sfx.play('stars'); buzz([30, 40, 30]);
      dizzyStars.show(player.visual, 1.2);
      const t = body.translation?.(); if (t) fxRing([t.x, t.y, t.z], '#ff8fb8');
    },
  };
})();
// ---------- small ring burst effect ----------
const rings = [];
function fxRing(pos, color) {
  const s = scene(); if (!s || !pos) return;
  const x = Array.isArray(pos) ? pos[0] : pos.x, y = Array.isArray(pos) ? pos[1] : pos.y, z = Array.isArray(pos) ? pos[2] : pos.z;
  if (![x, y, z].every(finite)) return;
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 40), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide}));
  mesh.name = 'PARTY_ring'; mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, (groundAt(x, z) ?? y) + 0.06, z);
  s.add(mesh); rings.push({mesh, t: 0});
}
function stepRings(dt) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.t += dt; const k = r.t / 0.45;
    r.mesh.scale.setScalar(0.6 + k * 2.4); r.mesh.material.opacity = 0.85 * (1 - k);
    if (k >= 1) { r.mesh.removeFromParent(); r.mesh.geometry.dispose(); r.mesh.material.dispose(); rings.splice(i, 1); }
  }
}

// ---------- bounded city hatches and park trampolines ----------
const toys = createParkSocialToys({world,scene,state,net,settings,sfx,send:(tag,ms)=>netHook.flag(tag,ms),reducedMotion,carrying:heldId,
 blocked:()=>document.hidden||!!document.querySelector('.wardrobe,dialog[open],#party-settings:not([hidden])')||!!window.__candy?.state?.().mounted});
window.__parkToyInteract=()=>targetClub.interact()||housing.interact()||toys.interact()||pets.interact();
const items = createParkLaunchers({world,scene,state,settings,reducedMotion,remotes:()=>net()?.remotes,
 blocked:()=>document.hidden||!!document.querySelector('.wardrobe,dialog[open],#party-settings:not([hidden])'),
 onLaunch(){if(settings.juice&&!reducedMotion())kick(.28);sfx.play('pad');buzz([15,30,25]);}
});
const fountain=createFountainLauncher({world,scene,state,reducedMotion,remotes:()=>net()?.remotes,
 enabled:()=>!!settings.pads&&!document.hidden&&!world()?.homeScene?.active,
 blocked:()=>!!window.__candy?.state?.().mounted||!!document.querySelector('.wardrobe,dialog[open],#party-settings:not([hidden])'),
 carried:()=>!!carryApi?.isLocalCarryActive?.(),
 onLaunch(){sfx.play('water-splash',.7);buzz(15);}
});
window.__parkFountain=fountain;

// ---------- controls: throw button (touch) and keyboard ----------
function installControls() {
  const throwNow = () => { sfx.ensure(); return guard(hits.throwHeld)() === true; };
  window.addEventListener('keydown', ev => {
    if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey || ev.code !== 'KeyT') return;
    if (ev.target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]')) return;
    if (throwNow()) { ev.preventDefault(); ev.stopImmediatePropagation(); }
  }, {capture: true});
  if (isTouch) {
    const btn = document.createElement('button');
    btn.id = 'party-throw'; btn.type = 'button'; btn.className = 'party-eggy party-eggy-blue'; btn.setAttribute('aria-label', 'Throw');
    btn.innerHTML = ICONS.throw + '<span>Throw</span>';
    btn.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); throwNow(); });
    btn.hidden = true; document.body.append(btn);
    setInterval(() => { try { btn.hidden = !(heldId() && player.map === 'city'); } catch {} }, 200);
  }
  installEggyButtons();
}
// Action art is shared with the parkur controls; behavior remains local.
const ICON_BY_LABEL = {EMOTE: 'emote', BAG: 'bag', SKATE: 'skate', WALK: 'walk', INTERACT: 'interact', EXIT: 'exit', SPRINT: 'sprint', JUMP: 'jump'};
function installEggyButtons() {
  if (!document.getElementById('party-defs')) { const d = document.createElement('div'); d.id = 'party-defs'; d.innerHTML = DEFS; document.body.prepend(d); }
  let dressed = null;
  const dress = () => { // the game's own Punch button: restyle in place, its click handlers stay
    const b = document.getElementById('preview-hit'); if (!b || b === dressed) return; dressed = b;
    b.style.cssText = 'position:fixed;right:20px;bottom:calc(280px + env(safe-area-inset-bottom));z-index:50;touch-action:manipulation;';
    b.classList.add('party-eggy', 'party-eggy-pink'); b.innerHTML = ICONS.punch + '<span>Punch</span>' + (isTouch ? '' : '<i class="party-key">F</i>');
  };
  const decorate = () => { // the park's round buttons: hide their line icon (CSS) and add the illustrated one, following label changes
    for (const el of document.querySelectorAll('.park-action')) {
      const label = (el.querySelector('span')?.textContent || el.getAttribute('aria-label') || '').trim().toUpperCase();
      const key = Object.keys(ICON_BY_LABEL).find(k => label.startsWith(k)); if (!key) continue;
      const icon = ICON_BY_LABEL[key]; if (el.dataset.partyIcon === icon) continue;
      el.querySelector('.party-icon')?.remove(); el.insertAdjacentHTML('beforeend', ICONS[icon]); el.dataset.partyIcon = icon;
    }
  };
  const tick = () => { try { settingsUI?.setAvailable(!!player.body&&!document.querySelector('.wardrobe,.return-entry'));dress(); decorate(); } catch {} };
  tick(); setInterval(tick, 400);
}

// ---------- settings panel ----------
function installSettings(){return installPlayerSettings({sfx,isTouch})}

try { settingsUI=installSettings(); installControls(); log('ready', VERSION, 'base', BASE, 'touch', isTouch); }
catch (e) { disabled = true; log('install failed', e); }
window.__party = {version: VERSION, settings, sfx, hits, netHook, toys, horn, audio: () => sfx.state(),
  status: () => ({disabled, faults:features.snapshot(),runtime: !!stateApi, carry: !!carryApi, spring: spring.v, map: player.map, ...items.count()}),
  debug: () => { const t = player.body?.translation?.(); const st = state(); return {...items.debug(), player: t ? {x: t.x, y: t.y, z: t.z} : null, state: st ? {grounded: st.grounded, speed: st.speed, vy: st.verticalVelocity, punchT: st.punchT, shake: st.shake, enabled: st.enabled} : null, id: net()?.id || null, remotes: net()?.remotes?.size ?? null}; }};
