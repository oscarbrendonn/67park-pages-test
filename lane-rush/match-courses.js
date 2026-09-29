import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as first from './toy-course.js?v=toy-level-1';

// Original pastel geometry; no Eggy Party assets. Round 2 follows the video's
// raised pink obstacle course, round 3 its two-team tile coloring. The video's
// final is NOT shown: the survival arena is our adaptation of the published rule.
export function createMatchCourse(round){
 if(round===1)return {...first,heightAt:(x,z)=>first.supported(x,z)?0:null};
 const race=round===2,team=round===3;
 const finish=-340,steps=[-44,-100,-156,-212,-268].flatMap(z=>[
  {a:z-5,b:z,h:.65},{a:z-12,b:z-5,h:1.3},{a:z-20,b:z-12,h:1.95},
 ]);
 let tiles=null,radius=13,paintScores=[0,0];
 const cells=[],owners=[];
 if(team)for(let row=0;row<11;row++)for(let col=0;col<11;col++){
  // Symmetric holes, enough connecting paths for both teams.
  if((row===3||row===7)&&(col===3||col===7))continue;
  cells.push({x:(col-5)*2.4,z:(row-5)*2.4,row,col});owners.push(-1);
 }
 const cellAt=(x,z)=>cells.findIndex(c=>Math.abs(x-c.x)<=1.2&&Math.abs(z-c.z)<=1.2);
 const heightAt=(x,z)=>{
  if(race){if(Math.abs(x)>10.6||z>20||z<finish-7)return null;return steps.find(p=>z>=p.a&&z<=p.b)?.h??0;}
  if(team)return cellAt(x,z)>=0?0:null;
  return Math.hypot(x,z)<=radius?0:null;
 };
 const sectionAt=z=>race?(z>-100?'Warm-up climb':z>-220?'Step and leap':'Final climb'):team?'Paint tiles for your team':'Stay on the arena';
 const api={FINISH_Z:race?finish:-999,DECKS:[[race?finish-7:-18,20]],CHECKPOINTS:race?[12,-68,-124,-180,-236,-292]:[0],LANE_CENTERS:first.LANE_CENTERS,SLIDER_ROWS:[],SPINNER_ROWS:race?[-80,-192]:team?[]:[0],
  supported:(x,z)=>heightAt(x,z)!==null,heightAt,sectionAt,
  jumpAhead(z,x=0){const here=heightAt(x,z),ahead=heightAt(x,z-1.7);return here!==null&&(ahead===null||ahead>here+.2);},
  punchTarget:first.punchTarget,createHitStars:first.createHitStars,createHurdles:()=>[],
  createToyCourse(scene,course){
   const mats=new Map(),geos=new Map();
   const material=color=>{if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.62}));return mats.get(color);};
   function box(w,h,d,color,x,y,z){const key=[w,h,d].join(':'),geo=geos.get(key)||new RoundedBoxGeometry(w,h,d,2,Math.min(.16,h*.35));geos.set(key,geo);const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.receiveShadow=true;course.add(m);return m;}
   if(race){
    box(22,.7,367,'#e5c6df',0,-.43,-163.5);
    box(21.5,.14,367,'#edbbd3',0,.01,-163.5);
    for(const p of steps){box(21.3,p.h+.08,p.b-p.a,'#f4c1d8',0,(p.h-.08)/2,(p.a+p.b)/2);box(21.35,.03,.16,'#fff5df',0,p.h+.02,p.b-.15);}
    for(const x of [-10.7,10.7])box(.16,.15,367,'#fff5df',x,.08,-163.5);
    // Inlaid direction marks and soft color blocks break up the runway without
    // introducing more collision ridges or texture downloads.
    const marks=[];for(let z=12;z>finish;z-=7)for(const x of [-6,0,6])marks.push({x,z,y:heightAt(x,z)});
    const geo=new T.PlaneGeometry(1.2,.16),mat=material('#fff5df'),dummy=new T.Object3D();
    for(const side of [-1,1]){const mesh=new T.InstancedMesh(geo,mat,marks.length);marks.forEach((p,i)=>{dummy.position.set(p.x+side*.43,p.y+.081,p.z);dummy.rotation.set(-Math.PI/2,0,-side*.45);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});course.add(mesh);}
   }else if(team){
    const geo=new RoundedBoxGeometry(2.34,.65,2.34,2,.15),mat=material('#ffffff');tiles=new T.InstancedMesh(geo,mat,cells.length);const dummy=new T.Object3D();
    cells.forEach((c,i)=>{dummy.position.set(c.x,-.33,c.z);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);tiles.setColorAt(i,new T.Color('#fff1df'));});tiles.receiveShadow=true;course.add(tiles);
   }else{
    const floor=new T.Mesh(new T.CylinderGeometry(13,13,.8,80),material('#bce1d0'));floor.position.y=-.4;floor.receiveShadow=true;course.add(floor);api.floor=floor;
    const rim=new T.Mesh(new T.TorusGeometry(13,.14,8,80),material('#f5c3d9'));rim.rotation.x=Math.PI/2;rim.position.y=.04;course.add(rim);api.rim=rim;
    const markings=new T.Group();course.add(markings);api.markings=markings;
    for(const r of [4.2,8.4]){const ring=new T.Mesh(new T.RingGeometry(r-.05,r+.05,64),material('#fff6df'));ring.rotation.x=-Math.PI/2;ring.position.y=.012;markings.add(ring);}
   }
   const clouds=new T.InstancedMesh(new T.SphereGeometry(1,12,8),material('#eef8ff'),18),dummy=new T.Object3D();
   for(let i=0;i<18;i++){const cluster=Math.floor(i/3),lobe=i%3,angle=cluster*Math.PI/3;dummy.position.set(Math.cos(angle)*23+(lobe-1)*2,-7+(lobe===1?1:0),race?15-cluster*65:Math.sin(angle)*23);dummy.scale.set(2.8,1.6,2.6);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}scene.add(clouds);
   return {version:'pastel-match-1',round,textures:0,length:race?355:26,finishZ:race?finish:null,kind:race?'race':team?'team':'survival'};
  },
  paint(x,z,side){
   const i=cellAt(x,z);if(!team||i<0||owners[i]===side)return;
   if(owners[i]>=0)paintScores[owners[i]]--;owners[i]=side;paintScores[side]++;
   tiles?.setColorAt(i,new T.Color(side===0?'#8fcde9':'#f3a5c2'));if(tiles?.instanceColor)tiles.instanceColor.needsUpdate=true;
  },
  scores:()=>[...paintScores],
  botTarget(id,side,time){
   const offset=(id*17+Math.floor(time/4)*7)%cells.length;
   const choices=cells.map((c,i)=>({c,i})).filter(({i})=>owners[i]!==side);
   return (choices[offset%Math.max(1,choices.length)]?.c)||cells[offset];
  },
  update(time){
   if(race||team)return;
   radius=Math.max(.8,13-Math.max(0,time-25)*.125);
   api.floor?.scale.set(radius/13,1,radius/13);api.rim?.scale.setScalar(radius/13);
   api.markings?.scale.setScalar(radius/13);
  },
  get radius(){return radius},
 };
 return api;
}
