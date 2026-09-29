import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Visuals conform to the existing authoritative meadow, cover and platform
// dimensions. No new invisible obstacles or downloaded textures/models.
export function createPastelArena({height,covers,platforms,spawns}){
 const root=new T.Group(),resources=new Set(),materials=new Map();
 root.name='67Park Pastel Garden Arena';
 const colors=['#efb9ca','#b8ded1','#b4d6eb','#f1dca8'];
 const mat=(color,roughness=.68)=>{const key=color+roughness;if(!materials.has(key)){const m=new T.MeshStandardMaterial({color,roughness,metalness:0});materials.set(key,m);resources.add(m);}return materials.get(key);};
 function mesh(geo,color,x,y,z){resources.add(geo);const m=new T.Mesh(geo,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 function box(w,h,d,color,x,y,z){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.18,h*.25)),color,x,y,z);}
 box(40,1,34,'#ead8be',0,-.58,0);
 const field=new T.PlaneGeometry(40,34,64,56);field.rotateX(-Math.PI/2);
 const pos=field.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,height(pos.getX(i),pos.getZ(i))+.02);field.computeVertexNormals();
 mesh(field,'#c8debc',0,0,0).name='continuous-walkable-meadow';
 function path(points,width,color,layer){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))),vertices=[],indices=[];
  // Sample across the width too, so a path follows the meadow instead of
  // cutting through its curved surface. Separate crossing paths in depth.
  const lengthSegments=160,widthSegments=16,stride=widthSegments+1;
  for(let i=0;i<=lengthSegments;i++){const p=curve.getPoint(i/lengthSegments),t=curve.getTangent(i/lengthSegments);for(let k=0;k<=widthSegments;k++){const side=k/widthSegments-.5,x=p.x-t.z*width*side,z=p.z+t.x*width*side;vertices.push(x,height(x,z)+.04+layer*.012,z);if(i<lengthSegments&&k<widthSegments){const j=i*stride+k;indices.push(j,j+1,j+stride,j+1,j+stride+1,j+stride);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const m=mesh(g,color,0,0,0);m.castShadow=false;m.name='continuous-path-'+layer;
 }
 for(const z of [-10,10])path([[-17,z],[-9,z],[-3,z*.72],[3,z*.72],[9,z],[17,z]],3.2,'#efcbd1',0);
 for(const x of [-13,13])path([[x,-14],[x*.8,-7],[x*.8,0],[x*.8,7],[x,14]],2.2,'#f4e6cf',1);
 // Wall inner faces agree with +/-18 and +/-15 simulation bounds.
 for(const z of [-15.2,15.2])box(36.8,.72,.4,'#fff1db',0,.3,z);
 for(const x of [-18.2,18.2])box(.4,.72,30.8,'#fff1db',x,.3,0);
 covers.forEach(([x,z,w,d],i)=>{
  const y=height(x,z);box(w,1.85,d,colors[i%4],x,y+.925,z).name='solid-cover-'+i;
  // A thin inset top cap, not an overlapping box face.
  const cap=mesh(new T.PlaneGeometry(w-.24,d-.24),'#fff3df',x,y+1.88,z);cap.rotation.x=-Math.PI/2;cap.castShadow=false;
 });
 for(const [i,[x,z]] of spawns.entries()){
  const y=height(x,z);mesh(new T.CylinderGeometry(1.55,1.55,.16,32),colors[i],x,y+.1,z);
  const ring=mesh(new T.RingGeometry(1.27,1.39,40),'#fff5e5',x,y+.21,z);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  // No arch behind the spawn: it intercepted the follow camera at eye height.
 }
 for(const p of platforms){
  const base=height(p.x,p.z),h=Math.max(.04,p.top-base),color=p.kind==='step'?'#f1dca8':colors[p.x<0?1:2];
  mesh(new T.CylinderGeometry(p.r,p.r,h,32),color,p.x,base+h/2,p.z).name='solid-platform-'+p.id;
  const inset=mesh(new T.CircleGeometry(p.r*.8,32),'#fff1db',p.x,p.top+.03,p.z);inset.rotation.x=-Math.PI/2;inset.castShadow=false;
 }
 // Small symmetrical landscaping OUTSIDE play bounds, not giant cover trees.
 const bushGeo=new T.SphereGeometry(1,12,8);resources.add(bushGeo);
 for(const z of [-16.25,16.25])for(const x of [-16,-8,0,8,16]){
  const b=mesh(bushGeo,'#a9cba5',x,.3,z);b.scale.set(1,.65,.55);
 }
 root.userData.pastelArena={version:1,textures:0,coverCount:covers.length,platformCount:platforms.length};
 return {root,update(){},dispose(){root.removeFromParent();for(const r of resources)r.dispose();}};
}
