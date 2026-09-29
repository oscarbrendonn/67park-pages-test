import {createCityHeightSampler58} from '../island/city-height-sampler58.js?v=drive-allocation-1';

// Stair rails were intentionally removed from the island's highest-floor
// index so approaching them would not pull a character onto the rail. Keep
// that side-contact behavior, but catch feet arriving from above on the exact
// rendered top. Two small curved ledges also need Float64 interpolation: their
// nearly vertical end bevels lose whole triangles in the large Float32 index.
export function installSkateObstacleSupport(world){
 if(!world?.scene||typeof world.ground!=='function')return null;
 if(world.skateObstacleSupport)return world.skateObstacleSupport;
 const rails=[],curbs=[];
 world.scene.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  if(/^67D_SKATEPARK_(?:STEP_RAIL_[01]|CENTER_STAIR_RAIL(?:_POST_[01])?)$/.test(mesh.name))rails.push(mesh);
  if(/^67D_SKATEPARK_STEP_CURB_[01]$/.test(mesh.name))curbs.push(mesh);
 });
 if(!rails.length&&!curbs.length)return null;
 const rail=rails.length?createCityHeightSampler58(rails,{cellSize:2}):null;
 const curb=curbs.length?createCityHeightSampler58(curbs,{cellSize:2}):null;
 const previous={ground:world.ground,sample:world.sample,characterGround:world.characterGround,characterObstacle:world.characterObstacle};
 let active=true;
 const higher=(base,top)=>top==null?base:base==null?top:Math.max(base,top);
 function ground(x,z,...args){return higher(previous.ground.call(this,x,z,...args),active?curb?.height(x,z):null);}
 function sample(x,z,...args){
  const base=previous.sample.call(this,x,z,...args),hit=active?curb?.sample(x,z):null;
  return hit&&(!base||hit.point.y>base.point.y)?hit:base;
 }
 function support(base,x,z,feet,step){
  if(!active||!Number.isFinite(feet))return base;
  const top=rail?.height(x,z);
  return top!=null&&feet+Math.max(0,step)>=top-1e-6?higher(base,top):base;
 }
 function characterGround(x,z,feet,step=.36){
  const base=previous.characterGround?previous.characterGround.call(this,x,z,feet,step):world.ground(x,z);
  return support(base,x,z,feet,step);
 }
 function characterObstacle(x,z,feet,step=.36){
  const base=previous.characterObstacle?previous.characterObstacle.call(this,x,z,feet,step):characterGround.call(this,x,z,feet,step);
  return support(base,x,z,feet,step);
 }
 world.ground=ground;if(previous.sample)world.sample=sample;
 world.characterGround=characterGround;world.characterObstacle=characterObstacle;
 const result={stats:{revision:'contact-escape-1',rails:rails.length,curbs:curbs.length,
  triangles:(rail?.stats.triangles??0)+(curb?.stats.triangles??0),bytes:(rail?.stats.bytes??0)+(curb?.stats.bytes??0),addedDrawCalls:0,perFrameRaycasts:0},
  dispose(){
   active=false;
   for(const [name,fn]of Object.entries({ground,sample,characterGround,characterObstacle}))if(world[name]===fn){
    if(previous[name])world[name]=previous[name];else delete world[name];
   }
   if(world.skateObstacleSupport===result)delete world.skateObstacleSupport;
  }};
 world.skateObstacleSupport=result;return result;
}
