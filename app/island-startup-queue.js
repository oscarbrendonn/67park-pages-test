// Required data jobs run only when createIslandRuntime invokes this helper.
// No module-evaluation fetch, global cache, preload, or fetch override exists.
// Each job includes response-body consumption, so the limit covers streams
// and JSON decoding readiness, not merely receipt of HTTP response headers.
export async function loadIslandPrerequisites(jobs,concurrency=4){
  if(!Array.isArray(jobs)||jobs.some(job=>typeof job!=='function'))throw TypeError('Island prerequisite jobs must be functions');
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw RangeError('Island prerequisite concurrency must be 1–4');
  const results=new Array(jobs.length);let next=0,failure,failed=false;
  async function worker(){
    while(!failed&&next<jobs.length){
      const index=next++;
      try{results[index]=await jobs[index]();}
      catch(error){if(!failed){failure=error;failed=true;}}
    }
  }
  // On failure, stop issuing new requests and settle already-started bodies.
  // No rejected worker is abandoned, and no queued promise remains pending.
  await Promise.all(Array.from({length:Math.min(concurrency,jobs.length)},worker));
  if(failed)throw failure;
  return results;
}
