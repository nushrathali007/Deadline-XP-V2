const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map(),sounds=[];
function element(key){if(key==='#remoteErrors')return null;if(!elements.has(key))elements.set(key,{hidden:key==='#login',textContent:'',innerHTML:'',style:{},remove(){},setAttribute(){},lastChild:{textContent:''},value:'',classList:{toggle(){},remove(){},add(){}},insertAdjacentHTML(){},querySelector(){return element(key+' child')}});return elements.get(key)}
const context=vm.createContext({console,Date,Math,Map,Set,JSON,Number,String,Array,Object,Boolean,FormData:class{},window:{},document:{hidden:false,querySelector:element,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},Audio:class{constructor(src){this.src=src;sounds.push(src)}play(){return Promise.resolve()}pause(){}},escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),$:element,desktop:element('#desktop'),closeWin(){},win(){return element('window')},toast(){},openApp(){},shutdown(){},logout(){},tick(){},integrity(){},beep(){},syncCascade(){},effects(){},errorPopup(){},crash(){},recover(){},game(){},security(){},welcome(){},startPractice(){},runCommand(){},windows:new Map(),z:10,profile:'Test',paused:false,installed:true,practice:false,state:{},sound:true,cascadeTimer:null,innerWidth:1366,innerHeight:900});
const assetRoot=fs.existsSync('public/case-data.js')?'public':'dist';
vm.runInContext(fs.readFileSync(assetRoot+'/case-data.js','utf8'),context);context.CASE=context.window.CASE;vm.runInContext(fs.readFileSync(assetRoot+'/investigation.js','utf8'),context);
const run=s=>vm.runInContext(s,context);const reset=()=>run(`incident=initialIncident();profile='Test';$('#login').hidden=true;paused=false;`);
const commit=(type,data={},cost=5,unsafe=false)=>{context.nextOp={id:'action-'+Math.random(),type,data,cost,unsafe,title:type};run('pendingAction=nextOp;commitAction()')};
reset();assert.equal(run('scoreBreakdown().total'),0);assert.equal(run('clockTime()'),'09:15');run("recordRead('D01');pinEvidence('D01');pinEvidence('D01')");assert.equal(run('incident.minutes'),0);assert.equal(run('incident.pinned.length'),1);
commit('isolate');assert.equal(run('clockTime()'),'09:20');assert.equal(run('incident.triggered.E23.time'),'09:20');run('commitAction()');assert.equal(run('incident.minutes'),5,'duplicate Apply must not charge');
run(`Object.assign(incident.claims,{machine:true,machineSource:true,locationSource:true,installer:true,request:true,installTime:true,acquisition:true,authenticity:true,causal:true,timeline:true,helper:true,inventory:true,helperPath:true})`);
commit('quarantine');commit('helper',{mode:'both'});commit('stage',{source:'A03',mirror:true},10);commit('changes',{rows:[{ref:'MH-231',qty:2,source:'E07'},{ref:'MH-209',qty:-1,source:'E08'},{ref:'ENQ-0855',qty:0,source:'E09'}],correct:true});assert.equal(run('countForCurrent()'),87);commit('test');run("incident.reviewed=['MH-231','MH-209'];incident.optional=['camera','welcome','invoice','repair']");assert.equal(run('fullReady()'),true);commit('handover',{outcome:'full'});assert.equal(run('incident.minutes'),40);assert.equal(run('scoreBreakdown().total'),1000);assert.equal(run('incident.ending'),'full');
reset();commit('isolate');commit('quarantine');commit('helper',{mode:'both'});commit('stage',{source:'A02',mirror:true},10);assert.equal(run('partialReady()'),true);assert.equal(run('fullReady()'),false);commit('handover',{outcome:'partial'});assert.equal(run('incident.ending'),'partial');
reset();commit('changes',{rows:[{ref:'MH-201',qty:2,source:'E07'},{ref:'MH-209',qty:-1,source:'E08'},{ref:'ENQ-0855',qty:0,source:'E09'}],correct:false});run("incident.source='A03'");assert.equal(run('countForCurrent()'),87);assert.equal(run('correctDeltas()'),false,'a right total with wrong rows must not pass');assert.equal(run('incident.unsafe'),0);assert.equal(run('incident.bookingErrors'),1);
reset();for(let i=0;i<7;i++)commit('unsafe',{},5,true);assert.equal(run('incident.ending'),'integrity-failure');assert.equal(run('integrity()'),0);
reset();run("incident.mode='relaxed'");for(let i=0;i<8;i++)commit('unsafe',{},5,true);assert.equal(run('incident.ending'),null);assert.equal(run('integrity()'),1);
reset();run('incident.minutes=100');commit('unsafe',{},5,true);assert.equal(run('incident.minutes'),105);commit('unsafe',{},5,true);assert.equal(run('incident.minutes'),105,'cutoff blocks further operations');
reset();run("incident.test={revision:incident.revision,checks:[{pass:true}]};mutate()");assert.equal(run('incident.test'),null,'edited state invalidates test');
run("audioPrefs.enabled=true;playSound('logon',true);playSound('logoff',true);playSound('error',true);playSound('notification',true)");for(const name of ['logon','logoff','error','notify'])assert(sounds.some(s=>s==='assets/audio/'+name+'.wav'));
for(const file of fs.readdirSync(assetRoot+'/assets/audio').filter(x=>x.endsWith('.wav'))){const data=fs.readFileSync(assetRoot+'/assets/audio/'+file);assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WAVE')}
console.log('Passed: full/partial endings, 40-minute route, score 1000, double-submit protection, false-total rejection, failure/relaxed thresholds, deadline, report invalidation, uploaded sound routing and 15 WAV headers.');

vm.runInContext(fs.readFileSync(assetRoot+'/first-step-guide.js','utf8'),context);
reset();assert.equal(run('guideStep()'),0);run('tutorialState().started=true');assert.equal(run('guideStep()'),1);run("incident.read=['S02']");assert.equal(run('guideStep()'),2);run("incident.read.push('D01')");assert.equal(run('guideStep()'),3);
run("windows.set('network',{hidden:false,querySelector:()=>({value:'PC-04'}),querySelectorAll:()=>[{value:'S02'},{value:'D01'}]})");assert.equal(run('guideStep()'),6);run("pendingAction={type:'isolate'};windows.set('confirm',{hidden:false})");assert.equal(run('guideStep()'),7);run("incident.isolated='PC-04'");assert.equal(run('guideStep()'),8);run('windows.clear()');
vm.runInContext(fs.readFileSync(assetRoot+'/cash-story.js','utf8'),context);
reset();run("incident.isolated='PC-04'");
const form=values=>({elements:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:v,checked:v===true}]))});
context.form=form({expected:'620',shortage:'240',s1:'C01',s2:'C02'});run('submitCashMoney(form)');assert.equal(run('cashScore()'),250);
context.form=form({entry:'R-119',finding:'false',s1:'C03',s2:'C04',s3:'C08'});run('submitCashRefund(form)');assert.equal(run('cashScore()'),500);
context.form=form({person:'Noah Bell',s1:'C05',s2:'C06',s3:'C07'});run('submitCashRecipient(form)');assert.equal(run('cashState().recipient'),false);
context.form=form({person:'Dana Reed',s1:'C05',s2:'C06',s3:'C07'});run('submitCashRecipient(form)');assert.equal(run('cashScore()'),800);
context.form=form({theory:'cash',limits:true,summary:'Supported cash movement and disruption account.'});run('submitCashConclusion(form)');assert.equal(run('cashScore()'),1000);assert.equal(run('cashState().completed'),true);assert.equal(run('incident.unsafe'),0);assert.equal(run('incident.minutes'),0);
console.log('Passed: automatic guide progression, containment completion, supported cash reconciliation, wrong-recipient rejection, mystery ending, and free hypotheses.');

