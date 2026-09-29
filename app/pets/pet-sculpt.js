import * as T from 'three';

// A small, shared, vertex-painted toy sculpt. Markings live ON the skin; they
// are not extra balls. Eyes follow the face and ears are rounded closed volumes.
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
const bell = (x, width) => Math.exp(-((x / width) ** 2));
const mix = (a, b, t) => a.clone().lerp(b, T.MathUtils.clamp(t, 0, 1));

export function buildPet(kind) {
  const cat = kind === 'cat';
  const palette = {
    coat:cat?'#9a918d':'#d79a5d', cream:'#f4e6cf', ear:cat?'#d99691':'#b9804e',
    stripe:cat?'#726c6c':'#ca8c52', collar:cat?'#80bba7':'#db8774',
    nose:cat?'#cd8c92':'#654332', eye:'#231b17', iris:'#785032', white:'#fff8e9', mouth:'#634137',
  };
  const c = Object.fromEntries(Object.entries(palette).map(([key,value])=>[key,new T.Color(value)]));
  const bones=[], names={}, positions=[], normals=[], colors=[], indices=[], weights=[], elements=[];
  function bone(name, xyz, parent='body') {
    const b=new T.Bone();b.name=name;b.position.set(...xyz);
    if(names[parent]!==undefined)bones[names[parent]].add(b);
    names[name]=bones.length;bones.push(b);return b;
  }
  bone('body',[0,.47,-.08],null);bone('head',[0,.39,.42]);
  bone('leftEar',[-.27,.30,-.08],'head');bone('rightEar',[.27,.30,-.08],'head');
  for(const [name,x,z]of [['frontL',-.184,.25],['frontR',.184,.25],['backL',-.166,-.26],['backR',.166,-.26]])bone(name,[x,-.10,z]);
  bone('tail',[0,.10,-.39]);bone('tailTip',[0,.20,-.23],'tail');bone('eyes',[0,0,0],'head');
  bones[0].updateMatrixWorld(true);

  function add(g, paint, owner, xyz=[0,0,0], scale=[1,1,1], rotation=[0,0,0], skin) {
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...xyz),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale)));
    const p=g.attributes.position,n=g.attributes.normal,offset=positions.length/3;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rgb=typeof paint==='function'?paint(x,y,z):paint;
      positions.push(x,y,z);normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(rgb.r,rgb.g,rgb.b);
      const blend=skin?skin(x,y,z):0;
      indices.push(names[owner],skin?names.tailTip:0,0,0);weights.push(1-blend,blend,0,0);
    }
    if(g.index)for(const index of g.index.array)elements.push(offset+index);
    else for(let i=0;i<p.count;i++)elements.push(offset+i);
    g.dispose();
  }
  const ball=(paint,owner,xyz,scale,segments=18,rings=12,rotation)=>add(new T.SphereGeometry(1,segments,rings),paint,owner,xyz,scale,rotation);

  // Weld the normal at the parametric seam, without adding a dependency or
  // duplicating materials. This removes the old visible faceted ear edges.
  function finish(g) {
    g.computeVertexNormals();const p=g.attributes.position,n=g.attributes.normal,groups=new Map();
    for(let i=0;i<p.count;i++) {
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
      const row=groups.get(key)||{sum:new T.Vector3(),ids:[]};row.sum.add(new T.Vector3(n.getX(i),n.getY(i),n.getZ(i)));row.ids.push(i);groups.set(key,row);
    }
    for(const {sum,ids}of groups.values()){sum.normalize();for(const i of ids)n.setXYZ(i,sum.x,sum.y,sum.z);}return g;
  }
  function sculpt(map, around=32, rows=20) {
    const g=new T.SphereGeometry(1,around,rows),p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,...map(p.getX(i),p.getY(i),p.getZ(i)));
    return finish(g);
  }
  function grid(map, columns, rows) {
    const p=[],ix=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++)p.push(...map(i/columns,j/rows));
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;ix.push(a,a+1,b,b,a+1,b+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);return finish(g);
  }

  // One rounded pear-shaped torso and a neck tucked under the head. The ivory
  // bib is blended vertex colour instead of the previous disconnected chest.
  const bodyPaint=(x,y,z)=>{
    const bib=smooth(.035,.15,z)*bell(x,.205)*smooth(.21,.38,y);
    let value=mix(c.coat,c.cream,bib);
    if(!cat)value=mix(value,c.stripe,.38*bell(x-.25,.12)*bell(y-.52,.15)*bell(z+.28,.19));
    return value.multiplyScalar(.94+.06*smooth(.12,.45,y));
  };
  add(sculpt((x,y,z)=>[x*.310*(1-.07*y),.45+y*.295+.14*smooth(0,.8,z)*smooth(0,.7,y),-.11+z*.461+.025*smooth(.35,.9,y)],28,18),bodyPaint,'body');

  // Soft cheeks are part of the head's silhouette, not a second white jaw.
  const cheek=ny=>1+.10*bell(ny+.26,.44);
  const headZ=(x,y)=>{
    const ny=(y-.949)/.355,nx=x/(.395*cheek(ny));
    const nz=Math.sqrt(Math.max(.0001,1-ny*ny-nx*nx));
    return .28+.328*nz+.023*bell(ny+.33,.45)*nz**4;
  };
  function headPaint(x,y,z) {
    const front=smooth(.285,.46,z);
    const chin=(1-smooth(.82,.975,y))*front;
    const blaze=bell(x,cat?.047:.068)*smooth(.80,1.08,y)*(1-smooth(1.20,1.29,y))*front;
    let value=mix(c.coat,c.cream,Math.max(chin,blaze*(cat?.63:1)));
    if(cat&&z>.39&&y>1.08) {
      let stripe=0;
      for(const offset of [-.112,0,.112])stripe=Math.max(stripe,bell(x-offset*(1+(1.21-y)*2),.020)*(smooth(1.08,1.17,y)*(1-smooth(1.28,1.305,y))));
      value=mix(value,c.stripe,stripe*.61);
    }
    return value;
  }
  add(sculpt((x,y,z)=>[x*.395*cheek(y),.949+.355*y,.28+.328*z+(z>0?.023*bell(y+.33,.45)*z**4:0)],44,30),headPaint,'head');

  // Conformal face patches: at most ~1 cm of relief, not stalk-like eyeballs.
  // All layers still belong to the same one-draw skinned mesh.
  function disc(paint,owner,cx,cy,rx,ry,lift,bulge=0,segments=32) {
    const g=grid((u,v)=>{const a=-u*Math.PI*2,x=cx+Math.cos(a)*rx*v,y=cy+Math.sin(a)*ry*v;return[x,y,headZ(x,y)+lift+bulge*(1-v*v)];},segments,bulge?3:1);
    add(g,paint,owner);
  }
  function line(points,paint,radius=.005,owner='head',segments=14) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    add(new T.TubeGeometry(curve,segments,radius,5,false),paint,owner);
  }
  function faceLine(points,paint,radius=.005,lift=.004,owner='head') {
    line(points.map(([x,y])=>[x,y,headZ(x,y)+lift]),paint,radius,owner);
  }
  for(const side of [-1,1]) {
    const x=side*.161,y=.979;
    disc(mix(c.coat,c.eye,.20),'eyes',x,y,.104,.116,.003,.003);
    disc(mix(c.white,c.cream,.3),'eyes',x,y-.003,.098,.108,.0035,.004);
    const ix=x-side*.007,iy=y-.003;
    disc((px,py)=>{
      const radius=Math.hypot((px-ix)/.087,(py-iy)/.098);
      return mix(c.eye,c.iris,.85*smooth(.48,.63,radius)*(1-smooth(.82,1,radius)));
    },'eyes',ix,iy,.087,.098,.010,.005);
    disc(c.white,'eyes',ix-.023,iy+.040,.017,.019,.020,0,16);
    disc(mix(c.white,c.iris,.45),'eyes',ix+.028,iy-.036,.006,.007,.017,0,12);
    faceLine([[x-side*.090,.997],[x-side*.062,1.070],[x,1.092],[x+side*.067,1.066]],mix(c.coat,c.eye,.72),.0045,.010,'eyes');
    faceLine([[side*.117,1.139],[side*.153,1.155],[side*.192,1.144]],mix(c.coat,c.eye,.38),.006);
  }

  // A small muzzle nestled into the cheeks. The nose and mouth never cover the
  // whole lower face; the puppy's tongue is inside a recessed smile.
  for(const side of [-1,1])ball(c.cream,'head',[side*.053,.823,.607],[.078,.052,.046],16,10);
  if(cat) {
    const nose=sculpt((x,y,z)=>[x*(.031+.008*y),.844+y*.021,.659+z*.017],20,12);add(nose,c.nose,'head');
    faceLine([[0,.812],[0,.796],[-.022,.781],[-.043,.790]],mix(c.cream,c.mouth,.72),.0035,.028);
    faceLine([[0,.796],[.022,.781],[.043,.790]],mix(c.cream,c.mouth,.72),.0035,.028);
  } else {
    disc(c.mouth,'head',0,.748,.087,.060,.003,.001);
    disc(mix(c.mouth,c.nose,.45),'head',0,.763,.074,.043,.005);
    disc(new T.Color('#dd9291'),'head',.005,.724,.041,.028,.008,.002,24);
    ball(c.nose,'head',[0,.850,.661],[.049,.032,.030],20,12);
    ball(mix(c.nose,c.cream,.25),'head',[-.013,.860,.688],[.016,.007,.003],12,6);
    faceLine([[-.074,.770],[-.095,.786],[-.101,.798]],mix(c.cream,c.mouth,.65),.0035,.005);
    faceLine([[.074,.770],[.095,.786],[.101,.798]],mix(c.cream,c.mouth,.65),.0035,.005);
  }

  add(new T.TorusGeometry(.211,.025,6,28),c.collar,'body',[0,.597,.191],[1,.94,1],[Math.PI/2,0,0]);
  line([[0,.594,.403],[0,.561,.413],[0,.542,.412]],c.collar,.010,'body',6);
  ball(c.collar,'body',[0,.526,.420],[.037,.039,.011],20,10);

  // A single rounded form per leg includes the paw. Blended socks avoid the
  // detached white marble feet, and the ankles stay broad and baby-like.
  const legProfile=new T.CatmullRomCurve3([
    new T.Vector3(0,.025,0),new T.Vector3(.083,.043,.116),new T.Vector3(.109,.086,.145),
    new T.Vector3(.098,.150,.116),new T.Vector3(.087,.252,.092),
    new T.Vector3(.109,.371,.112),new T.Vector3(.087,.465,.098),new T.Vector3(0,.506,0),
  ]);
  for(const [name,x,z]of [['frontL',-.184,.17],['frontR',.184,.17],['backL',-.166,-.34],['backR',.166,-.34]]) {
    const g=grid((u,v)=>{const p=legProfile.getPoint(v),a=-u*Math.PI*2;return[x+Math.cos(a)*p.x,p.y,z+Math.sin(a)*p.z+.029*(1-smooth(.13,.29,p.y))];},18,12);
    add(g,(px,py)=>mix(c.cream,c.coat,smooth(.117,.196,py)),name);
  }

  if(cat) {
    // Fully rounded, gently splayed kitten ears. Pink is painted inside the
    // front surface; there is no extruded triangle or separate pink insert.
    for(const side of [-1,1]) {
      const earProfile=new T.CatmullRomCurve3([
        new T.Vector3(.101,0,.061),new T.Vector3(.115,.046,.064),new T.Vector3(.097,.138,.049),
        new T.Vector3(.055,.241,.032),new T.Vector3(.019,.286,.017),new T.Vector3(0,.299,0),
      ]);
      const g=grid((u,v)=>{const p=earProfile.getPoint(v),a=-u*Math.PI*2;return[side*(.269+p.y*.16)+Math.cos(a)*p.x,1.148+p.y,.224+Math.sin(a)*p.z-p.y*.10];},20,14);
      add(g,(x,y,z)=>{
        const h=y-1.148,center=side*(.269+h*.16),width=.102*(1-smooth(.08,.29,h));
        const inner=smooth(.023,.058,z-(.224-h*.10))*smooth(.035,.10,h)*(1-smooth(.252,.282,h))*(1-smooth(width*.53,width*.91,Math.abs(x-center)));
        return mix(c.coat,c.ear,inner);
      },side<0?'leftEar':'rightEar');
    }
  } else {
    for(const side of [-1,1]) {
      const curve=new T.CatmullRomCurve3([
        new T.Vector3(side*.283,1.216,.209),new T.Vector3(side*.395,1.130,.247),
        new T.Vector3(side*.474,.870,.318),new T.Vector3(side*.445,.639,.346),
      ]);
      const g=grid((u,v)=>{const p=curve.getPoint(v),a=u*Math.PI*2,r=Math.pow(Math.sin(Math.PI*v),.35);return[p.x+Math.cos(a)*r*.127,p.y+Math.cos(a)*r*.042*side,p.z+Math.sin(a)*r*.084];},20,20);
      add(g,(x,y,z)=>mix(c.ear,c.coat,.22*smooth(.87,1.19,y)),side<0?'leftEar':'rightEar');
    }
  }
  const tailCurve=new T.CatmullRomCurve3(cat?[
    new T.Vector3(0,.53,-.476),new T.Vector3(.015,.667,-.640),new T.Vector3(.035,.892,-.727),new T.Vector3(.015,1.034,-.640),
  ]:[
    new T.Vector3(0,.53,-.466),new T.Vector3(.055,.635,-.654),new T.Vector3(.088,.815,-.726),new T.Vector3(.055,.91,-.676),
  ]);
  const tailFrames=tailCurve.computeFrenetFrames(24,false);
  const tail=grid((u,v)=>{
    const p=tailCurve.getPointAt(v),i=Math.min(24,Math.round(v*24)),a=u*Math.PI*2;
    const r=(cat?.059:.068)*(.82+.18*Math.sin(v*Math.PI))*Math.sqrt(1-smooth(.93,1,v));
    p.addScaledVector(tailFrames.normals[i],Math.cos(a)*r).addScaledVector(tailFrames.binormals[i],Math.sin(a)*r);return p.toArray();
  },14,24);
  add(tail,(x,y)=>mix(c.coat,c.cream,smooth(cat?.929:.795,cat?.978:.85,y)),'tail',[0,0,0],[1,1,1],[0,0,0],(x,y)=>smooth(.69,.87,y));

  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.setIndex(elements);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const bind=bones.map(b=>({name:b.name,parent:b.parent?names[b.parent.name]:-1,position:b.position.toArray()}));
  return{geometry,bind,names,triangles:elements.length/3};
}
