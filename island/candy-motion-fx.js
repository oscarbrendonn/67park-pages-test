import * as T from 'three';

// Candy-only physical contact feedback, deliberately requested at locomotion
// frequency: these are 200–280 ms world-space particles, not UI transitions.
// No textures, lights, shadows, render targets, full-screen effects or timers.
export const CANDY_MOTION_FX_BUDGET = Object.freeze({
  mobile: Object.freeze({puff: 16, trail: 20, spark: 12, ring: 2}),
  desktop: Object.freeze({puff: 24, trail: 32, spark: 20, ring: 3})
});
export const CANDY_MOTION_FX_LIFETIMES = Object.freeze({
  puff: .26, trail: .22, spark: .28, ring: .25, reduced: .20
});

const clamp = T.MathUtils.clamp;
const TAU = Math.PI * 2;
const MIN_SCALE = .0001;
const hash = (n, salt) => {
  const value = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

// Each analytic silhouette becomes fully transparent BEFORE the quad boundary.
// The additional edge guard is shared by all four materials, so even a future
// change to an individual shape cannot reveal a rectangular sprite edge.
const FRAGMENTS = {
  puff: `
    float leftCloud = length((q - vec2(-.34, -.13)) / vec2(.43, .47));
    float crownCloud = length((q - vec2(-.02, .15)) / vec2(.47, .53));
    float rightCloud = length((q - vec2(.36, -.08)) / vec2(.38, .43));
    float baseCloud = length((q - vec2(.02, -.29)) / vec2(.56, .27));
    float cloud = min(min(leftCloud, crownCloud), min(rightCloud, baseCloud));
    float silhouette = 1.0 - smoothstep(.62, 1.0, cloud);
    diffuseColor.rgb *= mix(vec3(.93, .91, .86), vec3(1.0), smoothstep(-.65, .55, q.y));
    diffuseColor.a *= silhouette;
  `,
  trail: `
    // Three tapered, gently curved wisps; their white cores stay narrow.
    float taper = sqrt(max(0.0, 1.0 - q.y * q.y));
    float bend = .065 * (1.0 - q.y * q.y);
    float core = 1.0 - smoothstep(.035, .14, abs(q.x - bend) / max(.18, taper));
    float left = 1.0 - smoothstep(.018, .075, abs(q.x + .31 + bend) / max(.18, taper));
    float right = 1.0 - smoothstep(.018, .065, abs(q.x - .29 + bend) / max(.18, taper));
    float ends = (1.0 - smoothstep(.53, .89, abs(q.y)));
    float wisp = max(core, max(left, right) * .44) * ends;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), core * .64);
    diffuseColor.a *= wisp;
  `,
  spark: `
    // A rounded four-point star and a faint, tightly bounded soft halo.
    vec2 a = abs(q);
    float starDistance = sqrt(a.x) + sqrt(a.y);
    float star = 1.0 - smoothstep(.78, .96, starDistance);
    float halo = (1.0 - smoothstep(.08, .52, length(q))) * .13;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), star * .65);
    diffuseColor.a *= max(star, halo);
  `,
  ring: `
    float radius = length(q);
    float line = 1.0 - smoothstep(.023, .075, abs(radius - .74));
    float halo = (1.0 - smoothstep(.045, .16, abs(radius - .74))) * .18;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.91, 1.0, .93), line * .26);
    diffuseColor.a *= max(line, halo);
  `
};

function createBatch(group, kind, capacity, color, ground) {
  const geometry = new T.PlaneGeometry(2, 2);
  if (ground) geometry.rotateX(-Math.PI / 2);
  const alpha = new T.InstancedBufferAttribute(new Float32Array(capacity), 1);
  alpha.setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('aCandyAlpha', alpha);
  // Unlit pastel color supplies the small luminous core without adding lights
  // or relying on bloom. Normal blending remains readable in bright daylight.
  const material = new T.MeshBasicMaterial({
    color, transparent: true, depthTest: true, depthWrite: false,
    side: T.DoubleSide, blending: T.NormalBlending, toneMapped: false
  });
  material.forceSinglePass = true;
  material.polygonOffset = ground;
  material.polygonOffsetFactor = ground ? -1 : 0;
  material.polygonOffsetUnits = ground ? -1 : 0;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCandyAlpha; varying float vCandyAlpha; varying vec2 vCandyUV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCandyAlpha = aCandyAlpha; vCandyUV = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCandyAlpha; varying vec2 vCandyUV;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 q = vCandyUV * 2.0 - 1.0;
        float quadGuard = (1.0 - smoothstep(.88, .985, abs(q.x))) *
                          (1.0 - smoothstep(.88, .985, abs(q.y)));
        diffuseColor.a *= vCandyAlpha * quadGuard;
        ${FRAGMENTS[kind]}
        if (diffuseColor.a < .002) discard;
      `);
  };
  material.customProgramCacheKey = () => `candy-motion-fx-v1-${kind}`;
  const mesh = new T.InstancedMesh(geometry, material, capacity);
  mesh.name = `CANDY_MOTION_${kind.toUpperCase()}`;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = ground ? 4 : 5;
  mesh.visible = false;
  mesh.count = 0;
  const dummy = new T.Object3D();
  dummy.scale.setScalar(MIN_SCALE);
  dummy.updateMatrix();
  // Initialize even hidden slots with a positive, invertible transform.
  for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, dummy.matrix);
  group.add(mesh);
  let count = 0;
  return {
    mesh,
    begin() { count = 0; },
    put(x, y, z, yaw, roll, sx, sy, sz, opacity) {
      if (count >= capacity) return;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, roll);
      dummy.scale.set(Math.max(MIN_SCALE, sx), Math.max(MIN_SCALE, sy), Math.max(MIN_SCALE, sz));
      dummy.updateMatrix();
      mesh.setMatrixAt(count, dummy.matrix);
      alpha.setX(count, opacity);
      count++;
    },
    end() {
      mesh.count = count;
      mesh.visible = count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      alpha.needsUpdate = true;
    },
    clear() { count = 0; mesh.count = 0; mesh.visible = false; },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

function createPool(capacity) {
  return {
    next: 0, emitted: 0, overwritten: 0,
    particles: Array.from({length: capacity}, (_, slot) => ({
      slot, id: 0, alive: false, age: 0, life: 0, x: 0, y: 0, z: 0,
      contactY: 0, vx: 0, vy: 0, vz: 0, size: 1, heading: 0,
      width: 0, height: 0, length: 0, opacity: 0, roll: 0, stationary: false
    }))
  };
}

function validContact(value, heading = false, speedRequired = false) {
  if (!value || typeof value !== 'object') return false;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return false;
  // Finite doubles can still overflow a GPU Float32 matrix.
  if (Math.abs(value.x) > 1e6 || Math.abs(value.y) > 1e6 || Math.abs(value.z) > 1e6) return false;
  if (heading && !Number.isFinite(value.heading)) return false;
  if (value.size !== undefined && (!Number.isFinite(value.size) || value.size <= 0)) return false;
  if ((speedRequired || value.speed !== undefined) && (!Number.isFinite(value.speed) || value.speed < 0)) return false;
  return true;
}

/**
 * Contact coordinates are WORLD SPACE terrain heights, never body centers.
 * The caller owns terrain validation, ground/sprint gating and event cadence.
 * Emission returns true when accepted, false when ignored; update(0) publishes
 * newly emitted particles without advancing time. No gameplay state is changed.
 */
export function createCandyMotionFX(options = {}) {
  const {scene, mobile = false, reducedMotion = false} = options || {};
  const budget = CANDY_MOTION_FX_BUDGET[mobile ? 'mobile' : 'desktop'];
  const group = new T.Group();
  group.name = 'CANDY_MOTION_FX';
  if (typeof scene?.add === 'function') scene.add(group);
  let reduced = !!reducedMotion;
  let disposed = false;
  let sequence = 0;
  const events = {steps: 0, trails: 0, bursts: 0};
  const pools = {
    puff: createPool(budget.puff), trail: createPool(budget.trail),
    spark: createPool(budget.spark), ring: createPool(budget.ring)
  };
  const batches = {
    puff: createBatch(group, 'puff', budget.puff, '#fff6de', false),
    trail: createBatch(group, 'trail', budget.trail, '#bcf7df', true),
    spark: createBatch(group, 'spark', budget.spark, '#baf5bf', false),
    ring: createBatch(group, 'ring', budget.ring, '#8cf0ac', true)
  };
  const kinds = ['puff', 'trail', 'spark', 'ring'];
  const cameraWorld = new T.Vector3();
  let hasCamera = false;

  function acquire(kind, contact, life) {
    const pool = pools[kind];
    const p = pool.particles[pool.next];
    pool.next = (pool.next + 1) % pool.particles.length;
    if (p.alive) pool.overwritten++;
    pool.emitted++;
    p.id = ++sequence;
    p.alive = true;
    p.age = 0;
    p.life = life;
    p.x = contact.x; p.y = contact.y; p.z = contact.z;
    p.contactY = contact.y;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.size = clamp(contact.size ?? 1, .55, 1.35);
    p.heading = Number.isFinite(contact.heading) ? contact.heading : 0;
    p.width = 0; p.height = 0; p.length = 0; p.opacity = 0; p.roll = 0;
    p.stationary = reduced;
    return p;
  }

  function step(contact) {
    if (disposed || !validContact(contact, true)) return false;
    const kind = contact.kind === undefined ? 'hard' : contact.kind;
    if (typeof kind !== 'string' || kind === 'water') return false;
    events.steps++;
    const count = reduced ? 1 : (mobile ? 2 : 3);
    const speed = clamp(contact.speed ?? 0, 0, 16);
    const forwardX = Math.sin(contact.heading), forwardZ = Math.cos(contact.heading);
    const sideX = forwardZ, sideZ = -forwardX;
    for (let i = 0; i < count; i++) {
      const p = acquire('puff', contact, reduced ? CANDY_MOTION_FX_LIFETIMES.reduced : CANDY_MOTION_FX_LIFETIMES.puff);
      const spread = (i - (count - 1) * .5) * .07 * p.size;
      const behind = (.045 + i * .023) * p.size;
      p.x += sideX * spread - forwardX * behind;
      p.z += sideZ * spread - forwardZ * behind;
      p.y += .027 + .075 * p.size;
      p.width = (.13 + hash(p.id, 2) * .035) * p.size;
      p.height = (.091 + hash(p.id, 8) * .014) * p.size;
      p.opacity = reduced ? .28 : (kind === 'grass' ? .38 : .48);
      p.vx = (sideX * spread * 1.5 - forwardX * (.07 + speed * .006));
      p.vz = (sideZ * spread * 1.5 - forwardZ * (.07 + speed * .006));
      p.vy = .16 * p.size;
    }
    return true;
  }

  function trail(contact) {
    if (disposed || reduced || !validContact(contact, true, true) || contact.speed <= 0) return false;
    events.trails++;
    const p = acquire('trail', contact, CANDY_MOTION_FX_LIFETIMES.trail);
    const speed = clamp(contact.speed, 0, 16);
    const behind = .14 * p.size;
    p.x -= Math.sin(p.heading) * behind;
    p.z -= Math.cos(p.heading) * behind;
    p.y += .025;
    p.width = (.11 + Math.min(speed, 9) * .005) * p.size;
    p.length = (.20 + Math.min(speed, 12) * .014) * p.size;
    p.opacity = .40;
    p.vx = -Math.sin(p.heading) * .10;
    p.vz = -Math.cos(p.heading) * .10;
    return true;
  }

  function burst(contact) {
    if (disposed || !validContact(contact)) return false;
    events.bursts++;
    const ring = acquire('ring', contact, reduced ? CANDY_MOTION_FX_LIFETIMES.reduced : CANDY_MOTION_FX_LIFETIMES.ring);
    ring.y += .032;
    ring.width = (reduced ? .39 : .28) * ring.size;
    ring.length = Math.min(.86, .64 * ring.size);
    ring.opacity = reduced ? .40 : .64;
    if (reduced) return true;
    const count = mobile ? 4 : 6;
    for (let i = 0; i < count; i++) {
      const p = acquire('spark', contact, CANDY_MOTION_FX_LIFETIMES.spark);
      const angle = i / count * TAU + hash(events.bursts, 7) * .6;
      const radius = (.14 + hash(p.id, 5) * .16) * p.size;
      p.x += Math.cos(angle) * radius;
      p.z += Math.sin(angle) * radius;
      p.y += .06 + hash(p.id, 9) * .045;
      p.vx = Math.cos(angle) * .28 * p.size;
      p.vz = Math.sin(angle) * .28 * p.size;
      p.vy = (.66 + hash(p.id, 4) * .30) * p.size;
      p.width = (.034 + hash(p.id, 1) * .016) * p.size;
      p.roll = angle * .35;
      p.opacity = .78;
    }
    return true;
  }

  function update(dt, context = {}) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return;
    const camera = context?.camera;
    if (camera && typeof camera.getWorldPosition === 'function') {
      camera.getWorldPosition(cameraWorld);
      hasCamera = Number.isFinite(cameraWorld.x + cameraWorld.y + cameraWorld.z);
    } else if (camera?.position && Number.isFinite(camera.position.x + camera.position.y + camera.position.z)) {
      cameraWorld.copy(camera.position);
      hasCamera = true;
    }
    // Analytic trajectories do not need small integration steps: a long frame
    // expires old feedback immediately instead of replaying it after a pause.
    for (const kind of kinds) {
      const batch = batches[kind];
      batch.begin();
      for (const p of pools[kind].particles) {
        if (!p.alive) continue;
        p.age += dt;
        if (p.age >= p.life) { p.alive = false; continue; }
        const t = p.age / p.life;
        const travel = p.stationary ? 0 : p.age;
        const x = p.x + p.vx * travel;
        const z = p.z + p.vz * travel;
        const opacity = p.opacity * (1 - t); // Linear, immediate feedback/fade.
        if (kind === 'puff') {
          const growth = p.stationary ? 1 : 1 + t * .26;
          const yaw = hasCamera ? Math.atan2(cameraWorld.x - x, cameraWorld.z - z) : p.heading;
          batch.put(x, p.y + p.vy * travel, z, yaw, 0, p.width * growth, p.height * growth, 1, opacity);
        } else if (kind === 'trail') {
          batch.put(x, p.y, z, p.heading, 0, p.width, 1, p.length * (1 + t * .12), opacity);
        } else if (kind === 'spark') {
          const yaw = hasCamera ? Math.atan2(cameraWorld.x - x, cameraWorld.z - z) : 0;
          const scale = p.width * (1 - t * .24);
          const y = p.y + p.vy * travel - .65 * travel * travel;
          batch.put(x, y, z, yaw, p.roll + travel * .7, scale, scale, 1, opacity);
        } else {
          const radius = p.stationary ? p.width : p.width + (p.length - p.width) * t;
          batch.put(x, p.y, z, 0, 0, radius, 1, radius, opacity);
        }
      }
      batch.end();
    }
  }

  function clear() {
    for (const kind of kinds) {
      for (const p of pools[kind].particles) p.alive = false;
      pools[kind].next = 0;
      batches[kind].clear();
    }
  }

  function setReducedMotion(value) {
    if (disposed) return reduced;
    const next = !!value;
    if (next !== reduced) { reduced = next; clear(); }
    return reduced;
  }

  function inspect() {
    const live = {}, emittedParticles = {}, overwritten = {}, pooled = {}, particles = {};
    let draws = 0;
    for (const kind of kinds) {
      const pool = pools[kind];
      particles[kind] = pool.particles.filter(p => p.alive).map(p => {
        const travel = p.stationary ? 0 : p.age;
        return {
          slot: p.slot, id: p.id, age: p.age, life: p.life,
          x: p.x + p.vx * travel, z: p.z + p.vz * travel,
          y: p.y + (kind === 'puff' || kind === 'spark' ? p.vy * travel : 0) -
            (kind === 'spark' ? .65 * travel * travel : 0),
          contactY: p.contactY, size: p.size, stationary: p.stationary,
          opacity: p.opacity * (1 - p.age / p.life)
        };
      });
      live[kind] = particles[kind].length;
      emittedParticles[kind] = pool.emitted;
      overwritten[kind] = pool.overwritten;
      pooled[kind] = pool.particles.length;
      if (group.visible && batches[kind].mesh.visible) draws++;
    }
    return {
      version: 1, status: disposed ? 'disposed' : 'ready', mobile: !!mobile,
      attached: !!group.parent, reducedMotion: reduced,
      budget: {...budget}, lifetimes: {...CANDY_MOTION_FX_LIFETIMES},
      emitted: {...events}, emittedParticles, live, pooled, overwritten, particles,
      draws, maxDraws: 4, addedLights: 0, addedTextures: 0, addedRenderTargets: 0,
      depthTest: true, depthWrite: false, proceduralAlpha: true,
      alphaEdgeGuard: {fadeStart: .88, fullyTransparentAt: .985},
      minimumScale: MIN_SCALE, maxContactRadius: .9
    };
  }

  function dispose() {
    if (disposed) return;
    clear();
    disposed = true;
    for (const kind of kinds) batches[kind].dispose();
    group.removeFromParent();
  }

  return {step, trail, burst, update, clear, setReducedMotion, inspect, dispose, group};
}
