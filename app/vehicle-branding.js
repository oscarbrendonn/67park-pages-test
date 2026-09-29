import * as T from 'three';
import {RoundedBoxGeometry} from '../island/utils/RoundedBoxGeometry.js';
import {mergeGeometries} from '../island/utils/BufferGeometryUtils.js';
let logo=null,logoMaterial=null;
export function parkLogoMaterial(){
 if(!logoMaterial){
  if(typeof document!=='undefined'){
   logo=new T.TextureLoader().load('/67park-pages-test/brand/67park-logo.png');
   logo.colorSpace=T.SRGBColorSpace;
  }
  logoMaterial=new T.MeshBasicMaterial({name:'67park-colour-logo',map:logo,color:'#ffffff',transparent:true,depthWrite:false,side:T.FrontSide,toneMapped:false});
 }
 return logoMaterial;
}
export function addParkPlates(car,{bus=false}={}){
 const group=new T.Group();group.name='67PARK_COLOUR_PLATES';
 for(const side of [-1,1]){
  const sign=new T.Mesh(new T.PlaneGeometry(bus?.84:.70,bus?.267:.222),parkLogoMaterial());
  sign.name='67park-logo-'+(side===1?'front':'rear');
  sign.position.set(0,bus?.89:.965,side*(bus?3.578:2.51));sign.rotation.y=side<0?Math.PI:0;group.add(sign);
  if(bus){
   const backing=new T.Mesh(new RoundedBoxGeometry(1,.36,.045,2,.04),car.mats.roof);
   backing.position.set(0,.89,side*3.544);group.add(backing);
  }
 }
 car.model.add(group);car.plates={text:'67park',source:'brand/67park-logo.png',coloured:true,front:true,rear:true};
 return car;
}
// Keep the original factory seats, wheel axes and collision envelope intact.
export function styleParkBus(car){
 if(car.kind!=='bus')return car;
 if(car.busWheelFeedback)return car;
 car.mats.paint.color.set('#83b9b6');car.mats.roof.color.set('#f0e5cf');car.mats.cream.color.set('#e8ddc4');
 car.mats.recess.color.set('#65928f');car.mats.rubber.color.set('#414a4b');
 car.mats.glass.opacity=.28;car.mats.glass.color.set('#829fa2');
 // The rounded factory minibus has real side-window openings and a cream belt.
 const retired=[];car.model.traverse(o=>{if(o.isMesh&&o.material===car.mats.label)retired.push(o);});
 for(const old of retired){
  const badge=new T.Mesh(new T.PlaneGeometry(1.23,.39),parkLogoMaterial());
  badge.position.copy(old.position);badge.rotation.copy(old.rotation);badge.position.z+=old.position.z>0?.008:-.008;car.model.add(badge);
  old.removeFromParent();old.geometry.dispose();
 }
 // The superseded school-lettering canvas is not part of the visible bus.
 // Release it rather than retaining a second, unused badge texture/material.
 const oldLabel=car.mats.label;let retiredTextureBytes=0;
 if(oldLabel&&retired.length){
  const texture=oldLabel.map;
  if(texture){retiredTextureBytes=(texture.image?.width||0)*(texture.image?.height||0)*4;texture.dispose();texture.image=null;oldLabel.map=null;}
  oldLabel.dispose();delete car.mats.label;
 }
 // Symmetric hubs can look stationary even when their axle is rotating.
 // Three small radial vents merge into the existing rubber batch (no draw).
 let triangles=0;
 for(const wheel of car.wheels){
  const rubber=wheel.roll.children.find(m=>m.isMesh&&m.material===car.mats.rubber);
  if(!rubber)continue;
  const pieces=[rubber.geometry.index?rubber.geometry.toNonIndexed():rubber.geometry.clone()];
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3,g=new T.CircleGeometry(.022,8).toNonIndexed();g.deleteAttribute('uv');
   g.rotateY(side*Math.PI/2);g.translate(side*.155,.26*Math.cos(a),.26*Math.sin(a));pieces.push(g);triangles+=8;
  }
  const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
  if(!merged)throw Error('Bus wheel batch mismatch');
  rubber.geometry.dispose();rubber.geometry=merged;
 }
 let angle=0;
 car.animate=(distance,turn)=>{
  distance=Number.isFinite(distance)?distance:0;turn=Number.isFinite(turn)?turn:0;
  angle=(angle+distance/(car.spec.wheelRadius*car.spec.scale))%(Math.PI*2);
  for(const w of car.wheels){w.pivot.rotation.y=w.front?turn:0;w.roll.rotation.x=angle;}
  car.steering.rotation.z=-turn*2.2;
 };
 car.busWheelFeedback={vents:3,addedDraws:0,addedTriangles:triangles,retiredTextureBytes};
 car.style='67park-rounded-mint-minibus';addParkPlates(car,{bus:true});
 car.stats={draws:0,triangles:0};car.group.traverseVisible(o=>{if(o.isMesh){car.stats.draws++;car.stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 return car;
}
