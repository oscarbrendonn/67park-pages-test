import * as T from 'three';
import {punchBurstGeometry} from '../app/punch-burst.js';

// Brief hit confirmation, not camera shake or a screen flash. Twelve pooled
// marks share 24-triangle geometry; no timers, textures or per-hit allocation.
export function createImpactFeedback(scene){
 const geometry=punchBurstGeometry(),marks=Array.from({length:12},()=>{
  const material=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);mesh.visible=false;mesh.name='rocket-impact-mark';scene.add(mesh);return {mesh,age:1,duration:.19};
 });let next=0,disposed=false;const stats={hits:0,active:0};
 return {stats,
  event(e){if(disposed||!['hit','burst','pop'].includes(e.type)||![e.x,e.z].every(Number.isFinite))return;const m=marks[next++%marks.length];m.age=0;m.mesh.position.set(e.x,(e.y||0)+1.1,e.z);stats.hits++;},
  update(dt,camera,reduced=false){stats.active=0;for(const m of marks){m.age+=Math.max(0,dt);m.mesh.visible=!disposed&&m.age<m.duration;if(!m.mesh.visible)continue;stats.active++;const t=m.age/m.duration;m.mesh.quaternion.copy(camera.quaternion);m.mesh.scale.setScalar(reduced?.9:.9+.22*(1-(1-t)**3));m.mesh.material.opacity=(reduced?.45:.9)*(1-t*t);}},
  dispose(){if(disposed)return;disposed=true;geometry.dispose();for(const m of marks){m.mesh.removeFromParent();m.mesh.material.dispose();}stats.active=0;}
 };
}
