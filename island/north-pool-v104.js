import {repairPoolPalmGeometry,stylePoolPalms} from '../app/pool-palm-geometry.js';
import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries,toCreasedNormals} from './utils/BufferGeometryUtils.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';
import {cutPoolBasin104} from './pool-basin-cut-v104.js?v=104.2';

// Cover BOTH northwest pieces as one compound: the northern lawn and the
// southern grey carrier, including the remaining strip to the east curb.
// Local -Z (the bar end) rotates east/right; +Z entry faces west/left.
export const poolLayout104={version:104,revision:6,x:-48.66176236431434,z:-215.9680301949971,yaw:-Math.PI/2,
 width:49.8090701114925,depth:64.82352472862867,cornerRadius:1.8,
 parcel:{name:'north-two-parcels-to-inner-curb',sources:['3_CIMEN','7_KB_SPOR_CIM_TASIYICI'],west:-81.07352472862867,east:-16.25,north:-240.87256525074335,south:-191.06349513925085},
 pool:{x:0,z:4.8,width:26.4,depth:43.6,radius:2.25},loungerRows:[-13.5,-1.9,9.7,21.3],loungerX:18.85,umbrellaX:19.35,tableX:20.35,cartX:18.6,barZ:-25.1,entranceWidth:8};

export function poolTransform104(A=poolLayout104){
 const c=Math.cos(A.yaw),s=Math.sin(A.yaw);
 return {world:(u,v)=>[A.x+c*u+s*v,A.z-s*u+c*v],local:(x,z)=>[c*(x-A.x)-s*(z-A.z),s*(x-A.x)+c*(z-A.z)]};
}

function rounded(w,d,r){const s=new T.Shape(),x=-w/2,z=-d/2;
 s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.absarc(x+w-r,z+r,r,-Math.PI/2,0,false);s.lineTo(x+w,z+d-r);s.absarc(x+w-r,z+d-r,r,0,Math.PI/2,false);s.lineTo(x+r,z+d);s.absarc(x+r,z+d-r,r,Math.PI/2,Math.PI,false);s.lineTo(x,z+r);s.absarc(x+r,z+r,r,Math.PI,Math.PI*1.5,false);s.closePath();return s;
}
function insideRounded(x,z,w,d,r){const ax=Math.abs(x),az=Math.abs(z);if(ax>w/2||az>d/2)return false;return Math.hypot(Math.max(0,ax-(w/2-r)),Math.max(0,az-(d/2-r)))<=r+1e-7;}

