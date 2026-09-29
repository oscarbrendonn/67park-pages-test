import * as T from 'three';
import {skateState} from './skate-tricks.js';

/** Deck geometry of the four shop boards exactly as SkateBoard.tsx wraps them
 * (wheel base at y=0, nose +z, 1.15 m long). skate-tricks-test.mjs re-measures
 * the GLBs, so a new or re-exported board cannot silently drift from this table. */
export const SKATE_DECK = Object.freeze({
  top: Object.freeze({neon: .178, klasik: .164, retro: .151, logo: .146}),
  halfWidth: Object.freeze({neon: .177, klasik: .152, retro: .261, logo: .149}),
  contract: .16, // FOOT_BOARD -0.34 over the wrapper at -0.5: the deck top the rider was authored for
  rigY: -.5,     // Player.tsx places the board wrapper here inside the visual group
  pivot: .15,    // flips turn about mid-deck, not about the wheel base
  flipClear: .05, // mid-kickflip the board drops half its width plus this under the feet
  maxSlope: .5   // steepest deck pitch the feet may impose (tan)
});

const deckTop = kind => SKATE_DECK.top[kind] ?? SKATE_DECK.top.logo;
const deck = {rig: null, kind: 'logo'};

/** Player.tsx hands over the board wrapper each frame. The character component places
 * it right after measuring the soles, so feet and deck always come from one pose
 * whatever order React Three Fiber runs the two frame callbacks in. */
export function setSkateDeck(rig, kind = 'logo') {
  deck.rig = rig;
  deck.kind = kind;
}

/** How much the board follows the feet instead of the ground: the pop on takeoff,
 * then the tucked airtime. On touchdown it drops at once, so the landing sinks the
 * body into the knees while the wheels stay down. */
export const skateAirWeight = (s = skateState) => (s.air > 0 ? Math.max(s.pop, s.tuck) : s.pop);

/** Undamped rider correction: on the ground the lower sole stands exactly on the
 * equipped deck whatever the knees do; in the air the measured feet may rise. */
export function skateLiftOffset(s = skateState, kind = 'logo') {
  return s.stance * (deckTop(kind) - SKATE_DECK.contract - (1 - skateAirWeight(s)) * s.feetRise);
}

const written = new WeakMap();
/** Replaces `lift.y = damp(lift.y, target, 10, dt)`: the base height (board on/off,
 * emote bob) keeps its smoothing and the skate correction is added undamped, so the
 * feet never lag the deck. A height written by another branch (seat, emote) resets it. */
export function dampSkateLift(lift, targetY, dt, s = skateState, kind = 'logo') {
  if (!lift) return;
  let w = written.get(lift);
  if (!w) written.set(lift, (w = {y: NaN, comp: 0}));
  const prev = w.y === lift.position.y ? w.comp : 0;
  const comp = skateLiftOffset(s, kind);
  lift.position.y = T.MathUtils.damp(lift.position.y - prev, targetY, 10, dt) + comp;
  w.y = lift.position.y;
  w.comp = comp;
}

const soles = new WeakMap(), bind = new T.Vector3();
/** Per model: the 48 lowest bind-pose vertices skinned mainly to each foot (Toe or
 * Shin bone) over the visible skinned meshes. The real soles rise less than the toe
 * bone when the knee folds, so the bone alone leaves the deck a couple of cm off. */
function soleVertices(model) {
  let sel = soles.get(model);
  if (sel) return sel;
  const pick = {L: [], R: []};
  model.traverse(o => {
    if (!o.isSkinnedMesh || !o.geometry?.attributes?.skinIndex || !o.skeleton) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    for (let i = 0; i < pos.count; i++) {
      let best = -1, bw = 0;
      for (let k = 0; k < 4; k++) { const wt = sw.getComponent(i, k); if (wt > bw) { bw = wt; best = si.getComponent(i, k); } }
      const name = o.skeleton.bones[best]?.name;
      const side = name === 'ToeL' || name === 'ShinL' ? 'L' : name === 'ToeR' || name === 'ShinR' ? 'R' : '';
      if (side) pick[side].push([o, i, bind.fromBufferAttribute(pos, i).applyMatrix4(o.bindMatrix).y]);
    }
  });
  sel = {L: [], R: []};
  for (const side of ['L', 'R']) sel[side] = pick[side].sort((a, b) => a[2] - b[2]).slice(0, 48).map(([o, i]) => [o, i]);
  soles.set(model, sel);
  return sel;
}

