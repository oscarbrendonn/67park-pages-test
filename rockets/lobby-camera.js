import {FEEL_CAMERA,createCameraBoom} from '../app/feel-camera.js';
import {cameraMeshCast} from '../app/feel-camera-meshes.js';
import {beginCameraDrag,moveCameraDrag,endCameraDrag} from '../app/camera-pointer.js';
import {cameraLookDelta} from '../app/control-tuning.js';
import {readCameraZoom,changeCameraZoom,flushCameraZoom} from '../app/camera-zoom.js';
import {createCameraPresentation,FIRST_PERSON_ZOOM,firstPersonPose} from '../app/camera-presentation.js';
import {settingsOpen} from '../app/player-settings.js';
import {installRunningCameraSettings} from '../app/running-camera-settings.js';

export function createRocketCamera(canvas,enabled,onLook){
 const boom=createCameraBoom(),presentation=createCameraPresentation(),listeners=[];let drag=null,world=null;
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const allowed=()=>enabled()&&!settingsOpen()&&!document.hidden;
 const end=e=>{drag=endCameraDrag(drag,e);if(!drag)flushCameraZoom();};
 listen(canvas,'pointerdown',e=>{if(allowed()&&(e.pointerType!=='mouse'||e.button===2))drag=beginCameraDrag(e,drag,{pinch:true});});
 listen(canvas,'pointermove',e=>{if(!allowed()){end();return;}const d=moveCameraDrag(drag,e);if(!d)return;if(d.ended){end();return;}e.preventDefault();if(d.zoomScale){changeCameraZoom(readCameraZoom()*d.zoomScale);return;}const delta=cameraLookDelta(d,drag.mouse);onLook(-delta.x,delta.y);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,name,end);
 listen(canvas,'wheel',e=>{if(allowed()){e.preventDefault();changeCameraZoom(readCameraZoom()+e.deltaY*.004);}},{passive:false});
 listen(window,'park:release-controls',()=>end());listen(window,'blur',()=>end());listen(window,'pagehide',()=>end());
 listen(document,'visibilitychange',()=>{if(document.hidden)end();});
 installRunningCameraSettings();
 // This game already has the scoreboard at the running course button position.
 document.querySelector('#running-camera-settings').style.cssText='top:231px;right:20px';
 return {restore:()=>presentation.restore(),reset(){end();boom.reset();presentation.reset();},
  update(camera,visual,feet,yaw,pitch,dt,root){
   if(!world){const blockers=[];root.traverse(m=>{if(m.isMesh)blockers.push(m);});world={blockers};}
   const distance=readCameraZoom(),pose=boom.pose(feet,yaw,pitch,distance,camera.aspect,dt);
   const resolved=boom.step(pose.target,pose.position,dt,(o,d,l)=>cameraMeshCast(world,o,d,l));
   const firstPerson=distance<=FIRST_PERSON_ZOOM,view=firstPerson?firstPersonPose(feet,yaw,pitch):{position:resolved,target:pose.target};
   camera.position.set(view.position.x,view.position.y,view.position.z);camera.up.set(0,1,0);camera.lookAt(view.target.x,view.target.y,view.target.z);
   const hidden=presentation.apply(camera,visual,{firstPerson,distance:resolved.distance});
   if(camera.fov!==FEEL_CAMERA.fov){camera.fov=FEEL_CAMERA.fov;camera.updateProjectionMatrix();}
   camera.userData.rocketCamera={requestedDistance:distance,firstPerson,avatarHidden:hidden,yaw,pitch,target:view.target};return view.target;
  },dispose(){this.reset();listeners.splice(0).forEach(off=>off());}
 };
}
