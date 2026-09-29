import * as THREE from 'three';

// Exact vertical triangle queries, spatially indexed once after island grading.
// No terrain decimation, heightmap approximation or changes to the model.
export function createTerrainSampler(meshes,cellSize=8){
  const started=performance.now(),bounds=new THREE.Box3(),box=new THREE.Box3();
  let total=0;
  for(const m of meshes){m.updateWorldMatrix(true,false);box.setFromObject(m);bounds.union(box);
    total+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}
  const cols=Math.max(1,Math.ceil((bounds.max.x-bounds.min.x)/cellSize));
  const rows=Math.max(1,Math.ceil((bounds.max.z-bounds.min.z)/cellSize));
  const cells=Array.from({length:cols*rows},()=>[]);
  let data=new Float32Array(total*10),owner=new Uint16Array(total);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let count=0;
  const ix=x=>Math.min(cols-1,Math.max(0,Math.floor((x-bounds.min.x)/cellSize)));
  const iz=z=>Math.min(rows-1,Math.max(0,Math.floor((z-bounds.min.z)/cellSize)));
  meshes.forEach((m,mi)=>{
    const geo=m.geometry,p=geo.attributes.position,index=geo.index,n=index?.count??p.count;
    for(let i=0;i<n;i+=3){
      a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(m.matrixWorld);
      c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(m.matrixWorld);
      const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
      if(Math.abs(det)<1e-12)continue; // vertical faces have zero footprint
      let mat=m.material;
      if(Array.isArray(mat)){const group=geo.groups.find(g=>i>=g.start&&i<g.start+g.count);mat=mat[group?.materialIndex??0];}
      if((mat?.side===THREE.FrontSide&&det>=0)||(mat?.side===THREE.BackSide&&det<=0))continue;
      const k=count*10;data[k]=a.x;data[k+1]=a.z;data[k+2]=a.y;
      data[k+3]=bx;data[k+4]=bz;data[k+5]=cx;data[k+6]=cz;
      data[k+7]=b.y-a.y;data[k+8]=c.y-a.y;data[k+9]=1/det;owner[count]=mi;
      const x0=ix(Math.min(a.x,b.x,c.x)),x1=ix(Math.max(a.x,b.x,c.x));
      const z0=iz(Math.min(a.z,b.z,c.z)),z1=iz(Math.max(a.z,b.z,c.z));
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)cells[z*cols+x].push(count);
      count++;
    }
  });
  const bins=cells.map(a=>Uint32Array.from(a));
  data=data.slice(0,count*10);owner=owner.slice(0,count);
  let lastX=NaN,lastZ=NaN,lastResult=null;
  return {
    stats:{triangles:count,cells:bins.length,buildMs:performance.now()-started},
    sample(x,z){
      if(x===lastX&&z===lastZ)return lastResult;
      lastX=x;lastZ=z;lastResult=null;
      if(x<bounds.min.x||x>bounds.max.x||z<bounds.min.z||z>bounds.max.z)return null;
      let y=-Infinity,which=-1;
      for(const t of bins[iz(z)*cols+ix(x)]){
        const k=t*10,dx=x-data[k],dz=z-data[k+1],inv=data[k+9];
        const u=(dx*data[k+6]-dz*data[k+5])*inv;
        if(u< -1e-6||u>1.000001)continue;
        const v=(data[k+3]*dz-data[k+4]*dx)*inv;
        if(v< -1e-6||u+v>1.000001)continue;
        const ty=data[k+2]+u*data[k+7]+v*data[k+8];
        if(ty<=80&&ty>y){y=ty;which=t;}
      }
      if(which>=0)lastResult={object:meshes[owner[which]],point:{x,y,z}};
      return lastResult;
    }
  };
}
