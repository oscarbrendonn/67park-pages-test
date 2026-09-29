import * as T from 'three';
import {RoundedBoxGeometry} from './utils/RoundedBoxGeometry.js';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';
import {finishCityMaterial60} from './city-props-v60.js';

// Reference marina: transverse promenade boards, three continuous piers and
// short mooring fingers. World-space placement preserves the existing road.
export const timberLayout79={
 top:9.56133671,ground:9.22754747,
 promenade:[207.20,-184.63625750,216.65,-110.94599201],
 pierEnd:241.42520248,pierWidth:2.4,
 pierCenters:[-171.31411220,-147.42197436,-123.52984721],
 fingerX:[219,226,238],fingerLength:5.1,fingerWidth:.95,
};
const OLD_NAMES=[
 '67D_ISKELE_AHSAP_ACIK','67D_ISKELE_AHSAP_ORTA','67D_ISKELE_AHSAP_YAN',
 '67D_ISKELE_AHSAP_PROMENAD_ACIK','67D_ISKELE_AHSAP_PROMENAD_ORTA',
 '67D_ISKELE_AHSAP_PROMENAD_YAN','8_DOGU_SAHIL_ISKELE_UST',
];

export function createSeasideTimber79({scene,terrainRoot,renderer,variant}){
 const L=timberLayout79,[x0,z0,x1,z1]=L.promenade,top=L.top;
 const group=new T.Group();group.name='SEASIDE_TIMBER_V79';
 const buckets=new Map(),exposure={value:1},surfaces=[],blockers=[];
 const colors={sand:'#cdae98',warm:'#cfad94',pale:'#d2b39c',rose:'#caae99',frame:'#c2a087',edge:'#b39279',under:'#a78670'};
 const stats={version:79,boards:0,piers:3,fingers:9,posts:0,draws:0,triangles:0,hidden:[]};
 const endBlend=z=>Math.min(1,Math.max(0,(z-z0)/1.8),Math.max(0,(z1-z)/1.8));
 const edgeBlend=x=>Math.min(1,Math.max(0,(x-x0)/(x1-x0)));
 // At each end the land-side corner meets the road. The water-side edge stays
 // above the retained curb, so no pale concrete cap can poke through the deck.
 const heightAtZ=(z,x)=>L.ground+(top-L.ground)*(endBlend(z)+(1-endBlend(z))*edgeBlend(x));
 const gradeAtZ=(z,x)=>(z<z0+1.8?1:z>z1-1.8?-1:0)*(top-L.ground)*(1-edgeBlend(x))/1.8;
 function put(w,h,d,x,y,z,color,r=.03,graded=false){
  const geo=new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4));
  geo.deleteAttribute('uv');geo.translate(x,y,z);
  if(graded){
   const p=geo.attributes.position,n=geo.attributes.normal,v=new T.Vector3();
   for(let i=0;i<p.count;i++){
    const xx=p.getX(i),zz=p.getZ(i);p.setY(i,p.getY(i)+heightAtZ(zz,xx)-top);
    v.fromBufferAttribute(n,i);v.x-=(top-L.ground)*(1-endBlend(zz))/(x1-x0)*v.y;v.z-=gradeAtZ(zz,xx)*v.y;v.normalize();n.setXYZ(i,v.x,v.y,v.z);
   }
  }
  if(!buckets.has(color))buckets.set(color,[]);buckets.get(color).push(geo);
 }
 function floor(rect,graded=false){
  const [a,b,c,d]=rect;surfaces.push({rect,graded});
  put(c-a,.26,d-b,(a+c)/2,top-.22,(b+d)/2,'under',.045,graded);
 }
 function board(rect,index,alongX,graded=false){
  const [a,b,c,d]=rect,tones=['sand','warm','pale','sand','rose','warm','sand'];
  put(c-a,.13,d-b,(a+c)/2,top-.065,(b+d)/2,tones[(index*5+Math.floor(index/7))%tones.length],.025,graded);stats.boards++;
 }
 function stripZ(a,c,b,d,color='frame',graded=false){put(c-a,.17,d-b,(a+c)/2,top-.085,(b+d)/2,color,.028,graded);}
 function stripX(a,c,b,d,color='frame'){put(c-a,.17,d-b,(a+c)/2,top-.085,(b+d)/2,color,.028);}
 function post(x,z){
  put(.29,1.30,.29,x,8.66,z,'edge',.05);stats.posts++;
 }
 // Separate end sections give both entrances a genuine continuous shallow ramp.
 for(const [a,b] of [[z0,z0+1.8],[z0+1.8,z1-1.8],[z1-1.8,z1]])floor([x0,a,x1,b],true);
 const rim=.16,count=Math.ceil((z1-z0-2*rim)/.80),pitch=(z1-z0-2*rim)/count;
 for(let i=0;i<count;i++)board([x0+rim,z0+rim+i*pitch+.013,x1-rim,z0+rim+(i+1)*pitch-.013],i,false,true);
 for(const [a,b]of [[z0,z0+1.8],[z0+1.8,z1-1.8],[z1-1.8,z1]])stripZ(x0,x0+rim,a,b,'frame',true);
 stripZ(x0+rim,x1-rim,z0,z0+rim,'frame',true);stripZ(x0+rim,x1-rim,z1-rim,z1,'frame',true);
 for(let z=z0+3;z<z1-2;z+=6)post(x1-.36,z);
 // The seaside rim stops exactly at each pier mouth, never across a passage.
 let previous=z0;
 for(const center of L.pierCenters){
  const a=center-L.pierWidth/2,b=center+L.pierWidth/2;
  for(const [lo,hi]of [[previous,Math.min(a,z0+1.8)],[Math.max(previous,z0+1.8),Math.min(a,z1-1.8)],[Math.max(previous,z1-1.8),a]])if(hi>lo)stripZ(x1-rim,x1,lo,hi,'frame',true);
  previous=b;
 }
 for(const [lo,hi]of [[previous,z1-1.8],[z1-1.8,z1]])if(hi>lo)stripZ(x1-rim,x1,lo,hi,'frame',true);
 for(const [j,center]of L.pierCenters.entries()){
  const a=center-L.pierWidth/2,b=center+L.pierWidth/2;
  floor([x1,a,L.pierEnd,b]);
  const mouth=x1-rim,n=Math.ceil((L.pierEnd-mouth-rim)/.62),step=(L.pierEnd-mouth-rim)/n;
  for(let i=0;i<n;i++)board([mouth+i*step+.013,a+rim,mouth+(i+1)*step-.013,b-rim],i+j*11,true);
  stripX(mouth,L.pierEnd-rim,a,a+rim);stripX(L.pierEnd-rim,L.pierEnd,a,b);
  // Short fingers are on the same side as the moored boats in the reference.
  let start=mouth;
  for(const fx of L.fingerX){
   const fa=fx-L.fingerWidth/2,fb=fx+L.fingerWidth/2;
   stripX(start,fa,b-rim,b);start=fb;
   const end=b+L.fingerLength;floor([fa,b,fb,end]);
   const entry=b-rim,m=Math.ceil((end-entry-rim)/.62),delta=(end-entry-rim)/m;
   for(let i=0;i<m;i++)board([fa+.10,entry+i*delta+.013,fb-.10,entry+(i+1)*delta-.013],i+j*13,false);
   stripZ(fa,fa+.10,entry,end-rim);stripZ(fb-.10,fb,entry,end-rim);stripX(fa,fb,end-rim,end);
   post(fx,end-.38);
  }
  stripX(start,L.pierEnd-rim,b-rim,b);
  for(let x=x1+.65;x<L.pierEnd-.2;x+=5.3){
   post(x,a+.34);post(x,b-.34);
   put(.37,.18,L.pierWidth-.25,x,9.08,center,'edge',.04);
  }
 }
 // Merge by finish: seven draw calls, no large texture, no per-board objects.
 for(const [key,geometries]of buckets){
  const geo=mergeGeometries(geometries,false);if(!geo)throw Error('Timber79 merge '+key);
  for(const g of geometries)g.dispose();geo.computeBoundingBox();geo.computeBoundingSphere();
  const source=new T.MeshPhysicalMaterial({name:'toy_timber79_'+key,color:colors[key],roughness:.52,metalness:0,clearcoat:.20,clearcoatRoughness:.42});
  const material=finishCityMaterial60(source,exposure);source.dispose();
  const mesh=new T.Mesh(geo,material);mesh.name='TIMBER79_'+key;mesh.receiveShadow=true;
  mesh.castShadow=key==='under'||key==='edge';mesh.userData.safeShadowCaster=mesh.castShadow;
  group.add(mesh);blockers.push(mesh);stats.triangles+=geo.attributes.position.count/3;
 }
 stats.draws=group.children.length;
 if(stats.draws>7||stats.triangles>65000)throw Error('Timber79 render budget');
 const support={name:'TIMBER79_CONTINUOUS_WALKDECK'};
 function height(x,z){
  let y=null;for(const s of surfaces){const [a,b,c,d]=s.rect;if(x>=a&&x<=c&&z>=b&&z<=d)y=Math.max(y??-Infinity,s.graded?heightAtZ(z,x):top);}return y;
 }
 function sample(x,z){const y=height(x,z);return y==null?null:{object:support,point:{x,y,z}};}
 function update(){exposure.value=(variant==='kimi'?.88:1.27)/Math.max(.05,renderer.toneMappingExposure);}
 update();scene.add(group);group.updateMatrixWorld(true);
 // Hide only the superseded decorative timber and its old narrow pier base.
 // Roads, curbs, water, trees and all original model data remain unchanged.
 terrainRoot.traverse(o=>{if(o.isMesh&&OLD_NAMES.includes(o.name)){o.visible=false;stats.hidden.push(o.name);}});
 renderer.domElement.dataset.seasideTimber79=JSON.stringify(stats);
 return {group,height,obstacle:height,sample,update,cameraBlockers:blockers,stats,surfaces};
}
