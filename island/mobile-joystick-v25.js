// Visible fixed-base movement pad. Pointer capture leaves other fingers free
// for the right-hand camera and jump/run. No timers, motion library or WebGL work.
export function joystickVector(dx,dy,radius){
  const length=Math.hypot(dx,dy),scale=Math.max(radius,length,1);
  return {x:dx/scale,y:dy/scale};
}

export function installMobileJoystick({onChange,isGame}){
  const host=document.createElement('div');host.id='hareketJoystick';host.hidden=true;
  host.tabIndex=0;host.setAttribute('role','group');
  host.setAttribute('aria-label','Hareket joystick’i');host.setAttribute('aria-describedby','joystickYardim');
  const knob=document.createElement('span');knob.className='joystickTop';knob.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='joystickEtiket';label.textContent='HAREKET';label.setAttribute('aria-hidden','true');
  const help=document.createElement('span');help.id='joystickYardim';help.className='joystickYardim';
  help.textContent='Yürümek veya yüzmek için sürükle. Bırakınca durur. Klavyede ok tuşları da kullanılabilir.';
  host.append(knob,label,help);document.body.append(host);
  let enabled=false,pointer=null,centerX=0,centerY=0,radius=38,grabX=0,grabY=0;
  let outputX=0,outputY=0;const keys=new Set();
  function output(x,y){
    outputX=x;outputY=y;
    knob.style.transform=`translate3d(${(x*radius).toFixed(2)}px,${(y*radius).toFixed(2)}px,0)`;
    host.dataset.x=x.toFixed(3);host.dataset.y=y.toFixed(3);onChange(x,y);
  }
  function reset(){
    const previous=pointer;pointer=null;keys.clear();host.dataset.active='false';output(0,0);
    if(previous!==null&&host.hasPointerCapture(previous))host.releasePointerCapture(previous);
  }
  function move(e){
    const v=joystickVector(e.clientX-centerX-grabX,e.clientY-centerY-grabY,radius);
    output(v.x,v.y);
  }
  host.addEventListener('pointerdown',e=>{
    if(!enabled||!isGame()||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();e.stopPropagation();
    const rect=host.getBoundingClientRect();radius=rect.width*.30;
    centerX=rect.left+rect.width/2;centerY=rect.top+rect.height/2;
    // Grabbing the knob off-centre must not jump it under the finger.
    grabX=e.target===knob?e.clientX-centerX-outputX*radius:0;
    grabY=e.target===knob?e.clientY-centerY-outputY*radius:0;
    pointer=e.pointerId;host.setPointerCapture(pointer);host.dataset.active='true';move(e);
  });
  host.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;e.preventDefault();e.stopPropagation();
    if(!enabled||!isGame()){reset();return;}move(e);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,e=>{
    if(e.pointerId!==pointer)return;e.stopPropagation();reset();
  });
  // Safari emits Touch Events alongside Pointer Events. They must not reach
  // the camera's touch recogniser, or one thumb would drive two controls.
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])host.addEventListener(type,e=>e.stopPropagation(),{passive:true});
  function keyboard(){
    const v=joystickVector((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),
      (keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0),1);
    host.dataset.active=keys.size?'true':'false';output(v.x,v.y);
  }
  host.addEventListener('keydown',e=>{
    if(!enabled||!isGame()||!/^Arrow(Left|Right|Up|Down)$/.test(e.key))return;
    e.preventDefault();e.stopPropagation();keys.add(e.key);keyboard();
  });
  host.addEventListener('keyup',e=>{if(keys.delete(e.key)){e.preventDefault();e.stopPropagation();keyboard();}});
  host.addEventListener('blur',reset);window.addEventListener('blur',reset);window.addEventListener('resize',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  output(0,0);
  return {element:host,reset,setEnabled(value){
    value=!!value;if(value===enabled)return;enabled=value;
    if(!value)reset();host.hidden=!value;host.dataset.enabled=String(value);
  }};
}
