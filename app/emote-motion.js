import * as T from 'three';

/** Authored emote motion for every standard 20-bone character (Gorilla and the 67
 * collection share the bone names, not the proportions). Bodies are posed with
 * additive rotations from the rest pose (the vehicle-pose.js rule: no translations,
 * no scaling), and hands are placed with an analytic two-bone reach in the
 * character's own frame, so a heart really closes and hands stay clear of the big
 * head on every rig. Measured on the real rigs: +x = the character's left,
 * +z = forward; Spine/Head +x bends forward; Biscep -x raises the arm forward. */

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const inOut = v => { v = clamp01(v); return v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2; };
const backOut = v => { v = clamp01(v) - 1; return 1 + v * v * (2.7 * v + 1.7); };
const snap = (s, k) => Math.sign(s) * Math.abs(s) ** k;
const mix = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

/** Timed gestures end by themselves (emote.ts timer); loops run until the player moves. */
export const EMOTE_MOTION_DURATION = Object.freeze({sixseven: 4, heart: 3.8});
export const EMOTE_MOTION_LOOPS = Object.freeze(['club', 'wave', 'bounce', 'spin', 'robot', 'cheer']);
export const emoteMotionHandles = id => id in EMOTE_MOTION_DURATION || EMOTE_MOTION_LOOPS.includes(id);

/** Written by the pose driver, read by emote-fx.js: where each performer's heart and
 * hands are this frame, plus one-shot events (heart burst, "6", "7"). Keys are the
 * performer's bone maps, so local and remote players never overwrite each other. */
export const emoteFxBus = {clock: 0, anchors: new Map(), events: []};
function emit(type, p, dx = 0, dz = 0) {
  if (emoteFxBus.events.length >= 48) emoteFxBus.events.shift();
  emoteFxBus.events.push({type, x: p.x, y: p.y, z: p.z, dx, dz});
}

const BODY = ['Root', 'Spine1', 'Spine2', 'Spine3', 'Head', 'BiscepL', 'ArmL', 'HandL', 'BiscepR', 'ArmR', 'HandR', 'ThighL', 'ShinL', 'ToeL', 'ThighR', 'ShinR', 'ToeR'];
const first = (bones, name) => bones.get(name)?.[0]?.o;
const rigs = new WeakMap();

/** Rest landmarks in the character frame (the Root bone's parent), measured once per
 * bone map with the skeleton at its rest rotations. */
function rigOf(bones) {
  let rig = rigs.get(bones);
  if (rig !== undefined) return rig;
  const root = first(bones, 'Root');
  if (!root?.parent || ['BiscepL', 'ArmL', 'HandL', 'BiscepR', 'ArmR', 'HandR', 'ToeL', 'Head'].some(n => !first(bones, n))) {
    rigs.set(bones, null);
    return null;
  }
  const saved = [];
  for (const name of BODY) for (const b of bones.get(name) ?? []) { saved.push([b.o, b.o.quaternion.clone()]); b.o.rotation.set(b.rx, b.ry, b.rz); }
  const frame = root.parent;
  frame.updateWorldMatrix(true, true);
  const inv = new T.Matrix4().copy(frame.matrixWorld).invert();
  const at = n => new T.Vector3().setFromMatrixPosition(first(bones, n).matrixWorld).applyMatrix4(inv);
  const shL = at('BiscepL'), shR = at('BiscepR'), toe = at('ToeL');
  rig = {frame, shL, shR, head: at('Head'), unit: Math.max(1e-5, shL.y - toe.y), state: {id: '', t: -1, s: 0, burst: false}};
  for (const [o, q] of saved) o.quaternion.copy(q);
  frame.updateWorldMatrix(false, true);
  rigs.set(bones, rig);
  return rig;
}

const pose = new Map();
function add(name, x = 0, y = 0, z = 0) {
  const v = pose.get(name);
  if (v) { v[0] += x; v[1] += y; v[2] += z; } else pose.set(name, [x, y, z]);
}
/** Soft knees: thigh forward, shin hinge on local z (L +, R -). Returns the sole rise to cancel. */
function crouch(c) {
  add('ThighL', -c); add('ThighR', -c); add('ShinL', 0, 0, 1.9 * c); add('ShinR', 0, 0, -1.9 * c);
  return .09 * c * c;
}

