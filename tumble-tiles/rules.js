// Shared browser/server rules. Coordinates use the character's feet and tile TOP.
// No DOM, renderer, asset loader or park controller is imported by this module.
export const TUMBLE_RULES = Object.freeze({
  dt: 1 / 60, duration: 150, maxPlayers: 25, size: 7, tileSize: 3.2, cubeHeight: 2.8,
  radius: .44, height: 1.6, speed: 6.8, jump: 9.2, gravity: 24,
  acceleration: 40, braking: 48, airAcceleration: 18,
  punchTime: .46, punchCd: .65, punchImpact: .14, punchStrikeTime: .08,
  punchRange: 1.55, punchFacingDot: .45, punchHeightTolerance: .9,
  bombFuse: 3, bombCd: 6, bombRadius: 3.6, bombKnockback: 11, bombKnockUp: 4,
  knockback: 8, knockUp: 2.2, maxSpeed: 24,
  fallY: -.75, droppedY: -4.2, stepHeight: .06,
  warmup: 3, cycle: 8, warningTime: 1.6, lowerTime: .8,
  droppedTime: 2.2, returnTime: .8,
});
const R = TUMBLE_RULES, EPS = 1e-7;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
const ordered = (a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
function seedNumber(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.trunc(seed) >>> 0;
  let n = 2166136261;
  for (const c of String(seed ?? 1)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
function limited(x, z, maximum) {
  const length = Math.hypot(x, z);
  return length > maximum ? {x: x / length * maximum, z: z / length * maximum} : {x, z};
}
function input(value) {
  const v = value && typeof value === 'object' ? value : {};
  const direction = limited(clamp(finite(v.x), -1, 1), clamp(finite(v.z), -1, 1), 1);
  return {...direction, jump: v.jump === true, dash: v.dash === true, bomb: v.bomb === true};
}
const STAGES = Object.freeze([
  {stage: 1, at: 0, label: 'Warm-up', warningTime: 1.6, cycle: 8},
  {stage: 2, at: 30, label: 'Faster Tiles', warningTime: 1.3, cycle: 7},
  {stage: 3, at: 60, label: 'Shrinking Arena', warningTime: 1, cycle: 6},
  {stage: 4, at: 90, label: 'Final Showdown', warningTime: .8, cycle: 5.2},
]);

/** Stage changes affect the next wave, never teleport an in-flight tile. */
export function progressionState(time = 0) {
  const age = Math.max(0, finite(time));
  const stage = STAGES.findLast(s => age >= s.at);
  const safeRadius = age < 60 ? 3 : age < 90 ? 2 : age < 120 ? 1 : age < 125 ? 0 : -1;
  return {stage: stage.stage, label: stage.label, warningTime: stage.warningTime,
    cycle: stage.cycle, safeRadius, showdown: age >= 90};
}

// A finite schedule suffices: all 49 tiles retire by 126.6 seconds. Wave times
// before that remain deterministic at stage boundaries, including 27..35s.
const WAVES = [];
for (let at = R.warmup, round = 0; at < 126; round++) {
  const stage = progressionState(at);
  WAVES.push({at, round, ...stage});
  at = Math.round((at + stage.cycle) * 1e6) / 1e6;
}
function waveAt(age) {
  return age < R.warmup ? null : WAVES.findLast(w => w.at <= age);
}
function threatened(row, column, round, seed, stage) {
  const ring = Math.max(Math.abs(row - 3), Math.abs(column - 3));
  // Early escape routes are familiar. The final 3x3 has a rotating refuge,
  // not a permanently safe cross that can be camped for a shared time-out win.
  if (stage === 4) return ring <= 1 && (row - 2) * 3 + column - 2 !== (round + seed) % 9;
  if (row === 3 || column === 3) return false;
  if (stage === 3) return (row * 7 + column + round + seed) % 4 !== 0;
  if (stage === 2 && (row * 7 + column + round + seed) % 5 === 0) return true;
  switch ((round + seed) % 4) {
    case 0: return (row + column + seed) % 2 === 0;
    case 1: return (row + round + seed) % 3 === 0;
    case 2: return (row < 3) === (column < 3);
    default: return (row * 3 + column + seed) % 4 < 2;
  }
}

function waveTile(age, row, column, seed, wave = waveAt(age)) {
  let y = 0, warning = false, solid = true;
  if (!wave || !threatened(row, column, wave.round, seed, wave.stage)) return {y, warning, solid};
  const phase = age - wave.at, lowerEnd = wave.warningTime + R.lowerTime;
  const returnStart = lowerEnd + R.droppedTime, returnEnd = returnStart + R.returnTime;
  if (phase < wave.warningTime) warning = true;
  else if (phase < lowerEnd) y = R.droppedY * (phase - wave.warningTime) / R.lowerTime;
  else if (phase < returnStart) {y = R.droppedY; solid = false;}
  else if (phase < returnEnd) y = R.droppedY * (1 - (phase - returnStart) / R.returnTime);
  return {y, warning, solid};
}

function retirement(row, column) {
  const ring = Math.max(Math.abs(row - 3), Math.abs(column - 3));
  return ring === 3 ? {at: 60, warningTime: 1.2} : ring === 2 ? {at: 90, warningTime: 1}
    : ring === 1 ? {at: 120, warningTime: .8} : {at: 125, warningTime: .8};
}

/** Stable 49-tile layout; seed and elapsed seconds fully determine the pattern. */
export function tileStates(time = 0, seed = 1) {
  const age = Math.max(0, finite(time)), n = seedNumber(seed);
  const wave = waveAt(age);
  const result = [];
  for (let row = 0; row < R.size; row++) for (let column = 0; column < R.size; column++) {
    const retire = retirement(row, column), permanent = age >= retire.at;
    let {y, warning, solid} = waveTile(age, row, column, n, wave);
    if (permanent) {
      // Freeze the current height for the entire warning, then descend. A tile
      // already low or absent must not pop back up when its ring is retired.
      const initial = waveTile(retire.at, row, column, n);
      const phase = age - retire.at, lower = clamp((phase - retire.warningTime) / R.lowerTime, 0, 1);
      y = initial.y + (R.droppedY - initial.y) * lower;
      warning = phase < retire.warningTime;
      solid = initial.solid && lower < 1;
    }
    result.push({id: row * R.size + column, x: (column - 3) * R.tileSize,
      z: (row - 3) * R.tileSize, y, warning, solid, permanent});
  }
  return result;
}

// Farthest-first ordering spreads partial crowds over the inner 5x5 instead of
// filling one row. All 25 positions are actual tile centres, 3.2m apart.
const CROWD_SPAWNS = [{x: 0, y: 0, z: 0, id: 24}], spawnCandidates = [];
for (let row = 1; row <= 5; row++) for (let column = 1; column <= 5; column++) {
  if (row !== 3 || column !== 3) spawnCandidates.push({x: (column - 3) * R.tileSize, y: 0, z: (row - 3) * R.tileSize, id: row * R.size + column});
}
while (spawnCandidates.length) {
  const distance = p => Math.min(...CROWD_SPAWNS.map(q => (p.x - q.x) ** 2 + (p.z - q.z) ** 2));
  spawnCandidates.sort((a, b) => distance(b) - distance(a) || a.id - b.id);
  CROWD_SPAWNS.push(spawnCandidates.shift());
}

function touches(tile, x, z, radius = R.radius) {
  const half = R.tileSize / 2;
  return Math.hypot(x - clamp(x, tile.x - half, tile.x + half),
    z - clamp(z, tile.z - half, tile.z + half)) < radius + EPS;
}
function topAt(tiles, x, z, ceiling = Infinity) {
  let found = null;
  for (const tile of tiles) if (tile.solid && tile.y <= ceiling + EPS && touches(tile, x, z)) {
    if (!found || tile.y > found.y + EPS || Math.abs(tile.y - found.y) < EPS && tile.id < found.id) found = tile;
  }
  return found;
}

function clearStrike(tiles, from, to) {
  // Strike between chest centres, not through the solid sides of raised blocks.
  // Slab intersection also handles a nearly parallel ray and corner crossings.
  const start = {x: from.x, y: from.y + R.height * .55, z: from.z};
  const delta = {x: to.x - from.x, y: to.y - from.y, z: to.z - from.z};
  const half = R.tileSize / 2;
  for (const tile of tiles) {
    if (!tile.solid) continue;
    const bounds = {x: [tile.x - half, tile.x + half],
      y: [tile.y - R.cubeHeight, tile.y], z: [tile.z - half, tile.z + half]};
    let enter = 0, exit = 1;
    for (const axis of ['x', 'y', 'z']) {
      const [minimum, maximum] = bounds[axis], speed = delta[axis];
      if (Math.abs(speed) < EPS) {
        if (start[axis] <= minimum + EPS || start[axis] >= maximum - EPS) {enter = 2; break;}
      } else {
        const a = (minimum - start[axis]) / speed, b = (maximum - start[axis]) / speed;
        enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
        if (enter >= exit - EPS) break;
      }
    }
    if (enter < exit - EPS && exit > EPS && enter < 1 - EPS) return false;
  }
  return true;
}

export class TumbleSimulation {
  constructor(roster = [], {duration = R.duration, seed = 1} = {}) {
    this.kind = 'tumble'; this.mode = 'tumble'; this.seed = seedNumber(seed);
    this.duration = clamp(finite(duration, R.duration), R.dt, 3600);
    this.tick = 0; this.age = 0; this.left = this.duration; this.over = false;
    this.events = []; this.eventId = 0; this.winnerId = null; this.winners = [];
    this.bombs = []; this.bombId = 0;
    this.resultReason = null; this.tied = false; this.tiles = tileStates(0, this.seed);
    const ids = new Set();
    const entrants = roster.filter(p => {
      if (!p || !['string', 'number'].includes(typeof p.id) || ids.has(p.id)) return false;
      if (typeof p.id === 'number' && !Number.isFinite(p.id)) return false;
      ids.add(p.id); return true;
    }).sort(ordered);
    if (entrants.length > R.maxPlayers) throw new RangeError(`Tumble Tiles supports at most ${R.maxPlayers} players.`);
    this.players = entrants.map((p, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, entrants.length);
      const point = CROWD_SPAWNS[index];
      const spawn = entrants.length <= 4 ? {x: Math.sin(angle) * 6.4, y: 0, z: Math.cos(angle) * 6.4}
        : {x: point.x, y: 0, z: point.z};
      return {id: p.id, index, state: {pos: {...spawn}, vel: {x: 0, y: 0, z: 0},
        yaw: Math.atan2(-spawn.x, -spawn.z), grounded: true}, alive: true, placement: 0,
        punchCd: 0, punchT: 0, punchDir: {x: 0, z: -1}, punchSerial: 0,
        bombCd: 0, bombSerial: 0, bombHeld: false,
        jumpSerial: 0, jumpHeld: false, dashHeld: false, hits: 0,
        support: topAt(this.tiles, spawn.x, spawn.z)?.id ?? null,
        hitIds: new Set(), spawn, lastFinite: {...spawn}, eliminatedTick: null};
    });
    this.initialCount = this.players.length;
  }
  event(type, data = {}) {
    const crowd = this.initialCount > 4;
    this.events.push({n: ++this.eventId, type, ...data, ...(crowd ? {tick: this.tick} : {})});
    // Preserve each bomb owner's hit attribution. A crowd can emit hundreds
    // of distinct hits in one tick; do not evict explosions before a snapshot.
    // Keep an entire legitimate same-tick burst; 2048 also bounds deliberately
    // malformed internal event injection beyond the 25-player gameplay maximum.
    if (crowd) {
      while (this.events.length > 1024 && this.events[0].tick < this.tick) this.events.shift();
      if (this.events.length > 2048) this.events.shift();
    } else if (this.events.length > 64) this.events.shift();
  }
  alive() {return this.players.filter(p => p.alive);}
  eliminate(p, reason = 'fall') {
    if (this.over || !p?.alive || !this.players.includes(p)) return;
    p.alive = false; p.eliminatedTick = this.tick; p.punchT = 0; p.support = null;
    p.state.grounded = false; p.state.vel = {x: 0, y: 0, z: 0};
    // Same-tick eliminations share a rank even when the hub calls us sequentially.
    const rank = this.alive().length + 1;
    for (const q of this.players) if (q.eliminatedTick === this.tick) q.placement = rank;
    this.event('out', {id: p.id, reason, x: p.state.pos.x, y: p.state.pos.y, z: p.state.pos.z});
  }
  finish(reason) {
    if (this.over) return;
    this.over = true;
    this.bombs.length = 0;
    const survivors = this.alive();
    for (const p of survivors) p.placement = 1;
    this.resultReason = reason ?? (survivors.length === 0 ? 'draw' : this.left <= EPS ? 'timeout' : 'last-standing');
    this.winners = survivors.map(p => p.id);
    this.winnerId = survivors.length === 1 ? survivors[0].id : null;
    this.tied = survivors.length !== 1;
    this.event('result', {winnerId: this.winnerId, winners: [...this.winners], tied: this.tied, reason: this.resultReason});
  }
  sanitize(p) {
    const s = p.state;
    for (const axis of ['x', 'y', 'z']) {
      if (!Number.isFinite(s.pos[axis]) || Math.abs(s.pos[axis]) > 10000) s.pos[axis] = p.lastFinite[axis];
      s.vel[axis] = clamp(finite(s.vel[axis]), -R.maxSpeed, R.maxSpeed);
    }
    s.yaw = finite(s.yaw); p.punchCd = Math.max(0, finite(p.punchCd)); p.punchT = Math.max(0, finite(p.punchT));
    p.bombCd = Math.max(0, finite(p.bombCd));
  }
  plantBomb(p) {
    if (this.over || !p?.alive || !this.players.includes(p) || !p.state.grounded
      || p.bombCd > EPS || this.bombs.some(b => b.ownerId === p.id)) return false;
    const pos = p.state.pos, half = R.tileSize / 2;
    // Unlike the character capsule, a planted object needs actual ground under
    // its centre. A foot overlapping a ledge must not create a floating bomb.
    const tile = this.tiles.find(t => t.solid && t.y >= R.fallY
      && Math.abs(t.x - pos.x) < half - EPS && Math.abs(t.z - pos.z) < half - EPS
      && Math.abs(t.y - pos.y) <= R.stepHeight + EPS);
    if (!tile || ![pos.x, pos.y, pos.z].every(Number.isFinite)) return false;
    const bomb = {id: `bomb-${++this.bombId}`, ownerId: p.id, x: pos.x, y: tile.y, z: pos.z,
      tileId: tile.id, placedTick: this.tick, explodeTick: this.tick + Math.round(R.bombFuse / R.dt)};
    this.bombs.push(bomb); p.bombCd = R.bombCd; p.bombSerial++;
    this.event('bomb-place', {id: p.id, bombId: bomb.id, x: bomb.x, y: bomb.y, z: bomb.z});
    return true;
  }
  updateBombs() {
    const due = [], retained = [];
    for (const bomb of this.bombs) {
      const tile = this.tiles[bomb.tileId];
      if (tile) bomb.y = tile.y;
      if (!tile?.solid || bomb.y < R.fallY) {
        this.event('bomb-fall', {bombId: bomb.id, ownerId: bomb.ownerId, x: bomb.x, y: bomb.y, z: bomb.z});
      } else if (this.tick >= bomb.explodeTick) due.push(bomb);
      else retained.push(bomb);
    }
    this.bombs = retained;
    const live = this.alive(), changes = new Map(live.map(p => [p.id, {x: 0, z: 0, y: 0}]));
    // Every explosion reads the same pre-blast positions and velocities. Other
    // bombs keep their own fuse; no traversal order can cause an early chain.
    for (const bomb of due) {
      this.event('bomb-explode', {bombId: bomb.id, ownerId: bomb.ownerId,
        x: bomb.x, y: bomb.y, z: bomb.z, radius: R.bombRadius});
      for (const p of live) {
        const s = p.state, dx = s.pos.x - bomb.x, dz = s.pos.z - bomb.z;
        const distance = Math.hypot(dx, s.pos.y - bomb.y, dz), horizontal = Math.hypot(dx, dz);
        if (distance > R.bombRadius + EPS || !clearStrike(this.tiles, bomb, s.pos)) continue;
        const strength = 1 - .65 * clamp(distance / R.bombRadius, 0, 1), change = changes.get(p.id);
        // At the exact centre a vertical pop is symmetric; no arbitrary north
        // direction or roster id gets a privileged horizontal escape vector.
        if (horizontal > EPS) {change.x += dx / horizontal * R.bombKnockback * strength; change.z += dz / horizontal * R.bombKnockback * strength;}
        change.y = Math.max(change.y, R.bombKnockUp * strength);
        this.event('bomb-hit', {id: p.id, by: bomb.ownerId, bombId: bomb.id,
          x: s.pos.x, y: s.pos.y, z: s.pos.z});
      }
    }
    for (const p of live) {
      const change = changes.get(p.id), s = p.state;
      if (!change.y) continue;
      const velocity = limited(s.vel.x + change.x, s.vel.z + change.z, R.maxSpeed);
      s.vel.x = velocity.x; s.vel.z = velocity.z;
      s.vel.y = Math.min(R.maxSpeed, Math.max(0, s.vel.y) + change.y);
      s.grounded = false; p.support = null; p.punchT = 0;
    }
  }
  sides(p, tiles, before) {
    const s = p.state, half = R.tileSize / 2;
    // Short swept substeps plus circle/AABB projection retain the tangential velocity.
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const tile of tiles) {
        if (!tile.solid || s.pos.y >= tile.y - R.stepHeight || s.pos.y + R.height <= tile.y - R.cubeHeight + EPS) continue;
        const minX = tile.x - half, maxX = tile.x + half, minZ = tile.z - half, maxZ = tile.z + half;
        let dx = s.pos.x - clamp(s.pos.x, minX, maxX), dz = s.pos.z - clamp(s.pos.z, minZ, maxZ);
        const length = Math.hypot(dx, dz);
        if (length >= R.radius - EPS) continue;
        let depth;
        if (length > EPS) {dx /= length; dz /= length; depth = R.radius - length;}
        else {
          const faces = [
            {d: s.pos.x - minX + R.radius, x: -1, z: 0, prior: before.x <= minX},
            {d: maxX - s.pos.x + R.radius, x: 1, z: 0, prior: before.x >= maxX},
            {d: s.pos.z - minZ + R.radius, x: 0, z: -1, prior: before.z <= minZ},
            {d: maxZ - s.pos.z + R.radius, x: 0, z: 1, prior: before.z >= maxZ},
          ];
          faces.sort((a, b) => Number(b.prior) - Number(a.prior) || a.d - b.d);
          ({x: dx, z: dz, d: depth} = faces[0]);
        }
        s.pos.x += dx * (depth + EPS); s.pos.z += dz * (depth + EPS);
        const inward = s.vel.x * dx + s.vel.z * dz;
        if (inward < 0) {s.vel.x -= inward * dx; s.vel.z -= inward * dz;}
        changed = true;
      }
      if (!changed) break;
    }
  }
  move(p, control, dt, oldTiles, tiles) {
    const s = p.state, before = {...s.pos};
    if (s.grounded) {
      const previous = oldTiles[p.support], platform = tiles[p.support];
      if (previous?.solid && platform?.solid && touches(platform, s.pos.x, s.pos.z)) {
        s.pos.y += platform.y - previous.y; s.vel.y = 0;
      } else {s.grounded = false; p.support = null;}
    }
    const originY = s.pos.y;
    const moving = Math.hypot(control.x, control.z) > .001;
    const targetX = control.x * R.speed, targetZ = control.z * R.speed;
    const acceleration = s.grounded ? moving ? R.acceleration : R.braking : R.airAcceleration;
    const change = limited(targetX - s.vel.x, targetZ - s.vel.z, acceleration * dt);
    s.vel.x += change.x; s.vel.z += change.z;
    if (moving && p.punchT <= EPS) s.yaw = Math.atan2(control.x, control.z);
    s.pos.x += s.vel.x * dt; s.pos.z += s.vel.z * dt;
    this.sides(p, tiles, before);
    s.vel.y = Math.max(-R.maxSpeed, s.vel.y - R.gravity * dt);
    let nextY = s.pos.y + s.vel.y * dt, floor = null;
    for (const tile of tiles) {
      if (!tile.solid || !touches(tile, s.pos.x, s.pos.z)) continue;
      const oldTop = oldTiles[tile.id].y;
      const crossedTop = originY >= Math.min(oldTop, tile.y) - R.stepHeight && nextY <= tile.y + EPS;
      if (crossedTop && (!floor || tile.y > floor.y)) floor = tile;
      const bottom = tile.y - R.cubeHeight, oldBottom = oldTop - R.cubeHeight;
      if (s.vel.y > 0 && originY + R.height <= oldBottom + EPS && nextY + R.height >= bottom) {
        nextY = bottom - R.height - EPS; s.vel.y = 0;
      }
    }
    if (floor && s.vel.y <= EPS) {
      const landed = !s.grounded;
      s.pos.y = floor.y; s.vel.y = 0; s.grounded = true; p.support = floor.id;
      if (landed) this.event('land', {id: p.id});
    } else {s.pos.y = nextY; s.grounded = false; p.support = null; p.punchT = 0;}
    this.sides(p, tiles, before);
  }
  contacts(tiles) {
    const live = this.alive(), changes = new Map(live.map(p => [p.id, {x: 0, z: 0, vx: 0, vz: 0, vy: 0}]));
    const hit = (attacker, victim, nx, nz, distance) => {
      const elapsed = R.punchTime - attacker.punchT;
      if (!attacker.state.grounded || attacker.punchT <= EPS || elapsed < R.punchImpact - EPS
        || elapsed > R.punchImpact + R.punchStrikeTime + EPS || attacker.hitIds.has(victim.id)
        || distance > R.punchRange + EPS
        || Math.abs(attacker.state.pos.y - victim.state.pos.y) > R.punchHeightTolerance) return;
      if (distance < EPS) {nx = attacker.punchDir.x; nz = attacker.punchDir.z;}
      if (nx * attacker.punchDir.x + nz * attacker.punchDir.z < R.punchFacingDot
        || !clearStrike(tiles, attacker.state.pos, victim.state.pos)) return;
      attacker.hitIds.add(victim.id); attacker.hits++;
      const delta = changes.get(victim.id);
      delta.vx += nx * R.knockback; delta.vz += nz * R.knockback; delta.vy = Math.max(delta.vy, R.knockUp);
      this.event('hit', {id: victim.id, by: attacker.id, x: victim.state.pos.x, y: victim.state.pos.y, z: victim.state.pos.z});
    };
    // All pairs read the same positions; impulses are applied only after the loop.
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], ap = a.state.pos, bp = b.state.pos;
      if (Math.abs(ap.y - bp.y) >= R.height) continue;
      const dx = bp.x - ap.x, dz = bp.z - ap.z, d = Math.hypot(dx, dz);
      if (d > R.punchRange + EPS) continue;
      const nx = d > EPS ? dx / d : 1, nz = d > EPS ? dz / d : 0;
      const overlap = Math.max(0, R.radius * 2 - d) / 2;
      const ac = changes.get(a.id), bc = changes.get(b.id);
      ac.x -= nx * overlap; ac.z -= nz * overlap; bc.x += nx * overlap; bc.z += nz * overlap;
      hit(a, b, nx, nz, d); hit(b, a, -nx, -nz, d);
    }
    for (const p of live) {
      const change = changes.get(p.id), s = p.state, before = {...s.pos};
      s.pos.x += change.x; s.pos.z += change.z;
      const v = limited(s.vel.x + change.vx, s.vel.z + change.vz, R.maxSpeed);
      s.vel.x = v.x; s.vel.z = v.z;
      if (change.vy) {s.vel.y = Math.min(R.maxSpeed, Math.max(0, s.vel.y) + change.vy); s.grounded = false; p.support = null; p.punchT = 0;}
      this.sides(p, tiles, before);
    }
  }
  step(controls = new Map()) {
    if (this.over) return;
    const dt = R.dt, startAge = this.age;
    this.tick++; this.age = this.tick * dt; this.left = Math.max(0, this.duration - this.age);
    if (this.initialCount > 4) this.events = this.events.filter(e => e.tick >= this.tick - 60);
    const frameInputs = new Map();
    let maximum = R.speed;
    for (const p of this.alive()) {
      this.sanitize(p);
      // Crossing below the playing surface is final. Stale grounded flags,
      // later input or a returning tile must never rescue an already-fallen actor.
      if (p.state.pos.y < R.fallY) {this.eliminate(p, 'fall'); continue;}
      const c = input(typeof controls?.get === 'function' ? controls.get(p.id) : null);
      frameInputs.set(p.id, c); p.punchCd = Math.max(0, p.punchCd - dt); p.bombCd = Math.max(0, p.bombCd - dt);
      if (c.jump && !p.jumpHeld && p.state.grounded) {
        p.state.vel.y = R.jump; p.state.grounded = false; p.support = null; p.punchT = 0; p.jumpSerial++;
        this.event('jump', {id: p.id});
      }
      // "dash" is the existing network action bit; Tumble interprets it only as
      // a punch. It never grants forward acceleration, a dive or a second jump.
      if (c.dash && !p.dashHeld && p.state.grounded && p.punchCd <= EPS && p.punchT <= EPS) {
        const length = Math.hypot(c.x, c.z);
        p.punchDir = length > .001 ? {x: c.x / length, z: c.z / length} : {x: Math.sin(p.state.yaw), z: Math.cos(p.state.yaw)};
        p.punchT = R.punchTime; p.punchCd = R.punchCd; p.punchSerial++; p.hitIds.clear();
        p.state.yaw = Math.atan2(p.punchDir.x, p.punchDir.z);
        this.event('punch', {id: p.id, serial: p.punchSerial});
      }
      if (c.bomb && !p.bombHeld) this.plantBomb(p);
      p.jumpHeld = c.jump; p.dashHeld = c.dash; p.bombHeld = c.bomb;
      maximum = Math.max(maximum, Math.hypot(p.state.vel.x, p.state.vel.y, p.state.vel.z));
    }
    const subdivisions = Math.max(2, Math.ceil(maximum * dt / (R.radius * .4))), subDt = dt / subdivisions;
    let previous = tileStates(startAge, this.seed);
    for (let i = 1; i <= subdivisions; i++) {
      const current = tileStates(startAge + i * subDt, this.seed);
      for (const p of this.alive()) this.move(p, frameInputs.get(p.id), subDt, previous, current);
      // Resolve every crossing before contacts or blasts can push a fallen
      // player back up. Finish only after the full tick, preserving equal ranks
      // for opponents who fall in different substeps of the same tick.
      for (const p of this.alive()) if (p.state.pos.y < R.fallY) this.eliminate(p, 'fall');
      this.contacts(current);
      previous = current;
    }
    this.tiles = tileStates(this.age, this.seed);
    this.updateBombs();
    for (const p of this.alive()) {
      p.punchT = Math.max(0, p.punchT - dt); if (p.punchT < EPS) p.punchT = 0;
      this.sanitize(p); p.lastFinite = {...p.state.pos};
    }
    if (this.alive().length === 0) this.finish('draw');
    else if (this.initialCount > 1 && this.alive().length === 1) this.finish('last-standing');
    else if (this.left <= EPS) this.finish('timeout');
  }
  snapshot() {
    return {kind: 'tumble', mode: 'tumble', tick: this.tick, age: this.age, left: this.left,
      progression: progressionState(this.age),
      seed: this.seed, over: this.over, winnerId: this.winnerId, winners: [...this.winners],
      resultReason: this.resultReason, tied: this.tied,
      bombs: this.bombs.map(b => ({id: b.id, ownerId: b.ownerId, x: b.x, y: b.y, z: b.z,
        remaining: Math.max(0, (b.explodeTick - this.tick) * R.dt), fuse: R.bombFuse, radius: R.bombRadius})),
      tiles: this.tiles.map(t => ({...t})),
      events: this.events.filter(e => this.initialCount <= 4 || e.tick >= this.tick - 60)
        .map(e => ({...e, ...(e.winners ? {winners: [...e.winners]} : {})})),
      players: this.players.map(p => ({id: p.id, p: [p.state.pos.x, p.state.pos.y, p.state.pos.z],
        v: [p.state.vel.x, p.state.vel.y, p.state.vel.z], yaw: p.state.yaw, grounded: p.state.grounded,
        alive: p.alive, placement: p.placement, punchCd: p.punchCd, punchT: p.punchT,
        punchSerial: p.punchSerial, bombCd: p.bombCd, bombSerial: p.bombSerial,
        jumpSerial: p.jumpSerial, hits: p.hits}))};
  }
}

