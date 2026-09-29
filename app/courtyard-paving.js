import * as T from 'three';
import {courtyardBoundary} from './courtyard-boundary-data.js';

// Replace the old inset rectangle BEFORE material batching and floor sampling.
// One watertight cap follows the actual inner curb. No coplanar overlay,
// additional draw call, road widening, or building transform is involved.
export function courtyardPaving(source,material,ground){
 const shape=new T.Shape();
 courtyardBoundary.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false,steps:1,curveSegments:1});
 geo.rotateX(-Math.PI/2);geo.translate(0,ground,0);
 const mesh=new T.Mesh(geo,material);mesh.name='continuous residential courtyard paving';mesh.userData.kind102='floor';
 source.add(mesh);return mesh;
}
