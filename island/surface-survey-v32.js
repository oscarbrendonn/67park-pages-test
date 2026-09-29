import * as THREE from 'three';
// Diagnostic-only close-up route. Each tile uses the live game's meshes,
// materials, renderer and lighting at walking-camera height; never a mockup.
const ROUTE=[
 ['Küçük ada kuzey',-156,-28],['Küçük ada orta',-154,25],['Küçük ada köprü',-131,51],
 ['Küçük ada güney',-140,126],['Alt köprü batı',-111,128],['Alt köprü doğu',-65,128],
 ['Kuzeybatı yol',-124,-193],['Spor kuzey',-76,-172],['Koşu pisti',-102,-118],
 ['Spor güney',-69,-90],['Spor doğu',-20,-112],['Kuzey mahalle',18,-211],
 ['Kuzey mahalle doğu',99,-208],['Kaykay parkı batı',-4,-142],['Kaykay kuzey',46,-181],
 ['Kaykay doğu',104,-141],['Kaykay güney',50,-87],['Kuzeydoğu yol',152,-194],
 ['İskele kuzey',214,-166],['İskele merkez',211,-138],['Sahil meydanı',164,-102],
 ['Sahil kavşağı',206,-79],['Stadyum batı',109,-50],['Stadyum güney',152,10],
 ['Merkez kuzey',48,-76],['Merkez doğu',103,-33],['Merkez güney',48,10],
 ['Merkez batı',-4,-33],['Batı parsel kuzey',-72,-78],['Batı parsel güney',-72,12],
 ['Güney merkez batı',-5,72],['Güney merkez doğu',106,74],['Güney merkez alt',47,124],
 ['Park batı giriş',112,48],['Park patika',127,88],['Park köprü',181,109],
 ['Park kuzey',175,24],['Park doğu',214,70],['Park güney',200,117],
 ['Alt mahalle batı',22,149],['Alt mahalle orta',101,150],['Alt mahalle doğu',218,150],
];
export function installSurfaceSurvey({renderer,scene,camera,grounds,ground,sun,sunOffset}){
 let page=0,dirty=true,direction=0;
 const panel=document.createElement('div');panel.style.cssText='position:fixed;z-index:20;inset:0 0 auto;background:#15202bee;color:white;padding:8px;font:14px system-ui;display:flex;gap:12px;align-items:center';
 const prev=document.createElement('button'),next=document.createElement('button'),turn=document.createElement('button'),label=document.createElement('span');
 prev.textContent='Önceki bölümler';next.textContent='Sonraki bölümler';turn.textContent='Diğer yandan';
 for(const b of [prev,next,turn])b.style.cssText='padding:9px;border:1px solid #ffffff66;border-radius:9px;background:#364e63;color:white';
 panel.append(prev,next,turn,label);document.body.append(panel);
 const labels=document.createElement('div');labels.style.cssText='position:fixed;inset:48px 0 0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);pointer-events:none;z-index:18';document.body.append(labels);
 for(let i=0;i<6;i++){const d=document.createElement('div');d.style.cssText='border:1px solid #ffffff55;padding:7px;color:white;font:12px system-ui;text-shadow:0 1px 3px black';labels.append(d);}
 const update=()=>{label.textContent=`Yakın oyun taraması ${page+1} / ${Math.ceil(ROUTE.length/6)} · ${direction?'karşı yön':'ön yön'}`;dirty=true;};
 prev.onclick=()=>{page=(page-1+Math.ceil(ROUTE.length/6))%Math.ceil(ROUTE.length/6);update();};
 next.onclick=()=>{page=(page+1)%Math.ceil(ROUTE.length/6);update();};turn.onclick=()=>{direction=1-direction;update();};update();
 const savedPosition=new THREE.Vector3(),savedQ=new THREE.Quaternion();
 return ()=>{
   if(!dirty)return;dirty=false;
   savedPosition.copy(camera.position);savedQ.copy(camera.quaternion);const aspect=camera.aspect,fov=camera.fov;
   const width=innerWidth/3,height=(innerHeight-48)/2;
   renderer.setScissorTest(true);
   const inspected=[];
   for(let i=0;i<6;i++){
     const [title,x,z]=ROUTE[page*6+i];
     const y=ground(x,z)??9.25;
     const angle=direction?Math.PI:0;
     camera.position.set(x+Math.sin(angle)*7,y+1.55,z+Math.cos(angle)*7);
     camera.lookAt(x,y+.03,z);camera.aspect=width/height;camera.fov=72;camera.updateProjectionMatrix();
     sun.target.position.set(x,0,z);sun.position.copy(sun.target.position).add(sunOffset);sun.target.updateMatrixWorld();
     const col=i%3,row=1-Math.floor(i/3);
     renderer.setViewport(col*width,row*height,width,height);renderer.setScissor(col*width,row*height,width,height);renderer.render(scene,camera);
     labels.children[i].textContent=`${page*6+i+1}. ${title} (${x}, ${z})`;
     inspected.push(title);
   }
   renderer.domElement.dataset.surveyPage=String(page+1);renderer.domElement.dataset.surveyDirection=String(direction);renderer.domElement.dataset.surveyLocations=inspected.join('|');
   renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
   camera.position.copy(savedPosition);camera.quaternion.copy(savedQ);camera.aspect=aspect;camera.fov=fov;camera.updateProjectionMatrix();
 };
}
