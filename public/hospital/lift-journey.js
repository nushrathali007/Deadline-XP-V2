// The journey is derived from the existing round, so old saved rounds resume
// without a storage migration. Only a correct answer unlocks the patient floor.
export const PATIENT_FLOOR=7;
export const STOREY_HEIGHT=4;
export const ROOM_OFFSET=PATIENT_FLOOR*STOREY_HEIGHT-3.625;

const DEPARTMENTS=[
 {name:'Nephrology',kind:'dialysis',accent:'#0ea5e9',wall:'#f8fafc',floor:'#e0f2fe'},
 {name:'Psychiatry',kind:'lounge',accent:'#f59e0b',wall:'#fffbeb',floor:'#fef3c7'},
 {name:'Cardiology',kind:'cardiac',accent:'#ef4444',wall:'#fff1f2',floor:'#ffe4e6'},
 {name:'Neurology',kind:'exam',accent:'#8b5cf6',wall:'#f5f3ff',floor:'#ede9fe'},
 {name:'Pulmonology',kind:'respiratory',accent:'#06b6d4',wall:'#ecfeff',floor:'#cffafe'},
 {name:'Pediatrics',kind:'pediatric',accent:'#eab308',wall:'#fefce8',floor:'#fef9c3'},
 {name:'Emergency medicine',kind:'emergency',accent:'#f97316',wall:'#fff7ed',floor:'#ffedd5'},
 {name:'Gastroenterology',kind:'treatment',accent:'#10b981',wall:'#ecfdf5',floor:'#d1fae5'}
];
function hash(value){let n=2166136261;for(const char of String(value)){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
export function wardProfile(specialty='Internal medicine'){
 const name=String(specialty).trim()||'Internal medicine',n=name.toLowerCase();
 let kind=n.includes('nephro')||n.includes('urol')?'dialysis':n.includes('psychi')?'lounge':n.includes('cardio')?'cardiac':n.includes('pulmo')||n.includes('respir')?'respiratory':n.includes('pediatr')?'pediatric':n.includes('emerg')?'emergency':n.includes('neuro')||n.includes('ophthal')?'exam':'treatment';
 return {...DEPARTMENTS.find(d=>d.kind===kind),name,kind};
}
export function wardFloors(question={}){
 const target=wardProfile(question.specialty),seed=hash(question.id||target.name);
 const candidates=DEPARTMENTS.filter(d=>d.name.toLowerCase()!==target.name.toLowerCase());
 const offset=seed%candidates.length,ordered=[...candidates.slice(offset),...candidates.slice(0,offset)];
 return [{floor:0,name:'Lobby & reception',kind:'lobby',accent:'#10b981',wall:'#f8fafc',floorColor:'#e2e8f0'},...ordered.slice(0,6).map((d,i)=>({...d,floorColor:d.floor,floor:i+1,layout:(seed+i)%3})),{...target,floorColor:target.floor,floor:7,layout:seed%3,target:true}];
}
export function journeyForRound(round={guesses:[],status:'playing'}){
 let floor=0;
 for(const guess of round.guesses||[]){
  if(guess.correct){floor=PATIENT_FLOOR;break;}
  // Same-class knowledge earns an express hop. Every other submitted miss
  // reaches the next landing, but no partial answer opens the seventh floor.
  floor=Math.min(PATIENT_FLOOR-1,floor+(guess.points>=65?2:1));
 }
 const won=round.status==='won',lost=round.status==='lost';
 return {floor:won?7:floor,won,lost,attempts:(round.guesses||[]).length,remaining:Math.max(0,7-(round.guesses||[]).length)};
}
