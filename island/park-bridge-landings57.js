// Pure local-coordinate sampler for the authored, triangulated landing lips.
// No scene or global state, network, native-scale transforms, or dependencies.
export function createBridgeLandings57(profiles) {
  const source=Array.isArray(profiles)?profiles:profiles?.aprons;
  if(!Array.isArray(source)||source.length<2)throw Error('Bridge landings57: at least two landing grids required');
  const grids=source.map(a=>{
    const rows=a.samples_outward,cols=a.samples_across,h=a.heights_y_m,axis=a.outward_axis==='v'?'v':'u';
    const outer0=axis==='u'?a.u_inner:a.v_inner,outer1=axis==='u'?a.u_outer:a.v_outer;
    const across=axis==='u'?a.v_bounds:a.u_bounds;
    if(!Number.isInteger(rows)||rows<2||!Number.isInteger(cols)||cols<2||
       !Array.isArray(h)||h.length!==rows*cols||!h.every(Number.isFinite)||
       !Number.isFinite(outer0)||!Number.isFinite(outer1)||outer0===outer1||
       !Array.isArray(across)||across.length!==2||!across.every(Number.isFinite)||across[1]<=across[0])
      throw Error('Bridge landings57: invalid profile');
    return {rows,cols,h:h.slice(),axis,o0:outer0,o1:outer1,c0:across[0],c1:across[1]};
  });
  function sample(u,v) {
    if(!Number.isFinite(u)||!Number.isFinite(v))return null;
    for(const g of grids){
      const out=g.axis==='u'?u:v,across=g.axis==='u'?v:u;
      if(out<Math.min(g.o0,g.o1)||out>Math.max(g.o0,g.o1)||across<g.c0||across>g.c1)continue;
      const fi=(out-g.o0)/(g.o1-g.o0)*(g.rows-1),fj=(across-g.c0)/(g.c1-g.c0)*(g.cols-1);
      const i=Math.min(g.rows-2,Math.max(0,Math.floor(fi))),j=Math.min(g.cols-2,Math.max(0,Math.floor(fj)));
      const a=Math.min(1,Math.max(0,fi-i)),b=Math.min(1,Math.max(0,fj-j));
      const k=i*g.cols+j,h00=g.h[k],h10=g.h[k+g.cols],h11=g.h[k+g.cols+1],h01=g.h[k+1];
      // Same diagonal as the actual top mesh: (00,10,11), (00,11,01).
      return a>=b ? (1-a)*h00+(a-b)*h10+b*h11 : (1-b)*h00+a*h11+(b-a)*h01;
    }
    return null;
  }
  return {sample};
}