// Outbreak's state machine is separate from the cash case and survives reloads.
context.setInterval=()=>1;context.clearInterval=()=>{};
vm.runInContext(fs.readFileSync(assetRoot+'/outbreak.js','utf8'),context);
run(`gameMode='outbreak';outbreak=newOutbreak();$('#login').hidden=true;
outWindow=()=>({classList:{add(){}},style:{cssText:''},querySelector:()=>({hidden:false})});
outGuide=()=>{};outHud=()=>{};outRenderPopup=()=>{};outCrashScreen=()=>{};outSecurity=()=>{};outTasks=()=>{};outUpgrades=()=>{};outReport=()=>{};outRemove=id=>{outbreak.popups=outbreak.popups.filter(p=>p.id!==id)};`);
run('outBegin()');assert.equal(run('outbreak.popups.length'),2);assert.equal(run('outbreak.tutorial'),true);
run('outTick()');assert.equal(run('outbreak.seconds'),0,'tutorial pauses timers');
run('outbreak.tutorial=false;outResolve(1,"ok");outResolve(2,"close")');assert.equal(run('outbreak.credits'),20);
run('outSpawn("error");outResolve(outbreak.popups[0].id,"ok")');assert.equal(run('outbreak.lesson'),2);assert.equal(run('outbreak.tutorial'),true);
run('outBuy("helper")');assert.equal(run('outbreak.helper'),1);assert.equal(run('outbreak.credits'),5);run('outBuy("ram")');assert.equal(run('outbreak.ram'),0,'cannot overspend');
run('outbreak.tutorial=false;outSpawn("captcha");outResolve(outbreak.popups[0].id,"wrong")');assert.equal(run('outbreak.mistakes'),1);assert.equal(run('outbreak.popups.length'),1);run('outResolve(outbreak.popups[0].id,outbreak.popups[0].code)');assert.equal(run('outbreak.popups.length'),0);
run('outSpawn("frozen");outResolve(outbreak.popups[0].id,"close")');assert.equal(run('outbreak.popups.length'),1,'frozen windows resist X');run('outEndTask(String(outbreak.popups[0].id))');assert.equal(run('outbreak.popups.length'),0);
run('outRecover("quarantine")');assert.equal(run('outbreak.recovery'),0,'cannot quarantine before stopping source');run('outEndTask("source")');assert.equal(run('outbreak.recovery'),0,'scan gate');
run('outbreak.resolved=24;outEndTask("source");outRecover("quarantine");outRecover("startup","audio")');assert.equal(run('outbreak.recovery'),2,'wrong startup entry rejected');run('outRecover("startup","doubler");outRecover("scan")');assert.equal(run('outbreak.scanning'),true);
run('outbreak.paused=true;outTick()');assert.equal(run('outbreak.repair'),0);run('outbreak.paused=false;outbreak.tutorial=false;outbreak.popups=[];outbreak.spawn=-100;for(let i=0;i<20;i++)outTick();outRecover("restart")');assert.equal(run('outbreak.phase'),'won');assert(run('outScore()')<=1000);assert.equal(run('outbreak.recovery'),4);
run('outSave()');assert(storage.has('deadline-xp-outbreak-v1:test'));assert(storage.has('deadline-xp-v2:'+run('profile').toLowerCase())||storage.size>1,'cash saves remain untouched');
run('outbreak=newOutbreak();outbreak.phase="active";outbreak.credits=100;outbreak.recovery=2;outbreak.ram=0;for(let i=0;i<14;i++)outSpawn("frozen");outTick()');assert.equal(run('outbreak.phase'),'crashed');assert.equal(run('outbreak.credits'),75);assert.equal(run('outbreak.recovery'),2,'crash keeps checkpoint');assert.equal(run('outbreak.popups.length'),0);run('outReboot()');assert.equal(run('outbreak.phase'),'active');
run('outbreak.popups=[];outbreak.helper=1;outbreak.helperTick=7;outbreak.spawn=-100;outSpawn("error");outTick()');assert.equal(run('outbreak.popups.length'),0,'Intern resolves ordinary errors');
console.log('Passed: outbreak installation/tutorial, rewards, upgrades, code validation, frozen tasks, ordered recovery, protected services, timed repair, score cap, distinct saves, crash checkpoints and helper automation.');

