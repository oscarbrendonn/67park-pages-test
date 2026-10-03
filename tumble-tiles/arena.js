import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {PARK_TOY_PALETTE as P,parkToyFinish} from '../app/park-toy-finish.js';
import {tileStates} from './rules.js';

export function createTumbleArena(scene){
  const root=new T.Group(),tiles=new Map(),owned=new Set();let disposed=false;scene.add(root);
  root.name='tumble-platform-over-void';
  const own=o=>(owned.add(o),o),mat=(color,ground=false)=>own(new T.MeshStandardMaterial(parkToyFinish(color,{ground})));
  const cube=own(new RoundedBoxGeometry(3.14,2.8,3.14,2,.1));
  const stripeGeo=own(new T.PlaneGeometry(.14,2.8));
  const stripeMat=own(new T.MeshBasicMaterial({color:'#fff4dd',transparent:true,opacity:.82,depthWrite:false}));
  const playerColors=[P.mint,P.rose,P.honey,P.sky];
  for(const tile of tileStates(0)){
    const material=mat((tile.id%7+Math.floor(tile.id/7))%2?'#eddfce':'#e7d5c5',true);
    const mesh=new T.Mesh(cube,material);mesh.userData.tileId=tile.id;mesh.position.set(tile.x,tile.y-1.4,tile.z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    const mark=new T.Group();for(let i=-1;i<=1;i++){const line=new T.Mesh(stripeGeo,stripeMat);line.rotation.x=-Math.PI/2;line.rotation.z=-.36;line.position.set(i*.85,1.409,0);mark.add(line)}mesh.add(mark);mark.visible=false;
    tiles.set(tile.id,{mesh,mark,base:material.color.clone()});
  }
  // The playable square is the whole arena: no floor, water, perimeter,
  // backdrop or decorative escape ledges beneath/beside the falling tiles.
  const warnColor=new T.Color('#d68e80');
  return {root,playerColors,
    update(frame){
      if(disposed)return;
      for(const t of frame?.tiles||[]){const view=tiles.get(t.id);if(!view)continue;view.mesh.position.y=t.y-1.4;view.mesh.visible=!(t.permanent&&t.y<=-4.2);view.mesh.material.color.copy(t.warning?warnColor:view.base);view.mark.visible=t.warning;}
    },
    readState(){return {kind:'platform-over-void',tileCount:tiles.size,decorationMeshes:root.children.filter(object=>!tiles.has(object.userData.tileId)).length,fallEffects:0,disposed}},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const resource of owned)resource.dispose();owned.clear();tiles.clear();root.clear()},
  };
}
