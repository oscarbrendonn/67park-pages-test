import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from './utils/BufferGeometryUtils.js';
import {VEHICLE_DRIVER_X,vehicleSeatLayout} from './vehicle-seat-layout.js';

// Editable geometry, not a generated picture. The rounded mint car and cream
// minibus in the user's reference are the silhouette/palette references.
// Actual tyre centres in world-scaled vehicle space. Water entry uses these,
// not the much wider/longer mirror-and-bumper collision rectangle.
const contacts=(x,rear,front)=>Object.freeze([-1,1].flatMap(side=>[rear,front].map(z=>Object.freeze([side*x*1.05,z*1.05]))));
export const CAR110=Object.freeze({scale:1.05,halfWidth:1.67,halfLength:2.82,wheelbase:3.255,wheelRadius:.46,maxSpeed:7,reverseSpeed:3,step:1/120,groundContacts:contacts(1.285,-1.55,1.55)});
export const BUS110=Object.freeze({...CAR110,halfWidth:1.79,halfLength:3.87,wheelbase:4.62,maxSpeed:5.5,reverseSpeed:2.4,groundContacts:contacts(1.37,-2.25,2.15)});
const clamp=T.MathUtils.clamp;
function batch(parent){
 parent.updateMatrixWorld(true);const buckets=new Map();
 for(const m of [...parent.children]){if(!m.isMesh)continue;const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);g.deleteAttribute('uv');const a=buckets.get(m.material)||[];a.push(g);buckets.set(m.material,a);parent.remove(m);m.geometry.dispose();}
 for(const [mat,parts] of buckets){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)throw Error('Vehicle geometry batch failed');const mesh=new T.Mesh(geometry,mat);mesh.name=mat.name;mesh.castShadow=!mat.transparent;mesh.receiveShadow=true;mesh.userData.safeShadowCaster=mesh.castShadow;parent.add(mesh);}
}
function softSolid(w,h,d,r=.12){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.45,h*.45,d*.45));return g;}
function smoothExtrusion(shape,depth=.04,bevel=.018){const raw=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:14});raw.deleteAttribute('normal');raw.deleteAttribute('uv');const g=mergeVertices(raw);raw.dispose();g.computeVertexNormals();return g;}
// A soft rounded-rectangle outline; radius is independent of pane thickness.
function roundedShape(x,y,w,h,r){const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function sideGeometry(g,side,width){const p=g.attributes.position;for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i),d=p.getZ(i);p.setXYZ(i,side*(width(y,z)+d),y,z);}if(side>0){if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];}else{for(const a of Object.values(g.attributes)){for(let i=0;i<a.count;i+=3)for(let j=0;j<a.itemSize;j++){const b=(i+1)*a.itemSize+j,c=(i+2)*a.itemSize+j,v=a.array[b];a.array[b]=a.array[c];a.array[c]=v;}}}}g.computeVertexNormals();return g;}
function pillRoof(w,h,d){
 const g=smoothExtrusion(roundedShape(-w,-d,w*2,d*2,.27),.11,.05);g.rotateX(-Math.PI/2);g.translate(0,.05-h,0);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i),top=clamp((y+h)/.21,0,1);p.setY(i,y+.075*top*(1-Math.pow(Math.abs(x)/(w+.055),4))*(1-Math.pow(Math.abs(z)/(d+.055),4)));}
 g.computeVertexNormals();return g;
}

