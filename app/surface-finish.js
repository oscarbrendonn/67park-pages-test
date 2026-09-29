import * as T from 'three';

// A reversible finish, not a mesh replacement. Water, foliage, characters,
// markings and translucent materials retain their authored shaders unchanged.
export function surfaceKind(name='') {
 if(/CIZGI|MARK|WATER|SU_|FOLIAGE|GLASS|TEMAS|AYIRICI|YAYA/i.test(name))return null;
 if(/AHSAP|ISKELE|KOPRU_UST|STADIUM99_timber/i.test(name))return 'timber';
 if(/CIMEN|CIM_STUB|_turf$|Park apron.*grass/i.test(name))return 'grass';
 if(/KUMTABAN|TOPRAK|STADIUM99_sand/i.test(name))return 'sand';
 if(/YOL_M|BORDUR|KALDIRIM|CONCRETE|PATIKA_UST|_paving$|GREY_PATH$|NW93_rolled_stone|SKATEPARK_(BOWL|DEEP)|STADIUM99_(shell|tier)/i.test(name))return 'stone';
 if(/^(CENTER69_PASTEL_GREY_\d|CENTER71_CLEAN_IVORY|arch59_(blush|cream)|SPORTS97_shell|COURTYARD102_shell|POOL104_shell)$/.test(name))return 'ceramic';
 return null;
}
export function installSurfaceFinish(roots,{enabled=true}={}) {
 const size=128,data=new Uint8Array(size*size*4);let seed=6709;
 for(let i=0;i<data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=seed>>>24;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 const strength={value:enabled?1:0},saved=new Map();
 for(const root of roots)root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   const kind=surfaceKind(m?.name);
   if(!kind||!m.isMeshStandardMaterial||m.transparent||saved.has(m))continue;
   const compile=m.onBeforeCompile,key=m.customProgramCacheKey;
   const previousKey=key.call(m);saved.set(m,{compile,key});
   m.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.uniforms.parkFinishNoise={value:texture};shader.uniforms.parkFinishStrength=strength;
    shader.vertexShader='varying vec3 vParkSurface;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     vec4 parkPoint=vec4(transformed,1.0);
     #ifdef USE_INSTANCING
      parkPoint=instanceMatrix*parkPoint;
     #endif
     vParkSurface=(modelMatrix*parkPoint).xyz;`);
    shader.fragmentShader='uniform sampler2D parkFinishNoise;\nuniform float parkFinishStrength;\nvarying vec3 vParkSurface;\n'+shader.fragmentShader;
    const scale=kind==='timber'?'vec2(0.025,0.8)':'vec2(0.13)';
    const amount=kind==='grass'?'0.23':kind==='sand'?'0.12':kind==='ceramic'?'0.035':'0.10';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec2 parkUV=vParkSurface.xz+vec2(vParkSurface.y*0.21);
     float parkMacro=texture2D(parkFinishNoise,parkUV*0.004).r-0.5;
     float parkMicro=texture2D(parkFinishNoise,parkUV*${scale}).r-0.5;
     float parkNear=1.0-smoothstep(20.0,100.0,length(vViewPosition));
     diffuseColor.rgb*=1.0+parkFinishStrength*(parkMacro*${amount}+parkMicro*${kind==='ceramic'?'0.012':'0.055'}*parkNear);`);
    // Reuse the two existing samples: subtle satin variation, no additional
    // draw calls, geometry, normal maps or shimmer-prone screen-space noise.
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=clamp(roughnessFactor+parkFinishStrength*(parkMacro*0.07+parkMicro*0.04*parkNear),0.04,1.0);`);
   };
   m.customProgramCacheKey=()=>previousKey+'|park-surface-v2-'+kind;m.needsUpdate=true;
  }
 });
 return {materials:saved.size,textureBytes:data.length,setEnabled(v){strength.value=v?1:0;},dispose(){for(const [m,s] of saved){m.onBeforeCompile=s.compile;m.customProgramCacheKey=s.key;m.needsUpdate=true;}saved.clear();texture.dispose();}};
}
