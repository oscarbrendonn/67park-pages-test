import * as T from 'three';

// Assembly-only fitting. Ears, gills, horns and snouts are not skull bounds.
// The approved Gorilla fitting remains on its original path.
export function nativeItemFit(head,base,item,donorBox,position,used){
 if(base==='goril')return null;
 const cranium=head.getObjectByName(base.replace(/67$/,'')+'-traced-cranium')||head.children.find(o=>o.isMesh)||head;
 const skull=new T.Box3().setFromObject(cranium,true),size=skull.getSize(new T.Vector3()),center=skull.getCenter(new T.Vector3()),donorSize=donorBox.getSize(new T.Vector3());
 if(item.rigid==='hat'){
  const factor=size.x*(item.cap?(base==='frog67'?.44:.62):.43)/donorSize.x;
  // The propeller/stem is the cap's axis. Overall bounds include the visor;
  // centering those bounds puts the dome into the back of the skull.
  const axis=new T.Box3(),v=new T.Vector3();
  if(item.cap)for(const i of used)if(position.getY(i)>donorBox.max.y-donorSize.y*.06)axis.expandByPoint(v.fromBufferAttribute(position,i));
  const origin=donorBox.getCenter(new T.Vector3());if(!axis.isEmpty())origin.z=axis.getCenter(v).z;
  origin.y=donorBox.min.y;
  // Fin/raised-eye heads have a central protrusion, not a flat crown. Sample
  // the real skull on both sides instead of balancing the hat on the tip.
  let crown=skull.max.y;
  if(base==='shark67'||base==='frog67'){
   const ray=new T.Raycaster(),hits=[];
   for(const sign of [-1,1]){ray.set(new T.Vector3(center.x+sign*size.x*.18,skull.max.y+size.y,center.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(cranium,true)[0];if(hit)hits.push(hit.point.y);}
   if(hits.length===2)crown=Math.max(...hits);
  }
  const target=new T.Vector3(center.x,crown-donorSize.y*factor*(item.cap?.17:.10),center.z);
  return{factor,target,origin,skull};
 }
 // Separate authored eyes give a stable row despite ears/crown feathers.
 const eyes=new T.Box3();head.traverse(o=>{if(o.isMesh&&/inset-eye|closed-eye|recessed-black-orbit|single-white-eye/.test(o.name))eyes.union(new T.Box3().setFromObject(o,true))});
 if(eyes.isEmpty())return null;
 const face=new T.Box3().setFromObject(head,true),factor=size.x*.86/donorSize.x;
 return{factor,target:new T.Vector3(center.x,eyes.getCenter(new T.Vector3()).y,face.max.z+.009),origin:new T.Vector3(donorBox.getCenter(new T.Vector3()).x,donorBox.getCenter(new T.Vector3()).y,donorBox.max.z),skull};
}
