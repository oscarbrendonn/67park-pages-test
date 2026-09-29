// Opt-in LOCAL QA exercises the actual player/keyboard, not a second controller.
export function installIslandSwimQA(world){
 if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||!new URLSearchParams(location.search).has('swimQA'))return;
 const panel=document.createElement('section');panel.setAttribute('aria-label','Swimming inspection');
 panel.style.cssText='position:fixed;left:8px;top:195px;z-index:20000;padding:10px;background:#fff5e9ed;border-radius:12px;max-width:310px;max-height:65vh;overflow:auto;color:#394b43;font:12px system-ui';
 const heading=document.createElement('strong');heading.textContent='Swimming inspection';panel.append(heading);
 const report=document.createElement('pre');report.setAttribute('aria-label','Swimming results');report.style.cssText='white-space:pre-wrap;max-height:220px;overflow:auto;font:11px system-ui';
 const body=()=>window.__eggyInput?.playerRef?.body,area=world.swimBoundary,b=area.stats.bounds;
 const center=area.stats.center||{x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2};
 let cancelled=0,busy=false,result=null,observe=false,inspection=null;const held=new Set();
 const beforeRender=world.scene.onBeforeRender;
 world.scene.onBeforeRender=function(...args){beforeRender?.apply(this,args);if(inspection){world.camera.position.fromArray(inspection.p);world.camera.lookAt(...inspection.t);world.camera.updateMatrixWorld(true);}};
 const key=(code,on)=>{window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));on?held.add(code):held.delete(code);};
 const release=()=>{for(const code of [...held])key(code,false);};
 const stop=()=>{cancelled++;busy=false;release();};
 const snapshot=()=>{const p=body()?.translation(),v=body()?.linvel();return {position:p,velocity:v,speed:v?Math.hypot(v.x,v.z):null,inArea:p?area.contains(p.x,p.z):null,water:p?world.water(p.x,p.z):null,floatError:p?p.y-world.sea(p.x,p.z)-.58:null,distanceToEdge:p?area.stats.edgeRadius-Math.hypot(p.x-center.x,p.z-center.z):null,run:window.__eggyInput?.input?.run,stats:area.stats,waterTable:world.waterTable?.stats};};
 const show=()=>{const value={...snapshot(),busy,result};report.textContent=JSON.stringify(value,null,2);report.dataset.report=JSON.stringify(value);};
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const point=(x,z,wet=true)=>{const rb=body();if(!rb)return false;rb.setTranslation({x,y:(wet?world.sea(x,z):world.ground(x,z))+.58,z},true);rb.setLinvel({x:0,y:0,z:0},true);rb.setAngvel({x:0,y:0,z:0},true);return true;};
 function button(label,action){const el=document.createElement('button');el.textContent=label;el.style.cssText='margin:4px;padding:6px;border:1px solid #b7c5b8;border-radius:6px;background:white;color:#394b43';el.onclick=()=>{stop();result=null;action();show();};panel.append(el);}
 button('East water',()=>point(b.max.x+30,(b.min.z+b.max.z)/2));
 button('North limit',()=>point(center.x,center.z-area.stats.edgeRadius+.15));
 button('Circular edge',()=>{const p=area.project(b.max.x+100,b.min.z-100);point(p.x,p.z);});
 button('Park pond',()=>point(175,90));
 button('Pool water',()=>{const pool=world.pool;const p=pool?.world(0,0);if(p)point(p[0],p[1]);});
 button('Return to shore',()=>point(...[world.spawn[0],world.spawn[2]],false));
 button('Water table overview',()=>{const y=world.sea(center.x,center.z);inspection={p:[center.x,y+880,center.z+220],t:[center.x,y,center.z]};});
 button('Water edge closeup',()=>{const x=center.x+area.stats.radius,y=world.sea(x,center.z);inspection={p:[x+20,y+8,center.z+16],t:[x,y-.45,center.z]};});
 button('Follow player camera',()=>{inspection=null;});
 button('Run swim controls check',()=>{void (async()=>{
  if(!body()){result={error:'Enter the park first'};show();return;}busy=true;const id=++cancelled;
  const ok=()=>id===cancelled&&!document.hidden;
  const wait=async ms=>{await pause(ms);if(!ok())throw Error('Inspection stopped');};
  try{
   result={stage:'normal swimming'};point(b.max.x+30,(b.min.z+b.max.z)/2);await wait(350);
   key('KeyW',true);await wait(1500);const normal=snapshot();result={stage:'Shift swimming',normal};show();
   key('ShiftLeft',true);await wait(1100);const fast=snapshot();
   const dir={x:fast.velocity.x/fast.speed,z:fast.velocity.z/fast.speed};
   if(!(normal.speed>.1&&fast.speed>.1))throw Error('Player did not move; close the wardrobe and enter the park');
   release();
   const edge=area.project(center.x+dir.x*10000,center.z+dir.z*10000);
   point(edge.x-dir.x*.15,edge.z-dir.z*.15);await wait(350);
   key('KeyW',true);key('ShiftLeft',true);result={stage:'outward at boundary',normal,fast};show();
   let outside=0,frames=0;for(let i=0;i<60;i++){await wait(50);const p=body().translation();frames++;if(!area.contains(p.x,p.z)&&Math.hypot(p.x-area.project(p.x,p.z).x,p.z-area.project(p.x,p.z).z)>.2)outside++;}
   const edgeState=snapshot();release();key('KeyS',true);const retreatStart=body().translation();await wait(1400);
   const retreat=snapshot(),retreatDistance=Math.hypot(retreat.position.x-retreatStart.x,retreat.position.z-retreatStart.z);release();
   // The shipped city locomotion adapter uses 3.3 walking / 7.5 sprinting,
   // both multiplied by .42 in water. Do not compare against the old upstream
   // 1.4 multiplier, which applies to other maps / skateboarding.
   const expectedRatio=7.5/3.3;
   result={pass:outside===0&&Math.abs(fast.speed/normal.speed-expectedRatio)<.15&&retreatDistance>1&&retreat.inArea,normalSpeed:normal.speed,shiftSpeed:fast.speed,ratio:fast.speed/normal.speed,expectedRatio,boundarySamples:frames,outside,edgeState,retreatDistance,retreat};
  }catch(error){result={error:String(error)};}finally{release();busy=false;show();}
 })();});
 button('Observe controls',()=>{observe=!observe;});
 button('Stop swim test',()=>{result={stopped:true};});
 panel.append(report);document.body.append(panel);
 const timer=setInterval(()=>{if(observe||busy)show();},250);
 const leave=()=>{stop();clearInterval(timer);world.scene.onBeforeRender=beforeRender;panel.remove();};
 addEventListener('pagehide',leave,{once:true});show();
 return ()=>{leave();removeEventListener('pagehide',leave);};
}