export function createNorthPool104({scene,terrainRoot,renderer,sample,variant}){
 const A=poolLayout104,P=A.pool,anchor=sample(A.x,A.z),{world,local}=poolTransform104(A),halfW=A.width/2,halfD=A.depth/2;
 if(!/^(5_KB_SPOR_ZEMIN|7_KB_SPOR_CIM_TASIYICI)$/.test(anchor?.object.name??''))throw Error('North pool parcel anchor changed');
 const base=9.618031278848012,deck=.27,waterY=.075,bottom=-1.90,group=new T.Group(),source=new T.Group(),materials={};
 group.name='NORTH_REFERENCE_POOL_V104';group.position.set(A.x,base,A.z);group.rotation.y=A.yaw;
 const reference=terrainRoot.getObjectByName('67D_SKATEPARK_INNER_OUTER_SURFACE')?.material;
 if(!reference?.color)throw Error('Pool needs the approved soft-grey material');
 function mat(key,color,roughness=.65,extra={}){const m=new T.MeshPhysicalMaterial({name:'POOL104_'+key,color,roughness,metalness:0,envMapIntensity:.35,clearcoat:.13,clearcoatRoughness:.44,...extra});materials[key]=m;return m;}
 mat('shell',reference.color.clone().lerp(new T.Color('#ded1ba'),.23));mat('edge',reference.color.clone().lerp(new T.Color('#e8e0cd'),.40));
 mat('paving',reference.color.clone().lerp(new T.Color('#d6c9b7'),.32),.80);mat('joint','#bcb2a4',.85);mat('inset','#adada0');
 mat('tile','#5faeb0',.28);mat('tileLight','#92d1ce',.38);mat('tileSeam','#7bbebd',.55);mat('basin','#6cbfc2',.33);
 mat('coral','#e6968f');mat('blue','#83b6c4');mat('sage','#a9bb8d');mat('yellow','#e5c475');mat('canvas','#e9dfc7');mat('wood','#c5aa83');
 mat('chrome','#b3c9c7',.25,{metalness:.57});mat('shadow','#677979');mat('glass','#8babae',.22);mat('drink','#cbd38b',.27);
 mat('trunk','#b4a282');mat('leaf','#8da47a',.73);mat('leafLight','#a7b78c',.73);mat('soil','#9a9179',.94);
 const put=(geo,key,name,x=0,y=0,z=0,kind='solid')=>{const m=new T.Mesh(geo,materials[key]);m.position.set(x,y,z);m.name=name;m.userData.poolKind104=kind;source.add(m);return m;};
 function box(w,h,d,key,x,y,z,r=.10,name='rounded toy detail',kind='solid'){return put(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.44,h*.44,d*.44)),key,name,x,y,z,kind);}
 function extrude(shape,depth,top,key,x,z,name,kind='solid',bevel=.06){const g=toCreasedNormals(new T.ExtrudeGeometry(shape,{depth:Math.max(.005,depth-2*bevel),bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:18}),.70);g.rotateX(-Math.PI/2);return put(g,key,name,x,top-depth+bevel,z,kind);}
 function slab(w,d,r,depth,top,key,x,z,name,kind='solid'){return extrude(rounded(w-.10,d-.10,r),depth,top,key,x,z,name,kind,Math.min(.05,depth*.22));}
 function ring(w,d,r,thick,depth,top,key,x,z,name,kind='solid',bevel=.035){const s=rounded(w,d,r),h=rounded(w-2*thick,d-2*thick,Math.max(.1,r-thick));s.holes.push(new T.Path(h.getPoints(18).reverse()));return extrude(s,depth,top,key,x,z,name,kind,bevel);}
 function rod(a,b,r,key,name='rounded rail',kind='solid',segments=10){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),m=put(new T.CylinderGeometry(r,r,v.length(),segments),key,name,...p.clone().add(q).multiplyScalar(.5).toArray(),kind);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 function sphere(r,key,x,y,z,name='soft cap',kind='solid',scale=[1,1,1]){const m=put(new T.SphereGeometry(r,16,10),key,name,x,y,z,kind);m.scale.set(...scale);return m;}
 function curve(points,r,key,name,kind='solid',segments=36){return put(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal'),segments,r,8,false),key,name,0,0,0,kind);}
 function pivotFrom(start,x,y,z,yaw=0){const pivot=new T.Group();for(const o of source.children.slice(start))pivot.add(o);pivot.position.set(x,y,z);pivot.rotation.y=yaw;source.add(pivot);return pivot;}
 // Full-size deck with a real opening, not a blue rectangle over grass.
 const deckShape=rounded(A.width-.10,A.depth-.10,A.cornerRadius),hole=rounded(P.width+.74,P.depth+.74,P.radius+.37);
 const hp=hole.getPoints(24).reverse().map(v=>new T.Vector2(v.x,-P.z+v.y));deckShape.holes.push(new T.Path(hp));
 extrude(deckShape,1.02,deck,'paving',0,0,'single rounded pool compound platform','floor',.045);
 slab(A.entranceWidth,.82,.12,.23,.07,'edge',0,halfD-.35,'wide entrance lower threshold','floor');
 // Two continuous rounded coping bands; no grass or gaps between them.
 ring(P.width+1.34,P.depth+1.34,P.radius+.67,.65,.38,deck+.095,'edge',0,P.z,'soft continuous ivory pool coping','floor',.065);
 ring(P.width+.22,P.depth+.22,P.radius+.11,.115,.065,deck+.102,'tileLight',0,P.z,'unbroken turquoise coping pinstripe','paint',.015);
 ring(P.width+.70,P.depth+.70,P.radius+.35,.35,deck-bottom+.08,deck+.04,'tile',0,P.z,'deep rounded pool tiled side walls','solid',.025);
 slab(P.width+.06,P.depth+.06,P.radius,.18,bottom,'basin',0,P.z,'visible recessed pool floor','floor');
 ring(P.width+.04,P.depth+.04,P.radius+.02,.045,.05,waterY-.055,'tileLight',0,P.z,'submerged pale waterline tile band','paint',.008);
 // Four broad submerged steps, each below the surface and rounded at its edge.
 const steps=[];for(let i=0;i<4;i++){
  const z=P.z+P.depth/2-1.00-i*.95,top=deck-.29-i*.40,d=1.36;
  slab(P.width-2.4,d,.35,Math.max(.16,top-bottom+.08),top,'tileLight',0,z,'broad submerged entry step '+(i+1),'floor');
  box(P.width-3,.018,.025,'tileSeam',0,top+.005,z-d/2+.12,.007,'underwater rounded stair nosing','paint');steps.push({z,top,width:P.width-2.4,depth:d});
 }
 // A few quiet tile joints are visible through the water, not a noisy grid.
 for(let x=-Math.floor((P.width/2-1)/2)*2;x<P.width/2-1;x+=2)box(.017,.012,P.depth-2.5,'tileSeam',x,bottom+.014,P.z,.004,'pool floor tile joint','paint');
 for(let z=P.z-P.depth/2+2;z<P.z+P.depth/2-2;z+=2.5)box(P.width-1.8,.012,.017,'tileSeam',0,bottom+.016,z,.004,'pool floor tile joint','paint');
 // Side ladders have open space between both rails and tread-sized rungs.
 for(const side of [-1,1]){
  const start=source.children.length,z=P.z+.6;
  for(const dz of [-.57,.57])curve([[side*(P.width/2+.62),deck+.03,z+dz],[side*(P.width/2+.62),deck+1.24,z+dz],[side*(P.width/2+.28),deck+1.60,z+dz],[side*(P.width/2-.40),deck+1.20,z+dz],[side*(P.width/2-.50),bottom+.48,z+dz]],.095,'chrome','curved open stainless pool ladder rail');
  for(let j=0;j<5;j++)box(.28,.10,1.15,'chrome',side*(P.width/2-.50),bottom+.43+j*.40,z,.035,'ladder non-slip rung');
  for(const dz of [-.57,.57])put(new T.CylinderGeometry(.20,.24,.06,20),'chrome','ladder anchor foot',side*(P.width/2+.62),deck+.055,z+dz);
 }
 // Continuous low perimeter wall, with a genuinely open eight-metre entry.
 function wallShape(){const s=new T.Shape(),W=A.width-.8,D=A.depth-.8,r=A.cornerRadius-.2,t=.70,e=A.entranceWidth/2,pt=(x,z)=>s.lineTo(x,-z),q=(x,z,a,b)=>s.quadraticCurveTo(x,-z,a,-b);
  s.moveTo(-e,-D/2);pt(-W/2+r,D/2);q(-W/2,D/2,-W/2,D/2-r);pt(-W/2,-D/2+r);q(-W/2,-D/2,-W/2+r,-D/2);pt(W/2-r,-D/2);q(W/2,-D/2,W/2,-D/2+r);pt(W/2,D/2-r);q(W/2,D/2,W/2-r,D/2);pt(e,D/2);pt(e,D/2-t);
  pt(W/2-r,D/2-t);q(W/2-t,D/2-t,W/2-t,D/2-r);pt(W/2-t,-D/2+r);q(W/2-t,-D/2+t,W/2-r,-D/2+t);pt(-W/2+r,-D/2+t);q(-W/2+t,-D/2+t,-W/2+t,-D/2+r);pt(-W/2+t,D/2-r);q(-W/2+t,D/2-t,-W/2+r,D/2-t);pt(-e,D/2-t);s.closePath();return s;
 }
 extrude(wallShape(),.95,deck+.96,'edge',0,0,'unbroken rounded perimeter wall with open entrance','solid',.09);
 for(const s of [-1,1])box(.85,1.05,1.12,'edge',s*(A.entranceWidth/2+.1),deck+.49,halfD-.83,.18,'soft entrance end post');
 for(let z=-21;z<=21;z+=7)for(const s of [-1,1])box(.73,.012,.022,'joint',s*(halfW-.75),deck+.955,z,.005,'quiet wall coping joint','paint');
 for(const x of [-7,0,7])box(.022,.012,.74,'joint',x,deck+.955,-halfD+.75,.005,'quiet far wall coping joint','paint');
 // Broad cushioned loungers face the pool. Same length and spacing all round.
 function lounger(x,z,color,side){const start=source.children.length;
  for(const sx of [-.78,.78]){box(.12,.18,4.1,'wood',sx,.24,0,.06,'lounger lower frame');for(const zz of [-1.6,1.6])box(.18,.43,.18,'wood',sx,.40,zz,.06,'rounded lounger foot');}
  box(1.95,.22,4.45,'edge',0,.62,0,.105,'pillowy lounger frame');
  box(1.79,.30,2.88,color,0,.87,.58,.145,'thick pastel lounger cushion');
  const back=box(1.79,.28,1.48,color,0,1.05,-1.43,.13,'gently tilted cushioned lounger back');back.rotation.x=.26;
  const pillow=box(1.42,.23,.49,'canvas',0,1.37,-1.92,.11,'rounded loose head pillow');pillow.rotation.x=.26;
  pivotFrom(start,x,deck,z,side<0?-Math.PI/2:Math.PI/2);
 }
 function umbrella(x,z,color){const y=deck,h=4.00,r=2.60;
  put(new T.CylinderGeometry(.50,.64,.16,32),'edge','weighted rounded umbrella foot',x,y+.08,z);
  rod([x,y+.12,z],[x,y+h+.70,z],.09,'wood','umbrella mast');
  for(let k=0;k<10;k++){
   const p=[],ix=[],N=7,R=7;
   for(let a=0;a<=N;a++)for(let b=0;b<=R;b++){const f=b/R,angle=(k+a/N)*Math.PI*2/10,rr=r*f,yy=y+h+.58*(1-f**1.6)-.11*Math.sin(a/N*Math.PI)*f**6;p.push(x+rr*Math.cos(angle),yy,z+rr*Math.sin(angle));}
   for(let a=0;a<N;a++)for(let b=0;b<R;b++){const i=a*(R+1)+b;ix.push(i,i+R+2,i+1,i,i+R+1,i+R+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();
   const m=put(g,k%2?'canvas':color,'rounded striped umbrella petal',0,0,0,'overhead');m.material.side=T.DoubleSide;
   const a=(k+.5)*Math.PI*2/10;rod([x,y+h+.51,z],[x+Math.cos(a)*r*.97,y+h-.06,z+Math.sin(a)*r*.97],.025,'wood','umbrella underside rib','overhead',6);
  }
  sphere(.14,color,x,y+h+.61,z,'umbrella soft top button','overhead');
 }
 function cup(x,y,z,color,drink=true){put(new T.CylinderGeometry(.14,.115,.33,16),'canvas','little ceramic drink cup',x,y+.165,z);put(new T.CylinderGeometry(.12,.12,.014,16),color,'visible drink surface',x,y+.335,z);if(drink){rod([x-.035,y+.22,z],[x+.055,y+.61,z],.018,color,'drink straw','decor',6);sphere(.07,'sage',x+.13,y+.38,z,'small citrus garnish','decor',[1,.35,1]);}}
 for(const side of [-1,1])for(const [i,z]of A.loungerRows.entries()){
  const color=['blue','coral','sage','yellow'][i];lounger(side*A.loungerX,z,color,side);umbrella(side*A.umbrellaX,z-2.4,i%2?'yellow':'coral');
  const tx=side*A.tableX,tz=z+1.75;put(new T.CylinderGeometry(.65,.68,.13,28),'edge','round poolside table',tx,deck+.93,tz);rod([tx,deck+.12,tz],[tx,deck+.86,tz],.10,'wood','table pedestal');put(new T.CylinderGeometry(.32,.40,.10,20),'wood','table foot',tx,deck+.10,tz);cup(tx,deck+1.01,tz,color);
 }
 // Two tidy folded-towel carts, leaving both ladder approaches clear.
 for(const side of [-1,1]){const x=side*A.cartX,z=3.0;
  box(.80,.12,1.12,'wood',x,deck+.65,z,.055,'towel cart shelf');for(const dz of [-.43,.43])for(const dx of [-.30,.30]){rod([x+dx,deck+.16,z+dz],[x+dx,deck+.80,z+dz],.055,'wood','cart rounded frame');sphere(.105,'shadow',x+dx,deck+.13,z+dz,'small towel cart wheel');}
  for(let j=0;j<3;j++)box(.69,.15,.94,['blue','canvas','coral'][j],x,deck+.77+j*.15,z,.07,'folded pool towel');
 }
 // Open, toy-scale pool bar: thick rounded counter, accessible front stools,
 // an actual service opening, and a canopy with generous head clearance.
 const barZ=A.barZ;
 slab(13.1,5.25,1.4,.33,deck+.28,'edge',0,barZ+.20,'pool bar rounded floor','floor');
 slab(12.5,2.15,1.04,1.95,deck+2.06,'shell',0,barZ+1.23,'rounded pool bar counter body');
 ring(12.5,2.15,1.04,.14,.16,deck+.54,'coral',0,barZ+1.23,'counter lower coral stripe');
 ring(12.51,2.16,1.04,.145,.18,deck+.86,'blue',0,barZ+1.23,'counter turquoise band');
 slab(12.90,2.45,1.17,.24,deck+2.26,'canvas',0,barZ+1.20,'thick smooth bar worktop');
 box(12.0,2.02,.34,'shell',0,deck+1.24,barZ-2.2,.15,'bar back service wall');
 for(const s of [-1,1])box(.26,4.12,.26,'coral',s*5.85,deck+2.34,barZ-.24,.11,'awning rounded support post');
 box(13.45,.55,3.05,'blue',0,deck+4.45,barZ-1.05,.23,'thick turquoise toy awning','overhead');
 box(12.95,.10,2.72,'canvas',0,deck+4.145,barZ-1.05,.04,'awning cream underside','overhead');
 // Fridge with separate dark reveal, glassy inset and a readable pull.
 box(2.55,2.20,1.5,'shadow',-3.95,deck+1.40,barZ-1.12,.18,'back bar refrigerator');
 box(2.32,1.94,.12,'inset',-3.95,deck+1.40,barZ-.30,.08,'fridge inset door');
 box(2.06,.88,.035,'glass',-3.95,deck+1.79,barZ-.223,.016,'fridge upper blue grey pane');
 rod([-3.03,deck+.75,barZ-.14],[-3.03,deck+1.25,barZ-.14],.04,'chrome','fridge handle');
 box(6.6,.16,1.15,'wood',1.03,deck+1.97,barZ-1.34,.07,'back bar service shelf');
 for(let i=0;i<6;i++){const x=-.8+i*.52,y=deck+2.06;put(new T.CylinderGeometry(.15,.17,.47,14),i%2?'drink':'sage','pastel juice bottle body',x,y+.24,barZ-1.30);put(new T.CylinderGeometry(.072,.095,.23,12),'sage','bottle neck',x,y+.57,barZ-1.30);box(.18,.18,.025,'canvas',x,y+.28,barZ-1.13,.03,'bottle little label');}
 box(1.53,.10,.84,'chrome',3.22,deck+2.08,barZ-1.30,.14,'sink rolled edge');box(1.20,.06,.57,'shadow',3.22,deck+2.14,barZ-1.30,.14,'open dark sink basin');
 curve([[3.22,deck+2.10,barZ-1.67],[3.22,deck+2.72,barZ-1.67],[3.22,deck+2.84,barZ-1.35],[3.22,deck+2.53,barZ-1.18]],.045,'chrome','rounded bar sink faucet','solid',20);
 for(const [i,x]of [-4,-1.35,1.35,4].entries()){
  const color=['blue','coral','blue','coral'][i],z=barZ+3.12;
  put(new T.CylinderGeometry(.48,.58,.13,28),'wood','stool weighted rounded foot',x,deck+.105,z);rod([x,deck+.16,z],[x,deck+1.17,z],.11,'wood','stool pedestal');
  const rr=put(new T.TorusGeometry(.38,.042,6,24),'wood','stool circular footrest',x,deck+.50,z);rr.rotation.x=Math.PI/2;
  put(new T.CylinderGeometry(.70,.66,.15,32),'edge','stool seat rim',x,deck+1.15,z);const cushion=sphere(.69,color,x,deck+1.27,z,'soft round pastel stool cushion','solid',[1,.27,1]);
  cup(x,deck+2.26,barZ+1.77,['coral','blue','sage','yellow'][i]);
 }
 // Four potted palms specifically requested by the new pool reference.
 // Their chunky, rounded fronds are confined to this compound; park trees
 // elsewhere are not replaced or recoloured.
 function palm(x,z,turn){
  put(new T.CylinderGeometry(1.00,.77,1.12,32),'edge','rounded palm planter',x,deck+.56,z);
  const lip=put(new T.TorusGeometry(.96,.14,8,32),'canvas','planter rolled lip',x,deck+1.11,z);lip.rotation.x=Math.PI/2;
  put(new T.CylinderGeometry(.86,.86,.06,28),'soil','visible planter soil',x,deck+1.09,z);
  curve([[x,deck+1.09,z],[x+.11,deck+2.3,z],[x-.10,deck+3.85,z+.10],[x,deck+4.64,z]],.27,'trunk','soft gently curved palm trunk','solid',20);
  for(let j=0;j<7;j++){const m=put(new T.TorusGeometry(.278,.035,6,14),'wood','subtle palm trunk ring',x+.035*Math.sin(j),deck+1.36+j*.43,z);m.rotation.x=Math.PI/2;}
  for(let k=0;k<9;k++){
   const angle=turn+k*Math.PI*2/9,L=k%2?2.35:2.75,pp=[],ix=[],N=12,S=8;
   for(let i=0;i<=N;i++){
    const t=i/N,rr=L*t,cy=deck+4.67+.65*Math.sin(t*Math.PI)-.87*t*t,ww=.08+.48*Math.sin(Math.PI*t)**.75;
    for(let j=0;j<=S;j++){const a=j/S*Math.PI*2,side=ww*Math.cos(a),yy=.11*Math.sin(a)*Math.sin(Math.PI*t);pp.push(x+Math.cos(angle)*rr-Math.sin(angle)*side,cy+yy,z+Math.sin(angle)*rr+Math.cos(angle)*side);}
   }
   for(let i=0;i<N;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j;ix.push(a,a+S+1,a+1,a+1,a+S+1,a+S+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ix);g.computeVertexNormals();put(g,k%3?'leaf':'leafLight','plump rounded palm frond',0,0,0,'overhead');
  }
  sphere(.42,'leaf',x,deck+4.72,z,'palm crown','overhead',[1,.75,1]);
 }
 const palmX=halfW-3.3,palmZ=halfD-3.6;
 for(const [i,[x,z]]of [[-palmX,-palmZ],[palmX,-palmZ],[-palmX,palmZ],[palmX,palmZ]].entries())palm(x,z,i*.8);
 const palmGeometry=repairPoolPalmGeometry(source);
 palmGeometry.style=stylePoolPalms(source);
 // Merge static toy parts by material/function: no per-chair lights or
 // reflection targets, and the overhead canopy never becomes walkable.
 source.updateMatrixWorld(true);const bins=new Map();
 source.traverse(m=>{if(!m.isMesh)return;const kind=m.userData.poolKind104,key=kind+':'+m.material.name;if(!bins.has(key))bins.set(key,{geos:[],material:m.material,kind});let g=m.geometry.clone().applyMatrix4(m.matrixWorld);if(g.index)g=g.toNonIndexed();for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);bins.get(key).geos.push(g);});
 const floors=[],solids=[],blockers=[];let triangles=0;
 for(const [key,b]of bins){const g=mergeGeometries(b.geos);for(const geo of b.geos)geo.dispose();const m=new T.Mesh(g,b.material);m.name='POOL104_'+key;m.userData.poolKind104=b.kind;m.castShadow=!['floor','paint','decor'].includes(b.kind);m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;group.add(m);if(b.kind==='floor')floors.push(m);if(['solid','floor'].includes(b.kind))solids.push(m);if(!['paint','decor'].includes(b.kind))blockers.push(m);triangles+=g.attributes.position.count/3;}
 source.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
 // Real transparent recessed water; restrained moving caustics are generated
 // in a single shader rather than downloaded textures or mirror passes.
 const clock={value:0},waterMat=new T.MeshPhysicalMaterial({name:'POOL104_clear_turquoise_water',color:'#40afb6',roughness:.18,metalness:.02,transparent:true,opacity:.52,depthWrite:false,envMapIntensity:.72,clearcoat:.55,clearcoatRoughness:.22});
 waterMat.onBeforeCompile=shader=>{
  shader.uniforms.poolTime104=clock;
  shader.vertexShader='varying vec2 poolUV104;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npoolUV104=position.xz;');
  shader.fragmentShader='uniform float poolTime104;\nvarying vec2 poolUV104;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(.016*sin(poolUV104.x*1.15+poolUV104.y*.63+poolTime104*.36),.012*cos(poolUV104.y*1.43-poolUV104.x*.45-poolTime104*.29),0.0));');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat a104=sin(poolUV104.x*1.16+sin(poolUV104.y*.78+poolTime104*.23));\nfloat b104=sin(poolUV104.y*1.31+sin(poolUV104.x*.84-poolTime104*.20));\nfloat c104=pow(1.0-abs(a104*b104),19.0);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.96,.94),c104*.16);');
 };
 waterMat.customProgramCacheKey=()=> 'north-pool-water104.1';
 const wg=new T.ShapeGeometry(rounded(P.width,P.depth,P.radius),32);wg.rotateX(-Math.PI/2);
 const water=new T.Mesh(wg,waterMat);water.name='POOL104_REAL_WATER_SURFACE';water.position.set(0,waterY,P.z);water.renderOrder=3;water.receiveShadow=true;group.add(water);
 group.updateMatrixWorld(true);
 const height=createCityHeightSampler58(solids,{cellSize:2}),floor=createCityHeightSampler58(floors,{cellSize:2});
 if(bins.size+1>45||triangles>210000)throw Error('Pool render budget exceeded: '+bins.size+'/'+triangles);
 // Validate the footprint before cutting any original land. The only public
 // sidewalk contact is the unobstructed entrance threshold.
 for(const [x,z]of [[-halfW+2,-halfD+2],[halfW-2,-halfD+2],[-halfW+2,halfD-2],[halfW-2,halfD-2],[0,-halfD+1],[0,halfD-1]]){const hit=sample(...world(x,z));if(!hit||/^(5_YOL|6_BORDUR|8_YAYA_GECIDI)$/.test(hit.object.name))throw Error('Pool crossed a public road');}
 const polygon=rounded(P.width+.38,P.depth+.38,P.radius+.19).getPoints(24).map(v=>world(P.x+v.x,P.z-v.y));
 const basinCut=cutPoolBasin104(terrainRoot,polygon,base+bottom-.20);
 scene.add(group);group.updateMatrixWorld(true);
 const contains=(x,z)=>{const [u,v]=local(x,z);return insideRounded(u,v,A.width,A.depth,A.cornerRadius)||(Math.abs(u)<=A.entranceWidth/2&&v>=halfD-.8&&v<=halfD+.06);};
 const inBasin=(x,z)=>{const [u,v]=local(x,z);return insideRounded(u-P.x,v-P.z,P.width+.38,P.depth+.38,P.radius+.19);};
 const isWater=(x,z)=>{const [u,v]=local(x,z);return insideRounded(u,v-P.z,P.width,P.depth,P.radius)&&height.height(x,z)<base+waterY-.06;};
 let elapsed=0;
 function update(dt=0){elapsed+=Math.min(.10,Math.max(0,dt));clock.value=elapsed;}
 const stats={palmGeometry,version:104,revision:A.revision,variant,anchor:[A.x,base,A.z],yaw:A.yaw,platform:[A.width,A.depth],worldFootprint:[A.depth,A.width],parcel:A.parcel,orientation:'clockwise-90-horizontal',pool:{width:P.width,depth:P.depth,waterLevel:base+waterY,floorLevel:base+bottom,realRecess:true,entrySteps:4,ladders:2},loungers:8,umbrellas:8,tables:8,palms:4,bar:1,stools:4,towelCarts:2,seatingInteractive:false,draws:bins.size+1,triangles:triangles+(wg.index?.count??wg.attributes.position.count)/3,newTextures:0,newLights:0,entryWidth:8,terrainCuts:basinCut.stats,roadsMoved:false,rotationPreserved:false};
 renderer.domElement.dataset.northPool104=JSON.stringify(stats);
 return {group,stats,layout:A,world,local,steps,water,waterMat,basinCut,contains,inBasin,isWater,waterLevelAt:(x,z)=>contains(x,z)?base+waterY:null,ground:floor.height,obstacle:height.height,cameraBlockers:blockers,update,heightSampler:height,floorSampler:floor};
}
