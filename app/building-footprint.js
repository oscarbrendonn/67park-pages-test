// Static collision outline taken from the visible lower wall/plinth, not the
// roof's bounding box. No per-frame triangle raycasting or added geometry.
export function createBuildingFootprint(geometries,{bottom=.02,top=1.1}={}) {
  const points=new Map();
  function add(x,z){if(Number.isFinite(x)&&Number.isFinite(z))points.set(Math.round(x*1e4)+','+Math.round(z*1e4),[x,z]);}
  for(const geometry of geometries){
    const p=geometry.attributes?.position,ix=geometry.index;if(!p)continue;
    const count=ix?.count??p.count;
    for(let i=0;i<count;i+=3){
      const v=[0,1,2].map(j=>{const k=ix?ix.getX(i+j):i+j;return[p.getX(k),p.getY(k),p.getZ(k)];});
      if(Math.max(...v.map(q=>q[1]))<bottom||Math.min(...v.map(q=>q[1]))>top)continue;
      for(let j=0;j<3;j++){
        const a=v[j],b=v[(j+1)%3];if(a[1]>=bottom&&a[1]<=top)add(a[0],a[2]);
        for(const y of [bottom,top])if((a[1]<y&&b[1]>y)||(b[1]<y&&a[1]>y)){
          const t=(y-a[1])/(b[1]-a[1]);add(a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t);
        }
      }
    }
  }
  const rows=[...points.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(rows.length<3)return null;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=rows=>{const hull=[];for(const p of rows){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),p)<=1e-7)hull.pop();hull.push(p);}hull.pop();return hull;};
  const hull=[...half(rows),...half([...rows].reverse())];
  if(hull.length<3||hull.length>256)return null;
  return {points:hull,minX:rows[0][0],maxX:rows.at(-1)[0],minZ:Math.min(...hull.map(p=>p[1])),maxZ:Math.max(...hull.map(p=>p[1]))};
}
export function insideBuildingFootprint(footprint,x,z){
  if(!footprint||x<footprint.minX||x>footprint.maxX||z<footprint.minZ||z>footprint.maxZ)return false;
  const p=footprint.points;
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length];
    if((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0])< -1e-6)return false;
  }
  return true;
}

export function installCentralBuildingContacts(result,renderer){
  const outlines=new Map();
  for(const p of result.placements){
    const key=(['NW','N1'].includes(p.id)?'TOY70_':'')+p.kind+'_';
    if(!outlines.has(key))outlines.set(key,createBuildingFootprint(result.group.children
      .filter(m=>m.isInstancedMesh&&m.name.startsWith('CENTRAL68_'+key)).map(m=>m.geometry)));
    p.footprint=outlines.get(key);p.contactCos=Math.cos(p.yaw);p.contactSin=Math.sin(p.yaw);
  }
  result.obstacle=(x,z)=>{
    for(const p of result.placements){
      const dx=x-p.x,dz=z-p.z,scale=p.scale*1.15;
      const inside=p.footprint?insideBuildingFootprint(p.footprint,(dx*p.contactCos-dz*p.contactSin)/scale,(dx*p.contactSin+dz*p.contactCos)/scale)
        :p.kind==='round'?dx*dx+dz*dz<=p.radius*p.radius:Math.abs(dx)<=p.radius&&Math.abs(dz)<=p.radius;
      if(inside)return p.y+p.height;
    }
    return null;
  };
  renderer.domElement.dataset.centralLayout68=JSON.stringify(result.placements);
  renderer.domElement.dataset.buildingContacts=JSON.stringify({revision:'corner-contact-1',total:result.placements.length,
    modelMatched:result.placements.filter(p=>p.footprint).length,addedDrawCalls:0});
  return result;
}
