import * as THREE from 'three';
// One contact ring + one pooled burst (2 draws, 66 triangles). No bloom,
// realtime light, transparent full-screen pass, texture or per-frame allocation.
export class ParkImpact{
  constructor(scene,{reduced=false}={}){
    this.reduced=reduced;this.age=9;this.hits=0;
    const ringMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uAge:{value:1},uSoft:{value:reduced?1:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float uAge;uniform float uSoft;
        void main(){float r=length(vUv-.5)*2.;float t=uAge;
        float front=mix(mix(.12,.93,1.-pow(1.-t,3.)),.72,uSoft);
        float ring=exp(-pow((r-front)/.045,2.));
        float inner=exp(-r*r*14.)*(1.-t);
        float rays=pow(max(0.,cos(atan(vUv.y-.5,vUv.x-.5)*8.)),18.)*exp(-pow((r-front*.85)/.12,2.))*.24;
        float alpha=(ring*.68+inner*.24+rays)*(1.-t)*(1.-smoothstep(.92,1.,r));
        gl_FragColor=vec4(mix(vec3(.30,.85,.35),vec3(.77,1.,.53),ring),alpha);
        #include <colorspace_fragment>
        }
      `});
    this.ring=new THREE.Mesh(new THREE.PlaneGeometry(1,1),ringMat);this.ring.rotation.x=-Math.PI/2;
    this.chips=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.045,0),new THREE.MeshBasicMaterial({color:'#b5f883',transparent:true,depthWrite:false}),8);
    this.group=new THREE.Group();this.group.add(this.ring,this.chips);scene.add(this.group);this.group.visible=false;
    this.dummy=new THREE.Object3D();
  }
  hit(x,y,z){this.age=0;this.hits++;this.group.position.set(x,y+.035,z);this.group.visible=true;this.update(0);}
  update(dt){
    this.age+=dt;const t=Math.min(1,this.age/(this.reduced?.35:.72));
    if(t>=1){this.group.visible=false;return;}
    this.ring.material.uniforms.uAge.value=t;
    this.ring.scale.setScalar(this.reduced?2.1:5.2);
    this.chips.visible=!this.reduced;this.chips.material.opacity=(1-t)*.68;
    for(let i=0;i<8;i++){const a=i*Math.PI/4+.2,r=.25+t*1.9;
      this.dummy.position.set(Math.sin(a)*r,Math.sin(t*Math.PI)*(.35+(i%3)*.12),Math.cos(a)*r);
      this.dummy.rotation.set(t*3+i,t*5,t*2);this.dummy.scale.setScalar(1-t*.8);
      this.dummy.updateMatrix();this.chips.setMatrixAt(i,this.dummy.matrix);}
    this.chips.instanceMatrix.needsUpdate=true;
  }
  clear(){this.age=9;this.group.visible=false;}
  dispose(){this.group.removeFromParent();for(const m of [this.ring,this.chips]){m.geometry.dispose();m.material.dispose();}this.chips.dispose();}
}

// Gameplay action: input -> anticipation -> jump -> tuck -> dive -> contact.
// Cooldown and the actual collision event, not an animation timer, gate the hit.
export class GroundSlam{
  constructor(){this.phase='ready';this.time=0;this.cooldown=0;this.impacts=0;}
  start({swimming,grounded}){if(swimming||this.cooldown>0||this.phase!=='ready')return false;
    this.phase=grounded?'anticipate':'tuck';this.time=0;this.cooldown=2.2;return true;}
  before(dt,c){
    this.cooldown=Math.max(0,this.cooldown-dt);this.time+=dt;
    if(c.swimming){this.cancel();return;}
    if(this.phase==='anticipate'&&this.time>=.12){this.phase='rise';this.time=0;c.vertical=9.3;c.grounded=false;}
    else if(this.phase==='rise'&&this.time>=.38){this.phase='tuck';this.time=0;}
    else if(this.phase==='tuck'){c.vertical=0;if(this.time>=.14){this.phase='dive';this.time=0;c.vertical=-18;}}
    else if(this.phase==='dive')c.vertical=Math.min(c.vertical,-18);
    else if(this.phase==='recover'&&this.time>=.24){this.phase='ready';this.time=0;}
  }
  after(c){
    if(c.swimming){this.cancel();return false;}
    if(this.phase==='dive'&&c.grounded){this.phase='recover';this.time=0;this.impacts++;return true;}
    return false;
  }
  cancel(){this.phase='ready';this.time=0;}
  get active(){return this.phase!=='ready';}
}
