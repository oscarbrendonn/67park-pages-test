// Shared surface-following for the island's authored skate bowls and ramps.
// No geometry edits, listeners, timers, new render loop, or scene-wide raycasts.
const finite = Number.isFinite;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const FOOT = .555;
const initialState = () => ({
  managed: false, grounded: false, gx: 0, gz: 0, pitch: 0, roll: 0,
  climb: 0, launches: 0, landings: 0, surface: '', vertical: 0, error: ''
});
export const skateSurfaceState = initialState();

export function isSkateRideSurface(name = '') {
  return name === '67D_REF_MINI_SKATE_BOWL' || name === '67D_REF_MINI_SKATE_DECK' ||
    /^67D_SKATEPARK_(?:BASE$|BOWL_NW_(?:DECK$|SURFACE_MESH(?:_1)?$)|INNER_OUTER_SURFACE$|LOWER_C_SURFACE$|QUARTER_C_SURFACE$|LOWER_RETURN_SURFACE$|DIAGONAL_LAUNCH$|EAST_WALL_BANK$|CENTER_SPINE_A$|MARK_67$)/.test(name);
}

export function createSkateSurface(out = initialState()) {
  let previous = null, cooldown = 0, climb = 0, lastWorld = null, failedWorld = null;
  function reset() {
    previous = null; cooldown = climb = 0;
    Object.assign(out, {managed:false, grounded:false, gx:0, gz:0, pitch:0, roll:0, climb:0, surface:'', vertical:0});
    return out;
  }
  function read(world, x, z) {
    const hit = world.sample?.(x, z);
    if (!hit || !isSkateRideSurface(hit.object?.name)) return null;
    const y = world.ground(x, z);
    // A prop/vehicle placed above a ramp isn't a skating surface.
    return finite(y) && Math.abs(y - hit.point.y) < .18 ? {y, name:hit.object.name} : null;
  }
  function step({body, world, enabled, dt}) {
    if (world !== lastWorld) { reset(); lastWorld = world; failedWorld = null; out.error = ''; }
    if (!enabled || !world?.ready || !body || world === failedWorld) return reset();
    if (!finite(dt) || dt <= 0) return out;
    if (dt > .15) return reset(); // no stored launch impulse after a suspended tab
    dt = Math.min(dt, .05);
    try {
      const p = body.translation(), v = body.linvel();
      if (![p.x,p.y,p.z,v.x,v.y,v.z].every(finite) || world.water?.(p.x,p.z)) return reset();
      if (previous && Math.hypot(p.x-previous.x,p.z-previous.z,p.y-previous.y) > 4) reset();
      const surface = read(world,p.x,p.z);
      if (!surface) return reset();
      const speed = Math.hypot(v.x,v.z), dx = speed > .05 ? v.x/speed : 0, dz = speed > .05 ? v.z/speed : 0;
      const height = (x,z) => read(world,x,z)?.y ?? surface.y;
      // Wider wheelbase probes average out individual triangles in the GLB.
      const e = .65;
      const gx = clamp((height(p.x+e,p.z)-height(p.x-e,p.z))/(2*e),-1.5,1.5);
      const gz = clamp((height(p.x,p.z+e)-height(p.x,p.z-e))/(2*e),-1.5,1.5);
      const slope = gx*dx + gz*dz;
      const ahead = (height(p.x+dx*.65,p.z+dz*.65)-surface.y)/.65;
      const delta = previous ? Math.hypot(p.x-previous.x,p.z-previous.z) : 0;
      const gap = p.y-FOOT-surface.y;
      cooldown = Math.max(0,cooldown-dt);
      // While riding, follow continuous descent as well as ascent. Explicit hops
      // and external launchers have positive vy and must NOT be glued back down.
      const wasGrounded = out.managed && out.grounded;
      let grounded = cooldown === 0 && v.y <= 1 &&
        (Math.abs(gap) < .28 || (wasGrounded && delta < 1.6 && Math.abs(gap) < .30 + delta*1.5));
      out.managed = true; out.surface = surface.name; out.vertical = v.y;
      if (grounded) {
        const rate = Math.max(0,slope*speed);
        climb = damp(climb,rate,rate > climb ? 14 : 4,dt);
        // A real rising transition must precede the flattening lip. No launch
        // from stationary contact, a stair edge, teleport, or an ordinary curb.
        const launch = wasGrounded && cooldown === 0 && speed > 2.5 && climb > 1.2 &&
          previous?.slope > .12 && ahead < .04 && slope < previous.slope*.9 && delta > .002;
        p.y = surface.y+FOOT;
        body.setTranslation(p,true);
        if (launch) {
          const vy = clamp(climb*.85,1.2,6);
          body.setLinvel({x:v.x,y:vy,z:v.z},true);
          grounded = false; cooldown = .22; out.vertical = vy; out.launches++;
        } else {
          body.setLinvel({x:v.x,y:0,z:v.z},true);
          out.vertical = 0;
          if (previous && !wasGrounded) out.landings++;
        }
      } else {
        climb = 0;
        // Catch downward contact, but never snap a rising hop to the ramp.
        if (cooldown === 0 && v.y <= 0 && gap < .06 && gap > -.8) {
          p.y = surface.y+FOOT; body.setTranslation(p,true);
          body.setLinvel({x:v.x,y:0,z:v.z},true);
          grounded = true; out.vertical = 0; out.landings++;
        }
      }
      out.grounded = grounded; out.gx = gx; out.gz = gz; out.climb = climb;
      previous = {x:p.x,y:p.y,z:p.z,slope};
      return out;
    } catch (error) {
      // Optional skate feedback must never terminate the main render callback.
      reset(); failedWorld = world; out.error = String(error?.message || error);
      return out;
    }
  }
  function pose(yaw, dt, riding, reduced = false) {
    if (!finite(yaw) || !finite(dt)) return {pitch:0,roll:0};
    dt = clamp(dt,0,.05);
    let pitch = 0, roll = 0;
    if (riding && out.managed) {
      if (out.grounded) {
        pitch = clamp(-Math.atan(out.gx*Math.sin(yaw)+out.gz*Math.cos(yaw)),-.7,.7);
        roll = clamp(Math.atan(out.gx*Math.cos(yaw)-out.gz*Math.sin(yaw)),-.6,.6);
      } else if (!reduced) pitch = clamp(-out.vertical*.05,-.35,.35);
    }
    // Physical contact alignment is retained for reduced motion; only the
    // optional airborne tip is omitted. Reversal retargets the current pose.
    out.pitch = damp(out.pitch,pitch,10,dt);
    out.roll = damp(out.roll,roll,10,dt);
    return out;
  }
  return {step,pose,reset,state:out};
}
const controller = createSkateSurface(skateSurfaceState);
// Rotate around the wheel-contact point, not the avatar's waist.
export function anchorSkateSurface(group) {
  if (!skateSurfaceState.managed) return;
  const {x:p,y:yaw,z:r}=group.rotation, h=.5*group.scale.y;
  const x=h*Math.sin(r), y=-h*Math.cos(r)*Math.cos(p), z=-h*Math.cos(r)*Math.sin(p);
  group.position.x-=x*Math.cos(yaw)+z*Math.sin(yaw);
  group.position.y-=h+y;
  group.position.z-=-x*Math.sin(yaw)+z*Math.cos(yaw);
}
export const stepSkateSurface = args => controller.step(args);
export const poseSkateSurface = (...args) => controller.pose(...args);
if (typeof window !== 'undefined') window.__skateSurface = skateSurfaceState;