// ---------------------------------------------------------------- reach solver
const X = new T.Vector3(1, 0, 0);
const S = new T.Vector3(), E = new T.Vector3(), H = new T.Vector3(), Tip = new T.Vector3(), P = new T.Vector3();
const U = new T.Vector3(), A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), rest = new T.Vector3(), poleW = new T.Vector3();
const qd = new T.Quaternion(), qw = new T.Quaternion(), qp = new T.Quaternion(), qt = new T.Quaternion(), eu = new T.Euler();
const TIP = .7; // the mitten reaches ~70% of the forearm past the wrist bone

function tipOf(el, ha, out) {
  E.setFromMatrixPosition(el.matrixWorld);
  H.setFromMatrixPosition(ha.matrixWorld);
  return out.copy(H).sub(E).multiplyScalar(TIP).add(H);
}
function rotateWorld(o, q) {
  o.getWorldQuaternion(qw);
  o.parent.getWorldQuaternion(qp).invert();
  qt.copy(q).multiply(qw);
  o.quaternion.copy(qp.multiply(qt));
  o.updateMatrixWorld(true);
}
/** Elbow on its own hinge to the needed length, shoulder swung onto the target, then
 * the elbow turned toward the pole (down, out, back) so arms never fold into the body. */
function reachArm(sh, el, ha, target, pole) {
  S.setFromMatrixPosition(sh.matrixWorld);
  tipOf(el, ha, Tip);
  const a = S.distanceTo(E), b = E.distanceTo(Tip);
  const d = Math.min(a + b - 1e-6, Math.max(Math.abs(a - b) + 1e-6, S.distanceTo(target)));
  const want = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - d * d) / (2 * a * b))));
  for (let k = 0; k < 2; k++) {
    const now = A.subVectors(S, E).angleTo(B.subVectors(Tip, E));
    const delta = now - want;
    if (Math.abs(delta) < 1e-4) break;
    el.quaternion.multiply(qd.setFromAxisAngle(X, delta)); el.updateMatrixWorld(true); tipOf(el, ha, Tip);
    const after = A.subVectors(S, E).angleTo(B.subVectors(Tip, E));
    if (Math.abs(after - want) > Math.abs(delta)) { el.quaternion.multiply(qd.setFromAxisAngle(X, -2 * delta)); el.updateMatrixWorld(true); tipOf(el, ha, Tip); }
  }
  A.subVectors(Tip, S).normalize(); U.subVectors(target, S).normalize();
  rotateWorld(sh, qd.setFromUnitVectors(A, U));
  E.setFromMatrixPosition(el.matrixWorld);
  A.subVectors(E, S); A.addScaledVector(U, -A.dot(U));
  B.copy(pole).addScaledVector(U, -pole.dot(U));
  if (A.lengthSq() > 1e-12 && B.lengthSq() > 1e-12) {
    A.normalize(); B.normalize();
    let ang = Math.acos(Math.max(-1, Math.min(1, A.dot(B))));
    if (C.crossVectors(A, B).dot(U) < 0) ang = -ang;
    rotateWorld(sh, qd.setFromAxisAngle(U, ang));
  }
}
function syncCopies(bones, name) {
  const rows = bones.get(name);
  if (!rows || rows.length < 2) return;
  const b0 = rows[0];
  qd.setFromEuler(eu.set(b0.rx, b0.ry, b0.rz)).invert().multiply(b0.o.quaternion);
  for (let i = 1; i < rows.length; i++) rows[i].o.quaternion.setFromEuler(eu.set(rows[i].rx, rows[i].ry, rows[i].rz)).multiply(qd);
}

// ---------------------------------------------------------------- motions
const arms = {L: null, R: null};
const hand = (x, y, z) => ({x, y, z});
const TEMPO = {club: 5.4, wave: 6.2, bounce: 7, spin: 4.4, robot: 4, cheer: 6.6};

