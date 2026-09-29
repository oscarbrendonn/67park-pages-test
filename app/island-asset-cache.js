// Only the texture-free, static v45 foliage library is shared. Every consumer
// still performs its original geometry/material cloning and finishing; the
// cached template is never attached to the world or uploaded to the GPU.
const foliageNames = ['cottage-pink','cottage-taupe','cottage-annex','tree-near','tree-far','shrub-near','shrub-far'];

function inspectTemplate(gltf) {
  if(!gltf?.scene || gltf.animations?.length)throw Error('Island foliage cache: unexpected animated asset');
  const geometries=new Set(),materials=new Set(),names=[];
  gltf.scene.traverse(m=>{
    if(m.isSkinnedMesh)throw Error('Island foliage cache: skeleton sharing is not allowed');
    if(!m.isMesh)return;
    names.push(m.name);geometries.add(m.geometry);
    for(const material of Array.isArray(m.material)?m.material:[m.material]){
      if(Object.values(material).some(v=>v?.isTexture))throw Error('Island foliage cache: texture ownership changed');
      materials.add(material);
    }
  });
  if(names.length!==7||foliageNames.some(n=>!names.includes(n)))throw Error('Island foliage cache: v45 mesh contract changed');
  let bytes=0;const arrays=new Set();
  for(const g of geometries)for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))if(!arrays.has(a.array)){arrays.add(a.array);bytes+=a.array.byteLength;}
  return {geometries,materials,bytes};
}

export function createIslandAssetCache() {
  let promise=null,template=null,resources=null,closed=false;
  const stats={parses:0,requests:0,activeReaders:0,completedReaders:0,templateBytes:0,releasedGeometries:0,releasedMaterials:0,released:false};
  function releaseIfUnused(){
    // Both known users have copied the template, or the containing startup
    // finished/failed. A late promise or still-running reader retains ownership.
    if(stats.activeReaders||(!closed&&stats.completedReaders<2)||!resources)return;
    for(const g of resources.geometries){g.dispose();stats.releasedGeometries++;}
    for(const m of resources.materials){m.dispose();stats.releasedMaterials++;}
    resources=null;template=null;promise=null;stats.released=true;
  }
  return {
    stats,
    async use(load,consume){
      if(closed||stats.released)throw Error('Island foliage cache: session already closed');
      stats.requests++;stats.activeReaders++;
      try{
        if(!promise){
          stats.parses++;
          promise=Promise.resolve().then(load).then(gltf=>{
            resources=inspectTemplate(gltf);template=gltf.scene;
            stats.templateBytes=resources.bytes;
            const ready=template;releaseIfUnused();return ready;
          });
        }
        // Distinct node matrices/parents keep both source readers independent.
        // Geometry/materials are read-only; protected consumers clone them.
        const instance=promise.then(original=>({scene:original.clone(true)}));
        // The protected Promise.all also starts houses/furniture/layout now,
        // not after foliage finishes. Consume failures still observe the load.
        instance.catch(()=>{});
        return await consume(instance);
      } finally {
        stats.activeReaders--;stats.completedReaders++;releaseIfUnused();
      }
    },
    close(){closed=true;releaseIfUnused();},
  };
}

export async function withIslandFoliage(cache,load,consume){
  // Standalone protected constructors remain usable outside the game runtime.
  const scoped=cache??createIslandAssetCache();
  try{return await scoped.use(load,consume);}finally{if(!cache)scoped.close();}
}
