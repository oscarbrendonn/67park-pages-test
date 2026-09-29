import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Shared low-poly primitives. No downloaded art, shadow maps or particle emitters.
export function createToyModels(){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const material=color=>mat(new T.MeshStandardMaterial({color,roughness:.67,metalness:.02}));
 const cream=material('#f6edd6'),mint=material('#a1cbb4'),rose=material('#e8a6bd'),gold=material('#ebc56d'),metal=material('#687b76');
 const colors=['#e9a3b9','#efc679','#bad396','#8acbc2','#9ebce2','#c3adde'];
 const active=colors.map(c=>mat(new T.MeshStandardMaterial({color:c,roughness:.65,emissive:c,emissiveIntensity:0})));
 const balloonPink=mat(new T.MeshStandardMaterial({color:'#e8a6bd',roughness:.3,metalness:.03}));
 const sphere=geo(new T.SphereGeometry(1,20,12)),pole=geo(new T.CylinderGeometry(.045,.045,1,8));
 const ring=geo(new T.TorusGeometry(.20,.033,6,16)),beam=geo(new RoundedBoxGeometry(5.4,.16,1.0,2,.08));
 const seat=geo(new RoundedBoxGeometry(1.1,.09,1.03,2,.08)),tile=geo(new RoundedBoxGeometry(1.22,.13,1.22,2,.09));
 const disc=geo(new T.CylinderGeometry(.68,.78,.12,24)),base=geo(new T.CylinderGeometry(.34,.48,.35,12));
 const knot=geo(new T.ConeGeometry(.08,.15,8)),string=geo(new T.CylinderGeometry(.018,.018,1,6));
 function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;}
 function seesaw(x,y,z){const group=new T.Group();group.name='PARK_TOY_SEESAW';group.position.set(x,y,z);mesh(disc,cream,group,0,.06);mesh(base,mint,group,0,.20);const pivot=new T.Group();pivot.position.y=.40;group.add(pivot);mesh(beam,cream,pivot);
  for(const side of [-1,1]){mesh(seat,side<0?mint:rose,pivot,side*2.12,.12);const handle=mesh(ring,metal,pivot,side*1.72,.42);handle.rotation.y=Math.PI/2;mesh(pole,metal,pivot,side*1.72,.24).scale.y=.25;}
  return {group,pivot};}
 function music(x,y,z){const group=new T.Group();group.name='PARK_TOY_NOTES';group.position.set(x,y,z);const keys=[];
  const dotGeo=geo(new T.CircleGeometry(.09,12)),stemGeo=geo(new T.PlaneGeometry(.035,.24));
  for(let i=0;i<6;i++){const key=new T.Group();key.position.set((i-2.5)*1.44,.07,0);group.add(key);mesh(tile,active[i],key);const dot=mesh(dotGeo,cream,key,-.03,.068,.08);dot.rotation.x=-Math.PI/2;const stem=mesh(stemGeo,cream,key,.04,.069,-.02);stem.rotation.x=-Math.PI/2;keys.push(key);}
  return{group,keys,materials:active};}
 function balloon(){const group=new T.Group();group.name='PARK_TOY_BALLOON';const ball=mesh(sphere,balloonPink,group,0,3.2,.33);ball.scale.set(.65,.85,.65);mesh(knot,gold,group,0,2.32,.33).rotation.z=Math.PI;
  // Bend the cord forward around large heads; the grip stays within short arms' reach.
  for(const [a,b]of [[new T.Vector3(0,.475,0),new T.Vector3(0,1.1,.33)],[new T.Vector3(0,1.1,.33),new T.Vector3(0,2.35,.33)]]){const d=b.clone().sub(a),m=mesh(string,cream,group);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
  const handle=mesh(ring,cream,group,0,.475);handle.scale.setScalar(.7);return group;}
 function station(x,y,z){const group=new T.Group();group.name='PARK_TOY_BALLOON_STOP';group.position.set(x,y,z);mesh(disc,mint,group,0,.06);const b=balloon();group.add(b);return{group,balloon:b};}
 return{seesaw,music,balloon,station,stats:()=>({geometries:geometries.size,materials:materials.size,textures:textures.size}),dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
