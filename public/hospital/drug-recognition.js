import {createDrugMatcher,normalizeDrugName,scoreNameTypo} from './drug-matcher.js';
import {answerTerms,normalize} from './scoring.js';

// Owner-approved choices, kept separate from the unchanged source catalog.
export const DRUG_HELPER_POLICY=Object.freeze({enabled:true,afterSubmitOnly:true,confirmEveryFuzzyMatch:true,acceptVerifiedAliases:true,suggestionVocabulary:'whole_game',maxSuggestions:3,minSimilarity:.8,allowCompleteCombinationSeparators:true,allowReorderedComponents:true,keepPreciseNamesSeparate:true,unknownInput:'edit_or_submit_anyway',classesDoNotGrade:true});
const exactStatus=result=>result.status==='exact'||result.status==='alias';

export function validateDrugCatalog(catalog){
 if(!catalog||catalog.schema_version!=='1.0.0'||typeof catalog.catalog_version!=='string'||!Array.isArray(catalog.drugs)||!catalog.drugs.length||!Array.isArray(catalog.classes)||!Array.isArray(catalog.sources)||!Array.isArray(catalog.confusable_pairs))throw Error('Unsupported drug dictionary');
 const drugs=new Set(),classes=new Set(),sources=new Set(catalog.sources.map(s=>s.id));
 for(const d of catalog.drugs){if(typeof d.id!=='string'||!d.id||drugs.has(d.id)||typeof d.generic_name!=='string'||!d.generic_name.trim()||!Array.isArray(d.aliases)||d.aliases.some(a=>typeof a.name!=='string'||!a.name.trim())||!Array.isArray(d.class_ids)||!Array.isArray(d.source_ids))throw Error('Invalid drug identity');drugs.add(d.id);}
 for(const c of catalog.classes){if(typeof c.id!=='string'||classes.has(c.id)||typeof c.name!=='string'||!Array.isArray(c.direct_drug_ids))throw Error('Invalid drug class');classes.add(c.id);}
 for(const d of catalog.drugs){for(const id of [...(d.component_ids||[]),...(d.confusable_ids||[])])if(!drugs.has(id))throw Error('Broken drug reference');for(const id of d.class_ids)if(!classes.has(id))throw Error('Broken class reference');for(const id of d.source_ids)if(!sources.has(id))throw Error('Broken source reference');}
 const byClass=new Map(catalog.classes.map(c=>[c.id,c]));
 for(const c of catalog.classes){if(c.parent_id&&!classes.has(c.parent_id)||c.direct_drug_ids.some(id=>!drugs.has(id)))throw Error('Broken class hierarchy');const seen=new Set([c.id]);let parent=c.parent_id;while(parent){if(seen.has(parent))throw Error('Cyclic class hierarchy');seen.add(parent);parent=byClass.get(parent).parent_id;}}
 for(const pair of catalog.confusable_pairs)if(!Array.isArray(pair.drug_ids)||pair.drug_ids.length!==2||pair.drug_ids.some(id=>!drugs.has(id)))throw Error('Invalid identity guard');
 return catalog;
}

