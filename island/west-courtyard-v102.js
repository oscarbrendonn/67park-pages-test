import {courtyardPaving} from '../app/courtyard-paving.js';
import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries,toCreasedNormals} from './utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {createSportBall103} from './sports-balls-v103.js?v=103.2';

// Reference: the enclosed residential block immediately WEST of the 67 plaza.
// All coordinates are world metres. Roads, curbs and prior districts stay intact.
export const courtyardLayout102={version:102,revision:3,center:[-63.5,-32.5],
 pad:{x:-63.5,z:-32.5,w:76.5,d:87},field:{x:-54,z:-30.5,w:31.8,d:19.8},
 buildings:[
  ['N1',-94,-69,12,11.8,0,'L'],['N2',-79,-69,12,11.8,0,'flat'],
  ['N3',-64,-69,12,11.8,0,'stepped'],['N4',-49,-69,12,11.8,0,'L'],['N5',-34,-69,12,11.8,0,'flat'],
  ['W1',-95,-52,14,11.8,Math.PI/2,'L'],['W2',-95,-31.5,22,11.8,Math.PI/2,'L'],['W3',-94,-11,12,11.8,Math.PI/2,'L'],
  ['S1',-93,4,12,11.8,Math.PI,'L'],['S2',-78,4,12,11.8,Math.PI,'L'],
  ['S3',-63,4,12,11.8,Math.PI,'L'],['S4',-48,4,12,11.8,Math.PI,'dome'],['S5',-33,4,12,11.8,Math.PI,'L'],
  ['INW',-72,-50.5,22,12.5,0,'dome'],['INE',-43,-50.5,22,12.5,0,'L'],
  ['IW',-79,-30.5,11.8,11.8,Math.PI/2,'dome'],['IE',-30,-30.5,18.8,8.4,-Math.PI/2,'L'],
  ['ISW',-72,-11.2,22,12.5,Math.PI,'flat'],['ISE',-43,-11.2,22,12.5,Math.PI,'dome']
 ].map(([id,x,z,w,d,yaw,roof])=>({id,x,z,w,d,yaw,roof,height:9.65}))};

function rounded(w,h,r,x=0,y=0){const s=new T.Shape(),a=x-w/2,b=y-h/2;r=Math.min(r,w/2,h/2);
 s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);
 s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);return s;
}
function extrusion(shape,depth=.12,bevel=.035,curve=6,bevelSegments=2){return toCreasedNormals(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments,steps:1,curveSegments:curve}),.7);}

