// Keep the world legible when a touch screen rotates. The canvas still fills
// the viewport; only its lens changes, independently of HTML control sizes.
export const MOBILE_FRAMING_REVISION='landscape-layout-1';
export function landscapeFramingScale(width,height,touch){
 if(!touch||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 1;
 // Bound very short windows (browser chrome / keyboards / split screen).
 return Math.max(1,Math.min(2.4,width/height));
}
export function createMobileViewportFraming(host=globalThis){
 const cameras=new Map();
 const pointer=host.matchMedia?.('(pointer:coarse)');
 let width=0,height=0,scale=1;
 const refresh=()=>{
  width=host.innerWidth;height=host.innerHeight;
  scale=landscapeFramingScale(width,height,!!pointer?.matches);
 };
 refresh();
 return {
  refresh,
  apply(camera){
   if(!camera?.isPerspectiveCamera||!Number.isFinite(camera.zoom)||camera.zoom<=0)return;
   let state=cameras.get(camera);
   if(!state){state={base:camera.zoom,applied:camera.zoom,scale:1};cameras.set(camera,state);}
   // Respect an explicit lens change made by the owning game; never multiply
   // our own previous result on every frame or persist it in player settings.
   if(Math.abs(camera.zoom-state.applied)>1e-8)state.base=camera.zoom;
   // Opt-in chase cameras only. A fitted bus, shooting gallery, scoreboard or
   // bird's-eye lens must not be cropped just because the phone rotated.
   const next=camera.userData?.parkPlayerFraming&&!camera.userData?.parkOverview?scale:1;
   const zoom=state.base*next;
   if(Math.abs(camera.zoom-zoom)>1e-8){camera.zoom=zoom;camera.updateProjectionMatrix();}
   state.applied=zoom;state.scale=next;
   const old=camera.userData?.mobileViewport;
   if(camera.userData&&(!old||old.scale!==next||old.width!==width||old.height!==height))
    camera.userData.mobileViewport={revision:MOBILE_FRAMING_REVISION,scale:next,width,height};
  },
  dispose(){
   for(const [camera,state] of cameras){
    if(camera.zoom===state.applied&&camera.zoom!==state.base){camera.zoom=state.base;camera.updateProjectionMatrix();}
    if(camera.userData)delete camera.userData.mobileViewport;
   }
   cameras.clear();
  }
 };
}
