// The authored r160 Islands used per-material IBL intensity with scene.environment.
// r185 overrides that value with scene.environmentIntensity when envMap is null.
// Bind the SAME PMREM explicitly so authored values (and their view profiles)
// survive the engine migration. Never repaint materials or replace custom maps.
export function preserveAuthoredIslandEnvironment(roots, environment) {
 if(!environment)return 0;
 const visited=new Set();let changed=0;
 for(const root of roots)root.traverse(object=>{
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!material||visited.has(material))continue;
   visited.add(material);
   if(!(material.isMeshStandardMaterial||material.isMeshLambertMaterial||material.isMeshPhongMaterial)||material.envMap!==null)continue;
   material.envMap=environment;material.needsUpdate=true;changed++;
  }
 });
 return changed;
}
