import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {emoteFxBus} from './emote-motion.js';

/** Emote effects: rounded candy hearts that pop out of a hand heart and float up, and
 * candy "6" / "7" numerals that pop from the high hand in Six Seven. Procedural
 * geometry only: no textures, lights, render targets or transparency sorting (the
 * pieces scale in and out instead of fading). Bounded pools, one draw per kind. */
export const EMOTE_FX_BUDGET = Object.freeze({mobile: {hearts: 16, digits: 4}, desktop: {hearts: 28, digits: 6}});

function heartGeometry() {
  const s = new T.Shape();
  s.moveTo(0, -.5);
  s.bezierCurveTo(-.12, -.36, -.56, -.1, -.56, .17);
  s.bezierCurveTo(-.56, .46, -.24, .58, 0, .33);
  s.bezierCurveTo(.24, .58, .56, .46, .56, .17);
  s.bezierCurveTo(.56, -.1, .12, -.36, 0, -.5);
  const g = new T.ExtrudeGeometry(s, {depth: .16, bevelEnabled: true, bevelThickness: .1, bevelSize: .08, bevelSegments: 5, curveSegments: 20});
  g.center();
  g.computeVertexNormals();
  return g;
}
function tubeDigit(shape, closed = false) {
  const curve = Array.isArray(shape) ? new T.CatmullRomCurve3(shape.map(([x, y]) => new T.Vector3(x, y, 0)), closed, 'catmullrom', .35) : shape;
  const radius = .11;
  const parts = [new T.TubeGeometry(curve, 96, radius, 12, closed)];
  if (!closed) for (const p of [curve.getPoint(0), curve.getPoint(1)]) parts.push(new T.SphereGeometry(radius, 12, 8).translate(p.x, p.y, p.z));
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()));
  for (const p of parts) p.dispose();
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new T.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  return g;
}
const SIX = [[.24, .5], [.02, .52], [-.2, .36], [-.3, .06], [-.27, -.28], [-.08, -.48], [.16, -.44], [.28, -.24], [.22, -.02], [.02, .06], [-.18, -.04], [-.28, -.2]];
// A straight bar and a straight stem joined by one rounded corner: no wobble in the 7.
function sevenCurve() {
  const v = (x, y) => new T.Vector3(x, y, 0), path = new T.CurvePath();
  path.add(new T.LineCurve3(v(-.3, .46), v(.12, .46)));
  path.add(new T.QuadraticBezierCurve3(v(.12, .46), v(.3, .46), v(.23, .3)));
  path.add(new T.LineCurve3(v(.23, .3), v(-.06, -.5)));
  return path;
}

