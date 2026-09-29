// Shared by the browser and authority. Plain text only; never a guarantee of
// universal child safety. Keep the policy deterministic, bounded and testable.
export const CHAT_LIMIT = 140;
export const SAFETY_LIMIT = 200;
const normal = value => value.normalize('NFKC').toLowerCase().replace(/ı/g,'i')
  .normalize('NFD').replace(/\p{M}/gu,'').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'');
const explicit = /(?:^|[^a-z])(?:porn(?:o|ography|ographic)?|porno(?:grafi|grafik)?|xxx|nudes?|naked|sext(?:ing)?|sex(?:y|ual)?|seks|ciplak|sikis|sikis(?:mek|elim)?|sikmek|yarrak|amcik|boobs?|tits?|penis|vagina|fuck(?:ing|er)?|blowjob|masturbat\w*|onlyfans)(?:$|[^a-z])/;
const grooming = /(?:send|show|gonder|goster).{0,24}(?:nude|naked|ciplak|private part|ozel bolge)|(?:nude|ciplak).{0,24}(?:photo|pic|foto)/;
const link = /(?:https?\s*:|www\s*[.]|discord\s*(?:[.]|gg)|(?:[a-z0-9-]+\s*(?:\.|\[dot\]|\(dot\)|\bdot\b|\bnokta\b)\s*)+[a-z]{2,24}\b|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|data\s*:|javascript\s*:)/i;
export function chatVerdict(value){
  if(typeof value!=='string')return {ok:false,code:'invalid',message:'Write a short text message.'};
  if(value.length>CHAT_LIMIT)return {ok:false,code:'length',message:'Messages can be up to 140 characters.'};
  const text=value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').trim();
  if(!text)return {ok:false,code:'empty',message:'Write a message first.'};
  const folded=normal(text),leet=folded.replace(/[@4]/g,'a').replace(/[03]/g,c=>c==='0'?'o':'e').replace(/[!1]/g,'i').replace(/[$5]/g,'s').replace(/7/g,'t');
  if(link.test(folded)||/[<>]/.test(text))return {ok:false,code:'link',message:'Links, media and markup are not allowed in chat.'};
  // Catch separated spellings without treating ordinary substrings as words.
  const spaced=leet.replace(/\b(?:[a-z][ ._*\-]+){2,}[a-z]\b/g,s=>s.replace(/[^a-z]/g,''));
  if([folded,leet,spaced].some(s=>explicit.test(s)||grooming.test(s)))return {ok:false,code:'content',message:'That message is not suitable for park chat.'};
  return {ok:true,text};
}
export function validSafetyId(id){return typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id);}
