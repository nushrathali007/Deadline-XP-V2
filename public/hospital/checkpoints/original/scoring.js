export function normalize(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/β/g,'beta').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
export function answerTerms(q) {
  return [{term:q.answer,points:100},...(q.aliases||[]).map(term=>({term,points:100})),...(q.partials||[]).flatMap(p=>p.terms.map(term=>({term,points:p.points,relation:p.relation})))];
}
export function gradeAnswer(q,input) {
  const n=normalize(input), matches=answerTerms(q).filter(t=>normalize(t.term)===n).sort((a,b)=>b.points-a.points);
  return matches[0] ? {...matches[0],correct:matches[0].points===100} : {term:input.trim(),points:0,correct:false};
}
export function editDistance(a,b) {
  const dp=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
  return dp[b.length];
}
export function suggestAnswers(q,input) {
  const n=normalize(input);
  if(n.length<3 || gradeAnswer(q,input).points>0)return [];
  // Never silently accept a negated answer, a list, or an arbitrary substring.
  // A recognizable term inside a sentence becomes a confirmation suggestion only.
  const terms=answerTerms(q), found=[];
  for(const item of terms){const t=normalize(item.term);if(t.length<3)continue;
    const distance=editDistance(n,t), max=t.length<6?1:t.length<10?2:3;
    const phrase=(' '+n+' ').includes(' '+t+' ') && n!==t;
    const prefix=n.length>=5 && t.startsWith(n) && n.length/t.length>=.55;
    if(phrase || prefix || (distance<=max && distance/Math.max(t.length,n.length)<=.27))found.push({...item,distance:phrase?0:prefix?1:distance});
  }
  found.sort((a,b)=>a.distance-b.distance || b.points-a.points);
  const seen=new Set();return found.filter(x=>{const key=normalize(x.points===100?q.answer:x.term);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3).map(x=>x.points===100?q.answer:x.term);
}
export function dayKey(date=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function dailyIndex(dateKey,length){const days=Math.floor((Date.parse(dateKey+'T00:00:00Z')-Date.UTC(2026,9,25))/86400000);return ((days%length)+length)%length;}
export function createRound(caseId,date=null){return {caseId,date,guesses:[],status:'playing',best:0};}
export function applyGuess(round,q,input){
  if(round.status!=='playing')return {error:'This round has ended.'};
  const value=input.trim();if(!value)return {error:'Add an answer first. No guess used.'};
  if(round.guesses.some(g=>normalize(g.answer)===normalize(value)))return {error:'You’ve tried that answer. No guess used.'};
  const grade=gradeAnswer(q,value), attempt=round.guesses.length+1;
  const points=grade.correct?100+(7-attempt)*10:grade.points;
  round.guesses.push({answer:value,points,correct:grade.correct,relation:grade.relation||''});
  round.best=Math.max(round.best,points);if(grade.correct)round.status='won';else if(attempt>=7)round.status='lost';
  return {grade,points,attempt,remaining:7-attempt};
}
