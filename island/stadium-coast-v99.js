import {repairCoastBoardwalk} from '../app/coast-boardwalk-boundary.js';
import {repairStadiumStairs} from '../app/island-stair-geometry.js';
import {widenIslandStadium} from '../app/island-stadium-width.js';
import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries,toCreasedNormals} from './utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {createApprovedParkPlants99} from './approved-park-plants-v99.js';
import {createSportBall103} from './sports-balls-v103.js?v=103.2';

export const layout99={version:99,revision:7,stadium:{x:181.2,z:-37,r:18,straight:34.7,tiers:8,wallRaise:1.0,platform:[181,-33.4,40.3,86],sideDoors:{count:2,openingWidth:4.8,clearWidth:4.5,clearHeight:3.68,open:true}},coast:{west:215.25,north:-76,south:13.4},umbrellas:4,loungers:6,benches:2};

function rounded(w,d,r){const s=new T.Shape(),x=-w/2,z=-d/2;
 s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
}
function capsule(r,straight,n=256){
 const p=[],h=straight/2,arc=n/2;
 for(let i=0;i<=arc;i++){const a=i/arc*Math.PI;p.push([Math.cos(a)*r,h+Math.sin(a)*r]);}
 // Exact vertices at the doorway jambs split each formerly single long
 // side quad. Both gates cut all seating tiers at the same z coordinates.
 for(const z of [2.4,0,-2.4,-h])p.push([-r,z]);
 for(let i=1;i<=arc;i++){const a=Math.PI+i/arc*Math.PI;p.push([Math.cos(a)*r,-h+Math.sin(a)*r]);}
 for(const z of [-2.4,0,2.4])p.push([r,z]);
 return p;
}

