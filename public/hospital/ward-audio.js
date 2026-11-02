const CUES={footstep:.25,'sit-contact':.28,'bed-creak':.22,'cough-single':.30,'laboured-breath':.18,'monitor-beep':.13};

// Audio follows scene state as well as frame markers. A stale cue cannot cross rooms.
export function cueAllowed(name,{stage=0,camera='room',travelling=false}={}){
 if(camera!=='room'||travelling)return false;
 if(name==='monitor-beep')return stage>=3&&stage<=6;
 if(name==='footstep')return stage===0||stage===1;
 if(name==='sit-contact')return stage===2;
 if(name==='bed-creak'||name==='cough-single')return stage===3;
 if(name==='laboured-breath')return stage===4;
 return false;
}
export function createWardAudio(){
 let context,master,enabled=false,volume=.5,ready=false,loading,ambient=null;
 let state={stage:0,camera:'room',travelling:false};
 const buffers=new Map(),sources=new Set();
 async function prepare(){
  if(!context){context=new AudioContext();master=context.createGain();master.gain.value=volume;master.connect(context.destination);}
  await context.resume();
  if(!loading)loading=Promise.all([...Object.keys(CUES),'hospital-ambience-loop'].map(async name=>{
   const response=await fetch(`./assets/audio/${name}.wav`);if(!response.ok)throw Error('Sound unavailable');
   buffers.set(name,await context.decodeAudioData(await response.arrayBuffer()));
  })).then(()=>ready=true).catch(error=>{loading=null;ready=false;throw error;});
  await loading;
 }
 function stop(item,fade=.04){
  if(!item||item.stopping)return;item.stopping=true;
  try{const now=context.currentTime;item.gain.gain.cancelScheduledValues(now);item.gain.gain.setTargetAtTime(0,now,fade/4);item.source.stop(now+fade);}catch{}
 }
 function cancelActions(){for(const item of sources)if(item.name!=='hospital-ambience-loop')stop(item,.07);}
 function cancel(){for(const item of sources)stop(item,.07);ambient=null;}
 function connect(name,value){
  const source=context.createBufferSource(),gain=context.createGain(),item={source,gain,name,stopping:false};
  source.buffer=buffers.get(name);gain.gain.value=value;source.connect(gain);gain.connect(master);sources.add(item);
  source.onended=()=>{sources.delete(item);source.disconnect();gain.disconnect();if(ambient===item)ambient=null;};return item;
 }
 function active(){return enabled&&ready&&!document.hidden&&context?.state==='running';}
 function syncAmbience(){
  const wanted=active()&&state.camera==='hospital'&&!state.travelling;
  if(!wanted){if(ambient){stop(ambient,.65);ambient=null;}return;}
  if(ambient)return;
  ambient=connect('hospital-ambience-loop',0);ambient.source.loop=true;ambient.source.loopStart=0;ambient.source.loopEnd=ambient.source.buffer.duration;
  ambient.gain.gain.setTargetAtTime(.28,context.currentTime,.8/4);ambient.source.start(context.currentTime);
 }
 function setScene(next){
  const changed=state.stage!==next.stage||state.camera!==next.camera||state.travelling!==next.travelling;state={...state,...next};
  if(changed){for(const item of sources)if(item.name!=='hospital-ambience-loop'&&!cueAllowed(item.name,state))stop(item,.07);syncAmbience();}
 }
 function play(name,{delay=0}={}){
  if(!active()||!cueAllowed(name,state)||!buffers.has(name))return false;
  for(const item of sources)if(item.name===name&&!item.stopping)stop(item,.015);
  const item=connect(name,CUES[name]);item.source.start(context.currentTime+delay);return true;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else syncAmbience();});
 return {
  async toggle(){if(enabled){enabled=false;cancel();return false;}await prepare();enabled=true;syncAmbience();return true;},
  setVolume(value){volume=Math.max(0,Math.min(.75,value));if(master)master.gain.setTargetAtTime(volume,context.currentTime,.03);},
  play,cancel,cancelActions,setScene,
  get enabled(){return enabled;},get ready(){return ready;},get ambiencePlaying(){return !!ambient;},
  get activeNames(){return [...sources].filter(item=>!item.stopping).map(item=>item.name);}
 };
}