export function createDrugRecognition(catalog,questions=[]){
 validateDrugCatalog(catalog);
 const byId=new Map(catalog.drugs.map(d=>[d.id,d]));
 const settings={acceptAliases:true,allowCombinationSeparators:true,allowReorderedComponents:true,maxSuggestions:3,minSimilarity:.8};
 const exact=createDrugMatcher(catalog,{...settings,enableFuzzy:false});
 let matcher,cache=new WeakMap(),vocabularyIds=[],displayNames=new Map(),courseTerms=new Map();
 const lookup=text=>exact.recognize(text);
 const resolve=text=>{const result=lookup(text);return exactStatus(result)&&result.candidates.length===1?result.candidates[0].drug_id:null;};
 function setQuestions(all){
  const ids=new Set();displayNames=new Map();courseTerms=new Map();
  // The complete course, including distractors, supplies spelling candidates.
  // No active question, correct-answer score or answer-key rank enters matching.
  for(const question of all)for(const term of [...answerTerms(question).map(item=>item.term),...(question.options||[])]){const id=resolve(term);if(id){ids.add(id);if(!displayNames.has(id))displayNames.set(id,term);}else if(isMedication(question)&&term.trim()){const name=normalizeDrugName(term);if(!courseTerms.has(name))courseTerms.set(name,term);}}
  vocabularyIds=[...ids].sort();matcher=createDrugMatcher(catalog,{...settings,enableFuzzy:true,suggestionDrugIds:vocabularyIds});cache=new WeakMap();
 }
 function isMedication(question){return question.answerType==='clinical'?false:question.answerType==='drug'||!!resolve(question.answer);}
 function approvedTerms(question){
  if(cache.has(question))return cache.get(question);
  const terms=answerTerms(question),ids=new Map();
  for(const item of [...terms].sort((a,b)=>b.points-a.points)){const id=resolve(item.term);if(id&&!ids.has(id))ids.set(id,item);}
  const value={terms,ids};cache.set(question,value);return value;
 }
 function prepare(question,input,{skipSuggestions=false}={}){
  if(!isMedication(question))return {kind:'legacy',input};
  const approved=approvedTerms(question),name=normalizeDrugName(input);
  const explicit=approved.terms.filter(item=>{
   // Drug identities retain meaningful punctuation, tokens and qualifiers.
   // Explicit class/concept phrases retain the game's existing normalization.
   return resolve(item.term)?normalizeDrugName(item.term)===name:normalize(item.term)===normalize(input);
  }).sort((a,b)=>b.points-a.points)[0];
  if(explicit)return {kind:'ready',input,gradingInput:explicit.term,drugId:resolve(input)};
  const known=lookup(input);
  if(exactStatus(known)){
   const id=known.candidates[0].drug_id,term=approved.ids.get(id);
   return {kind:'ready',input,drugId:id,gradingInput:term?.term||byId.get(id).generic_name};
  }
  if(courseTerms.has(name))return {kind:'ready',input,gradingInput:input};
  if(skipSuggestions)return {kind:'ready',input,gradingInput:input};
  const result=matcher.recognize(input);
  const candidates=result.requires_confirmation?result.candidates.map(c=>({...c,text:displayNames.get(c.drug_id)||c.generic_name,drugId:c.drug_id})):[];
  // Explicit brands and class phrases use the same conservative spelling rule,
  // pooled across the whole course. They never imply a new drug equivalence.
  for(const [term,text] of courseTerms){const match=scoreNameTypo(name,term);if(match)candidates.push({text,...match});}
  const seen=new Set();candidates.sort((a,b)=>(a.distance||0)-(b.distance||0)||(b.similarity||1)-(a.similarity||1)||a.text.localeCompare(b.text));
  const choices=candidates.filter(c=>{const key=normalizeDrugName(c.text);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3).map(({text,drugId})=>({text,...(drugId?{drugId}:{})}));
  if(choices.length)return {kind:'confirm',input,candidates:choices};
  return {kind:'unknown',input};
 }
 setQuestions(questions);
 return {prepare,setQuestions,isMedication,resolve,get available(){return true;},get count(){return catalog.drugs.length;},get vocabularyIds(){return [...vocabularyIds];},catalogVersion:catalog.catalog_version};
}

export async function loadDrugRecognition(questions,{fetcher=fetch,url='./assets/drugs/catalog.json',timeoutMs=8000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetcher(url,{signal:controller.signal});if(!response.ok)throw Error('Dictionary unavailable');return {status:'ready',adapter:createDrugRecognition(await response.json(),questions)};}
 catch(error){return {status:'unavailable',adapter:null,error};}
 finally{clearTimeout(timer);}
}