const MOTIONS = {
  /** "6 7": palms up in front, hands trade places like scales, the torso answers
   * each swap with a twist and the knees give a small dip on every change. */
  sixseven(t, r, fx) {
    const u = r.unit, sx = r.shL.x, bt = Math.max(0, t - .25), wave = Math.sin(bt * TAU * 1.75);
    // The right hand rises first and says "6", the left answers with "7" (Oscar, 2026-09-14).
    const s = snap(-wave, .45); // quick trade, brief hold at the top: readable from across the park
    const y0 = r.shL.y - .05 * u, amp = .2 * u, z = .36 * u, x = sx + .22 * u; // beside the torso, readable from behind too
    arms.L = hand(x, y0 + amp * s, z);
    arms.R = hand(-x, y0 - amp * s, z);
    add('HandL', -.55 - .25 * s, 0, .25); add('HandR', -.55 + .25 * s, 0, -.25); // palms turned up, the high hand cocks
    add('Spine1', .04); add('Spine2', 0, .15 * s, -.05 * s); add('Spine3', 0, .07 * s);
    add('Head', .07 - .06 * Math.abs(s), -.16 * s, .09 * s);
    const dip = 1 - Math.abs(wave) ** .6;
    fx.rootBobY = -crouch(.16 + .14 * dip) - .012 * dip;
    return {six: s < -.96, seven: s > .96, s, sideY: .26 * u, sideX: .26 * u};
  },
  /** Hands travel up, snap together into a heart in front of the chest, beat twice a
   * second while the body sways, then release. */
  heart(t, r, fx) {
    const u = r.unit;
    const up = inOut(t / .55), form = backOut((t - .38) / .3), release = smooth((t - 3.3) / .45);
    const beat = t > .75 && t < 3.3 ? Math.max(0, Math.sin((t - .75) * TAU * 1.25)) ** 4 : 0;
    const sway = Math.sin((t - .6) * Math.PI * .9) * smooth((t - .6) / .5) * (1 - release);
    const gap = mix(.52 * u, .085 * u, form * (1 - release));
    const y = mix(r.shL.y - .55 * u, r.shL.y - .2 * u, up) + .035 * u * beat, z = mix(.2 * u, .5 * u, up) + .04 * u * beat;
    arms.L = hand(gap, y, z); arms.R = hand(-gap, y, z);
    add('HandL', -.35 * form, .2 * form, -.55 * form); add('HandR', -.35 * form, -.2 * form, .55 * form);
    add('Spine1', -.04 * up); add('Spine2', -.05 * up, 0, .06 * sway);
    add('Head', -.1 * form + .05 * beat, .05 * sway, .16 * form + .05 * sway);
    fx.rootBobY = -crouch(.08 + .06 * beat) + .01 * beat;
    return {burst: t >= .62 && t < 3.3, hearts: t > .78 && t < 3.25, heartY: y + .06 * u, heartZ: z + .06 * u, burstY: r.head.y + 1.2 * u, burstZ: .14 * u};
  },
  /** Right hand high beside the head, forearm fanning from the elbow with a wrist
   * flick on each swing; the body leans away and bounces on the beat. */
  wave(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = t * TEMPO.wave, sw = Math.sin(ph);
    arms.R = hand(-sx - .38 * u - .06 * u * sw, r.shL.y + .3 * u - .03 * u * Math.abs(sw), .16 * u + .05 * u * sw);
    arms.L = hand(sx + .16 * u, r.shL.y - .62 * u, .08 * u);
    add('HandR', 0, 0, .5 * sw); add('HandL', 0, 0, .15);
    add('Spine2', 0, -.08, -.08); add('Head', -.05, -.1, .13 + .04 * sw);
    fx.rootBobY = -crouch(.12 + .08 * Math.abs(Math.cos(ph))) + .012 * Math.abs(sw);
    return {};
  },
  /** Arms in a V beside the head, pumping on the beat, with a knee-loaded hop. */
  cheer(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = t * TEMPO.cheer, hop = Math.max(0, Math.sin(ph)) ** .7, load = Math.max(0, -Math.sin(ph));
    const pump = snap(Math.sin(ph * 2), .6);
    arms.L = hand(sx + .56 * u, r.shL.y + .36 * u + .05 * u * pump, .3 * u); // a hand's width off the (very wide) head
    arms.R = hand(-sx - .56 * u, r.shL.y + .36 * u + .05 * u * pump, .3 * u);
    add('HandL', 0, 0, .3); add('HandR', 0, 0, -.3);
    add('Spine2', -.08 - .04 * hop); add('Head', -.2 - .06 * hop);
    fx.rootBobY = -crouch(.1 + .45 * load) + .1 * hop;
    return {};
  },
  /** Club groove: down on every beat, hips and shoulders counter-sway, one arm pumps
   * up while the other drops, head nods. */
  club(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = t * TEMPO.club, dip = Math.cos(ph) ** 2, side = snap(Math.sin(ph), .5);
    const lUp = .5 + .5 * side, rUp = 1 - lUp;
    arms.L = hand(sx + mix(.14, .32, lUp) * u, r.shL.y + mix(-.42, .32, lUp) * u, mix(.26, .22, lUp) * u);
    arms.R = hand(-sx - mix(.14, .32, rUp) * u, r.shL.y + mix(-.42, .32, rUp) * u, mix(.26, .22, rUp) * u);
    add('Spine1', .06, 0, .07 * side); add('Spine2', .04 * dip, .12 * side, -.1 * side); add('Head', .12 * dip - .04, -.08 * side, .06 * side);
    fx.rootBobY = -crouch(.12 + .32 * dip) - .02 * dip;
    return {};
  },
  /** Boxer bounce: fists up in front of the chin, alternating jabs, springy knees. */
  bounce(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = t * TEMPO.bounce, spring = Math.abs(Math.sin(ph));
    const jabL = Math.max(0, Math.sin(ph * .5)) ** 3, jabR = Math.max(0, -Math.sin(ph * .5)) ** 3;
    arms.L = hand(sx * .55, r.shL.y - .16 * u, (.44 + .16 * jabL) * u);
    arms.R = hand(-sx * .55, r.shL.y - .16 * u, (.44 + .16 * jabR) * u);
    add('HandL', .4, 0, .2); add('HandR', .4, 0, -.2);
    add('Spine1', .1); add('Spine2', .06, .14 * (jabR - jabL)); add('Head', .08 * (1 - spring), .08 * (jabL - jabR));
    fx.rootBobY = -crouch(.14 + .36 * (1 - spring)) + .05 * spring;
    return {};
  },
  /** Robot: four locked poses per cycle joined by fast, clipped moves. */
  robot(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = (t * TEMPO.robot) / TAU * 4, i = Math.floor(ph), f = ph - i;
    const k = smooth(f / .22); // move in the first 22% of the beat, then hold dead still
    const P = [
      [[.1, .08, .34], [-.1, -.32, .42], .38, .12],
      [[.02, -.2, .5], [-.02, -.2, .5], 0, 0],
      [[.1, -.32, .42], [-.1, .08, .34], -.38, -.12],
      [[.18, -.44, .3], [-.18, -.44, .3], 0, 0],
    ];
    const a = P[((i % 4) + 4) % 4], b = P[(((i + 1) % 4) + 4) % 4];
    const lerp3 = (p, q) => [mix(p[0], q[0], k), mix(p[1], q[1], k), mix(p[2], q[2], k)];
    const L = lerp3(a[0], b[0]), R = lerp3(a[1], b[1]);
    arms.L = hand(sx + L[0] * u, r.shL.y + L[1] * u, L[2] * u);
    arms.R = hand(-sx + R[0] * u, r.shL.y + R[1] * u, R[2] * u);
    add('HandL', .1, 0, .35); add('HandR', .1, 0, -.35);
    add('Spine2', 0, mix(a[3], b[3], k)); add('Head', 0, mix(a[2], b[2], k));
    fx.rootBobY = -crouch(.1) + .012 * Math.sin(Math.PI * k);
    return {};
  },
  /** Pirouette: arms open and floating, one knee drawn up, rising onto the toes. */
  spin(t, r, fx) {
    const u = r.unit, sx = r.shL.x, ph = t * TEMPO.spin, float = Math.sin(ph * 2);
    arms.L = hand(sx + .44 * u, r.shL.y + (.08 + .05 * float) * u, .06 * u);
    arms.R = hand(-sx - .44 * u, r.shL.y + (.08 - .05 * float) * u, .06 * u);
    add('HandL', 0, 0, .2 + .15 * float); add('HandR', 0, 0, -.2 + .15 * float);
    add('ThighR', -.55); add('ShinR', 0, 0, -1.1);
    add('Spine2', -.05); add('Head', -.1, 0, .05 * float);
    fx.rootBobY = .03;
    fx.rootYaw = ph;
    return {};
  },
};

