// Local ambient NPC reactions only. No damage or authority over online players.
const controllers = new Set();
const finite = p => p && [p.x,p.y,p.z].every(Number.isFinite);
const smooth = t => { t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
export function strikeParkBots(position, heading) {
  if (!finite(position) || !Number.isFinite(heading)) return false;
  for (const controller of controllers) if(controller.strike(position,heading)) return true;
  return false;
}
export function createParkBotHitController({world,actors,reducedMotion=()=>false}) {
  const reactions = new Map();
  const routeDelays = new Map();
  let time=0, lastStrike=-Infinity, disposed=false;
  const stats={hits:0,misses:0,active:0};
  const controller={stats,
    strike(player,heading){
      if(disposed || time-lastStrike<.5 || !finite(player) || !Number.isFinite(heading))return false;
      lastStrike=time;
      let target=null, nearest=2.1;
      for(const actor of actors()){
        if(!actor?.root?.visible)continue;
        const p=actor.root.position, dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);
        if(d>=nearest || Math.abs(p.y-player.y)>1.7)continue;
        // 120 degree forward cone, with a small contact allowance at arm's length.
        if(d>.35 && (dx*Math.sin(heading)+dz*Math.cos(heading))/d<.5)continue;
        nearest=d;target=actor;
      }
      if(!target){stats.misses++;return false;}
      const p=target.root.position, dx=Math.sin(heading),dz=Math.cos(heading);
      let distance=0, ground=p.y;
      // Bound displacement and validate the swept path, not only the endpoint.
      for(let step=1;step<=4;step++){
        const amount=step*.18,x=p.x+dx*amount,z=p.z+dz*amount;
        let y;
        try{y=world.ground(x,z);if(!Number.isFinite(y)||Math.abs(y-ground)>.12||world.water(x,z)||world.treeBlocked?.(x,y+.6,z))break;}catch{break;}
        distance=amount;ground=y;
      }
      const previous=reactions.get(target), fall=!!previous && time-previous.started<1.8;
      reactions.set(target,{started:time,duration:fall?1.15:.75,fall,
        origin:{x:p.x,y:p.y,z:p.z},destination:{x:p.x+dx*distance,y:ground,z:p.z+dz*distance},
        heading:target.root.rotation.y,dx,dz});
      stats.hits++;stats.active=reactions.size;
      target.entry.hits=(target.entry.hits||0)+1;
      target.entry.hitPhase=fall?'knockdown':'recoil';
      return true;
    },
    tick(dt,paused=false){if(!paused&&Number.isFinite(dt))time+=Math.max(0,Math.min(.05,dt));},
    routeTime(actor,clock,dt){
      const hit=reactions.get(actor);
      if(hit&&time-hit.started<hit.duration&&Number.isFinite(dt))routeDelays.set(actor,(routeDelays.get(actor)||0)+Math.max(0,Math.min(.05,dt)));
      return clock-(routeDelays.get(actor)||0);
    },
    sample(actor,sample){
      const hit=reactions.get(actor);if(!hit)return sample;
      const age=time-hit.started, recoverStart=hit.duration-.35;
      if(age>=hit.duration){
        actor.entry.hitPhase='ready';
        // Retain only a short combo window, bounded to the three loaded actors.
        if(age>1.8){reactions.delete(actor);stats.active=reactions.size;}
        return sample;
      }
      const push=smooth(age/.16),recover=smooth((age-recoverStart)/.35);
      const dest=hit.destination,origin=hit.origin;
      const x=origin.x+(dest.x-origin.x)*push,y=origin.y+(dest.y-origin.y)*push,z=origin.z+(dest.z-origin.z)*push;
      const amplitude=(reducedMotion()?.12:hit.fall?1.2:.38)*smooth(age/.12)*(1-recover);
      actor.entry.hitPhase=age<recoverStart?(hit.fall?'knockdown':'recoil'):'recover';
      return {...sample,position:{x:x+(sample.position.x-x)*recover,y:y+(sample.position.y-y)*recover,z:z+(sample.position.z-z)*recover},
        velocity:{x:0,y:0,z:0},speed:0,heading:hit.heading,
        hitTiltX:amplitude*(hit.dz*Math.cos(hit.heading)+hit.dx*Math.sin(hit.heading)),
        hitTiltZ:amplitude*(hit.dz*Math.sin(hit.heading)-hit.dx*Math.cos(hit.heading))};
    },
    dispose(){disposed=true;reactions.clear();routeDelays.clear();stats.active=0;controllers.delete(controller);}
  };
  controllers.add(controller);
  return controller;
}
