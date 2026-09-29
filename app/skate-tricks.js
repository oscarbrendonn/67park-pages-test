/** Skateboard trick feedback for the island rider: ollie pop, one kickflip per
 * airtime, landing squash, carve lean and push-off cadence. Cosmetic only —
 * the state never applies an impulse, grants height or changes the grounded
 * and landing rules owned by Player.tsx and cityBridge. */
export const SKATE_TRICKS = Object.freeze({
  popDecay: 5.5,      // ollie nose-up pitch relaxes at this rate (1/s)
  flipDuration: .46,  // one full kickflip roll (s)
  squashDecay: 7,     // landing squash recovery (1/s)
  leanMax: .40,       // carve roll clamp (rad)
  leanGain: .026,     // roll per (rad/s of heading change × m/s of speed)
  leanBlend: 9,       // roll damping (1/s)
  minAir: .10,        // shorter hops are not a landing (s)
  hardAir: .34,       // airtime that lands with a thud (s)
  pushSpeed: 3.2,     // below this ground speed the rider kicks to push (m/s)
  pushPeriod: .9,     // one push kick cycle (s)
  stanceBlend: 8      // sideways stance ease in/out (1/s)
});
/** Rider stands across the deck; the head still looks along the travel line. */
export const SKATE_STANCE_YAW = .62;

/** Shared frame-fresh snapshot: written by Player.tsx, read by the pose driver. */
export const skateState = {
  riding: false, stance: 0, stanceYaw: 0, pop: 0, flip: 0, squash: 0, lean: 0,
  tuck: 0, crouch: 0, push: 0, pushing: false, air: 0,
  // written by skate-deck.js measureSkateFeet (soles in the character root frame)
  feetRise: 0, feetRiseAvg: 0, feetSlope: 0, feetMidZ: 0,
  time: 0, roll: 0 // seconds on the board and the eased rolling speed (0..1), for life in the stance
};
// Read-only QA hook, same style as window.__candy: nothing gameplay-side reads it.
if (typeof window !== 'undefined') window.__skateState = skateState;

/** input.ts queues a jump on every Space keydown, auto-repeat included, and the
 * physics keeps that hold-to-hop behaviour. The kickflip alone needs a fresh press,
 * so remember whether the latest Space keydown was an OS repeat. Touch Jump never
 * emits keyboard events and therefore always counts as fresh. */
export const skateInput = { repeat: false };
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.code === 'Space') skateInput.repeat = !!e.repeat; });
  window.addEventListener('keyup', e => { if (e.code === 'Space') skateInput.repeat = false; });
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function createSkateTricks(config = {}, out = skateState) {
  const c = {...SKATE_TRICKS, ...config};
  let pop = 0, flip = 0, flipArmed = false, squash = 0, air = 0, lean = 0, tuck = 0, stance = 0, time = 0, roll = 0;
  let prevYaw = null, wasGrounded = true, pushPhase = 0, pushing = false;
  return {
    /** Call once per frame with the same grounded/queued values the physics used. */
    step({riding = false, grounded = false, queued = false, speed = 0, yaw = 0, moving = false, swimming = false, dt = 0} = {}) {
      dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1);
      const events = [];
      // Relax last frame's feedback first so a trick started this frame is published at full strength.
      pop *= Math.exp(-c.popDecay * dt); if (pop < .002) pop = 0;
      if (flip > 0) flip = Math.max(0, flip - dt / c.flipDuration);
      squash *= Math.exp(-c.squashDecay * dt); if (squash < .002) squash = 0;
      if (riding) {
        if (queued && grounded) { pop = 1; events.push('ollie'); }
        else if (queued && !skateInput.repeat && !grounded && flipArmed && flip === 0 && air > .06) { flip = 1; flipArmed = false; events.push('kickflip'); }
        if (!grounded) {
          if (wasGrounded) flipArmed = true; // any takeoff (ollie, ramp lip, ledge) arms one kickflip
          air += dt;
        } else {
          if (!wasGrounded && air >= c.minAir) {
            squash = clamp(.55 + air * 1.3, 0, 1);
            events.push(air >= c.hardAir ? 'land-hard' : 'land');
          }
          air = 0; flipArmed = false;
          flip = 0; // touching down snaps the deck flat
        }
        pushing = grounded && moving && speed < c.pushSpeed;
        if (pushing) pushPhase = (pushPhase + dt / c.pushPeriod) % 1;
        else if (pushPhase > 0) pushPhase = pushPhase < .5 ? Math.max(0, pushPhase - dt * 2.2) : Math.min(1, pushPhase + dt * 2.2) % 1;
        // Carve: roll into the turn from the measured heading rate. Airborne the
        // rider straightens instead of holding a lean without a contact patch.
        const rate = prevYaw === null || dt === 0 ? 0 : wrap(yaw - prevYaw) / dt;
        const target = grounded ? clamp(-rate * Math.min(speed, 12) * c.leanGain, -c.leanMax, c.leanMax) : 0;
        lean = damp(lean, target, c.leanBlend, dt);
        prevYaw = yaw;
      } else {
        pop = flip = squash = air = 0; flipArmed = false; pushing = false; pushPhase = 0; prevYaw = null;
        lean = damp(lean, 0, 12, dt);
      }
      wasGrounded = grounded;
      tuck = damp(tuck, riding && !grounded && air > .04 ? 1 : 0, riding && !grounded ? 10 : 18, dt); if (tuck < .002) tuck = 0;
      // Entering water pitches the visual root prone; a lingering stance yaw would roll the swimmer, so it snaps off.
      stance = swimming ? 0 : damp(stance, riding ? 1 : 0, c.stanceBlend, dt); if (stance < .002) stance = 0;
      time = riding ? time + dt : 0;
      roll = damp(roll, riding && grounded ? clamp(speed / 6, 0, 1) : 0, 4, dt); if (roll < .002) roll = 0;
      const crouch = clamp(squash * .9 + pop * .55 + (pushing ? .22 : 0), 0, 1);
      Object.assign(out, {riding, stance, stanceYaw: SKATE_STANCE_YAW * stance, pop, flip, squash, lean, tuck, crouch, push: pushPhase, pushing, air, time, roll});
      return {...out, events};
    }
  };
}