export function createEmoteFX(scene, {mobile = false, reducedMotion = false} = {}) {
  const budget = EMOTE_FX_BUDGET[mobile ? 'mobile' : 'desktop'];
  const group = new T.Group();
  group.name = 'EMOTE_FX';
  scene?.add?.(group);
  const geo = {heart: heartGeometry(), six: tubeDigit(SIX), seven: tubeDigit(sevenCurve())};
  const mat = {
    heart: new T.MeshStandardMaterial({color: '#ff5f97', emissive: '#ff2f7a', emissiveIntensity: .32, roughness: .32, metalness: 0}),
    six: new T.MeshStandardMaterial({color: '#62d3b6', emissive: '#27b38f', emissiveIntensity: .28, roughness: .35}),
    seven: new T.MeshStandardMaterial({color: '#ff8cc0', emissive: '#f0508f', emissiveIntensity: .28, roughness: .35})
  };
  const mesh = {}, pool = {};
  for (const [kind, cap] of [['heart', budget.hearts], ['six', budget.digits], ['seven', budget.digits]]) {
    const m = new T.InstancedMesh(geo[kind], mat[kind], cap);
    m.name = 'EMOTE_FX_' + kind.toUpperCase();
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = m.receiveShadow = false;
    m.count = 0;
    m.visible = false;
    group.add(m);
    mesh[kind] = m;
    pool[kind] = Array.from({length: cap}, () => ({alive: false}));
  }
  const cursor = {heart: 0, six: 0, seven: 0};
  const stats = {spawned: {heart: 0, six: 0, seven: 0}, live: {heart: 0, six: 0, seven: 0}, draws: 0, addedTextures: 0, addedLights: 0};
  let reduced = !!reducedMotion, disposed = false, seq = 0;
  const cam = new T.Vector3(), dummy = new T.Object3D();

  function spawn(kind, x, y, z, big = false, dx = 0, dz = 0) {
    const list = pool[kind], p = list[cursor[kind]++ % list.length], k = ++seq;
    const j = n => Math.sin(k * 12.9898 + n * 78.233) * .5; // deterministic jitter
    Object.assign(p, {
      alive: true, age: 0, x: x + (big ? 0 : j(1) * .08), y, z: z + (big ? 0 : j(2) * .05),
      life: big ? 1.7 : kind === 'heart' ? 1.5 + j(3) * .3 : 1.1,
      size: big ? .17 : kind === 'heart' ? .08 + j(4) * .03 : .22,
      rise: big ? .36 : kind === 'heart' ? .55 + j(5) * .12 : .4,
      phase: k * 1.7,
      // outward speed: hearts fan out past the head so they read from any camera
      vx: dx * (big ? 0 : kind === 'heart' ? .9 + j(7) * .15 : .24), vz: dz * (big ? 0 : kind === 'heart' ? .9 + j(7) * .15 : .24)
    });
    stats.spawned[kind]++;
  }
  const emitters = new WeakMap();
  function update(dt, {camera = null, paused = false} = {}) {
    if (disposed) return;
    emoteFxBus.clock++;
    if (paused || !Number.isFinite(dt) || dt > .25) { clear(); emoteFxBus.events.length = 0; return; }
    dt = Math.max(0, Math.min(dt, .05));
    for (const [key, a] of emoteFxBus.anchors) {
      if (a.stamp < emoteFxBus.clock - 3) { emoteFxBus.anchors.delete(key); continue; }
      if (!a.hearts) { emitters.delete(a); continue; }
      const e = emitters.get(a) ?? {acc: .15, n: 0};
      e.acc += dt;
      const every = reduced ? .65 : mobile ? .3 : .2;
      while (e.acc >= every) { e.acc -= every; const sgn = e.n++ % 2 ? 1 : -1; const ox = (a.ax ?? 0) * sgn, oz = (a.az ?? 0) * sgn; spawn('heart', a.x + ox * .12, a.y, a.z + oz * .12, false, ox, oz); }
      emitters.set(a, e);
    }
    for (const ev of emoteFxBus.events) {
      if (ev.type === 'heartBurst') spawn('heart', ev.x, ev.y, ev.z, true);
      else if (ev.type === 'six') spawn('six', ev.x, ev.y, ev.z, false, ev.dx, ev.dz);
      else if (ev.type === 'seven') spawn('seven', ev.x, ev.y, ev.z, false, ev.dx, ev.dz);
    }
    emoteFxBus.events.length = 0;
    if (camera) camera.getWorldPosition(cam);
    stats.draws = 0;
    for (const kind of ['heart', 'six', 'seven']) {
      let n = 0;
      for (const p of pool[kind]) {
        if (!p.alive) continue;
        p.age += dt;
        if (p.age >= p.life) { p.alive = false; continue; }
        const t = p.age, lifeLeft = p.life - t;
        const grow = t < .22 ? (() => { const v = t / .22 - 1; return 1 + v * v * (2.9 * v + 1.9); })() : 1;
        const shrink = lifeLeft < .32 ? Math.max(0, lifeLeft / .32) ** 1.5 : 1;
        const s = p.size * grow * shrink;
        const sway = reduced ? 0 : Math.sin(t * 4.2 + p.phase) * .035;
        const out = (1 - Math.exp(-2.2 * t)) / 2.2;
        const px = p.x + sway + p.vx * out, py = p.y + p.rise * (t - .18 * t * t / p.life), pz = p.z + p.vz * out;
        dummy.position.set(px, py, pz);
        const yaw = camera ? Math.atan2(cam.x - px, cam.z - pz) : 0;
        dummy.rotation.set(0, yaw, reduced ? 0 : Math.sin(t * 3.1 + p.phase) * .22);
        dummy.scale.setScalar(Math.max(1e-4, s));
        dummy.updateMatrix();
        mesh[kind].setMatrixAt(n++, dummy.matrix);
      }
      mesh[kind].count = n;
      mesh[kind].visible = n > 0;
      if (n) { mesh[kind].instanceMatrix.needsUpdate = true; stats.draws++; }
      stats.live[kind] = n;
    }
  }
  function clear() {
    for (const kind of ['heart', 'six', 'seven']) { for (const p of pool[kind]) p.alive = false; mesh[kind].count = 0; mesh[kind].visible = false; stats.live[kind] = 0; }
    stats.draws = 0;
  }
  function setReducedMotion(v) { reduced = !!v; return reduced; }
  function dispose() {
    if (disposed) return;
    clear(); disposed = true;
    for (const m of Object.values(mesh)) m.dispose();
    emoteFxBus.anchors.clear(); emoteFxBus.events.length = 0;
    for (const g of Object.values(geo)) g.dispose();
    for (const m of Object.values(mat)) m.dispose();
    group.removeFromParent();
  }
  return {group, stats, update, clear, spawn, setReducedMotion, dispose};
}
