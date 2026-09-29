import * as THREE from 'three';

// Two pooled quads (4 triangles total). No bloom, lights, textures, allocations
// during animation, or permanent draw calls. Green = takeoff; soft mint = landing.
export class JumpFeedback{
  constructor(scene,{reduced=false}={}){
    this.reduced=reduced;this.elapsed=1;this.duration=.6;this.kind='none';
    this.group=new THREE.Group();this.group.name='PARK_JUMP_FEEDBACK';
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      depthTest:true,side:THREE.DoubleSide,toneMapped:false,
      uniforms:{uFade:{value:0},uPulse:{value:0},uColor:{value:new THREE.Color('#a4f583')}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform float uFade;uniform float uPulse;uniform vec3 uColor;varying vec2 vUv;
        void main(){float d=length(vUv-.5)*2.;
          float glow=pow(max(0.,1.-d),2.)*.8;
          float radius=.38+uPulse*.38;
          float ring=exp(-pow((d-radius)/.095,2.))*.36;
          float a=(glow+ring)*uFade;if(a<.008)discard;
          gl_FragColor=vec4(uColor,a);
          #include <colorspace_fragment>
        }`});
    this.geometry=new THREE.PlaneGeometry(1,1);
    this.ground=new THREE.Mesh(this.geometry,this.material);
    this.ground.rotation.x=-Math.PI/2;this.ground.renderOrder=3;
    this.auraMaterial=this.material.clone();
    this.aura=new THREE.Mesh(this.geometry,this.auraMaterial);
    this.aura.rotation.x=-Math.PI/2;this.aura.renderOrder=3;
    this.group.add(this.ground,this.aura);this.group.visible=false;scene.add(this.group);
  }
  trigger(kind,x,y,z){
    this.kind=kind;this.elapsed=0;this.duration=kind==='jump'?.62:.28;
    this.ground.position.set(x,y+.025,z);this.group.visible=true;
    this.material.uniforms.uColor.value.set(kind==='jump'?'#a4f583':'#c7e8bb');
  }
  update(dt,{x,z,foot,swimming,visible=true}){
    this.elapsed+=dt;
    const p=Math.min(1,this.elapsed/this.duration);
    this.group.visible=visible&&!swimming&&p<1;
    if(!this.group.visible)return;
    const fade=(1-p)*(1-p);
    this.material.uniforms.uFade.value=fade*(this.reduced?.3:.82);
    this.material.uniforms.uPulse.value=this.reduced?0:p;
    const size=this.kind==='jump'?1.05:1.25;
    this.ground.scale.setScalar(size*(this.reduced?1:1+.2*p));
    this.aura.visible=this.kind==='jump'&&!this.reduced;
    this.aura.position.set(x,foot+.035,z);this.aura.scale.setScalar(.7);
    this.auraMaterial.uniforms.uFade.value=fade*.52;
    this.auraMaterial.uniforms.uPulse.value=0;
  }
  clear(){this.elapsed=this.duration;this.group.visible=false;}
  dispose(){this.group.removeFromParent();this.geometry.dispose();this.material.dispose();this.auraMaterial.dispose();}
}
