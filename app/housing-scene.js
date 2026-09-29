import {Scene,Vector3} from 'three';

// First-stage scene partitioning, deliberately limited to Rose Cottage.
// Shared avatars, chat, sockets, physics and lights stay in the active scene.
// Exterior assets are retained, not disposed: leaving never needs a map reload.
export const ISOLATED_HOME='H01';
export function createHousingScene(world){
 const dormant=new Scene();dormant.name='67PARK_DORMANT_EXTERIOR';
 const moved=new Map(),restores=[],target=new Vector3();
 const lights=(world.objects||[]).filter(o=>o.isLight);
 const keep=new Set([...lights,...lights.map(l=>l.target).filter(Boolean)]);
 const sun=lights.find(l=>l.isDirectionalLight);
 const stats={active:false,enters:0,exits:0,roots:0,parkUpdatesSkipped:0,assetPolicy:'retain-exterior-for-safe-return'};
 let disposed=false,shadowWasEnabled;
 function wrap(owner,key,fn){if(!owner||typeof owner[key]!=='function')return;const original=owner[key],wrapped=function(...args){return fn.call(this,original,args)};owner[key]=wrapped;restores.push(()=>{if(owner[key]===wrapped)owner[key]=original;});}
 wrap(world,'update',function(original,args){
  if(!stats.active)return original.apply(this,args);
  stats.parkUpdatesSkipped++;
  const p=args[1]?.body?.translation?.();
  if(p&&sun?.shadow?.camera)world.shadowAnchor?.update(target.set(p.x,0,p.z),sun.shadow.camera);
 });
 wrap(world.effects,'update',function(original,[dt,options={}]){return original.call(this,stats.active?0:dt,stats.active?{...options,paused:true,active:false}:options)});
 function collect(){
  const extra=world.scene.children.filter(o=>/^(ISLAND_WATER_TABLE_|PARK_SOCIAL_TOYS$|PARK_LAUNCHERS$)/.test(o.name));
  for(const o of [...(world.objects||[]),...(world.lobbyCourts?.balls||[]).map(b=>b.object),...extra]){
   if(!o||keep.has(o)||o.parent!==world.scene||moved.has(o))continue;
   moved.set(o,o.parent);dormant.add(o);
  }
  stats.roots=moved.size;
 }
 function leave(){
  if(!stats.active)return;
  stats.active=false;
  for(const [o,parent]of moved)if(o.parent===dormant)parent.add(o);
  moved.clear();stats.roots=0;stats.exits++;
  if(shadowWasEnabled!==undefined)world.shadowCache?.setEnabled(shadowWasEnabled);
  world.shadowAnchor?.invalidate();world.shadowCache?.invalidate();
 }
 const api={
  enter(){if(disposed)throw Error('Interior scene is disposed');if(stats.active)return;stats.active=true;stats.enters++;try{collect();shadowWasEnabled=world.shadowCache?.enabled;world.shadowCache?.setEnabled(false);world.shadowAnchor?.invalidate();}catch(e){leave();throw e;}},
  step(){if(stats.active)collect();},leave,
  dispose(){if(disposed)return;leave();disposed=true;for(const f of restores.reverse())f();},
  get active(){return stats.active},stats,
 };
 wrap(world,'dispose',function(original,args){api.dispose();return original.apply(this,args)});
 return api;
}
