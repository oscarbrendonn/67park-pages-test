import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EFFECTS,createEffect} from './effect-runtime.js';
import {STORAGE_KEY,cleanSettings,settingsEqual,readDrafts} from './state.js';

const $=id=>document.getElementById(id), all=s=>[...document.querySelectorAll(s)];
const isThumb=new URLSearchParams(location.search).has('thumbnail');
if(isThumb)document.body.classList.add('thumbnail');
let storage;try{storage=localStorage;}catch{}
const drafts=isThumb?{}:readDrafts(storage), histories=new Map();
const categories=['All','Eyewear','Headwear','Back','Footwear','Effects'];
let catalog=[],filtered=[],category='All',selected=null,current=null,settings=cleanSettings(),committed=cleanSettings(),materialIndex=0,requestId=0,pending=null,exporting=false;
let renderer,controls,camera,scene,floor,frameId=0,lastTime=0,effectTime=0,needsRender=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const loader=new GLTFLoader();
const status=text=>{$('save-status').textContent=text;};
const safeName=item=>item.id.replace(/:/g,'-');

function disposeTree(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set(),images=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
  for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
  for(const t of textures){if(t.source?.data?.close)images.add(t.source.data);t.dispose();}
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());images.forEach(i=>i.close());
}
function disposeCurrent(){
  if(!current)return;
  // Restore maps so hidden original textures are also released after solid-color edits.
  for(const {material,original} of current.materials){material.map=original.map;material.metalnessMap=original.metalnessMap;material.roughnessMap=original.roughnessMap;original.dispose();}
  scene.remove(current.display);disposeTree(current.display);current=null;
}
function boundsOf(root){
  root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  const box=new T.Box3(),v=new T.Vector3();
  root.traverse(o=>{
    if(!o.isMesh||!o.visible||!o.geometry.attributes.position)return;
    const g=o.geometry,seen=new Uint8Array(g.attributes.position.count),indices=g.index?.array;
    for(let n=0;n<(indices?.length??seen.length);n++){const i=indices?indices[n]:n;if(seen[i])continue;seen[i]=1;o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);box.expandByPoint(v);}
  });
  if(box.isEmpty()||!Number.isFinite(box.min.x+box.max.x))throw Error('This item has no valid visible geometry.');
  return box;
}
function render(){
  frameId=0;if(document.hidden||!renderer)return;
  const now=performance.now()/1000,dt=Math.min(.05,Math.max(0,now-lastTime));lastTime=now;
  if(current?.effect){if(!reduced.matches)effectTime+=dt*settings.speed;current.effect.update(reduced.matches?0:effectTime);}
  renderer.render(scene,camera);needsRender=false;
  if(current?.effect&&settings.speed>0&&!reduced.matches)requestFrame();
}
function requestFrame(){needsRender=true;if(!frameId&&!document.hidden)frameId=requestAnimationFrame(render);}
function resize(){
  if(!renderer)return;const r=$('viewport').getBoundingClientRect();if(!r.width||!r.height)return;
  renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();requestFrame();
}
function view(kind='fit'){
  if(!current)return;
  current.display.updateMatrixWorld(true);
  const center=current.edit.position.clone().multiplyScalar(current.normalization);
  const distance=Math.max(3.4,3.4/camera.aspect)*Math.max(.8,settings.scale);
  const direction=kind==='front'?[0,.15,1]:kind==='side'?[1,.15,0]:kind==='back'?[0,.15,-1]:[.65,.4,1];
  camera.position.copy(center).add(new T.Vector3(...direction).normalize().multiplyScalar(distance));controls.target.copy(center);controls.update();requestFrame();
}
function initializeRenderer(){
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  scene=new T.Scene();scene.background=new T.Color('#e6ebe5');
  camera=new T.PerspectiveCamera(38,1,.01,100);
  $('viewport').append(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.3;controls.maxDistance=22;controls.addEventListener('change',requestFrame);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff,0x7c967d,1.4));const sun=new T.DirectionalLight(0xffffff,1.8);sun.position.set(3,5,4);scene.add(sun);
  floor=new T.Mesh(new T.CircleGeometry(2.15,64),new T.MeshStandardMaterial({color:'#d8e0d3',roughness:1,metalness:0}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  new ResizeObserver(resize).observe($('viewport'));resize();
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();$('loading').hidden=false;$('loading').classList.add('error');$('loading').textContent='The 3D view was interrupted. Reload this page to restore it. Your saved edits are safe.';});
}
function renderLibrary(){
  const query=$('search').value.trim().toLowerCase();
  filtered=catalog.filter(item=>(category==='All'||item.category===category)&&(`${item.name} ${item.id} ${item.category}`).toLowerCase().includes(query));
  if(isThumb)return;
  $('list-summary').textContent=`${filtered.length} ${filtered.length===1?'item':'items'} · ${category==='All'?'Entire collection':category}`;
  $('empty').hidden=!!filtered.length;$('item-grid').replaceChildren();
  for(const item of filtered){
    const button=document.createElement('button');button.type='button';button.className='item-card';button.dataset.id=item.id;button.setAttribute('aria-pressed',String(selected?.id===item.id));button.setAttribute('aria-label',`Preview ${item.name} (${item.id})`);
    const img=document.createElement('img');img.src=`previews/${safeName(item)}.png`;img.loading='lazy';img.decoding='async';img.alt=item.name;img.width=240;img.height=220;
    // A failed thumbnail must not prevent loading the real 3D item.
    img.addEventListener('error',()=>{if(!img.dataset.retried){img.dataset.retried='1';img.src=`previews/${safeName(item)}.png?retry=1`;}else img.alt='3D preview available';});
    const copy=document.createElement('span');copy.className='card-copy';const name=document.createElement('strong');name.textContent=item.name;const id=document.createElement('small');id.textContent=item.id;copy.append(name,id);button.append(img,copy);
    if(drafts[item.id]){const dot=document.createElement('span');dot.className='dot';dot.textContent='Edited';button.append(dot);}
    button.addEventListener('click',()=>select(item.id));$('item-grid').append(button);
  }
  $('previous').disabled=$('next').disabled=filtered.length<2;
}
function syncHistory(){const h=histories.get(selected?.id);$('undo').disabled=!h?.undo.length;$('redo').disabled=!h?.redo.length;}
function updateMaterialFields(){
  const m=current?.materials[materialIndex]?.material;if(!m)return;
  const mode=settings.materials[materialIndex]?.mode||'original';$('color-mode').value=mode;
  $('color').value='#'+m.color.getHexString();$('color-value').textContent=$('color').value.toUpperCase();
  for(const key of ['roughness','metalness']){$(key).disabled=!(key in m);$(key).value=m[key]??0;$(key+'-value').textContent=key in m?Number(m[key]).toFixed(2):'—';}
}
function applySettings(){
  if(!current)return;
  current.edit.scale.setScalar(settings.scale);current.edit.rotation.y=T.MathUtils.degToRad(settings.rotation);current.edit.position.fromArray(settings.offset.map(v=>v*current.span));
  current.materials.forEach(({material:m,original:o},i)=>{
    const saved=settings.materials[i];m.color.copy(o.color);m.map=o.map;m.vertexColors=o.vertexColors;
    if(saved&&saved.mode!=='original'){m.color.set(saved.color);if(saved.mode==='solid'){m.map=null;m.vertexColors=false;}}
    for(const key of ['roughness','metalness'])if(key in m){m[key]=saved?.[key]??o[key];m[key+'Map']=o[key+'Map'];}
    if(current.effect&&m.emissive)m.emissive.copy(m.color);m.needsUpdate=true;
  });
  for(const key of ['scale','rotation','speed'])$(key).value=settings[key];
  $('scale-value').textContent=Math.round(settings.scale*100)+'%';$('rotation-value').textContent=settings.rotation+'°';$('speed-value').textContent=settings.speed+'×';
  ['x','y','z'].forEach((axis,i)=>$('offset-'+axis).value=settings.offset[i]);
  updateMaterialFields();const edited=!settingsEqual(settings,{});$('draft-badge').textContent=edited?'Edited locally':'Original';$('draft-badge').classList.toggle('edited',edited);syncHistory();requestFrame();
}
function persist(){
  if(!selected||isThumb)return;
  if(settingsEqual(settings,{}))delete drafts[selected.id];else drafts[selected.id]=cleanSettings(settings);
  try{storage.setItem(STORAGE_KEY,JSON.stringify(drafts));status('Saved on this browser. Original files are unchanged.');}catch{status('Browser storage is unavailable. Export your edits before leaving.');}
  renderLibrary();
}
function commit(){
  if(!current||settingsEqual(committed,settings))return;
  const h=histories.get(selected.id)||{undo:[],redo:[]};h.undo.push(cleanSettings(committed));if(h.undo.length>40)h.undo.shift();h.redo=[];histories.set(selected.id,h);committed=cleanSettings(settings);persist();syncHistory();
}
async function select(id){
  if(exporting)return;const item=catalog.find(x=>x.id===id);if(!item)return;
  commit();const token=++requestId;pending?.abort();pending=new AbortController();
  $('editing').disabled=$('export').disabled=$('snapshot').disabled=true;$('loading').hidden=false;$('loading').classList.remove('error');$('loading').textContent='Loading '+item.name+'…';
  let root,effect;
  try{
    if(item.kind==='effect'){effect=createEffect(id);root=effect.root;}
    else{const response=await fetch(item.url,{signal:pending.signal});if(!response.ok)throw Error('Could not download this item ('+response.status+').');const gltf=await loader.parseAsync(await response.arrayBuffer(),new URL('../',location.href).href);root=gltf.scene;}
    if(token!==requestId){disposeTree(root);return;}
    const box=item.kind==='effect'?new T.Box3(new T.Vector3(-.7,-.12,-.7),new T.Vector3(.7,.12,.7)):boundsOf(root);
    const size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,.001),center=box.getCenter(new T.Vector3());
    disposeCurrent();
    const recenter=new T.Group();recenter.position.copy(center).negate();recenter.add(root);const edit=new T.Group();edit.name=item.name+' (edited)';edit.add(recenter);const display=new T.Group();display.scale.setScalar(2/span);display.add(edit);scene.add(display);
    const materials=[];const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material])if(material?.color&&!seen.has(material)){seen.add(material);materials.push({material,original:material.clone()});}});
    current={root,edit,display,materials,span,normalization:2/span,effect};selected=item;settings=cleanSettings(drafts[id]);committed=cleanSettings(settings);materialIndex=0;effectTime=0;
    floor.position.y=-size.y/span-.13;
    $('material').replaceChildren(...materials.map(({material},i)=>new Option(`${i+1}. ${material.name||'Surface'}`,String(i))));
    $('item-name').textContent=item.name;$('item-category').textContent=item.category.toUpperCase();$('item-id').textContent=id;$('item-size').textContent=item.kind==='effect'?'Procedural · live preview':`${(item.bytes/1024).toFixed(0)} KB · GLB`;
    all('.effect-only').forEach(e=>e.hidden=item.kind!=='effect');all('.model-only').forEach(e=>e.hidden=item.kind==='effect');
    $('original').hidden=item.kind==='effect';if(item.url){$('original').href=item.url;$('original').download=safeName(item)+'.glb';}
    $('kind-note').textContent=item.kind==='effect'?'A 67Park procedural effect, not an extracted Friends model. Edit it here and export its settings.':'Edits are saved on this browser only. Original files stay untouched.';
    $('export').textContent=item.kind==='effect'?'Export effect JSON ↓':'Export edited GLB ↓';
    $('export-note').textContent=item.kind==='effect'?'JSON stores color, transform and speed. Use it with the downloadable effect runtime and Three.js; it is not an animated GLB.':"GLB keeps the item's materials and skinning. The editor's floor and lights are not exported.";
    $('editing').disabled=$('export').disabled=$('snapshot').disabled=false;$('loading').hidden=true;
    applySettings();resize();view();renderLibrary();
    const url=new URL(location.href);url.hash=id;history.replaceState(null,'',url);status(drafts[id]?'Restored your saved local edits.':'Your edits stay on this device.');
  }catch(error){
    if(token!==requestId||error.name==='AbortError')return;
    if(root&&current?.root!==root)disposeTree(root);$('loading').hidden=false;$('loading').classList.add('error');$('loading').textContent='Preview unavailable. '+error.message+' Select another item or reload to retry.';console.error(error);
  }
}
function download(data,type,name){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportItem(){
  if(!current||exporting)return;commit();exporting=true;$('export').disabled=$('editing').disabled=true;
  const item=selected;status('Preparing your export…');
  try{
    if(item.kind==='effect')download(JSON.stringify({schema:'67park-effect-preset-v1',id:item.id,name:item.name,settings:cleanSettings(settings),runtime:'effect-runtime.js',note:'Call createEffect(id, settings), then update(elapsedSeconds * settings.speed). Respect reduced-motion preferences.'},null,2),'application/json',safeName(item)+'-edited.json');
    else{current.display.updateMatrixWorld(true);const exporter=new GLTFExporter();const glb=await exporter.parseAsync(current.edit,{binary:true,onlyVisible:true});download(glb,'model/gltf-binary',safeName(item)+'-edited.glb');}
    status('Export ready. Your original item is unchanged.');
  }catch(error){status('Export failed: '+error.message+'. Your draft is still saved.');console.error(error);}
  finally{exporting=false;$('export').disabled=$('editing').disabled=false;}
}

function wireUI(){
  for(const name of categories){const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(name===category));b.onclick=()=>{category=name;all('#categories button').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));renderLibrary();};$('categories').append(b);}
  $('search').addEventListener('input',renderLibrary);
  all('[data-panel]').filter(e=>e.tagName==='BUTTON').forEach(b=>b.onclick=()=>{document.querySelector('.workspace').dataset.panel=b.dataset.panel;all('.mobile-tabs button').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));resize();});
  all('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
  for(const [id,step] of [['previous',-1],['next',1]])$(id).onclick=()=>{const n=filtered.findIndex(x=>x.id===selected?.id);if(filtered.length)select(filtered[n<0?(step>0?0:filtered.length-1):(n+step+filtered.length)%filtered.length].id);};
  $('material').onchange=()=>{commit();materialIndex=Number($('material').value);updateMaterialFields();};
  for(const id of ['color','color-mode','roughness','metalness']){
    $(id).addEventListener('input',()=>{
      if(!current||exporting)return;const m=current.materials[materialIndex].material;
      const v=settings.materials[materialIndex]||{mode:current.effect?'tint':$('color-mode').value,color:'#'+m.color.getHexString(),roughness:m.roughness??1,metalness:m.metalness??0};
      if(id==='color'){v.color=$(id).value;if(v.mode==='original')v.mode='tint';}else if(id==='color-mode')v.mode=$(id).value;else v[id]=Number($(id).value);
      settings.materials[materialIndex]=v;applySettings();
    });$(id).addEventListener('change',commit);
  }
  for(const id of ['scale','rotation','speed']){$(id).oninput=()=>{settings[id]=Number($(id).value);settings=cleanSettings(settings);applySettings();};$(id).onchange=commit;}
  ['x','y','z'].forEach((axis,i)=>{$('offset-'+axis).oninput=()=>{const v=Number($('offset-'+axis).value);if(!Number.isFinite(v))return;settings.offset[i]=T.MathUtils.clamp(v,-2,2);current.edit.position.fromArray(settings.offset.map(n=>n*current.span));requestFrame();};$('offset-'+axis).onchange=()=>{settings=cleanSettings(settings);applySettings();commit();};});
  $('reset').onclick=()=>{if(!current||exporting)return;settings=cleanSettings();applySettings();commit();view();};
  for(const key of ['undo','redo'])$(key).onclick=()=>{if(!current||exporting)return;commit();const h=histories.get(selected.id);if(!h?.[key].length)return;h[key==='undo'?'redo':'undo'].push(cleanSettings(settings));settings=h[key].pop();committed=cleanSettings(settings);applySettings();persist();};
  $('export').onclick=exportItem;
  $('snapshot').onclick=()=>{if(!current)return;renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(blob)download(blob,'image/png',safeName(selected)+'-preview.png');},'image/png');};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){commit();cancelAnimationFrame(frameId);frameId=0;}else{lastTime=performance.now()/1000;requestFrame();}});
  reduced.addEventListener('change',requestFrame);addEventListener('pagehide',commit);
}

async function start(){
  try{
    const response=await fetch('catalog.json');if(!response.ok)throw Error('The item catalog could not be loaded.');catalog=await response.json();
    catalog.push(...EFFECTS.map(e=>({id:e.id,name:e.name,kind:'effect',category:'Effects'})));$('total-count').textContent=catalog.length;
    initializeRenderer();wireUI();renderLibrary();
    const requested=decodeURIComponent(location.hash.slice(1));await select(catalog.some(i=>i.id===requested)?requested:catalog[0].id);
    window.__itemStudio={select,view,catalog,inspect:()=>({id:selected?.id,ready:!!current&&$('loading').hidden,settings:cleanSettings(settings),materials:current?.materials.map(m=>({color:'#'+m.material.color.getHexString(),map:!!m.material.map})),camera:camera.position.toArray(),memory:{...renderer.info.memory},lost:renderer.getContext().isContextLost(),span:current?.span,effectTime}),capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}};
  }catch(error){$('loading').hidden=false;$('loading').classList.add('error');$('loading').textContent='The studio could not start. '+error.message+' You can still download the originals ZIP above.';console.error(error);}
}
start();
