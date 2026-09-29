// Local practice tournament. This does not submit scores or impersonate an
// authoritative multiplayer server. Four stages: 32 -> 24 -> 16 -> 8 -> 1.
export const ROUND_RULES=Object.freeze([
 {number:1,name:'Pastel Sprint',kind:'race',qualify:24,seconds:120},
 {number:2,name:'Cloud Climb',kind:'race',qualify:16,seconds:120},
 {number:3,name:'Color Teams',kind:'team',qualify:8,seconds:90},
 {number:4,name:'Last One Standing',kind:'survival',qualify:1,seconds:120},
]);
export function newMatch(){return {version:1,round:1,active:Array.from({length:32},(_,i)=>i),history:[],champion:null};}
export function validateMatch(value){
 if(!value||value.version!==1||!Number.isInteger(value.round)||value.round<1||value.round>4||!Array.isArray(value.active)||!value.active.length||value.active.length>32||new Set(value.active).size!==value.active.length||value.active.some(id=>!Number.isInteger(id)||id<0||id>31))return newMatch();
 if(!Array.isArray(value.history)||value.history.length!==value.round-1)return newMatch();
 return {...value,active:[...value.active],history:value.history.map(r=>({...r}))};
}
export function createRound(match){
 const rule=ROUND_RULES[match.round-1],active=[...match.active],finished=[],fallen=new Set();let result=null;
 // Alternation gives equally sized teams when 16 qualify; stable for replay.
 const teams=new Map(active.map((id,index)=>[id,index%2]));
 function settle(qualified,extra={}){
  if(result)return result;
  const survivors=[...new Set(qualified)].filter(id=>active.includes(id));
  result={round:match.round,kind:rule.kind,qualified:survivors,eliminated:active.filter(id=>!survivors.includes(id)),...extra};
  return result;
 }
 return {
  rule,active,teams,finished,fallen,
  get result(){return result},
  finish(id,time){
   if(result||rule.kind!=='race'||!active.includes(id)||finished.some(r=>r.id===id)||!Number.isFinite(time)||time<0)return result;
   finished.push({id,time});if(finished.length>=Math.min(rule.qualify,active.length))return settle(finished.map(r=>r.id),{times:[...finished]});return null;
  },
  raceTimeout(){if(rule.kind!=='race'||result)return result;return settle(finished.map(r=>r.id),{times:[...finished],retry:finished.length===0});},
  teamResult(scores){
   if(result||rule.kind!=='team'||scores.length!==2||scores.some(n=>!Number.isFinite(n)||n<0))return result;
   if(scores[0]===scores[1])return null; // Overtime, never an arbitrary winner.
   const team=scores[0]>scores[1]?0:1;
   return settle(active.filter(id=>teams.get(id)===team),{scores:[...scores],team});
  },
  eliminate(ids){
   if(result||rule.kind!=='survival')return result;
   for(const id of ids)if(active.includes(id))fallen.add(id);
   const alive=active.filter(id=>!fallen.has(id));
   if(alive.length===1)return settle(alive,{champion:alive[0]});
   if(alive.length===0)return settle([],{retry:true}); // Same-frame tie: rematch.
   return null;
  },
  advance(){
   if(!result||result.retry)return null;
   if(match.round===4)return {...match,champion:result.champion,history:[...match.history,result]};
   return {version:1,round:match.round+1,active:[...result.qualified],history:[...match.history,result],champion:null};
  },
 };
}