vm.runInContext(fs.readFileSync(assetRoot+'/outbreak-variety.js','utf8'),context);
run("gameMode='outbreak';outbreak=newOutbreak();outbreak.phase='active';outbreak.tutorial=false;$('#login').hidden=true;");
for(const type of ['cable','allocation','filesort','mismatch','services','scan']){
 context.challengeType=type;run('outSpawn(challengeType)');
 const id=run('outbreak.popups.at(-1).id');context.challengeId=id;
 run('outChallenge(challengeId,"wrong")');assert(run('outbreak.popups.some(p=>p.id===challengeId)'),type+' must reject wrong answers');
 const answers={cable:'2',allocation:{system:40,unknown:20},filesort:{good:'keep',bad:'quarantine'},mismatch:run('outChallengeData(outbreak.popups.at(-1)).target'),services:['0','2'],scan:run('outChallengeData(outbreak.popups.at(-1)).damaged')};context.challengeAnswer=answers[type];run('outChallenge(challengeId,challengeAnswer)');assert(!run('outbreak.popups.some(p=>p.id===challengeId)'),type+' must complete on its own solution');run('outbreak.tutorial=false');
}
run('outSpawn("sequence")');context.challengeId=run('outbreak.popups.at(-1).id');run('outChallenge(challengeId,"2")');assert.equal(run('outbreak.popups.at(-1).steps||0'),0);run('outChallenge(challengeId,"0");outChallenge(challengeId,"1")');assert.equal(run('outbreak.popups.at(-1).steps'),2);run('outChallenge(challengeId,"2")');assert(!run('outbreak.popups.some(p=>p.id===challengeId)'));
run('outSetVolume(.35)');assert.equal(run('audioPrefs.effects'),.35);assert.equal(run('audioPrefs.system'),.35);run('outMute(true)');assert.equal(run('audioPrefs.enabled'),false);run('outMute(false)');assert.equal(run('audioPrefs.enabled'),true);
assert.equal(run('new Set(OUT_POPUP_ORDER).size'),15);assert.notEqual(run('outCopy({id:1,type:"error"})[1]'),run('outCopy({id:2,type:"error"})[1]'));
console.log('Passed: seven new interaction mechanics, invalid-answer rejection, ordered recovery steps, 15-type rotation, varied dialogue, volume persistence and mute.');
