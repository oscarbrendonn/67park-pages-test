import * as THREE from 'three';

// Reference 3: a quiet powder blue, not saturated blue with painted white lines.
// One opaque draw call; reuses the v21 land mask and its centimetre-safe sea level.
export const WATER_PALETTE=Object.freeze({deep:'#b8c2d6',light:'#c2cbdd',horizon:'#c4ccdd',wake:'#e4e9f1'});
export function createPastelWater(U,data){
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uniforms={uTime:U.zaman,uPlayer:U.oyuncu,uLand:U.karaDoku,uLandMin:U.karaMin,uLandSize:U.karaBoy,
    uAmp:{value:.012},uMotion:{value:reduced?0:1},uWet:{value:0},uSpeed:{value:0},uDirection:{value:new THREE.Vector2(0,-1)},
    uDeep:{value:new THREE.Color(WATER_PALETTE.deep)},uLight:{value:new THREE.Color(WATER_PALETTE.light)},
    uHorizon:{value:new THREE.Color(WATER_PALETTE.horizon)},uWake:{value:new THREE.Color(WATER_PALETTE.wake)}};
  const material=new THREE.ShaderMaterial({uniforms,
    vertexShader:`uniform float uTime,uAmp,uMotion; varying vec3 vWorld;
      void main(){vec3 p=position;vec2 q=(modelMatrix*vec4(p,1.)).xz;
        float t=uTime*uMotion;
        p.z+=(sin(dot(q,vec2(.10,.06))+t*.43)*.55+sin(dot(q,vec2(-.07,.12))-t*.31)*.30+sin(dot(q,vec2(.16,-.05))+t*.21)*.15)*uAmp;
        vec4 wp=modelMatrix*vec4(p,1.);vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`uniform sampler2D uLand;uniform vec2 uLandMin,uLandSize,uPlayer,uDirection;
      uniform float uTime,uMotion,uWet,uSpeed;uniform vec3 uDeep,uLight,uHorizon,uWake;varying vec3 vWorld;
      void main(){
        vec2 uv=(vWorld.xz-uLandMin)/uLandSize;
        if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))&&texture2D(uLand,uv).r>.5)discard;
        vec2 p=vWorld.xz;float t=uTime*uMotion;
        float a=dot(p,vec2(.10,.06))+t*.43;
        float b=dot(p,vec2(-.07,.12))-t*.31;
        float c=dot(p,vec2(.16,-.05))+t*.21;
        float swell=.50+.20*sin(a)*sin(b)+.08*sin(c+.6*sin(a));
        vec3 col=mix(uDeep,uLight,swell);
        vec3 toEye=cameraPosition-vWorld;float eyeDistance=length(toEye);
        vec3 view=toEye/max(.001,eyeDistance);
        float grazing=pow(1.-clamp(abs(view.y),0.,1.),3.);
        col=mix(col,uHorizon,grazing*.55);
        // Two crossing 7–9 m ripples, ~8–10 s periods. Fragment normals add
        // gentle light motion without tessellation, normal textures or reflections.
        // Fade fine detail before it aliases at the horizon / bird's-eye zoom.
        float detail=1.-smoothstep(35.,180.,eyeDistance);
        if(detail>.001){
        float fa=dot(p,vec2(.83,.28))+t*.80+.35*sin(b);
        float fb=dot(p,vec2(-.35,.69))-t*.62+.28*sin(c);
        float ca=cos(fa),cb=cos(fb);
        vec3 normal=normalize(vec3(-.035*ca+.021*cb,1.,-.014*ca-.030*cb));
        float light=dot(normal,vec3(-.532,.745,.402));
        col*=1.+(light-.745)*.55*detail;
        // Broad, broken soft sheen — not a white stripe or a foam sheet.
        float crest=.5+.5*ca;float crossing=.5+.5*cb;
        float sheen=crest*crest*crest*crest*crossing*crossing;
        col=mix(col,uWake,sheen*.065*detail*(.60+.40*grazing));
        }
        // Uniform branch: don't shade swimmer effects over the entire ocean
        // while the player is on land. Keeps the added ripple cost modest.
        if(uWet>.001){
        vec2 d=p-uPlayer;float r=length(d);
        float ripple=(.5+.5*sin(r*10.-uTime*3.6+.45*sin(d.x*3.)))*exp(-r*2.4)*smoothstep(.12,.30,r);
        float behind=-dot(d,uDirection);float across=abs(dot(d,vec2(-uDirection.y,uDirection.x)));
        float trail=exp(-pow((across-(.10+max(0.,behind)*.20))/.09,2.));
        trail*=smoothstep(.08,.35,behind)*(1.-smoothstep(.6,2.4,behind));
        float wake=uWet*(ripple*(.12+.18*uSpeed)+trail*.16*uSpeed);
        col=mix(col,uWake,clamp(wake,0.,.22));
        }
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
    // Explicit linear -> display conversion above. Exposure changes for the map
    // must not turn the reference colour white or dark blue.
    toneMapped:false,transparent:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide
  });
  const previous=new THREE.Vector2(),delta=new THREE.Vector2();let ready=false;
  material.userData.update=dt=>{
    if(!ready){previous.copy(U.oyuncu.value);ready=true;}
    delta.copy(U.oyuncu.value).sub(previous);const distance=delta.length();previous.copy(U.oyuncu.value);
    const blend=1-Math.exp(-6*dt),wet=U.oyuncuSuda.value;
    uniforms.uWet.value+=(wet-uniforms.uWet.value)*blend;
    const speed=distance<2&&dt>0?Math.min(1,distance/dt/2.8)*wet:0;
    uniforms.uSpeed.value+=(speed-uniforms.uSpeed.value)*blend;
    if(distance>.0001&&distance<2){uniforms.uDirection.value.lerp(delta.normalize(),blend).normalize();}
    data.waterWet=uniforms.uWet.value.toFixed(2);data.waterWakeSpeed=uniforms.uSpeed.value.toFixed(2);
  };
  Object.assign(data,{waterShader:'pastel-soft-wave-v24',waterMaterial:'opaque-pastel-shader',waterPalette:WATER_PALETTE.deep,
    waterColorSpace:'linear-to-srgb',waterWaveAmplitude:'0.012',waterReducedMotion:String(reduced),
    waterWaveDetail:'two-crossing-normals-distance-fade',waterExtraDrawCalls:'0',waterExtraTextures:'0'});
  return material;
}
