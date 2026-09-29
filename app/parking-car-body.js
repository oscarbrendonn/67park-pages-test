import * as T from 'three';
import {mergeGeometries} from '../island/utils/BufferGeometryUtils.js';
import parts from './parking-car-data.js';

// Exact parked-car exterior, scaled uniformly to the existing road footprint.
// The original parking lot is never modified or registered as driveable.
export function useParkingBody(car){
 if(!['car','bus'].includes(car.kind))return car;
 const bus=car.kind==='bus';
 const k=1.21/car.spec.scale,origin=[-36.2,.155924990773201,-31.015],materials=new Map(),buckets=new Map();
 const retire=g=>{g.removeFromParent();g.traverse(m=>{if(m.isMesh)m.geometry.dispose();});};
 retire(car.model.children[0]);
 for(const w of car.wheels)retire(w.pivot);
 const exterior=new T.Group();exterior.name='SPORTS97_PARKING_CAR_EXTERIOR';car.model.add(exterior);
 const newWheels=[];
 const material=(p,roof=false)=>{
  const key=p.material+(roof?'-roof':'');if(materials.has(key))return materials.get(key);
  const glass=p.material==='SPORTS97_glass',paint=p.material==='SPORTS97_blue';
  const m=new T.MeshPhysicalMaterial({name:'parking-'+key,color:roof?car.mats.roof.color:paint?car.mats.paint.color:new T.Color().fromArray(p.color),roughness:glass?.16:p.roughness,metalness:0,clearcoat:.32,clearcoatRoughness:.25,envMapIntensity:.5,transparent:glass,opacity:glass?.32:1,depthWrite:!glass,side:glass?T.DoubleSide:T.FrontSide});
  materials.set(key,m);return m;
 };
 // Clip only the hidden cabin opening out of the bonnet/body's top face.
 // Keep every outer silhouette vertex; no solid body surface through passengers.
 const clip=(poly,axis,bound,sign)=>{
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-bound)*sign,db=(b.p[axis]-bound)*sign;
   if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({p:a.p.map((v,j)=>v+(b.p[j]-v)*t),n:a.n.map((v,j)=>v+(b.n[j]-v)*t)});}}
  return out;
 };
 for(const part of parts){
  const center=part.min.map((v,i)=>(v+part.max[i])/2),size=part.max.map((v,i)=>v-part.min[i]);
  const wheel=part.material==='SPORTS97_tyre'||(part.material==='SPORTS97_cream'&&size[0]<.3&&size[1]<.5);
  const body=part.material==='SPORTS97_blue'&&size[2]>4;
  const roof=part.material==='SPORTS97_blue'&&center[1]>1.88;
  const pillar=part.material==='SPORTS97_blue'&&size[0]<.12;
  // Reuse the car's moulded component shapes, with proper minibus proportions
  // instead of stretching a whole passenger car (including its wheels).
  const side=center[0]<origin[0]?-1:1,front=center[2]>origin[2];
  let targetSize=size,targetCenter=center;
  if(bus){
   if(wheel){targetSize=[size[0]*1.12,size[1]*(.46/.39),size[2]*(.46/.39)];targetCenter=[side*1.37,.47,front?2.15:-2.25];}
   else if(body){targetSize=[2.86,1.01,6.86];targetCenter=[0,.985,0];}
   else if(roof){targetSize=[2.86,.22,6.23];targetCenter=[0,2.61,-.06];}
   else if(pillar){targetSize=[.10,1.07,.13];targetCenter=[side*1.365,2.015,-.07];}
   else if(part.material==='SPORTS97_glass'){targetSize=[2.74,1.05,6.07];targetCenter=[0,2.005,-.07];}
   else if(part.material==='SPORTS97_blue'){targetSize=[2.58,.08,.38];targetCenter=[0,1.51,3.08];}
   else if(part.material==='SPORTS97_warm'){targetSize=[.49,.27,.14];targetCenter=[side*.9,1.04,3.455];}
   else if(part.material==='SPORTS97_rose'){targetSize=[.42,.21,.11];targetCenter=[side*.91,1.04,-3.455];}
   else if(part.material==='SPORTS97_cream'){targetSize=[2.52,.19,.18];targetCenter=[0,.61,front?3.51:-3.51];}
   else if(part.material==='SPORTS97_line'){targetSize=[.58,.18,.05];targetCenter=[0,.79,3.605];}
   else if(part.material==='SPORTS97_metal'){targetSize=[.06,.06,.29];targetCenter=[side*1.45,1.32,1.63];}
  }
  const scales=targetSize.map((s,i)=>s/size[i]);
  const pp=[],nn=[];
  const append=poly=>{for(let i=1;i+1<poly.length;i++)for(const v of [poly[0],poly[i],poly[i+1]]){pp.push(...v.p.map((x,j)=>bus?(x-center[j])*scales[j]+targetCenter[j]:(x-origin[j])*k));const n=bus?v.n.map((x,j)=>x/scales[j]):v.n,l=Math.hypot(...n)||1;nn.push(...n.map(x=>x/l));}};
  for(let i=0;i<part.positions.length;i+=9){
   const tri=[0,1,2].map(j=>({p:part.positions.slice(i+j*3,i+j*3+3),n:part.normals.slice(i+j*3,i+j*3+3)}));
   if(body&&tri.every(v=>v.n[1]>.9)){
    // Non-overlapping strips around the cabin rectangle.
    const left=bus?-37.12:-37.075,right=bus?-35.28:-35.325;
    append(clip(tri,0,left,-1));append(clip(tri,0,right,1));
    const middle=clip(clip(tri,0,left,1),0,right,-1);
    append(clip(middle,2,bus?-32.90:-32.43,-1));append(clip(middle,2,bus?-29.285:-30.19,1));
   }else if(part.material!=='SPORTS97_glass'||!tri.every(v=>Math.abs(v.n[1])>.9))append(tri);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pp,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nn,3));
  const mat=material(part,bus&&roof);
  if(wheel){
   const id=(center[0]<origin[0]?'left':'right')+(center[2]>origin[2]?'front':'back');
   let w=newWheels.find(w=>w.id===id);if(!w){const pivot=new T.Group(),roll=new T.Group();if(bus)pivot.position.fromArray(targetCenter);else pivot.position.set((center[0]-origin[0])*k,(.54-origin[1])*k,(center[2]-origin[2])*k);pivot.add(roll);exterior.add(pivot);w={id,pivot,roll,front:center[2]>origin[2]};newWheels.push(w);}
   geo.translate(-w.pivot.position.x,-w.pivot.position.y,-w.pivot.position.z);const m=new T.Mesh(geo,mat);m.castShadow=true;w.roll.add(m);
  }else{if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(geo);if(bus&&pillar)for(const z of [-2.82,-1.41,1.41,2.82])buckets.get(mat).push(geo.clone().translate(0,0,z));}
 }
 for(const [mat,geos] of buckets){const g=mergeGeometries(geos);geos.forEach(g=>g.dispose());const m=new T.Mesh(g,mat);m.name=mat.name;m.castShadow=!mat.transparent;m.receiveShadow=true;m.userData.safeShadowCaster=m.castShadow;exterior.add(m);}
 const dash=new T.Mesh(new T.BoxGeometry(bus?2.5:2.0,.12,.22),car.mats.seat);dash.position.set(0,bus?1.42:1.11,bus?2.37:.70);car.model.add(dash);
 const floor=new T.Mesh(new T.BoxGeometry(bus?2.5:2.0,.07,bus?5.84:2.6),car.mats.rubber);floor.position.set(0,bus?.47:.36,bus?-.17:-.5);car.model.add(floor);
 if(bus)for(const z of [2.99,-3.20]){const sign=new T.Mesh(new T.BoxGeometry(2.48,.26,.022),car.mats.roof);sign.position.set(0,2.31,z);car.model.add(sign);}
 const oldDispose=car.dispose;let angle=0;
 car.animate=(distance,turn)=>{car.steering.rotation.z=-turn*2.2;angle+=distance/(bus?.46*car.spec.scale:.39*1.21);for(const w of newWheels){w.pivot.rotation.y=w.front?turn:0;w.roll.rotation.x=angle;}};
 car.wheels=newWheels;car.style=bus?'sports97-family-school-bus':'sports97-parking-car-driveable';car.parkingExterior=exterior;
 car.roofUnderside=bus?2.50*car.spec.scale:(1.78-origin[1])*1.21;car.stats={draws:0,triangles:0};
 car.group.traverseVisible(m=>{if(m.isMesh){car.stats.draws++;car.stats.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});
 car.dispose=()=>{oldDispose();materials.forEach(m=>m.dispose());};
 return car;
}