const toWorld = (rig, p, out) => out.set(p.x, p.y, p.z).applyMatrix4(rig.frame.matrixWorld);
const frameInv = new T.Matrix4(), leftAxis = new T.Vector3();

/**
 * Poses the skeleton for a handled emote and returns root effects ({rootBobY,
 * rootYaw}), or null when the emote or the rig is not handled (legacy path runs).
 * `time` is seconds since the emote started.
 */
export function applyEmoteMotion(bones, id, time) {
  const duration = EMOTE_MOTION_DURATION[id];
  if (duration === undefined && !EMOTE_MOTION_LOOPS.includes(id)) return null;
  const rig = rigOf(bones);
  if (!rig) return null;
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  const w = smooth(t / .3) * (duration === undefined ? 1 : 1 - smooth((t - duration + .35) / .35));
  pose.clear(); arms.L = arms.R = null;
  const fx = {rootBobY: 0};
  const info = MOTIONS[id](t, rig, fx);
  for (const name of BODY) for (const b of bones.get(name) ?? []) b.o.rotation.set(b.rx, b.ry, b.rz);
  for (const [name, [x, y, z]] of pose) for (const b of bones.get(name) ?? []) b.o.rotation.set(b.rx + x * w, b.ry + y * w, b.rz + z * w);
  rig.frame.updateWorldMatrix(true, true);
  const tips = {};
  leftAxis.set(1, 0, 0).transformDirection(rig.frame.matrixWorld); // the character's left, in world space
  const worldUnit = rig.unit * rig.frame.matrixWorld.getMaxScaleOnAxis();
  for (const side of ['L', 'R']) {
    const sh = first(bones, 'Biscep' + side), el = first(bones, 'Arm' + side), ha = first(bones, 'Hand' + side);
    if (arms[side]) {
      tipOf(el, ha, rest);
      toWorld(rig, arms[side], P).sub(rest).multiplyScalar(w).add(rest);
      // Blending in or out, swing out around the big head instead of cutting through it.
      P.addScaledVector(leftAxis, (side === 'L' ? 1 : -1) * Math.sin(Math.PI * w) * .16 * worldUnit);
      poleW.set(side === 'L' ? .55 : -.55, -1, -.45).transformDirection(rig.frame.matrixWorld);
      reachArm(sh, el, ha, P, poleW);
      syncCopies(bones, 'Biscep' + side); syncCopies(bones, 'Arm' + side);
    }
    tips[side] = tipOf(el, ha, new T.Vector3());
  }
  fx.rootBobY *= w;
  // Effects: per performer anchor + one-shot events, edge-triggered on this performer's clock.
  const st = rig.state;
  if (st.id !== id || t < st.t) { st.id = id; st.burst = false; st.s = 0; }
  let anchor = emoteFxBus.anchors.get(bones);
  if (!anchor) {
    if (emoteFxBus.anchors.size >= 64) emoteFxBus.anchors.delete(emoteFxBus.anchors.keys().next().value);
    emoteFxBus.anchors.set(bones, (anchor = {id, stamp: 0, hearts: false, x: 0, y: 0, z: 0}));
  }
  anchor.id = id; anchor.stamp = emoteFxBus.clock; anchor.hearts = false;
  anchor.ax = leftAxis.x; anchor.az = leftAxis.z;
  if (id === 'heart') {
    toWorld(rig, {x: 0, y: info.heartY, z: info.heartZ}, P);
    anchor.x = P.x; anchor.y = P.y; anchor.z = P.z; anchor.hearts = !!info.hearts && w > .5;
    if (info.burst && !st.burst && w > .5) { st.burst = true; emit('heartBurst', toWorld(rig, {x: 0, y: info.burstY, z: info.burstZ}, P)); }
  } else if (id === 'sixseven' && w > .5) {
    frameInv.copy(rig.frame.matrixWorld).invert();
    const beside = (tip, sign) => { tip.applyMatrix4(frameInv); tip.x += sign * info.sideX; tip.y += info.sideY; return toWorld(rig, tip, P); };
    if (info.six && st.s >= -.96) emit('six', beside(tips.R, -1), -leftAxis.x, -leftAxis.z);
    if (info.seven && st.s <= .96) emit('seven', beside(tips.L, 1), leftAxis.x, leftAxis.z);
    st.s = info.s;
  }
  st.t = t;
  return fx;
}
