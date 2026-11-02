import {normalize} from './scoring.js';
function hash(text){let value=2166136261;for(const c of String(text)){value^=c.charCodeAt(0);value=Math.imul(value,16777619);}return value>>>0;}
function random(seed){let x=seed||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function shuffle(values,rng){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// Each block of four practice cases uses all four answer positions. The order
// is randomized per session, rather than exposing a repeating A-B-C-D pattern.
export function practiceChoices(question,index,sessionSeed){
 const block=Math.floor(index/4),positions=shuffle([0,1,2,3],random(hash(`${sessionSeed}:positions:${block}`))),slot=positions[index%4];
 const wrong=question.options.filter(text=>normalize(text)!==normalize(question.answer));
 if(wrong.length!==3)throw Error('A case must have four distinct choices including its canonical answer.');
 const choices=shuffle(wrong,random(hash(`${sessionSeed}:${question.id}:${index}`)));choices.splice(slot,0,question.answer);return choices;
}