/** Local practice bot; only returns the same bounded inputs accepted from humans. */
export function botInput(sim, p) {
  const empty = {x: 0, z: 0, jump: false, dash: false};
  if (!p?.alive || sim.over) return empty;
  const position = p.state.pos, velocity = p.state.vel;
  const tiles = tileStates(sim.age, sim.seed), future = tileStates(sim.age + 1.05, sim.seed);
  const nearestTo = point => tiles.reduce((a, t) => !a || Math.hypot(t.x - point.x, t.z - point.z) < Math.hypot(a.x - point.x, a.z - point.z) ? t : a, null);
  const nearest = nearestTo(position);
  const safe = t => t.solid && !t.warning && t.y >= -.05 && future[t.id].solid && !future[t.id].warning && future[t.id].y >= -.05;
  const margin = R.radius + .28, edge = R.size * R.tileSize / 2 - margin;
  const supported = (x, z) => {
    if (Math.abs(x) > edge || Math.abs(z) > edge) return false;
    return [[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([ox, oz]) => {
      const column = Math.floor((x + ox) / R.tileSize + 3.5), row = Math.floor((z + oz) / R.tileSize + 3.5);
      const tile = tiles[row * R.size + column];
      return row >= 0 && row < R.size && column >= 0 && column < R.size && tile && safe(tile);
    });
  };
  const corridor = (target, length = Math.hypot(target.x - position.x, target.z - position.z)) => {
    const dx = target.x - position.x, dz = target.z - position.z, d = Math.hypot(dx, dz);
    if (d < EPS) return supported(position.x, position.z);
    const count = Math.max(2, Math.ceil(length / .4));
    for (let i = 1; i <= count; i++) if (!supported(position.x + dx / d * length * i / count, position.z + dz / d * length * i / count)) return false;
    return true;
  };
  const terrainDanger = !safe(nearest) || !supported(position.x + velocity.x * .16, position.z + velocity.z * .16);
  const hazards = sim.bombs ?? [];
  const outsideBlasts = point => hazards.every(b => Math.hypot(b.x - point.x, b.z - point.z) > R.bombRadius + .9);
  const bombDanger = !outsideBlasts(position), danger = terrainDanger || bombDanger;
  // Never chase an actor that has already flown past the edge or is falling.
  const boardEdge = R.size * R.tileSize / 2;
  const opponents = sim.alive().filter(q => q !== p && Math.abs(q.state.pos.x) <= boardEdge && Math.abs(q.state.pos.z) <= boardEdge && q.state.pos.y >= R.fallY)
    .sort((a, b) => Math.hypot(a.state.pos.x - position.x, a.state.pos.z - position.z) - Math.hypot(b.state.pos.x - position.x, b.state.pos.z - position.z) || ordered(a, b));
  const opponent = opponents[0];
  const byDistance = point => (a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z) || a.id - b.id;
  const safeTiles = tiles.filter(safe);
  const refuges = [...safeTiles].sort(byDistance(position));
  const refuge = bombDanger ? refuges.find(t => outsideBlasts(t) && corridor(t))
    ?? refuges.find(outsideBlasts) ?? refuges[0] : refuges[0];
  if (!refuge) return empty;
  let pursuit = opponent?.state.pos;
  // A camper near the rim is still an opponent: approach the safe inner rim
  // without chasing that opponent's unsafe standing position into the void.
  if (pursuit && (Math.abs(pursuit.x) > edge - .1 || Math.abs(pursuit.z) > edge - .1)) {
    pursuit = {x: clamp(pursuit.x, -edge + .1, edge - .1), y: pursuit.y, z: clamp(pursuit.z, -edge + .1, edge - .1)};
  }
  let target = danger ? refuge : pursuit ?? refuge;
  // Route around holes with a real four-neighbour path. A point already on the
  // stable cross must advance through the centre, not keep targeting itself.
  if (!terrainDanger && !corridor(target)) {
    const goal = [...safeTiles].sort(byDistance(target))[0];
    const queue = [nearest.id], parents = new Map([[nearest.id, null]]);
    for (let i = 0; i < queue.length && !parents.has(goal.id); i++) {
      const current = tiles[queue[i]], row = Math.floor(current.id / R.size), column = current.id % R.size;
      for (const [dr, dc] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) {
        const r = row + dr, c = column + dc, next = tiles[r * R.size + c];
        if (r >= 0 && r < R.size && c >= 0 && c < R.size && !parents.has(next.id) && safe(next)) {parents.set(next.id, current.id); queue.push(next.id);}
      }
    }
    if (parents.has(goal.id)) {
      let next = goal.id;
      while (parents.get(next) !== null && parents.get(next) !== nearest.id) next = parents.get(next);
      target = tiles[next];
      // Reach the current tile's centre first if cutting this turn would clip a hole.
      if (!corridor(target)) target = nearest;
    } else target = refuge;
  }
  const dx = finite(target.x) - finite(position.x), dz = finite(target.z) - finite(position.z), distance = Math.hypot(dx, dz);
  const attackDistance = opponent ? Math.hypot(opponent.state.pos.x - position.x, opponent.state.pos.z - position.z) : Infinity;
  const direct = opponent && (target === opponent.state.pos || target === pursuit) && attackDistance > EPS;
  if (!danger && p.state.grounded && p.bombCd <= EPS && !p.bombHeld
    && !hazards.some(b => b.ownerId === p.id) && sim.age >= 6
    && p.hits >= p.bombSerial * 6 + 4
    // Area denial is useful against a crowd. In a final one-on-one duel bots
    // keep fighting instead of repeatedly planting, fleeing and timing out.
    && opponents.filter(q => Math.hypot(q.state.pos.x - position.x, q.state.pos.z - position.z) <= R.bombRadius).length >= 2
    && attackDistance > R.punchRange && attackDistance <= R.bombRadius - .2
    && (sim.tick + p.index * 17) % 30 === 0) {
    const landingTiles = tileStates(sim.age + R.bombFuse + .3, sim.seed);
    const escape = refuges.find(t => Math.hypot(t.x - position.x, t.z - position.z) > R.bombRadius + 1
      && outsideBlasts(t) && landingTiles[t.id].solid && !landingTiles[t.id].warning
      && landingTiles[t.id].y >= -.05 && corridor(t));
    if (escape) {
      const direction = limited(escape.x - position.x, escape.z - position.z, 1);
      return {...direction, jump: false, dash: false, bomb: true};
    }
  }
  const attack = !danger && direct && p.state.grounded && attackDistance <= R.punchRange - .08
    && Math.abs(opponent.state.pos.y - position.y) <= R.punchHeightTolerance
    && p.punchCd <= EPS && !p.dashHeld && clearStrike(tiles, position, opponent.state.pos)
    && corridor(target, Math.min(distance, .5));
  // Melee keeps a short stand-off distance and never adds a jump or forward burst.
  // A tiny facing input starts the strike while normal acceleration brakes motion.
  if (attack) return {x: (opponent.state.pos.x - position.x) / attackDistance * .02,
    z: (opponent.state.pos.z - position.z) / attackDistance * .02, jump: false, dash: true};
  const approach = direct ? Math.max(0, (distance - 1.08) / Math.max(EPS, distance)) : 1;
  // Velocity-aware steering brakes at waypoints and resists post-hit drift.
  const steerX = dx * approach - velocity.x * .18, steerZ = dz * approach - velocity.z * .18;
  const direction = limited(steerX / .8, steerZ / .8, 1);
  const climb = danger && target.y > position.y + .2;
  return {...direction, jump: !p.jumpHeld && p.state.grounded && climb, dash: false};
}