export function createWestCourtyard102({scene,terrainRoot,renderer,sample,variant}){
 const layout=courtyardLayout102,anchor=sample(...layout.center);
 if(!anchor||anchor.object.name!=='5_PARSEL_ZEMIN')throw Error('West courtyard parcel anchor changed');
 const ground=anchor.point.y,reference=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material;
 if(!reference?.color)throw Error('Approved warm grey material missing');
 const shell=reference.color.clone(),palette={shell,edge:shell.clone().multiplyScalar(1.075),inset:shell.clone().multiplyScalar(.80),
  paving:shell.clone().multiplyScalar(.86),room:'#888b87',curtain:'#d6c5b8',warm:'#ead0a1',glass:'#adc5ca',
  sage:'#a4b19c',blue:'#9fb8c2',rose:'#c49fa0',brass:'#c4ab80',turf:'#718d60',key:'#91a194',rim:'#c78762',ink:'#e7e4d8'};
 const materials={};for(const [key,color]of Object.entries(palette))materials[key]=new T.MeshPhysicalMaterial({name:'COURTYARD102_'+key,color,
  metalness:0,roughness:key==='glass'?.18:key.startsWith('turf')?.92:key==='paving'?.76:.48,envMapIntensity:.40,clearcoat:key==='glass'?.4:.18,clearcoatRoughness:.35});
 materials.glass.transparent=true;materials.glass.opacity=.28;materials.glass.depthWrite=false;materials.glass.forceSinglePass=true;
 materials.warm.emissive.set('#e6c387');materials.warm.emissiveIntensity=.16;
 const source=new T.Group(),group=new T.Group();group.name='WEST_COURTYARD_V102';let windows=0,doors=0;
 const put=(parent,geo,key,x=0,y=0,z=0,name=key,kind='detail')=>{const o=new T.Mesh(geo,materials[key]);o.position.set(x,y,z);o.name=name;o.userData.kind102=kind;parent.add(o);return o;};
 const box=(g,w,h,d,key,x,y,z,r=.09,name=key,kind='detail')=>put(g,new RoundedBoxGeometry(w,h,d,1,Math.min(r,w*.43,h*.43,d*.43)),key,x,y,z,name,kind);
 const smallBox=(g,w,h,d,key,x,y,z,name)=>put(g,new T.BoxGeometry(w,h,d),key,x,y,z,name);
 function plate(g,w,d,r,h,top,key,x=0,z=0,name=key,kind='detail'){
  const geo=extrusion(rounded(w-.10,d-.10,r),h-.06,.03,10);geo.rotateX(-Math.PI/2);return put(g,geo,key,x,top-h+.03,z,name,kind);
 }
 function frame(g,w,h,t,x,y,z,key='edge'){
  const s=rounded(w,h,.20),hole=rounded(w-2*t,h-2*t,.12);s.holes.push(new T.Path(hole.getPoints(2).reverse()));
  return put(g,extrusion(s,.14,.035,2,1),key,x,y,z,'soft deep frame');
 }
 function rod(g,a,b,r,key,kind='detail'){
  const u=new T.Vector3(...a),v=new T.Vector3(...b),delta=v.clone().sub(u),o=put(g,new T.CylinderGeometry(r,r,delta.length(),8),key,...u.clone().add(v).multiplyScalar(.5).toArray(),'round detail',kind);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 }
 function window(g,x,y,lit){
  const w=2.38,h=1.92;
  // Real inset cavity: the facade is cut here; backing and curtains sit inside.
  smallBox(g,w-.08,h-.08,.07,lit?'warm':'room',x,y,-.49,'inset room backing');
  smallBox(g,w-.10,.13,.46,'inset',x,y-h/2+.015,-.21,'room sill depth');
  for(const sign of [-1,1])for(let i=0;i<2;i++)smallBox(g,.19,h-.18,.075,'curtain',x+sign*(w/2-.17-i*.13),y,-.14+i*.015,'soft curtain fold');
  if(lit){smallBox(g,.38,.12,.15,'brass',x+.36,y-h*.22,-.23,'small room table');smallBox(g,.29,.35,.12,'warm',x+.36,y-h*.10,-.22,'small warm room light');}
  frame(g,w+.38,h+.34,.19,x,y,.01);
  smallBox(g,.095,h-.03,.13,'edge',x,y,.14,'window central mullion');
  const pane=new T.ShapeGeometry(rounded(w-.04,h-.04,.12),5);put(g,pane,'glass',x,y,.12,'blue-grey clear glazing');
  smallBox(g,w+.48,.18,.48,'edge',x,y-h/2-.18,.12,'recessed window sill');windows++;
 }
 function facade(build,w,d,front,doorColor){
  const panel=rounded(w-.72,9.16,.18,0,4.92),columns=w>20?[-w*.36,-w*.14,w*.14,w*.36]:[-w*.25,w*.25];
  const entries=[];
  for(let row=0;row<3;row++)for(let i=0;i<columns.length;i++){
   const x=columns[i],y=1.98+row*3.08;panel.holes.push(new T.Path(rounded(2.38,1.92,.15,x,y).getPoints(2).reverse()));entries.push({x,y,lit:(i+row+(front?1:0))%4===0});
  }
  if(front)panel.holes.push(new T.Path(rounded(2.25,3.04,.19,0,1.92).getPoints(5).reverse()));
  put(build,extrusion(panel,.13,0,3),'shell',0,0,0,'rounded wall with actual window recesses');
  entries.forEach(p=>window(build,p.x,p.y,p.lit));
  if(front){
   box(build,2.18,2.96,.13,doorColor,0,1.92,.055,.13,'solid residential door');frame(build,2.60,3.40,.22,0,1.93,.07);
   box(build,.08,.43,.07,'brass',.68,1.79,.29,.025,'door handle');
   box(build,2.65,.15,.75,'edge',0,.31,.15,.06,'low doorstep');doors++;
  }
 }
 const buildingBounds=[];
 // Buildings are created first; the separate field follows below.
 for(const [index,p]of layout.buildings.entries()){
  const g=new T.Group();g.name='WEST102_BUILDING_'+p.id;g.position.set(p.x,ground+.10,p.z);g.rotation.y=p.yaw;source.add(g);
  const {w,d}=p,doorColor=['sage','blue','rose'][index%3];
  plate(g,w+.70,d+.70,.90,.20,.23,'inset',0,0,'soft residential foundation');
  box(g,w-1.40,9.28,d-1.40,'room',0,4.9,0,.48,'recessed interior core');
  for(const x of [-w/2+.36,w/2-.36])for(const z of [-d/2+.36,d/2-.36])box(g,.83,9.33,.83,'shell',x,4.91,z,.32,'rounded solid building corner');
  for(const [yy,hh]of [[.53,.34],[3.54,.25],[6.62,.25],[9.55,.38]])plate(g,w+.15,d+.15,.85,hh,yy,'edge',0,0,'continuous soft storey moulding');
  for(const side of [0,1,2,3]){
   const face=new T.Group();g.add(face);face.rotation.y=side*Math.PI/2;
   face.position.set(side===1?w/2-.12:side===3?-w/2+.12:0,0,side===0?d/2-.12:side===2?-d/2+.12:0);
   facade(face,side%2?d:w,side%2?w:d,side===0,doorColor);
  }
  plate(g,w+.64,d+.64,1.10,.36,9.88,'edge',0,0,'pillowy roof lower lip');
  plate(g,w+.21,d+.21,1.00,.30,10.16,'shell',0,0,'rounded upper roof moulding');
  plate(g,w-1.10,d-1.10,.78,.10,10.19,'inset',0,0,'roof recessed tray shadow');
  plate(g,w-1.52,d-1.52,.69,.11,10.24,'shell',0,0,'soft roof tray floor');
  if(p.roof==='L'){
   box(g,1.3,.45,3.1,'edge',-w*.26,10.44,-d*.23,.13,'L roof service housing');box(g,3,.45,1.25,'edge',-w*.26+.83,10.44,-d*.23+.93,.13,'L roof service return');
  }else if(p.roof==='dome'){
   const r=Math.min(3.45,w*.265,d*.265),x=w>18?w*.22:0;
   put(g,new T.CylinderGeometry(r+.28,r+.37,.30,32),'edge',x,10.39,0,'rounded dome collar');
   const dome=put(g,new T.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2),'shell',x,10.49,0,'soft toy roof dome');dome.scale.y=.82;
  }else if(p.roof==='stepped'){
   plate(g,w*.70,d*.66,1.05,.68,10.84,'edge',0,0,'stepped roof lower');plate(g,w*.55,d*.51,.85,.56,11.38,'shell',0,0,'stepped roof upper');
  }
  g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(g);buildingBounds.push({id:p.id,min:b.min.toArray(),max:b.max.toArray(),x:p.x,z:p.z,yaw:p.yaw,w:p.w+.9,d:p.d+.9,top:b.max.y});
 }
 courtyardPaving(source,materials.paving,ground);
 // Three open arches connect the north group, with individually collidable piers.
 const arcade={x:-72,z:-60.3,width:22.7,height:4.9,openings:3};
 for(let i=0;i<4;i++)box(source,.80,4.35,1.30,'edge',arcade.x-10.6+i*7.0667,ground+2.285,arcade.z,.17,'arcade pier','solid');
 for(let i=0;i<3;i++){
  const x=arcade.x-7.0667+i*7.0667,outer=3.60,inner=3.02,s=new T.Shape();
  s.absarc(0,0,outer,0,Math.PI,false);s.lineTo(-inner,0);s.absarc(0,0,inner,Math.PI,0,true);s.closePath();
  put(source,extrusion(s,.90,.06,12),'edge',x,ground+1.30,arcade.z-.45,'soft open arcade arch','overhead');
 }
 plate(source,22.8,1.95,.22,.30,ground+5.02,'shell',arcade.x,arcade.z,'arcade top coping','overhead');
 // Two-ended basketball court inside the retained 19-building residential block.
 const F=layout.field;
 plate(source,F.w+1.0,F.d+2.0,1.85,.22,ground+.24,'shell',F.x,F.z,'separate grey basketball foundation','floor');
 plate(source,F.w,F.d,1.42,.13,ground+.31,'turf',F.x,F.z,'smooth muted green basketball court','floor');
 function line(x1,z1,x2,z2){const dx=x2-x1,dz=z2-z1,o=put(source,new T.PlaneGeometry(.105,Math.hypot(dx,dz)),'ink',F.x+(x1+x2)/2,ground+.330,F.z+(z1+z2)/2,'flat basketball line','paint');o.rotation.set(-Math.PI/2,0,Math.atan2(dx,dz));}
 function arc(cx,cz,r,a0,a1,side=1){
  const pos=[],indices=[],N=96;for(let i=0;i<=N;i++){const a=a0+(a1-a0)*i/N;for(const rr of [r-.0525,r+.0525])pos.push(F.x+cx+side*Math.cos(a)*rr,ground+.331,F.z+cz+Math.sin(a)*rr);}
  for(let i=0;i<N;i++){const a=i*2;indices.push(...(side>0?[a,a+2,a+1,a+1,a+2,a+3]:[a,a+1,a+2,a+1,a+3,a+2]));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();put(source,g,'ink',0,0,0,'flat basketball arc','paint');
 }
 const fx=14,fz=7.5;line(-fx,-fz,fx,-fz);line(-fx,fz,fx,fz);line(-fx,-fz,-fx,fz);line(fx,-fz,fx,fz);line(0,-fz,0,fz);arc(0,0,1.8,0,Math.PI*2);
 const hoops=[];
 for(const side of [-1,1]){
  const end=side*fx,free=end-side*5.8;
  const key=put(source,new T.PlaneGeometry(5.8,4.9),'key',F.x+end-side*2.9,ground+.321,F.z,'muted sage basketball key','paint');key.rotation.x=-Math.PI/2;
  line(end,-2.45,free,-2.45);line(free,-2.45,free,2.45);line(free,2.45,end,2.45);arc(free,0,1.8,0,Math.PI*2);
  const angle=Math.asin(6.35/6.65),corner=side*(12.72-Math.cos(angle)*6.65);
  arc(side*12.72,0,6.65,-angle,angle,-side);line(end,-6.35,corner,-6.35);line(end,6.35,corner,6.35);
  arc(side*12.72,0,1.25,-Math.PI/2,Math.PI/2,-side);
  for(const depth of [1.8,3.0,4.2])for(const sign of [-1,1])line(end-side*depth,sign*2.45,end-side*depth,sign*2.75);
  const base=ground+.32,postX=F.x+side*15.20,boardX=F.x+side*13.25,rimX=F.x+side*12.72,rimY=base+3.65;
  box(source,.72,.18,1.24,'inset',postX,base+.09,F.z,.07,'basketball weighted rounded foot','solid');
  rod(source,[postX,base+.15,F.z],[postX,base+4.30,F.z],.12,'edge','solid');
  box(source,.42,1.62,.49,'blue',postX,base+.92,F.z,.16,'soft padded basketball upright','solid');
  rod(source,[postX,base+4.22,F.z],[boardX,base+4.22,F.z],.105,'edge','overhead');
  rod(source,[postX,base+3.32,F.z],[boardX,base+4.22,F.z],.072,'inset','overhead');
  box(source,.18,1.40,2.26,'edge',boardX,rimY+.43,F.z,.075,'rounded basketball backboard','overhead');
  box(source,.035,1.17,2.03,'blue',boardX-side*.101,rimY+.43,F.z,.013,'basketball blue-grey backboard inset','overhead');
  const front=boardX-side*.125;
  for(const sign of [-1,1])box(source,.045,.62,.055,'ink',front,rimY+.31,F.z+sign*.45,.02,'backboard target vertical','overhead');
  for(const yy of [rimY,rimY+.62])box(source,.045,.055,.955,'ink',front,yy,F.z,.02,'backboard target horizontal','overhead');
  rod(source,[front,rimY,F.z],[rimX+side*.27,rimY,F.z],.055,'rim','overhead');
  const ring=put(source,new T.TorusGeometry(.30,.042,8,40),'rim',rimX,rimY,F.z,'open orange basketball rim','overhead');ring.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++)for(const shift of [-1,1]){
   const a=i/12*Math.PI*2,b=(i+shift)/12*Math.PI*2;
   rod(source,[rimX+Math.cos(a)*.285,rimY-.025,F.z+Math.sin(a)*.285],[rimX+Math.cos(b)*.18,rimY-.48,F.z+Math.sin(b)*.18],.011,'ink','overhead');
  }
  hoops.push({side:side<0?'west':'east',rim:[rimX,rimY,F.z],rimHeight:3.65,post:[postX,base,F.z],openNet:true});
 }
 source.updateMatrixWorld(true);
 // Reject any foundation on the public road/curb. The source terrain is never cut.
 for(const p of buildingBounds){for(const x of [p.min[0],(p.min[0]+p.max[0])/2,p.max[0]])for(const z of [p.min[2],(p.min[2]+p.max[2])/2,p.max[2]]){
  const h=sample(x,z);if(!h||h.object.name!=='5_PARSEL_ZEMIN')throw Error('Residential footprint crossed parcel: '+p.id+' '+[x,z]+' '+h?.object.name);
 }}
 const bins=new Map();source.traverse(m=>{if(!m.isMesh)return;const key=m.userData.kind102+':'+m.material.name;if(!bins.has(key))bins.set(key,{material:m.material,kind:m.userData.kind102,geos:[]});let geo=m.geometry.clone().applyMatrix4(m.matrixWorld);if(geo.index)geo=geo.toNonIndexed();for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);bins.get(key).geos.push(geo);});
 const floors=[],blockers=[],solids=[];let draws=0,triangles=0;
 for(const [key,b]of bins){
  const g=mergeGeometries(b.geos);for(const a of b.geos)a.dispose();const m=new T.Mesh(g,b.material);m.name='WEST102_'+key;m.userData.kind102=b.kind;
  m.castShadow=!m.material.transparent&&!['floor','paint'].includes(b.kind);m.receiveShadow=!m.material.transparent;m.userData.safeShadowCaster=m.castShadow;
  if(b.kind==='paint'){m.material.polygonOffset=true;m.material.polygonOffsetFactor=-1;m.material.polygonOffsetUnits=-1;}
  group.add(m);draws++;triangles+=g.attributes.position.count/3;
  if(b.kind==='floor')floors.push(m);if(b.kind==='solid'||b.kind==='floor')solids.push(m);if(!m.material.transparent&&b.kind!=='paint')blockers.push(m);
  if(!g.attributes.position.array.every(Number.isFinite))throw Error('Invalid courtyard vertex');
 }
 const ball=createSportBall103({sport:'basketball',radius:.32});ball.position.set(F.x+2.8,ground+.31+.32,F.z+2.2);group.add(ball);
 ball.traverse(m=>{if(m.isMesh){draws++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});
 if(draws>38||triangles>350000){const counts={};source.traverse(m=>{if(m.isMesh)counts[m.name]=(counts[m.name]||0)+(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});throw Error('Courtyard exceeds mobile geometry budget: '+draws+'/'+triangles+' '+JSON.stringify(Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12)));}
 group.updateMatrixWorld(true);const floorSampler=createCityHeightSampler58(floors,{cellSize:3}),solidSampler=createCityHeightSampler58(solids,{cellSize:3});
 function obstacle(x,z){let h=solidSampler.height(x,z);for(const p of buildingBounds){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);if(Math.abs(dx*c-dz*s)<p.w/2&&Math.abs(dx*s+dz*c)<p.d/2)h=h===null?p.top:Math.max(h,p.top);}return h;}
 const stats={version:102,revision:3,buildings:layout.buildings.length,domes:layout.buildings.filter(p=>p.roof==='dome').length,windows,solidDoors:doors,arcadeOpenings:3,
  field:{sport:'basketball',center:[F.x,F.z],size:[F.w,F.d],playingSize:[28,15],goals:0,hoops:2,hoopDetails:hoops,separateGreyBase:true,ball:{position:ball.position.toArray(),radius:.32,interactive:false}},draws,triangles,ground,grey:shell.getHexString(),roadsModified:false,curbsModified:false,treesAdded:0};
 scene.add(group);group.updateMatrixWorld(true);source.traverse(m=>{if(m.isMesh)m.geometry.dispose();});source.clear();
 renderer.domElement.dataset.westCourtyard102=JSON.stringify(stats);
 return {group,stats,layout,buildingBounds,floorSampler,cameraBlockers:blockers,ground:floorSampler.height,obstacle};
}
