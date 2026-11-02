/** Optional offline reference only. It does not connect to or modify a game.
 * All fuzzy results require player confirmation. No answer key or grading input
 * is accepted by this module. Runtime behavior must be approved before adoption.
 */
export function normalizeDrugName(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-').trim().replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ');
}

/** Optimal string alignment distance: insertion, deletion, substitution,
 * and one adjacent transposition each cost one. Not a probability. */
export function editDistance(a, b) {
  const d = Array.from({length:a.length+1}, () => new Uint16Array(b.length+1));
  for (let i=0;i<=a.length;i++) d[i][0]=i;
  for (let j=0;j<=b.length;j++) d[0][j]=j;
  for (let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}

const protectedWords = new Set(['xr','xl','er','sr','cr','mr','dr','ir','ec','la','extended','modified','immediate','delayed','release']);
function comparable(a,b) {
  // Do not erase or change numeric qualifiers or release-form words. Word
  // boundaries remain significant; salt/prodrug removal is not implemented.
  if(JSON.stringify(a.match(/\d+/g)||[])!==JSON.stringify(b.match(/\d+/g)||[])) return false;
  const aa=a.split(' '),bb=b.split(' ');
  if(aa.length!==bb.length) return false;
  const protect = words => words.filter(w=>protectedWords.has(w));
  return JSON.stringify(protect(aa))===JSON.stringify(protect(bb));
}

// Shared conservative spelling rule for catalog names and explicitly authored
// course terms. It recognizes spelling only and never assigns clinical credit.
export function scoreNameTypo(q,term,minSimilarity=.80) {
  const len=Math.min(q.length,term.length),cap=len<5?0:len<8?1:2;
  if(!cap||Math.abs(q.length-term.length)>cap||!comparable(q,term))return null;
  const distance=editDistance(q,term),similarity=1-distance/Math.max(q.length,term.length);
  return distance<=cap&&similarity>=minSimilarity?{distance,similarity}:null;
}

export function createDrugMatcher(catalog, options={}) {
  if(!catalog||catalog.schema_version!=='1.0.0'||!Array.isArray(catalog.drugs)) throw new Error('Unsupported or invalid drug catalog');
  const settings={enableFuzzy:false,acceptAliases:false,allowCombinationSeparators:false,allowReorderedComponents:false,maxSuggestions:3,minSimilarity:.80,...options};
  if(!Number.isInteger(settings.maxSuggestions)||settings.maxSuggestions<1||settings.maxSuggestions>3) throw new Error('maxSuggestions must be 1 to 3');
  if(!Number.isFinite(settings.minSimilarity)||settings.minSimilarity<.80||settings.minSimilarity>1) throw new Error('minSimilarity must be 0.80 to 1');
  const byId=new Map(),lexicon=new Map(),terms=new Map();
  for(const d of catalog.drugs){
    if(!d.id||!d.generic_name||byId.has(d.id))throw new Error('Invalid or duplicate drug identity');
    byId.set(d.id,d);
    const ns=[d.generic_name,...(settings.acceptAliases?(d.aliases||[]).map(a=>a.name):[])];
    terms.set(d.id,[...new Set(ns.map(normalizeDrugName))]);
    for(const n of terms.get(d.id)){
      if(!lexicon.has(n))lexicon.set(n,new Set());
      lexicon.get(n).add(d.id);
    }
  }
  for(const d of byId.values())for(const rid of d.component_ids||[])if(!byId.has(rid))throw new Error('Missing combination component');
  const fuzzyIds=options.suggestionDrugIds?new Set(options.suggestionDrugIds):new Set(byId.keys());
  for(const rid of fuzzyIds)if(!byId.has(rid))throw new Error('Unknown suggestion vocabulary ID: '+rid);
  const singles=[...byId.values()].filter(d=>!d.component_ids);
  const combos=[...byId.values()].filter(d=>d.component_ids);
  const out=(status,original,candidates=[],extra={})=>({status,original_input:original,candidates,requires_confirmation:status==='needs_confirmation'||status==='ambiguous',...extra});
  const card=(rid,extra={})=>({drug_id:rid,generic_name:byId.get(rid).generic_name,...extra});
  function exactResult(q,raw){
    const ids=lexicon.get(q);
    if(!ids)return null;
    const candidates=[...ids].sort().map(id=>card(id));
    if(ids.size>1)return out('ambiguous',raw,candidates,{reason:'The normalized name maps to multiple identities; ask for clarification.'});
    const id=[...ids][0];
    return out(q===normalizeDrugName(byId.get(id).generic_name)?'exact':'alias',raw,candidates);
  }
  function score(q,rid){
    // Any exact known identity is protected, including outside the fuzzy pool.
    const known=lexicon.get(q);
    if(known)return known.has(rid)?{distance:0,similarity:1}:null;
    let best=null;
    for(const term of terms.get(rid)){
      const match=scoreNameTypo(q,term,settings.minSimilarity);
      if(match&&(!best||match.distance<best.distance||match.distance===best.distance&&match.similarity>best.similarity))best=match;
    }
    return best;
  }
  const order=(a,b)=>a.distance-b.distance||b.similarity-a.similarity||a.generic_name.localeCompare(b.generic_name);
  function recognizeCombination(q,raw){
    const parts=q.split(/\s*[/+]\s*/);
    if(parts.length<2||parts.length>8||parts.some(p=>!p))return out('unrecognized_combination',raw,[],{reason:'Every component must be supplied explicitly.'});
    const known=parts.map(p=>lexicon.get(p));
    const allKnown=known.every(Boolean);
    const matches=[];
    for(const d of combos){
      if(d.component_ids.length!==parts.length)continue;
      if(!allKnown&&(!settings.enableFuzzy||!fuzzyIds.has(d.id)))continue;
      let best=null;
      function assign(i,used,total,worst){
        if(i===parts.length){if(!best||total<best.distance)best={distance:total,similarity:worst};return;}
        for(let j=0;j<d.component_ids.length;j++){
          if(used.has(j)||!settings.allowReorderedComponents&&i!==j)continue;
          const rid=d.component_ids[j];
          if(!known[i]&&!settings.enableFuzzy)continue;
          const s=score(parts[i],rid);
          if(s){used.add(j);assign(i+1,used,total+s.distance,Math.min(worst,s.similarity));used.delete(j);}
        }
      }
      assign(0,new Set(),0,1);
      if(best)matches.push(card(d.id,best));
    }
    matches.sort(order);
    const exact=matches.filter(m=>m.distance===0);
    if(exact.length===1)return out('exact',raw,exact,{recognized_by:'complete_component_set'});
    if(exact.length>1)return out('ambiguous',raw,exact,{reason:'More than one combination identity has this ingredient set.'});
    if(matches.length)return out('needs_confirmation',raw,matches.slice(0,settings.maxSuggestions),{reason:'Confirm the complete ingredient set; no component has been added.'});
    return out('unrecognized_combination',raw,[],{reason:'No complete matching combination. Exact known components were not rewritten.'});
  }
  return Object.freeze({recognize(raw){
    if(typeof raw!=='string')return out('unsupported_input',raw,[],{reason:'Supply a drug name as text.'});
    const q=normalizeDrugName(raw);
    if(!q)return out('empty',raw);
    if(q.length>160)return out('unsupported_input',raw,[],{reason:'Input is too long for this reference matcher.'});
    const exact=exactResult(q,raw);if(exact)return exact;
    if(/[/+]/.test(q))return settings.allowCombinationSeparators?recognizeCombination(q,raw):out('unrecognized_combination',raw);
    if(!settings.enableFuzzy)return out('unrecognized',raw);
    const matches=[];
    for(const d of singles){
      if(!fuzzyIds.has(d.id))continue;
      const s=score(q,d.id);if(s)matches.push(card(d.id,{...s,identity_guard:(d.confusable_ids||[]).length>0}));
    }
    matches.sort(order);
    return matches.length?out('needs_confirmation',raw,matches.slice(0,settings.maxSuggestions),{reason:'Select or edit the intended name before the existing game grades the answer.'}):out('unrecognized',raw);
  }});
}