export function createCandyVehicle110({id='main-mint',color='#8ebfb5',kind='car'}={}){
 const bus=kind==='bus',spec=bus?BUS110:CAR110,group=new T.Group(),model=new T.Group();
 group.name='CANDY_'+(bus?'SCHOOL_BUS':'FOUR_SEAT_CAR')+'110_'+id;model.scale.setScalar(spec.scale);group.add(model);
 const physical=(name,color,extra={})=>new T.MeshPhysicalMaterial({name,color,metalness:0,roughness:.34,clearcoat:.36,clearcoatRoughness:.28,envMapIntensity:.50,...extra});
 const paint=bus?'#e3bc75':color;
 const mats={paint:physical('candy-body',paint),roof:physical('vanilla-roof','#ddd7c8'),cream:physical('vanilla-trim','#d8cfba'),
  rubber:physical('charcoal-rubber','#53595a',{roughness:.82,clearcoat:0}),seat:physical('soft-upholstery',bus?'#aec2b1':'#b7c7b8',{roughness:.7,clearcoat:.08}),
  glass:physical('rounded-smoky-blue-glass','#719ca6',{transparent:true,opacity:.30,depthWrite:false,side:T.DoubleSide,roughness:.17,clearcoat:.55}),
  recess:physical('quiet-panel-joints',new T.Color(paint).multiplyScalar(.64),{roughness:.6,clearcoat:.1}),
  light:physical('warm-round-headlights','#efdbab',{emissive:'#eacb96',emissiveIntensity:.12}),red:physical('strawberry-tail-lights','#ca7f79')};
 const mesh=(p,g,k,x=0,y=0,z=0)=>{const m=new T.Mesh(g,mats[k]);m.position.set(x,y,z);p.add(m);return m;};
 const box=(p,w,h,d,k,x=0,y=0,z=0,r=.1)=>mesh(p,softSolid(w,h,d,r),k,x,y,z);
 const oval=(p,k,x,y,z,sx,sy,sz)=>{const m=mesh(p,new T.SphereGeometry(1,24,14),k,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const line=(p,points,r,k,n=24)=>mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),n,r,6,false),k);
 const fixed=new T.Group();model.add(fixed);
 const width=bus?1.43:1.34,front=bus?3.43:2.40,back=bus?-3.43:-2.40,roofY=bus?2.62:2.075;
 box(fixed,width*1.60,.18,front-back-.70,'rubber',0,.32,0,.075);
 box(fixed,width*1.73,.034,bus?5.84:3.01,'rubber',0,.375,bus?-.17:-.48,.016);
 if(!bus){
  // Puffy rounded bonnet and tail: no rectangular glass cuboid on a slab.
  box(fixed,2.70,.81,1.84,'paint',0,.85,1.50,.36);
  box(fixed,2.70,.77,1.09,'paint',0,.84,-1.93,.34);
  for(const side of [-1,1]){
   box(fixed,.255,.80,3.17,'paint',side*1.235,.85,-.42,.11);
   line(fixed,[[side*1.34,1.17,.64],[side*1.35,.80,.63],[side*1.35,.56,.46],[side*1.35,.55,-.43],[side*1.35,.80,-.54],[side*1.33,1.16,-.54]],.008,'recess');
   line(fixed,[[side*1.33,1.15,-.60],[side*1.35,.72,-.59],[side*1.35,.56,-.77],[side*1.35,.56,-1.57],[side*1.34,.86,-1.75]],.008,'recess');
   for(const z of [-.35,-1.53])box(fixed,.045,.064,.24,'cream',side*1.37,1.085,z,.025);
  }
 }else{
  box(fixed,2.86,1.06,1.01,'paint',0,.98,2.99,.43);
  box(fixed,2.86,1.15,.59,'paint',0,1.00,-3.20,.24);
  for(const side of [-1,1])box(fixed,.25,1.02,5.72,'paint',side*1.31,.99,-.08,.11);
  // Cream waist stripe is part of the moulded minibus shell.
  for(const side of [-1,1])box(fixed,.035,.12,6.12,'cream',side*1.453,1.29,-.04,.016);
  for(const side of [-1,1]){
   line(fixed,[[side*1.443,1.31,1.36],[side*1.451,.65,1.36],[side*1.451,.52,1.52],[side*1.451,.52,2.52],[side*1.443,1.31,2.67]],.009,'recess');
   box(fixed,.039,.077,.25,'cream',side*1.46,1.10,1.60,.018);
  }
  box(fixed,2.57,.26,.13,'roof',0,2.31,2.94,.05);
  box(fixed,2.60,.25,.13,'roof',0,2.31,-3.15,.05);
 }
 // Curved side frame with actual empty window openings. All four car seats
 // can be seen through the rolled-down panes; front/rear screens are thin.
 const outline=new T.Shape(),holes=[];
 const cabinWidth=bus?(y=>1.405-.07*clamp((y-1.37)/1.13,0,1)):(y=>1.305-.10*clamp((y-1.17)/.78,0,1));
 if(bus){
  outline.moveTo(-3.14,1.32);outline.lineTo(2.98,1.32);outline.quadraticCurveTo(3.19,1.36,3.13,1.60);outline.lineTo(2.91,2.32);outline.quadraticCurveTo(2.86,2.53,2.58,2.53);outline.lineTo(-2.83,2.53);outline.quadraticCurveTo(-3.14,2.53,-3.14,2.23);outline.closePath();
  for(const z of [-2.99,-1.53,-.07,1.39])holes.push(roundedShape(z,1.48,1.26,.90,.19));
 }else{
  outline.moveTo(-2.02,1.15);outline.quadraticCurveTo(-2.17,1.17,-2.04,1.43);outline.bezierCurveTo(-1.90,1.72,-1.76,2.00,-1.44,2.00);outline.lineTo(.02,2.00);outline.bezierCurveTo(.35,2.00,.58,1.81,.83,1.46);outline.quadraticCurveTo(1.01,1.17,.81,1.15);outline.closePath();
  const f=new T.Shape();f.moveTo(-.39,1.26);f.lineTo(.64,1.26);f.quadraticCurveTo(.80,1.26,.68,1.43);f.bezierCurveTo(.43,1.76,.31,1.88,.06,1.88);f.lineTo(-.39,1.88);f.quadraticCurveTo(-.48,1.88,-.48,1.79);f.lineTo(-.48,1.35);f.quadraticCurveTo(-.48,1.26,-.39,1.26);
  const r=new T.Shape();r.moveTo(-1.90,1.26);r.lineTo(-.66,1.26);r.quadraticCurveTo(-.58,1.26,-.58,1.34);r.lineTo(-.58,1.80);r.quadraticCurveTo(-.58,1.88,-.68,1.88);r.lineTo(-1.43,1.88);r.quadraticCurveTo(-1.65,1.88,-1.83,1.53);r.quadraticCurveTo(-1.99,1.26,-1.90,1.26);holes.push(f,r);
 }
 for(const h of holes)outline.holes.push(new T.Path(h.getPoints(16)));
 for(const side of [-1,1]){
  const g=sideGeometry(smoothExtrusion(outline),side,cabinWidth);
  if(!bus){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+.095*clamp((p.getY(i)-1.35)/.65,0,1));g.computeVertexNormals();}
  mesh(fixed,g,'paint');
 }
 mesh(fixed,pillRoof(bus?1.43:1.28,bus?.17:.145,bus?3.13:1.085),'roof',0,roofY,bus?-.06:-.60);
 function windscreen(rear){
  const p=[],ix=[],nx=26,ny=14;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const v=j/ny,u=i/nx*2-1,r=.12,edge=Math.min(v,1-v),round=edge<r?r-Math.sqrt(Math.max(0,r*r-(edge-r)**2)):0;
   const w=(bus?1.34:T.MathUtils.lerp(1.27,1.12,v))-round;
   const y=bus?T.MathUtils.lerp(1.48,2.50,v):T.MathUtils.lerp(1.245,2.07,v);
   let z=bus?(rear?-3.17:T.MathUtils.lerp(3.13,2.80,v)):(rear?T.MathUtils.lerp(-2.01,-1.57,v):T.MathUtils.lerp(.91,.19,v));
   z+=(rear?-1:1)*.105*(1-u*u)*Math.sin(v*Math.PI);
   p.push(u*w,y,z);if(i<nx&&j<ny){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.push(a,b,d,a,d,c);}
  }const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
 }
 mesh(fixed,windscreen(false),'glass');mesh(fixed,windscreen(true),'glass');
 const wheelZ=bus?[-2.25,2.15]:[-1.55,1.55];
 for(const side of [-1,1]){
  for(const z of wheelZ){
   const pts=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;pts.push([side*(width+.025),.48+Math.sin(a)*.50,z+Math.cos(a)*.50]);}line(fixed,pts,.046,'paint');
  }
  box(fixed,.20,.075,.16,'paint',side*(width+.035),bus?1.72:1.31,bus?2.7:.62,.03);
  oval(fixed,'paint',side*(width+.115),bus?1.74:1.34,bus?2.65:.59,.12,.10,.17);
  oval(fixed,'glass',side*(width+.117),bus?1.74:1.34,bus?2.515:.455,.084,.07,.024);
 }
 // Round cream-rimmed lamps and tiny moulded details; no noisy chrome kit.
 for(const side of [-1,1]){
  oval(fixed,'cream',side*(bus?.88:.87),.94,front+.035,.265,.243,.093);
  oval(fixed,'light',side*(bus?.88:.87),.95,front+.11,.212,.192,.049);
  oval(fixed,'cream',side*1.03,.91,back-.035,.16,.215,.070);
  oval(fixed,'red',side*1.03,.92,back-.092,.111,.158,.035);
 }
 for(const z of [front+.12,back-.12])box(fixed,bus?2.55:2.36,.17,.18,'cream',0,.49,z,.075);
 oval(fixed,'cream',0,1.20,front+.025,.071,.071,.025);
 box(fixed,.66,.115,.032,'rubber',0,.71,front+.067,.014);
 for(const x of [-.17,0,.17])box(fixed,.032,.073,.022,'cream',x,.71,front+.09,.01);
 box(fixed,.43,.12,.035,'cream',0,.52,front+.217,.016);
 // A low dashboard, never a solid glazed cabin. The wheel moves with the
 // actual driver's hand contact; four separate cushions support four bodies.
 const dashboardZ=bus?2.37:.65;
 box(fixed,width*1.77,.14,.36,'seat',0,bus?1.42:1.10,dashboardZ,.064);
 box(fixed,.31,.13,.045,'rubber',VEHICLE_DRIVER_X,bus?1.54:1.18,dashboardZ-.06,.019);
 const seats=[];
 for(const {x,y,z,side,row,label} of vehicleSeatLayout(kind)){
  const sg=new T.Group();sg.name='real-seat-'+seats.length;model.add(sg);
  box(sg,.94,.20,.68,'seat',x,y-.10,z,.085);
  box(sg,.94,.52,.16,'seat',x,y+.19,z-.32,.069);
  box(sg,.50,.22,.17,'cream',x,y+.51,z-.325,.074);
  batch(sg);
  const fr=box(model,.82,.07,.48,'rubber',x,bus?.80:.40,z+.28,.032);fr.name='seat-foot-platform-'+seats.length;fr.castShadow=true;
  const base=new T.Vector3(x,y,z).multiplyScalar(spec.scale);
  seats.push({index:seats.length,role:seats.length?'passenger':'driver',side,row,label,group:sg,footRest:fr,position:base.clone(),base,rig:null});
 }
 batch(fixed);
 const wheels=[];
 for(const side of [-1,1])for(const z of wheelZ){
  const pivot=new T.Group(),roll=new T.Group();pivot.position.set(side*(width-.06),.47,z);pivot.add(roll);model.add(pivot);
  const profile=[[.27,-.15],[.38,-.175],[.43,-.13],[.46,-.065],[.46,.065],[.43,.13],[.38,.175],[.27,.15]].map(a=>new T.Vector2(...a));
  const tyre=mesh(roll,new T.LatheGeometry(profile,32),'rubber');tyre.rotation.z=Math.PI/2;
  const whitewall=mesh(roll,new T.CylinderGeometry(.325,.325,.305,28),'cream');whitewall.rotation.z=Math.PI/2;
  const hub=mesh(roll,new T.SphereGeometry(1,24,12),'paint');hub.scale.set(.172,.231,.231);
  const cap=mesh(roll,new T.CylinderGeometry(.082,.082,.353,20),'cream');cap.rotation.z=Math.PI/2;
  batch(roll);wheels.push({pivot,roll,front:z>0});
 }
 const steering=new T.Group();steering.position.set(VEHICLE_DRIVER_X,bus?1.50:1.12,bus?2.10:.47);steering.rotation.x=-.3;model.add(steering);
 mesh(steering,new T.TorusGeometry(.23,.038,8,28),'cream');for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const r=box(steering,.032,.23,.032,'cream',Math.sin(a)*.09,Math.cos(a)*.09,0,.01);r.rotation.z=-a;}batch(steering);
 const column=mesh(model,new T.CylinderGeometry(.036,.041,1,8),'cream');
 const end=new T.Vector3(VEHICLE_DRIVER_X,bus?1.49:1.13,dashboardZ),delta=end.clone().sub(steering.position);column.position.copy(steering.position).add(end).multiplyScalar(.5);column.scale.y=delta.length();column.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
 const textures=[];
 if(bus&&typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ded7c8';ctx.fillRect(0,0,512,96);ctx.fillStyle='#655d4d';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 39px system-ui';ctx.fillText('SCHOOL BUS',256,48);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);
  const labelMat=new T.MeshStandardMaterial({name:'school-service-lettering',map:tex,roughness:.7});mats.label=labelMat;
  for(const [z,rot] of [[3.009,0],[-3.219,Math.PI]]){const m=new T.Mesh(new T.PlaneGeometry(1.62,.22),labelMat);m.position.set(0,2.31,z);m.rotation.y=rot;model.add(m);}
 }
 const occupants=new Map(),riders=new Map();let rollAngle=0;
 const stats={draws:0,triangles:0};group.updateMatrixWorld(true);group.traverse(o=>{if(o.isMesh){stats.draws++;stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 const car={id,kind,spec,group,model,mats,seats,capacity:seats.length,riders,wheels,steering,column,stats,style:'candy-reference-v110',dashboardZ,
  seat:seats[0].position,baseSeat:seats[0].base,driverSeat:seats[0].group,footRest:seats[0].footRest,
  floorTop:(bus?.47:.393)*spec.scale,roofUnderside:(bus?2.435:1.92)*spec.scale,
  claimSeat(index,owner){if(!Number.isInteger(index)||index<0||index>=seats.length||typeof owner!=='string'||!owner)return false;if(occupants.has(index))return occupants.get(index)===owner;if([...occupants.values()].includes(owner))return false;occupants.set(index,owner);return true;},
  releaseSeat(index,owner){if(occupants.get(index)!==owner)return false;riders.delete(index);return occupants.delete(index);},
  ownerAt:index=>occupants.get(index)??null,
  canDrive:owner=>typeof owner==='string'&&occupants.get(0)===owner,
  availableSeat(preferDriver=true){if(preferDriver&&!occupants.has(0))return 0;return seats.findIndex((s,i)=>i>0&&!occupants.has(i));},
  seatStatus:()=>({capacity:seats.length,occupied:[...occupants.keys()],driver:occupants.get(0)??null,multiplayer:false}),
  animate(distance,turn){rollAngle+=distance/(spec.wheelRadius*spec.scale);for(const w of wheels){w.pivot.rotation.y=w.front?turn:0;w.roll.rotation.x=rollAngle;}steering.rotation.z=-turn*2.2;},
  dispose(){group.removeFromParent();group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});Object.values(mats).forEach(m=>m.dispose());textures.forEach(t=>t.dispose());occupants.clear();riders.clear();}
 };return car;
}
