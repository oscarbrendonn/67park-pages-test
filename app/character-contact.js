// Reuse the existing curb/stair/swept-wall rules. A blocked diagonal must not
// discard its free tangent. At most four sweeps (including a rail tangent).
export function resolveCharacterContact(sweep, options) {
  const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
  if(!finite(options.to)||!finite(options.velocity)||(options.from&&!finite(options.from))) {
    const position=finite(options.from)?{...options.from}:finite(options.to)?{...options.to}:{x:0,y:.555,z:0};
    return {position,vertical:0,horizontal:{x:0,z:0},grounded:false,blocked:true,kind:'invalid-motion',samples:0};
  }
  const run=args=>{
    const solid=args.blocked;
    const rising=args.from&&args.velocity.y>.2;
    if(!rising&&!(solid?.canEscape&&args.from))return sweep(args);
    const support=args.supportGround||args.ground;
    return sweep({...args,blocked:(x,y,z)=>{
      if(solid?.(x,y,z)&&!(solid.canEscape&&args.from&&solid.canEscape(args.from,{x,y,z})))return true;
      // The legacy airborne sweep tests walls at torso height. A short grass
      // lip can therefore enter below the waist while the jump is still rising,
      // before the downward landing snap ever runs. Keep that horizontal move
      // outside until the feet clear the real supporting top. Do not cancel the
      // upward jump, change grounded curb traversal, or promote an overhead
      // obstacle (such as a window head) into a floor. Water retains its rules.
      if(!rising||args.water?.(x,z))return false;
      const floor=support(x,z);
      return Number.isFinite(floor)&&floor>y-.555+.012;
    }});
  };
  const hit = run(options);
  const velocity = options.velocity;
  const horizontal = {x: velocity.x, z: velocity.z};
  if (!hit.blocked) return {...hit, horizontal};
  horizontal.x = horizontal.z = 0;
  if (!options.from || hit.kind === 'sweep-limit') return {...hit, horizontal};

  let best = hit, bestDistance = 0, tangentVelocity=null;
  let samples = hit.samples || 0;
  const normal=options.blocked?.normal?.(hit.position);
  if(normal){
    const dx=options.to.x-hit.position.x,dz=options.to.z-hit.position.z;
    const inward=dx*normal.x+dz*normal.z;
    if(inward<0){
      const to={x:hit.position.x+dx-normal.x*inward,y:options.to.y,z:hit.position.z+dz-normal.z*inward};
      const candidate=run({...options,from:hit.position,to,wasGrounded:hit.grounded});
      samples+=candidate.samples||0;
      const moved=Math.hypot(candidate.position.x-hit.position.x,candidate.position.z-hit.position.z);
      if(!candidate.blocked&&moved>1e-7){
        best=candidate;bestDistance=moved;
        const into=Math.min(0,velocity.x*normal.x+velocity.z*normal.z);
        tangentVelocity={x:velocity.x-normal.x*into,z:velocity.z-normal.z*into};
      }
    }
  }
  for (const axis of ['x', 'z']) {
    const distance = options.to[axis] - hit.position[axis];
    if (Math.abs(distance) < 1e-7) continue;
    const to = {...hit.position, y: options.to.y, [axis]: options.to[axis]};
    const candidate = run({...options, from: hit.position, to, wasGrounded: hit.grounded});
    samples += candidate.samples || 0;
    const moved = Math.abs(candidate.position[axis] - hit.position[axis]);
    if (moved > bestDistance + 1e-7) {best = candidate; bestDistance = moved;tangentVelocity=null;}
  }
  for (const axis of ['x', 'z']) {
    if (Math.abs(options.to[axis] - best.position[axis]) < 1e-6) horizontal[axis] = velocity[axis];
  }
  if(tangentVelocity)Object.assign(horizontal,tangentVelocity);
  return {...best, blocked: true, horizontal, kind: bestDistance > 1e-7 ? 'slide' : hit.kind,
    stepUp: (hit.stepUp || 0) + (best === hit ? 0 : best.stepUp || 0),
    stepDown: (hit.stepDown || 0) + (best === hit ? 0 : best.stepDown || 0), samples};
}

// Walking, skating and vehicles share this normal curb allowance. It is below
// a building-wall height, while covering the raised road and park curbs.
const TRAVERSABLE_CURB_RISE = .55;

// Skate/swim retain the original slope and water rules, with bounded sampling.
// Sliding uses this same predicate; it cannot bypass an intervening wall.
export function sweepRideContact({from, to, velocity, ground, water=()=>false, blocked=()=>false}) {
  const start = from || to, length = Math.hypot(to.x-start.x, to.z-start.z);
  let samples = 0;
  const sample = (x,z) => {samples++; return ground(x,z);};
  if (length > 8 || !Number.isFinite(length)) return {position:{...start},vertical:velocity.y,blocked:true,kind:'sweep-limit',samples};
  const count = Math.max(1, Math.ceil(length/.12));
  let previous = sample(start.x,start.z), position = {...start};
  const startHeight=previous;
  // Rapier applies gravity before this sweep. At low FPS, the proposed body
  // can be below a perfectly ordinary curb even though the previous frame was
  // standing on the road. Test supported steps from that floor, not the fallen
  // proposal; zn() still performs the actual floor snap after the contact sweep.
  // Never grant this support to a jump, swim, void, or drop off a tall ledge.
  let supported=previous!=null&&!water(start.x,start.z)&&velocity.y<=.2&&Math.abs(start.y-previous-.555)<=.095;
  for (let i=1; i<=count; i++) {
    const x=start.x+(to.x-start.x)*i/count,z=start.z+(to.z-start.z)*i/count;
    const height=sample(x,z),slope=height!=null&&previous!=null&&Math.abs(height-previous)<=length/count*1.5+.03;
    const rise=height!=null&&previous!=null?height-previous:null;
    const tallStep=supported&&rise!=null&&rise>TRAVERSABLE_CURB_RISE&&!slope;
    supported=supported&&rise!=null&&rise>=-.372&&!water(x,z);
    const contactY=supported&&!tallStep?Math.max(to.y,previous+.555):to.y;
    let collision = tallStep||blocked(x,contactY,z);
    for (const [dx,dz] of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4]]) {
      if (collision) break;
      const h=sample(x+dx,z+dz);
      if (h!=null&&h>contactY+.05&&!water(x+dx,z+dz)&&!(slope&&Math.abs(h-height)<.7)) {
        // A landing can leave a side probe overlapping the neighbouring wall.
        // Permit motion away OR parallel to that existing overlap, not toward
        // it. Requiring a strictly rear probe froze skating along coping ends.
        // The centre probe and any new/higher obstacle always remain solid.
        const away=(dx!==0||dz!==0)&&length>1e-8&&dx*(to.x-start.x)+dz*(to.z-start.z)<=1e-8;
        const old=away?sample(start.x+dx,start.z+dz):null;
        const retreat=away&&old!=null&&h<=old+.012&&!water(start.x+dx,start.z+dz)&&
          (old>start.y+.05||startHeight!=null&&Math.abs(start.y-startHeight-.555)<=.095&&h<=startHeight+TRAVERSABLE_CURB_RISE+.012);
        if(!retreat)collision=true;
      }
    }
    if (collision) return {position:{...position,y:to.y},vertical:velocity.y,blocked:true,kind:'blocked',samples};
    position={x,y:to.y,z}; previous=height;
  }
  return {position,vertical:velocity.y,blocked:false,kind:'ride',samples};
}