const rootInv = new T.Matrix4(), toRoot = new T.Matrix4(), v = new T.Vector3(), fL = {y: 0, z: 0}, fR = {y: 0, z: 0};
function transformFoot(list, buf) {
  let mesh = null;
  for (let k = 0; k < list.length; k++) {
    const [m, i] = list[k];
    if (m !== mesh) { toRoot.multiplyMatrices(rootInv, m.matrixWorld); mesh = m; }
    v.fromBufferAttribute(m.geometry.attributes.position, i);
    m.applyBoneTransform(i, v).applyMatrix4(toRoot);
    buf[2 * k] = v.y;
    buf[2 * k + 1] = v.z;
  }
}
/** Support of one sole against a deck line of the given slope: the line's height at
 * the foot's centre, through the vertex that sits lowest relative to that line (the
 * toe or heel once the foot tips, not simply the lowest vertex). */
function support(buf, slope, out) {
  let best = Infinity, zSum = 0;
  const n = buf.length / 2;
  for (let k = 0; k < n; k++) {
    const y = buf[2 * k], z = buf[2 * k + 1], h = y - slope * z;
    if (h < best) best = h;
    zSum += z;
  }
  out.z = zSum / n;
  out.y = best + slope * out.z;
}

export function clearSkateFeet(s = skateState) {
  s.feetRise = s.feetRiseAvg = s.feetSlope = s.feetMidZ = 0;
  placeSkateDeck(deck.rig, s, deck.kind);
}

/** Measures both soles in the character root's frame (the root sits at identity in
 * the visual group that also holds the board, so feet and deck share one frame) and
 * publishes feetRise / feetRiseAvg (lower / mean sole above the lift origin),
 * feetSlope (sole height change per metre along the board) and feetMidZ (where the
 * feet stand along it). Call after skateStance. */
export function measureSkateFeet(model, root, lift, s = skateState) {
  const sel = model && root && lift && s.stance > 0 ? soleVertices(model) : null;
  if (!sel || !sel.L.length || !sel.R.length) { clearSkateFeet(s); return; }
  root.updateMatrixWorld(true);
  rootInv.copy(root.matrixWorld).invert();
  sel.bufL ??= new Float64Array(sel.L.length * 2);
  sel.bufR ??= new Float64Array(sel.R.length * 2);
  transformFoot(sel.L, sel.bufL);
  transformFoot(sel.R, sel.bufR);
  // Flat on the ground the support is the lowest sole point. In the air the deck is
  // pitched, so refine the contact against the deck line twice (from last frame's pitch).
  const w = skateAirWeight(s);
  let slope = Number.isFinite(s.feetSlope) ? s.feetSlope : 0;
  for (let pass = 0; pass < 2; pass++) {
    support(sel.bufL, w * slope, fL);
    support(sel.bufR, w * slope, fR);
    const dz = fR.z - fL.z;
    slope = Math.abs(dz) > .02 ? T.MathUtils.clamp((fR.y - fL.y) / dz, -SKATE_DECK.maxSlope, SKATE_DECK.maxSlope) : 0;
  }
  if (!Number.isFinite(fL.y + fR.y + fL.z + fR.z + slope)) { clearSkateFeet(s); return; }
  s.feetRise = Math.min(fL.y, fR.y) - lift.position.y;
  s.feetRiseAvg = (fL.y + fR.y) / 2 - lift.position.y;
  s.feetSlope = slope;
  s.feetMidZ = (fL.z + fR.z) / 2;
  placeSkateDeck(deck.rig, s, deck.kind);
}

const pivot = new T.Vector3();
/** Board pose for the trick state. On the ground it rolls flat on its wheels; from
 * the pop to touchdown the deck takes the height and pitch of the measured soles
 * (nose-up because the front knee rises), and a kickflip turns it about mid-deck
 * while it dips under the feet and rises back to meet them. */
export function placeSkateDeck(rig, s = skateState, kind = 'logo') {
  if (!rig) return;
  const w = skateAirWeight(s), spin = s.flip > 0 ? 1 - s.flip : 0;
  rig.rotation.set(-Math.atan(w * s.feetSlope), -s.lean * .3, Math.PI * 2 * spin + s.lean * .45);
  const z = w * s.feetMidZ;
  pivot.set(0, SKATE_DECK.pivot, z).applyEuler(rig.rotation);
  const dip = spin > 0 ? ((SKATE_DECK.halfWidth[kind] ?? SKATE_DECK.halfWidth.logo) + SKATE_DECK.flipClear) * Math.sin(Math.PI * spin) : 0;
  rig.position.set(-pivot.x, SKATE_DECK.rigY + SKATE_DECK.pivot + w * s.feetRiseAvg - dip - pivot.y, z - pivot.z);
}
