import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
import {finishCityMaterial60} from './city-props-v60.js';
import {createCityHeightSampler58} from './city-height-sampler58.js';

// The latest user photo: one soft peach promenade and exactly three plain
// straight arms. No miniature finger piers, plank grid or contrasting frame.
// Every arm is generated from this one frozen profile, never per-arm sizes.
export const pierProfile81=Object.freeze({
 count:3,startX:216.65,length:24.77520248,width:2.4,
 firstCenterZ:-171.31411220,spacing:23.89213250,
 bodyDepth:.42,bevelThickness:.14,bevelSize:.075,cornerRadius:.20,
});
const pierCenters81=Object.freeze(Array.from({length:pierProfile81.count},(_,i)=>pierProfile81.firstCenterZ+i*pierProfile81.spacing));
export const timberLayout81=Object.freeze({
 top:9.56133671,ground:9.22754747,
 promenade:Object.freeze([207.20,-177,pierProfile81.startX,pierCenters81.at(-1)+pierProfile81.width/2]),
 pierEnd:pierProfile81.startX+pierProfile81.length,pierWidth:pierProfile81.width,
 pierCenters:pierCenters81,fingerX:Object.freeze([]),
});
const OLD_NAMES=[
 '67D_ISKELE_AHSAP_ACIK','67D_ISKELE_AHSAP_ORTA','67D_ISKELE_AHSAP_YAN',
 '67D_ISKELE_AHSAP_PROMENAD_ACIK','67D_ISKELE_AHSAP_PROMENAD_ORTA',
 '67D_ISKELE_AHSAP_PROMENAD_YAN','8_DOGU_SAHIL_ISKELE_UST',
];

function roundedOutline(points,radius){
 const shape=new T.Shape();
 for(let i=0;i<points.length;i++){
  const a=new T.Vector2(...points[(i+points.length-1)%points.length]);
  const b=new T.Vector2(...points[i]),c=new T.Vector2(...points[(i+1)%points.length]);
  const r=Math.min(radius,b.distanceTo(a)*.4,b.distanceTo(c)*.4);
  const p=b.clone().add(a.sub(b).normalize().multiplyScalar(r));
  const q=b.clone().add(c.sub(b).normalize().multiplyScalar(r));
  if(i===0)shape.moveTo(p.x,-p.y);else shape.lineTo(p.x,-p.y);
  shape.quadraticCurveTo(b.x,-b.y,q.x,-q.y);
 }
 shape.closePath();return shape;
}

// Preserve the entry grade break lines in the cap's triangulation. Otherwise a
// large cap triangle can spread a low road corner across an entire pier.
function splitAtGradeLines(source,planes){
 const p=source.attributes.position,n=source.attributes.normal,pos=[],norm=[];
 const out=new T.BufferGeometry();
 function half(poly,axis,value,sign){
  const result=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-value)*sign,db=(b.p[axis]-value)*sign;
   if(da>=-1e-8)result.push(a);
   if((da>1e-8&&db< -1e-8)||(da< -1e-8&&db>1e-8)){
    const t=(value-a.p[axis])/(b.p[axis]-a.p[axis]);
    result.push({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t)});
   }
  }
  return result;
 }
 for(const group of source.groups){
  const start=pos.length/3;
  for(let i=group.start;i<group.start+group.count;i+=3){
   let polys=[[0,1,2].map(j=>({p:[p.getX(i+j),p.getY(i+j),p.getZ(i+j)],n:[n.getX(i+j),n.getY(i+j),n.getZ(i+j)]}))];
   for(const [axis,value]of planes){
    polys=polys.flatMap(poly=>{
     const ds=poly.map(v=>v.p[axis]-value);
     return Math.min(...ds)<-1e-8&&Math.max(...ds)>1e-8?[half(poly,axis,value,1),half(poly,axis,value,-1)]:[poly];
    });
   }
   for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){pos.push(...v.p);const len=Math.hypot(...v.n)||1;norm.push(...v.n.map(x=>x/len));}
  }
  out.addGroup(start,pos.length/3-start,group.materialIndex);
 }
 out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(norm,3));source.dispose();return out;
}