export function createStadiumCoast99({scene,terrainRoot,renderer,sample,variant}){
 const A=layout99.stadium,wallRaise=A.wallRaise,ground=sample(A.x,A.z)?.point.y;
 if(!Number.isFinite(ground)||sample(A.x,A.z).object.name!=='5_SAHIL_GRI_ZEMIN')throw Error('Stadium parcel anchor changed');
 const reference=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material;
 const original67=terrainRoot.getObjectByName('CENTER73_67');
 if(!reference?.color||!original67)throw Error('Approved grey material or 67 decal missing');
 const group=new T.Group();group.name='STADIUM_AND_COAST_V99';const source=new T.Group(),materials={};
 function mat(key,color,roughness=.64){const m=new T.MeshPhysicalMaterial({name:'STADIUM99_'+key,color,roughness,metalness:0,envMapIntensity:.34,clearcoat:.12,clearcoatRoughness:.4});materials[key]=m;return m;}
 mat('shell',reference.color);mat('edge',reference.color.clone().multiplyScalar(1.065));mat('shadow',reference.color.clone().multiplyScalar(.68));
 mat('tier','#797476');mat('seat','#8d8687');mat('glass','#829fab',.20);mat('frame','#d6c9bd');mat('turf','#7f9463',.90);mat('turfSoft','#91a276',.91);mat('ink','#eee9e1',.96);
 mat('sand','#dbc8a8',.84);mat('timber','#d8ac8c',.44);mat('timberSide','#c49d82',.51);mat('seam','#cc9f83',.64);mat('coral','#db9a98');mat('blue','#9ebccc');mat('sage','#b1c0a0');mat('yellow','#e3c58f');mat('canvas','#e8dfcf');
 const approvedTimber=scene.getObjectByName('TIMBER81_CONTINUOUS_SOFT_DECK');
 if(Array.isArray(approvedTimber?.material)){materials.timber.dispose();materials.timber=approvedTimber.material[0];}
 function put(geo,key,name,x=0,y=0,z=0,kind='solid'){
  const m=new T.Mesh(geo,materials[key]);m.position.set(x,y,z);m.name=name;m.userData.kind99=kind;source.add(m);return m;
 }
 function box(w,h,d,key,x,y,z,r=.12,name='rounded toy detail',kind='solid'){
  return put(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.44,h*.44,d*.44)),key,name,x,y,z,kind);
 }
 function slab(shape,depth,top,key,name,x=0,z=0,bevel=.10,kind='solid'){
  const g=toCreasedNormals(new T.ExtrudeGeometry(shape,{depth:Math.max(.01,depth-2*bevel),bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:20}),.68);
  g.rotateX(-Math.PI/2);return put(g,key,name,x,top-depth+bevel,z,kind);
 }
 function plate(w,d,r,depth,top,key,x,z,name,kind='solid'){return slab(rounded(w-.14,d-.14,r),depth,top,key,name,x,z,Math.min(.07,depth*.23),kind);}
 function rod(a,b,r,key,name='soft round rail',kind='solid'){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p),m=put(new T.CylinderGeometry(r,r,delta.length(),8),key,name,...p.clone().add(q).multiplyScalar(.5).toArray(),kind);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
 }
 function line(x1,z1,x2,z2,y,width=.11,key='ink',name='flat pitch marking'){
  const len=Math.hypot(x2-x1,z2-z1),m=put(new T.PlaneGeometry(width,len),key,name,(x1+x2)/2,y,(z1+z2)/2,'paint');m.rotation.set(-Math.PI/2,0,Math.atan2(x2-x1,z2-z1));return m;
 }
 // South, west and east portals are real openings through every tier.
 // The upper rim bridges them with ample physical head clearance.
 function band(ri,ro,straight,base,top,key,name,{portal=false,kind='solid',x=A.x,z=A.z}={}){
  const outside=capsule(ro,straight),inside=capsule(ri,straight),n=outside.length,p=[],ix=[];
  const vertex=(xx,yy,zz)=>{const i=p.length/3;p.push(xx,yy,zz);return i;};
  const quad=(a,b,c,d)=>ix.push(a,b,c,a,c,d);
  const omitted=i=>{const a=outside[(i+n)%n],b=outside[(i+n+1)%n];
   const south=a[1]>straight/2&&b[1]>straight/2&&Math.abs((a[0]+b[0])/2)<1.9;
   const side=Math.abs(a[0]-b[0])<1e-6&&Math.abs(a[0])>ro-.001&&Math.max(Math.abs(a[1]),Math.abs(b[1]))<=2.400001;
   return portal&&(south||side);
  };
  for(let i=0;i<n;i++){
   const j=(i+1)%n,a=outside[i],b=outside[j],c=inside[i],d=inside[j];
   if(omitted(i))continue;
   const v=[vertex(...[a[0],top,a[1]]),vertex(b[0],top,b[1]),vertex(c[0],top,c[1]),vertex(d[0],top,d[1]),vertex(a[0],base,a[1]),vertex(b[0],base,b[1]),vertex(c[0],base,c[1]),vertex(d[0],base,d[1])];
   quad(v[0],v[2],v[3],v[1]);quad(v[4],v[5],v[7],v[6]);quad(v[0],v[1],v[5],v[4]);quad(v[2],v[6],v[7],v[3]);
   // Radial end caps prevent paper-thin open edges at the entry cut.
   if(omitted(i-1))quad(v[0],v[4],v[6],v[2]);if(omitted(i+1))quad(v[1],v[3],v[7],v[5]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return put(toCreasedNormals(g,.65),key,name,x,ground,z,kind);
 }
 const [px,pz,pw,pd]=A.platform;
 plate(pw,pd,3.6,.40,ground+.20,'shell',px,pz,'stadium rounded rectangular common platform','floor');
 // Hide nothing until geometry, constraints and samplers have succeeded.
 const outline=capsule(11.8,A.straight),pitch=new T.Shape();pitch.moveTo(outline[0][0],-outline[0][1]);for(const v of outline.slice(1))pitch.lineTo(v[0],-v[1]);pitch.closePath();
 slab(pitch,.14,ground+.32,'turf','stadium continuous green pitch',A.x,A.z,.03,'floor');
 for(let i=0;i<8;i++){
  const ri=12.0+i*.63,ro=ri+.64,top=.92+i*.62;
  band(ri,ro,A.straight,.20,top,'tier','exposed seating terrace '+(i+1),{portal:true});
  band(ri+.06,ro-.08,A.straight,top,top+.12,'seat','soft continuous seat lip '+(i+1),{portal:true});
 }
 band(11.85,12.04,A.straight,.20,.65,'edge','low pitch boundary',{portal:true});
 band(17.12,18.00,A.straight,.2,5.98+wallRaise,'shell','stadium outer continuous wall',{portal:true});
 const rimShape=new T.Shape(),rimOuter=capsule(18.10,A.straight),rimInner=capsule(16.95,A.straight).reverse();
 rimShape.moveTo(rimOuter[0][0],-rimOuter[0][1]);for(const p of rimOuter.slice(1))rimShape.lineTo(p[0],-p[1]);rimShape.closePath();
 const rimHole=new T.Path();rimHole.moveTo(rimInner[0][0],-rimInner[0][1]);for(const p of rimInner.slice(1))rimHole.lineTo(p[0],-p[1]);rimHole.closePath();rimShape.holes.push(rimHole);
 slab(rimShape,.55,ground+6.47+wallRaise,'edge','pillowy stadium upper rim',A.x,A.z,.15,'overhead');
 // Clear stair aisles climb over the seating rows without a canopy.
 for(const side of [-1,1])for(let j=0;j<16;j++){
  const rr=12.02+j*.315,top=.49+(j+1)*.31;
  box(.92,.31,.36,'shell',A.x+side*rr,ground+top-.155,A.z-9,.06,'terrace stair tread');
 }
 const fieldY=ground+.355,halfW=9.5,halfD=23.4;
 const L=(x1,z1,x2,z2)=>line(A.x+x1,A.z+z1,A.x+x2,A.z+z2,fieldY);
 L(-halfW,-halfD,halfW,-halfD);L(-halfW,halfD,halfW,halfD);L(-halfW,-halfD,-halfW,halfD);L(halfW,-halfD,halfW,halfD);
 L(-halfW,0,-5.9,0);L(5.9,0,halfW,0);
 for(const sign of [-1,1]){
  const end=sign*halfD,pen=sign*(halfD-7.2),small=sign*(halfD-2.8);
  for(const [w,zz]of [[6.6,pen],[3.4,small]]){L(-w,end,-w,zz);L(w,end,w,zz);L(-w,zz,w,zz);}
  const dot=put(new T.CircleGeometry(.16,20),'ink','penalty spot',A.x,fieldY+.001,A.z+sign*(halfD-5.2),'paint');dot.rotation.x=-Math.PI/2;
  const zz=A.z+end,back=zz+sign*1.7,base=ground+.34,h=2.8,ww=6.6;
  for(const x of [A.x-ww/2,A.x+ww/2]){rod([x,base,zz],[x,base+h,zz],.095,'canvas','goal upright');rod([x,base+h,zz],[x,base+1.9,back],.045,'canvas','goal frame');rod([x,base+.03,back],[x,base+1.9,back],.04,'canvas','net support');}
  rod([A.x-ww/2,base+h,zz],[A.x+ww/2,base+h,zz],.095,'canvas','goal crossbar');
  for(let i=0;i<=12;i++)rod([A.x-ww/2+i*ww/12,base+.05,back],[A.x-ww/2+i*ww/12,base+1.9,back],.014,'canvas','goal net');
  for(let j=1;j<=6;j++)rod([A.x-ww/2,base+j*1.9/6,back],[A.x+ww/2,base+j*1.9/6,back],.014,'canvas','goal net');
 }
 // Reuse the approved clean numeral outlines, flat on the turf, no new font.
 original67.updateWorldMatrix(true,false);const decal=original67.geometry.clone().applyMatrix4(original67.matrixWorld);decal.computeBoundingBox();
 const db=decal.boundingBox,dc=db.getCenter(new T.Vector3()),scale=10.7/(db.max.x-db.min.x);
 decal.translate(-dc.x,-dc.y,-dc.z);decal.scale(scale,1,scale);put(decal,'ink','stadium flat approved 67 decal',A.x,fieldY+.007,A.z,'paint');
 // Substantial side buildings with rounded roof mouldings and recessed glass.
 for(const side of [-1,1]){
  const x=A.x+side*17.0;
  // Grow walls from their existing footings; door height and openings stay fixed.
  for(const end of [-1,1])box(4.75,5.0+wallRaise,11.8,'shell',x,ground+2.7+wallRaise/2,A.z+end*8.6,.65,'side pavilion beside open doorway');
  box(4.75,1.05+wallRaise,5.4,'shell',x,ground+4.675+wallRaise/2,A.z,.24,'doorway overhead lintel','overhead');
  plate(5.05,29.6,.85,.45,ground+5.53+wallRaise,'edge',x,A.z,'side pavilion rolled roof','overhead');
  plate(4.55,29.1,.7,.13,ground+5.68+wallRaise,'shell',x,A.z,'side pavilion roof inset','overhead');
  const outer=x+side*2.405;
  for(const z of [-10,-5,5,10]){
   box(.12,2.0,3.2,'shadow',outer,ground+3.0,A.z+z,.05,'recessed side pavilion window');
   box(.15,1.68,2.84,'glass',outer+side*.05,ground+3.0,A.z+z,.055,'blue grey side pavilion glazing');
   box(.19,1.84,.095,'edge',outer+side*.11,ground+3.0,A.z+z,.035,'window mullion');
  }
  // Open double doors swing INWARD, never into the public road or curb.
  for(const end of [-1,1]){
   box(.36,3.95,.36,'edge',outer,ground+2.175,A.z+end*2.80,.14,'rounded entrance door jamb');
   const leafX=outer-side*1.12,leafZ=A.z+end*2.57;
   box(2.15,3.48,.20,'blue',leafX,ground+2.04,leafZ,.075,'inward open opaque door leaf');
   box(1.67,1.25,.025,'glass',leafX,ground+2.93,leafZ-end*.112,.01,'door upper glass inset');
   box(1.67,.065,.04,'edge',leafX,ground+2.27,leafZ-end*.13,.025,'door glazing lower frame');
   rod([outer-side*1.94,ground+1.40,leafZ-end*.24],[outer-side*1.94,ground+1.95,leafZ-end*.24],.048,'frame','door vertical pull');
  }
  box(.40,.28,5.95,'edge',outer,ground+4.14,A.z,.12,'rounded doorway header','overhead');
  plate(8.2,4.70,.40,.12,ground+.32,'shell',A.x+side*15.85,A.z,'level side doorway passage','floor');
 }
 const entranceZ=A.z+A.straight/2+A.r+2.35;
 plate(12.5,7.5,1.5,.18,ground+.22,'edge',A.x,entranceZ,'stadium entrance landing','floor');
 for(const side of [-1,1]){
  box(3.1,4.1+wallRaise,5.3,'shell',A.x+side*4.6,ground+2.25+wallRaise/2,entranceZ,.65,'open entrance flanking pavilion');
  box(2.0,2.5,.12,'shadow',A.x+side*4.6,ground+1.95,entranceZ+2.71,.05,'ticket window recess');
  box(1.75,2.22,.15,'glass',A.x+side*4.6,ground+1.96,entranceZ+2.79,.065,'ticket window blue glass');
  box(.11,2.22,.19,'edge',A.x+side*4.6,ground+1.96,entranceZ+2.87,.035,'ticket window mullion');
 }
 plate(12.8,6.2,1.4,.60,ground+4.68+wallRaise,'edge',A.x,entranceZ,'open entrance overhead crown','overhead');
 // Walkable open tunnel is 5.5m wide; no invisible door blocks the pitch.
 plate(3.6,10.8,.6,.12,ground+.32,'shell',A.x,A.z+34.45,'clear south field access','floor');
 const stadiumStairs=repairStadiumStairs(source,A,ground);
 const stadiumWidth=widenIslandStadium(source,A);
 for(const route of stadiumStairs.routes){route.from[0]=stadiumWidth.x(route.from[0]);route.to[0]=stadiumWidth.x(route.to[0]);route.camera.p[0]=stadiumWidth.x(route.camera.p[0]);route.camera.t[0]=stadiumWidth.x(route.camera.t[0]);}
 for(const region of stadiumStairs.regions){region.minX=stadiumWidth.x(region.minX);region.maxX=stadiumWidth.x(region.maxX);}
 // Soft, contiguous sand extension fixes the existing pinched shoreline.
 // XY shape y maps to world -z, retaining the original road boundary.
 const path=new T.Shape();path.moveTo(215.45,66);path.quadraticCurveTo(215.45,75.5,223,75.5);path.lineTo(241,75.5);
 path.bezierCurveTo(252,72,242,53,237,44);path.bezierCurveTo(231,33,231,22,235,12);
 path.bezierCurveTo(239,3,248,0,248,-10);path.quadraticCurveTo(248,-13.1,242,-13.1);path.lineTo(225,-13.1);path.quadraticCurveTo(215.45,-13.1,215.45,-3);path.lineTo(215.45,66);path.closePath();
 slab(path,.50,9.07,'sand','one continuous rounded beach',0,0,.12,'floor');
 const deckCurve=new T.CatmullRomCurve3([[239,-74.0],[224,-74.0],[217.2,-69],[217.2,-53],[217.2,-30],[217.2,-7],[217.2,3],[220,10],[230,11.65],[244.8,11.65]].map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
 const N=420,W=2.65,top=9.365,bottom=8.90,pos=[],indices=[];
 const profile=[[-W/2,bottom],[-W/2,top-.11],[-W/2+.11,top],[W/2-.11,top],[W/2,top-.11],[W/2,bottom]];
 for(let i=0;i<=N;i++){
  const c=deckCurve.getPointAt(i/N),t=deckCurve.getTangentAt(i/N),nx=t.z,nz=-t.x;
  for(const [u,y]of profile)pos.push(c.x+nx*u,y,c.z+nz*u);
 }
 for(let i=0;i<N;i++)for(let j=0;j<profile.length;j++){const a=i*6+j,b=i*6+(j+1)%6,c=(i+1)*6+(j+1)%6,d=(i+1)*6+j;indices.push(a,c,b,a,d,c);}
 // End caps are separately triangulated and the profile carries bevels.
 for(const i of [0,N]){const off=i*6;for(let j=1;j<5;j++)indices.push(...(i===0?[off,off+j+1,off+j]:[off,off+j,off+j+1]));}
 const deckGeo=new T.BufferGeometry();deckGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));deckGeo.setIndex(indices);deckGeo.computeVertexNormals();
 put(deckGeo,'timber','continuous rounded coastal boardwalk',0,0,0,'floor');
 const deckLength=deckCurve.getLength();
 for(let s=2;s<deckLength-1;s+=1.5){const c=deckCurve.getPointAt(s/deckLength),t=deckCurve.getTangentAt(s/deckLength);line(c.x-t.z*1.12,c.z+t.x*1.12,c.x+t.z*1.12,c.z-t.x*1.12,top+.005,.025,'seam','quiet boardwalk joint');}
 const coastBoardwalkBoundary=repairCoastBoardwalk(source);
 function umbrella(x,z,color){
  const y=9.07,h=3.9,r=2.2;put(new T.CylinderGeometry(.55,.62,.16,32),'canvas','umbrella rounded foot',x,y+.08,z);
  rod([x,y+.12,z],[x,y+h+.4,z],.085,'timberSide','umbrella pole');
  for(let k=0;k<10;k++){
   const pp=[],ii=[],R=5,S=8;
   for(let a=0;a<=S;a++)for(let b=0;b<=R;b++){
    const angle=(k+a/S)/10*Math.PI*2,rr=r*b/R,yy=y+h+.48*(1-(rr/r)**1.35);pp.push(x+Math.cos(angle)*rr,yy,z+Math.sin(angle)*rr);
   }
   for(let a=0;a<S;a++)for(let b=0;b<R;b++){const i=a*(R+1)+b;ii.push(i,i+R+2,i+1,i,i+R+1,i+R+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);g.computeVertexNormals();
   const m=put(g,k%2?'canvas':color,'pastel striped umbrella canopy',0,0,0,'overhead');m.material.side=T.DoubleSide;
   const angle=(k+.5)/10*Math.PI*2;rod([x,y+h+.43,z],[x+Math.cos(angle)*r*.96,y+h-.04,z+Math.sin(angle)*r*.96],.025,'canvas','umbrella rib','overhead');
  }
  put(new T.SphereGeometry(.13,12,8),color,'umbrella cap',x,y+h+.52,z,'overhead');
 }
 const umbrellas=[[226,-54,'coral'],[225.6,-33,'sage'],[226.2,-13,'blue'],[238,4.4,'coral']];umbrellas.forEach(p=>umbrella(...p));
 function lounger(x,z,yaw,color){
  const pivot=new T.Group(),start=source.children.length,base=9.07;
  for(const xx of [-.65,.65]){
   rod([xx,.20,-1.0],[xx,.20,1.25],.09,'timberSide','lounger bottom rail');rod([xx,.20,-.75],[xx,1.25,-1.40],.075,'canvas','lounger recline frame');rod([xx,.20,1.15],[xx,.62,1.15],.08,'canvas','lounger foot');
  }
  box(1.4,.18,1.75,'canvas',0,.62,.36,.075,'soft lounger seat');
  const back=box(1.4,.16,1.26,color,0,.97,-1.05,.065,'reclining pastel lounger back');back.rotation.x=.55;
  box(1.15,.15,.36,'canvas',0,1.32,-1.46,.07,'rounded head pillow');
  const objects=source.children.slice(start);for(const o of objects)pivot.add(o);pivot.position.set(x,base,z);pivot.rotation.y=yaw;source.add(pivot);
 }
 for(const [x,z,yaw,color]of [[229.2,-58,.3,'coral'],[230.7,-58,.3,'canvas'],[226,-18,.45,'blue'],[228,-18,.45,'canvas'],[232,5.4,-.4,'yellow'],[233.8,6,-.4,'canvas']])lounger(x,z,yaw,color);
 // Reuse the same approved park benches, just with new placements.
 const park=scene.getObjectByName('REFERENCE_PARK_V63');
 if(!park)throw Error('Reference park must load first');
 for(const [i,p]of [[225,-64],[225,-60]].entries())for(const s of park.children.filter(m=>m.name.startsWith('P57_bench_'))){
  const m=new T.Mesh(s.geometry,s.material);m.name='COAST99_APPROVED_BENCH_'+i+'_'+s.name;m.position.set(p[0],9.05,p[1]);m.rotation.y=0;m.castShadow=true;m.receiveShadow=true;m.userData.safeShadowCaster=true;group.add(m);
 }
 // A small round shower pedestal in the north, as in the reference.
 put(new T.CylinderGeometry(.9,1.15,.18,48),'edge','beach round shower base',227,9.17,-69,'floor');
 rod([227,9.24,-69],[227,11.5,-69],.10,'shadow','beach shower upright');rod([227,11.5,-69],[227.6,11.5,-69],.10,'shadow','beach shower arm');
 put(new T.CylinderGeometry(.21,.18,.09,16),'edge','shower rose',227.6,11.45,-69);
 // Consolidate by material and function. No extra lights or render targets.
 source.updateMatrixWorld(true);const bins=new Map();
 source.traverse(m=>{if(!m.isMesh)return;const kind=m.userData.kind99,key=kind+':'+m.material.name;if(!bins.has(key))bins.set(key,{geos:[],material:m.material,kind});let geo=m.geometry.clone().applyMatrix4(m.matrixWorld);if(geo.index)geo=geo.toNonIndexed();for(const k of Object.keys(geo.attributes))if(!['position','normal'].includes(k))geo.deleteAttribute(k);bins.get(key).geos.push(geo);});
 const floors=[],solids=[],blockers=[];let draws=0,triangles=0;
 for(const [key,b]of bins){
  const geometry=mergeGeometries(b.geos);for(const g of b.geos)g.dispose();const m=new T.Mesh(geometry,b.material);m.name='S99_'+key;m.userData.kind99=b.kind;
  m.castShadow=!['floor','paint'].includes(b.kind);m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;
  if(b.kind==='paint'){m.material.polygonOffset=true;m.material.polygonOffsetFactor=-1;m.material.polygonOffsetUnits=-1;}
  group.add(m);
 }
 const football=createSportBall103({sport:'football',radius:.34});football.position.set(stadiumWidth.x(A.x+1.8),ground+.32+.34,A.z+8.2);football.traverse(m=>{if(m.isMesh)m.userData.kind99='ball';});group.add(football);
 group.updateMatrixWorld(true);
 group.traverse(m=>{if(!m.isMesh)return;draws++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;if(!Object.values(m.geometry.attributes).every(a=>a.array.every(Number.isFinite)))throw Error('Nonfinite stadium geometry');
  if(m.userData.kind99==='floor')floors.push(m);
  if(!['overhead','paint','ball'].includes(m.userData.kind99))solids.push(m);blockers.push(m);
 });
 if(draws>42||triangles>180000)throw Error('Stadium coast render budget: '+draws+'/'+triangles);
 const heightSampler=createCityHeightSampler58(solids,{cellSize:2}),floorSampler=createCityHeightSampler58(floors,{cellSize:2});
 const plants=createApprovedParkPlants99({scene,sample,name:'STADIUM99_APPROVED_PARK_PLANTS',placements:[
  {asset:'tree',x:194.8,z:5.0,scale:1.65,yaw:1.6,base:ground+.20},{asset:'tree',x:198.5,z:2.5,scale:1.4,yaw:3.2,base:ground+.20},
  {asset:'shrub',x:192.5,z:6.7,scale:1.0,yaw:.8,base:ground+.20},
 ]});
 // Retire only the blank oval placeholder after the complete model succeeds.
 // Its geometry/material stay intact for rollback; roads and curbs stay live.
 scene.add(group);group.updateMatrixWorld(true);
 terrainRoot.getObjectByName('5_SAHIL_GRI_ZEMIN').visible=false;
 const stats={...layout99,stadium:stadiumWidth.layout,islandWidth:stadiumWidth.stats,stairs:stadiumStairs,coastBoardwalk:coastBoardwalkBoundary,draws,triangles,grey:reference.color.getHexString(),foliage:plants.stats,entrance:'open south portal plus west and east double doors',pitch67:'approved flat numeral geometry',football:{position:football.position.toArray(),radius:.34,interactive:false},roadsModified:false,curbsModified:false,lighthouseModified:false,marinaModified:false,ground};
 renderer.domElement.dataset.stadiumCoast99=JSON.stringify(stats);
 return {group,stats,plants,floorSampler,heightSampler,cameraBlockers:blockers,ground:floorSampler.height,
  obstacle:(x,z)=>{const a=heightSampler.height(x,z),b=plants.obstacle(x,z);return a===null?b:b===null?a:Math.max(a,b);},
  update:(dt,camera)=>plants.update(dt,camera)};
}
