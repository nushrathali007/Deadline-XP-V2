import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {SoftwareRenderer} from './software-renderer.js';
import {createWardAudio} from './ward-audio.js';
import {fitModel} from './room-assets.js';
import {createRig,sampleMotion,capturePose,blendPose,plantFeet,holdPole,ease} from './motion-player.js';
import {advancePacer,facingYaw} from './room-motion.js';
import {createHospitalPeople} from './hospital-people.js';
import {createHospitalTower} from './hospital-tower.js';
import {ROOM_OFFSET} from './lift-journey.js';
import {buildMinecraftCharacterTemplate,setupCrispMinecraftLighting} from './voxel-world.js';

const HR=[78,90,102,113,124,136,148,0],FLOOR=3.625;
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function createWard(container,options={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(54,1,.08,180),loader=new GLTFLoader(),audio=createWardAudio();
 let renderer,software=false;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;}catch{renderer=new SoftwareRenderer();software=true;}
 setupCrispMinecraftLighting(scene,{skyColor:'#7ec8ff'});
 container.append(renderer.domElement);renderer.domElement.style.display='block';
 const wrap=container.closest('.scene-wrap'),caption=document.createElement('div');caption.className='hospital-caption';caption.innerHTML='<span>Ward Rounds hospital</span><strong>Seven floors. One patient waiting.</strong>';wrap.append(caption);
 const enter=document.createElement('button');enter.hidden=true;enter.className='enter-room';enter.type='button';enter.textContent='Enter Room 07 →';enter.onclick=()=>goRoom();wrap.append(enter);
 let stage=-1,won=false,ready=false,model,ivProp,patientRig,people,joints={},motion,extraMotion,actionStart=0,lastActionTime=-.001,lastRender=-Infinity,lastFrame=0,clock=0,beatAge=0,cameraMode='room',journey=null,overviewHeld=false,roomPan=0,panTarget=0;
 const pacer={distance:.5,speed:.42},grip=new THREE.Vector3(-.45,.95,.32);let gaitTime=0,ivBlend=0,patientBlend=null;
 const patientLayer=new THREE.Group();patientLayer.name='patient-ward-floor-seven';scene.add(patientLayer);
 let tower,pendingCase=null,pendingRound=null;
 const actor=new THREE.Group();actor.name='original-minecraft-patient';patientLayer.add(actor);
 let faceMask;const oxygen=new THREE.Group(),ventHose=new THREE.Group();patientLayer.add(oxygen,ventHose);
 const lit=(color,extra={})=>new THREE.MeshLambertMaterial({color,...extra});
 const basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,...extra});
 function box(w,h,d,color,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),lit(color));o.position.set(x,y,z);parent.add(o);return o;}
 function tube(points,color,r=.025,parent=scene){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,6,false),lit(color));parent.add(mesh);return mesh;}
 function pixelMaterials(root){root.traverse(n=>{if(!n.isMesh)return;n.material=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;m.map.colorSpace=THREE.SRGBColorSpace;}const next=new THREE.MeshLambertMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,side:m.side,depthWrite:!m.transparent});return next;});if(n.material.length===1)n.material=n.material[0];});}
 const monitorCanvas=document.createElement('canvas');monitorCanvas.width=256;monitorCanvas.height=160;const mctx=monitorCanvas.getContext('2d'),monitorTexture=new THREE.CanvasTexture(monitorCanvas);monitorTexture.colorSpace=THREE.SRGBColorSpace;monitorTexture.magFilter=THREE.NearestFilter;monitorTexture.minFilter=THREE.NearestFilter;
 const monitorScreen=new THREE.Mesh(new THREE.PlaneGeometry(.44,.44),basic(0xffffff,{map:monitorTexture}));
 async function prop(name,settings){const g=await loader.loadAsync(`./assets/models/${name}${software?'-lite':''}.glb`);pixelMaterials(g.scene);const fitted=fitModel(g.scene,settings);patientLayer.add(fitted.group);return fitted;}
 function setShot(pos,target,fov){camera.position.copy(pos);camera.lookAt(target);camera.fov=fov;camera.updateProjectionMatrix();}
 const whole={pos:new THREE.Vector3(1.5,17.5,-52),target:new THREE.Vector3(1.8,15.5,1.0),fov:42};
 const front={pos:new THREE.Vector3(7.4,6.3,-1.8),target:new THREE.Vector3(8.2,4.5,2.6),fov:52};
 const room={pos:new THREE.Vector3(9.91,6.65,4.72),target:new THREE.Vector3(8.0,4.4,2.1),fov:68};
 for(const shot of [front,room]){shot.pos.y+=ROOM_OFFSET;shot.target.y+=ROOM_OFFSET;}
 let currentTarget=room.target.clone();
 function travel(mode){if(!ready)return false;audio.cancelActions();overviewHeld=mode==='hospital';cameraMode=mode;panTarget=0;roomPan=0;const dest=mode==='hospital'?whole:mode==='window'?front:room;journey={start:performance.now(),duration:reduced?1:mode==='hospital'?2400:mode==='window'?1600:camera.position.distanceTo(whole.pos)<2?6200:1600,from:camera.position.clone(),fromTarget:currentTarget.clone(),fromFov:camera.fov,dest};wrap.dataset.camera=mode;return true;}
 function goRoom(){overviewHeld=false;return travel('room');}
 function cameraTick(now){if(journey){let t=(now-journey.start)/journey.duration;if(t>=1){setShot(journey.dest.pos,journey.dest.target,journey.dest.fov);currentTarget.copy(journey.dest.target);journey=null;}else{let p=smooth(t),pos=journey.from.clone().lerp(journey.dest.pos,p),target=journey.fromTarget.clone().lerp(journey.dest.target,p),fov=THREE.MathUtils.lerp(journey.fromFov,journey.dest.fov,p);if(cameraMode==='room'&&journey.from.distanceTo(whole.pos)<2){if(t<.67){p=smooth(t/.67);pos=journey.from.clone().lerp(front.pos,p);target=journey.fromTarget.clone().lerp(front.target,p);fov=THREE.MathUtils.lerp(journey.fromFov,front.fov,p);}else{p=smooth((t-.67)/.33);pos=front.pos.clone().lerp(room.pos,p);target=front.target.clone().lerp(room.target,p);fov=THREE.MathUtils.lerp(front.fov,room.fov,p);}}setShot(pos,target,fov);currentTarget.copy(target);}}
  else if(cameraMode==='room'){roomPan+=(panTarget-roomPan)*.1;const pos=room.pos.clone();pos.x-=Math.max(0,roomPan)*1.3;pos.z-=Math.max(0,-roomPan)*1.8;setShot(pos,room.target,room.fov);currentTarget.copy(room.target);}
  wrap.classList.toggle('show-hospital-caption',cameraMode==='hospital');enter.hidden=cameraMode!=='hospital';
 }
 let drag=null;container.addEventListener('pointerdown',e=>{if(!ready||cameraMode!=='room')return;drag={x:e.clientX,pan:panTarget};container.setPointerCapture(e.pointerId);});container.addEventListener('pointermove',e=>{if(drag)panTarget=THREE.MathUtils.clamp(drag.pan+(e.clientX-drag.x)/150,-1,1);});container.addEventListener('pointerup',()=>drag=null);container.addEventListener('pointercancel',()=>drag=null);
 function resetCamera(){return travel('room');}
 function pose(name,time,rootScale=1){return sampleMotion(patientRig,motion,name,time,{rootScale});}
 function cue(name,action){if(document.hidden||journey||cameraMode!=='room')return;if(audio.play(name)){container.dataset.lastCue=name;container.dataset.cueAction=action;container.dataset.cueStage=stage;if(name!=='monitor-beep'){container.dataset.lastActionCue=name;container.dataset.actionCueStage=stage;container.dataset.actionCueAction=action;}}}
 function crossed(prev,next,t){return prev<t&&next>=t;}
 function eventOnce(name,t,prev,next,action){if(crossed(prev,next,t))cue(name,action);}
 function footEvents(name,previous,next,active=true){if(!active)return;const c=motion.clips[name],first=Math.floor(Math.max(0,previous)/c.duration),last=Math.floor(next/c.duration);let latest=-Infinity;for(let cycle=first;cycle<=last;cycle++)for(const e of c.events||[])if(e.event.includes('foot')&&crossed(previous,next,cycle*c.duration+e.time))latest=Math.max(latest,cycle*c.duration+e.time);if(next-latest<.18)cue('footstep','walking');}
 function restPose(){pose('cough',0);joints.leftUpperArm.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-.06);joints.rightUpperArm.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-.06);joints.leftLowerArm.quaternion.identity();joints.rightLowerArm.quaternion.identity();}
 function alignFeet(){plantFeet(patientRig,FLOOR+ROOM_OFFSET);}
 function animatePatient(t,previous,dt){if(!ready)return;let action='standing';actor.position.set(8.28,FLOOR,2.6);actor.rotation.set(0,0,0);oxygen.visible=stage===4;ventHose.visible=stage>=5&&stage<7;if(faceMask)faceMask.visible=stage>=4&&stage<7;
  if(stage<=1){const withIV=stage===1,at=advancePacer(pacer,dt,withIV?.20:.46),name=withIV?'ivWalk':'walk',c=motion.clips[name],oldGait=gaitTime;gaitTime+=dt*at.gaitRate;action=withIV?'iv-walking':won?'recovered-walking':'walking';pose(name,gaitTime%c.duration,.3);actor.position.set(at.x,FLOOR,at.z);actor.rotation.y=at.yaw;
   if(patientBlend){const p=ease((clock-patientBlend.at)/.65);blendPose(patientRig,patientBlend.at?patientBlend.pose:patientBlend,p);if(p>=1)patientBlend=null;}
   alignFeet();footEvents(name,oldGait,gaitTime);
   if(withIV){ivBlend=Math.min(1,ivBlend+dt/.7);const hand=holdPole(patientRig,grip);ivProp.position.lerp(new THREE.Vector3(hand.x,FLOOR,hand.z),ease(ivBlend));ivProp.rotation.y=at.yaw;}
  }
  else if(stage===2){const c=pose('sit',t,.35),p=smooth(t/2.6);action=t<c.duration?'sitting-down':'seated';actor.position.set(8.28,FLOOR,4.25-p*.5);actor.rotation.y=0;eventOnce('sit-contact',2.6,previous,t,'sitting-down');}
  else {actor.position.set(8.28,FLOOR-.02,2.6);if(stage===3){if(t<1){action='lying-down';const p=smooth(t);pose('sit',motion.clips.sit.duration,.35);const seat={};for(const [k,j] of Object.entries(joints))seat[k]=j.quaternion.clone();const seatY=joints.root.position.y;restPose();for(const [k,j] of Object.entries(joints))j.quaternion.copy(seat[k].slerp(j.quaternion,p));joints.root.position.y=THREE.MathUtils.lerp(seatY,.63,p);actor.position.z=THREE.MathUtils.lerp(3.75,2.6,p);actor.position.y=THREE.MathUtils.lerp(FLOOR,FLOOR-.02,p);eventOnce('bed-creak',.73,previous,t,'lying-down');}else if(t<1+motion.clips.cough.duration){action='coughing';pose('cough',t-1,.12);eventOnce('cough-single',1+.233-.015,previous,t,'coughing');}else{action='resting';restPose();}}
   else if(stage===4){action='laboured-breathing';restPose();const period=2.8,phase=t%period;const heave=Math.max(0,Math.sin(phase/period*Math.PI*2));joints.torso.rotation.x+=heave*.075;joints.root.position.y+=heave*.035;if(Math.floor(t/period)>Math.floor(previous/period))cue('laboured-breath','laboured-breathing');}
   else if(stage===5){action='ventilated';restPose();joints.torso.rotation.x+=Math.sin(t*Math.PI/1.8)*.025;}
   else if(stage===6){action=t<motion.clips.seizure.duration?'convulsing':'critical-rest';if(t<motion.clips.seizure.duration)pose('seizure',t,.1);else restPose();}
   else {action='flatline';restPose();}
  }
  container.dataset.action=action;
 }
 function setCondition(next,saved=false){if(next===stage&&saved===won)return;if(ready&&next<=1){patientBlend={pose:capturePose(patientRig),at:clock};gaitTime=0;if(next===1)ivBlend=0;}stage=next;won=saved;actionStart=clock;lastActionTime=-.001;beatAge=0;audio.cancelActions();container.dataset.condition=stage;delete container.dataset.lastCue;delete container.dataset.cueAction;delete container.dataset.cueStage;delete container.dataset.lastActionCue;delete container.dataset.actionCueAction;delete container.dataset.actionCueStage;if(ready&&(stage>0||saved)&&(cameraMode!=='room'||journey)){journey=null;cameraMode='room';overviewHeld=false;setShot(room.pos,room.target,room.fov);currentTarget.copy(room.target);wrap.dataset.camera='room';}}
 function drawMonitor(){mctx.fillStyle='#09191f';mctx.fillRect(0,0,256,160);mctx.strokeStyle='#1e3a4c';mctx.lineWidth=1;for(let gx=0;gx<256;gx+=32){mctx.beginPath();mctx.moveTo(gx,0);mctx.lineTo(gx,160);mctx.stroke();}for(let gy=0;gy<160;gy+=32){mctx.beginPath();mctx.moveTo(0,gy);mctx.lineTo(256,gy);mctx.stroke();}mctx.fillStyle=stage>=6?'#ef4444':'#22c55e';mctx.font='bold 26px monospace';mctx.fillText(String(HR[stage]||0),188,36);mctx.font='bold 12px monospace';mctx.fillStyle='#38bdf8';mctx.fillText('ECG · ROOM 07',14,24);mctx.fillText(`SpO2 ${[98,97,94,92,89,86,80,0][stage]??98}%`,14,144);mctx.strokeStyle=stage>=6?'#ef4444':'#4ade80';mctx.lineWidth=2.5;mctx.beginPath();for(let x=0;x<256;x++){const age=beatAge+(256-x)/105,y=82-wave(age)*30;if(x)mctx.lineTo(x,y);else mctx.moveTo(x,y);}mctx.stroke();monitorTexture.needsUpdate=true;if(software)renderer.textures.delete(monitorTexture);}
 function wave(age){if(stage===7)return 0;const period=60/(HR[stage]||78),p=(age%period)/period;if(p<.045)return 1-p/.045;if(p<.09)return -.4*(1-(p-.045)/.045);if(p>.18&&p<.34)return .15*Math.sin((p-.18)/.16*Math.PI);if(p>.82&&p<.9)return .1;return 0;}
 function addPharmacySign(sign){if(!sign)return;const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;const ctx=canvas.getContext('2d');ctx.fillStyle='#0f172a';ctx.fillRect(0,0,384,384);ctx.strokeStyle='#10b981';ctx.lineWidth=12;ctx.strokeRect(12,12,360,360);ctx.strokeStyle='#38bdf8';ctx.lineWidth=4;ctx.strokeRect(26,26,332,332);ctx.fillStyle='#10b981';ctx.fillRect(172,58,40,104);ctx.fillRect(140,90,104,40);ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 52px monospace';ctx.fillText('PHARMACY',192,226);ctx.fillStyle='#38bdf8';ctx.font='bold 28px monospace';ctx.fillText('OPEN 24H  →',192,296);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),basic(0xffffff,{map:texture,side:THREE.DoubleSide}));mesh.position.set(10.32,2.1,-1.5);mesh.rotation.y=-Math.PI/2;scene.add(mesh);container.dataset.sign='PHARMACY';}
 async function load(){try{const [library,bed,monitor,iv,vent,extra,roster]=await Promise.all([
   fetch('./assets/motion/block-motion-library.json').then(r=>{if(!r.ok)throw Error('Motion unavailable');return r.json();}),
   prop('hospital-bed',{length:2.55,stretchY:.68,position:[8.28,FLOOR,2.6],rotation:0}),prop('ecg-monitor',{height:1.5,position:[9.45,FLOOR,.85],rotation:facingYaw(new THREE.Vector3(9.45,0,.85),new THREE.Vector3(8.28,0,2.6))}),prop('iv-stand',{height:1.95,position:[7.8,FLOOR,1.3]}),prop('ventilator',{height:1.38,position:[9.45,FLOOR,1.6],rotation:facingYaw(new THREE.Vector3(9.45,0,1.6),new THREE.Vector3(8.28,0,2.6),'x')}),
   fetch('./assets/motion/extra-motion-library.json').then(r=>r.json()),fetch('./assets/people.json').then(r=>r.json())
  ]);
   const patientTemplate=buildMinecraftCharacterTemplate('steve');
   patientRig=createRig(patientTemplate);model=patientRig.model;actor.add(model);patientRig.placement=actor;motion=library;extraMotion=extra;ivProp=iv.group;ivProp.scale.x*=.65;ivProp.scale.z*=.65;joints=patientRig.joints;
   const templates={
    steve:patientTemplate,
    'room-nurse':buildMinecraftCharacterTemplate('room-nurse'),
    'red-staff':buildMinecraftCharacterTemplate('red-staff'),
    'white-staff':buildMinecraftCharacterTemplate('white-staff')
   };
   people=createHospitalPeople({scene,patientLayer,roster,templates,motion,extra,container});
   tower=createHospitalTower({scene,patientLayer,templates,motion,extra,container:options.liftContainer,software,onChange:options.onLiftUpdate});
   if(pendingCase)tower.setRound(pendingCase,pendingRound);scene.updateMatrixWorld(true);
   const c=monitor.sourceCenter;monitorScreen.geometry.dispose();monitorScreen.geometry=new THREE.PlaneGeometry(.42592531,.42592531);monitorScreen.position.set(-c.x,1.2452040847-monitor.sourceMinY,.23253782-c.z+.009/monitor.scale);monitor.group.add(monitorScreen);
   addPharmacySign(roster.sign);
   faceMask=box(.24,.14,.07,'#38bdf8',0,.14,.22,joints.head);
   box(.55,.10,.30,'#ffffff',8.28,FLOOR+.57,1.75,patientLayer);tube([[8.27,FLOOR+.85,1.65],[7.85,FLOOR+.93,1.45],[7.8,FLOOR+1.5,1.3]],'#38bdf8',.014,oxygen);
   tube([[8.27,FLOOR+.85,1.65],[8.8,FLOOR+.98,1.45],[9.4,FLOOR+1.02,1.6]],'#0ea5e9',.04,ventHose);
   ready=true;container.dataset.loaded='true';document.querySelector('#scene-loader').hidden=true;actionStart=clock;lastActionTime=-.001;setShot(whole.pos,whole.target,whole.fov);currentTarget.copy(whole.target);if(options.skipIntro||reduced){setShot(room.pos,room.target,room.fov);currentTarget.copy(room.target);cameraMode='room';}else{cameraMode='hospital';wrap.dataset.camera='hospital';setTimeout(()=>{if(cameraMode==='hospital'&&!overviewHeld)goRoom();},1800);}
  }catch(e){console.error('Could not load the hospital scene',e);document.querySelector('#scene-loader').innerHTML='The hospital could not load.<span>Please reload to try again.</span>';container.dataset.loaded='error';}}
 function size(){const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
 new ResizeObserver(size).observe(container);size();setCondition(0);load();
 function frame(now){requestAnimationFrame(frame);const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;if(document.hidden){audio.cancel();lastFrame=0;return;}clock+=dt;if(!ready)return;const elapsed=clock-actionStart;cameraTick(now);audio.setScene({stage,camera:cameraMode,travelling:!!journey});animatePatient(elapsed,lastActionTime,dt);lastActionTime=elapsed;people?.update(clock,dt,stage,actor.position);tower?.update(now,dt);container.dataset.ambience=String(audio.ambiencePlaying);const period=HR[stage]?60/HR[stage]:Infinity;beatAge+=dt;if(beatAge>=period){beatAge%=period;cue('monitor-beep','heartbeat');}if(now-lastRender>(software?90:20)){drawMonitor();const start=performance.now();renderer.render(scene,camera);tower?.render();container.dataset.activeSounds=audio.activeNames.join(',');container.dataset.renderMs=String(Math.round(performance.now()-start));lastRender=now;}}
 requestAnimationFrame(frame);
 return {setCondition,setRound(question,round){pendingCase=question;pendingRound=round;tower?.setRound(question,round);},isTravelling:()=>!!tower?.travelling,liftView:()=>tower?.setView('lift'),towerView:()=>tower?.setView('tower'),inspectFloor:floor=>tower?.setView('floor',floor),resetCamera,replayArrival:()=>travel('hospital'),windowView:()=>travel('window'),roomView:goRoom,audio,getBeatAge:()=>beatAge,getWave:wave};
}