export function createSeasideTimber81({scene,terrainRoot,renderer,variant}){
 const L=timberLayout81,[x0,z0,x1,z1]=L.promenade;
 const group=new T.Group();group.name='SEASIDE_TIMBER_TOY_V81';
 const exposure={value:1},blockers=[],stats={version:82,piers:pierProfile81.count,fingers:0,boards:0,posts:0,draws:0,triangles:0,hidden:[],style:'single soft peach toy silhouette',pierProfile:pierProfile81};
 function material(color,name){
  const source=new T.MeshPhysicalMaterial({name,color,roughness:.36,metalness:0,clearcoat:.38,clearcoatRoughness:.30});
  const m=finishCityMaterial60(source,exposure);source.dispose();return m;
 }
 const topMaterial=material('#dbae8e','peach_toy_timber81');
 const sideMaterial=material('#cda083','peach_toy_timber81_edge');
 const supportMaterial=material('#bd9982','peach_toy_timber81_support');
 const outline=[[x0,z0],[x1,z0]];
 for(const [i,z] of L.pierCenters.entries()){
  const a=z-L.pierWidth/2,b=z+L.pierWidth/2;
  outline.push([x1,a],[L.pierEnd,a],[L.pierEnd,b]);
  if(i<L.pierCenters.length-1)outline.push([x1,b]);
 }
 outline.push([x0,z1]);
 // A single watertight extruded outline makes every pier junction genuinely
 // continuous. Soft bevels carry the highlight instead of hundreds of lines.
 let geometry=new T.ExtrudeGeometry(roundedOutline(outline,pierProfile81.cornerRadius),{
  depth:pierProfile81.bodyDepth,bevelEnabled:true,bevelThickness:pierProfile81.bevelThickness,bevelSize:pierProfile81.bevelSize,
  bevelSegments:3,curveSegments:6,steps:1,
 });
 geometry.rotateX(-Math.PI/2);geometry.translate(0,L.top-pierProfile81.bodyDepth-pierProfile81.bevelThickness,0);
 geometry=splitAtGradeLines(geometry,[[0,x1],[2,z0+1.8],[2,z1-1.8]]);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);
  const ramp=Math.min(1,Math.max(0,(z-z0)/1.8),Math.max(0,(z1-z)/1.8));
  const land=1-T.MathUtils.clamp((x-x0)/(x1-x0),0,1);
  p.setY(i,p.getY(i)-(L.top-L.ground)*(1-ramp)*land);
 }
 // Keep the authored smooth bevel normals. Only the shallow entrance patches
 // have changed slope; their normal adjustment is analytical, not faceted.
 const normal=geometry.attributes.normal,v=new T.Vector3();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);
  const blend=Math.min(1,Math.max(0,(z-z0)/1.8),Math.max(0,(z1-z)/1.8));
  const land=1-T.MathUtils.clamp((x-x0)/(x1-x0),0,1);
  v.fromBufferAttribute(normal,i);const ny=v.y;
  if(x>=x0&&x<=x1)v.x-=(L.top-L.ground)*(1-blend)/(x1-x0)*ny;
  v.z-=(z<z0+1.8?1:z>z1-1.8?-1:0)*(L.top-L.ground)*land/1.8*ny;
  v.normalize();normal.setXYZ(i,v.x,v.y,v.z);
 }
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const deck=new T.Mesh(geometry,[topMaterial,sideMaterial]);deck.name='TIMBER81_CONTINUOUS_SOFT_DECK';
 deck.castShadow=true;deck.receiveShadow=true;deck.userData.safeShadowCaster=true;group.add(deck);blockers.push(deck);
 const feet=[];
 function foot(x,z){
  const g=new RoundedBoxGeometry(.48,1.3,.48,2,.17);g.deleteAttribute('uv');g.translate(x,8.60,z);feet.push(g);stats.posts++;
 }
 for(let z=z0+3;z<z1-2;z+=6)foot(x1-.40,z);
 for(const z of L.pierCenters)for(let x=x1+.75;x<L.pierEnd-.3;x+=5.3){foot(x,z-.70);foot(x,z+.70);}
 const footGeometry=mergeGeometries(feet);for(const g of feet)g.dispose();
 const supports=new T.Mesh(footGeometry,supportMaterial);supports.name='TIMBER81_ROUNDED_SUPPORTS';
 supports.castShadow=true;supports.receiveShadow=true;supports.userData.safeShadowCaster=true;group.add(supports);blockers.push(supports);
 group.updateMatrixWorld(true);
 // Query the actual rounded/sloped surface; no invisible rectangular floor
 // survives where the old short fingers used to be.
 const sampler=createCityHeightSampler58([deck],{cellSize:2});
 const sample=sampler.sample,height=sampler.height;
 stats.draws=3;stats.triangles=(geometry.attributes.position.count+footGeometry.attributes.position.count)/3;
 if(stats.triangles>22000)throw Error('Timber81 render budget');
 function update(){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);}
 update();scene.add(group);group.updateMatrixWorld(true);
 terrainRoot.traverse(o=>{if(o.isMesh&&OLD_NAMES.includes(o.name)){o.visible=false;stats.hidden.push(o.name);}});
 renderer.domElement.dataset.seasideTimber79=JSON.stringify(stats);
 return {group,height,obstacle:height,sample,update,cameraBlockers:blockers,stats};
}
