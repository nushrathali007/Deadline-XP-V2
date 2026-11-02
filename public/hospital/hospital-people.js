import * as THREE from 'three';
import {createRig,transitionMotion,plantFeet,ease,mixAngle} from './motion-player.js';
import {facingYaw} from './room-motion.js';
import {buildMinecraftCharacterTemplate} from './voxel-world.js';

const seatedSequence=[['sitIdleB',9.5],['sitRubArm',8],['sitTalk',12],['sitIdleA',4.2]];
const seatedDuration=seatedSequence.reduce((sum,item)=>sum+item[1],0);
const bedside=new THREE.Vector3(7.12,3.625,2.45);

export function createHospitalPeople({scene,patientLayer,roster,motion,extra,container}){
 const people=roster.characters.map((entry,index)=>{
  let roleKey=entry.rig;
  if(entry.role==='pharmacist')roleKey='pharmacist';
  else if(entry.role==='seated')roleKey=index%3===0?'visitor-blue':index%3===1?'visitor-amber':'steve';
  else if(entry.rig==='white-staff'&&index%2===1)roleKey='surgeon';

  const rig=createRig(buildMinecraftCharacterTemplate(roleKey));
  (entry.role==='room-nurse'&&patientLayer?patientLayer:scene).add(rig.placement);
  rig.placement.name=entry.id;
  const position=new THREE.Vector3(...entry.position),person={...entry,index,rig,home:position.clone(),yaw:entry.yaw||0,lastSide:null,move:null};
  if(entry.role==='seated')position.y=entry.hipPosition[1]-rig.hipY;
  rig.placement.position.copy(position);rig.placement.rotation.y=person.yaw;return person;
 });
 const nurse=people.find(person=>person.role==='room-nurse');
 function updateSeated(person,time){
  let local=(time+person.index*4.37)%seatedDuration,clip='sitIdleB';
  for(const [name,duration] of seatedSequence){if(local<duration){clip=name;break;}local-=duration;}
  const {rig}=person;rig.placement.position.set(person.hipPosition[0],person.hipPosition[1]-rig.hipY,person.hipPosition[2]);rig.placement.rotation.y=person.yaw;
  transitionMotion(rig,extra,clip,(local+person.index*.83)%extra.clips[clip].duration,time,{blend:.85,rootScale:0,neutralHeading:true});
  if(person.floorSit){for(const side of ['left','right']){rig.joints[side+'Thigh'].rotation.set(-Math.PI/2,0,side==='left'?-.08:.08);rig.joints[side+'Shin'].quaternion.identity();}}
  return clip;
 }
 function updateStanding(person,time,dt){
  const {rig}=person,A=person.home,B=new THREE.Vector3(...person.routeEnd),walkDuration=Math.max(3.2,A.distanceTo(B)/.35),talkDuration=5.2+person.index*.15,total=2*(walkDuration+talkDuration);
  let local=(time+person.index*2.73)%total,from=A,to=B,moving=false,at=A;
  if(local<talkDuration){at=A;}
  else if(local<talkDuration+walkDuration){local-=talkDuration;moving=true;from=A;to=B;}
  else if(local<2*talkDuration+walkDuration){local-=talkDuration+walkDuration;at=B;from=B;to=A;}
  else{local-=2*talkDuration+walkDuration;moving=true;from=B;to=A;}
  rig.placement.position.copy(moving?new THREE.Vector3().lerpVectors(from,to,ease(local/walkDuration)):at);
  const desired=moving?facingYaw(from,to):facingYaw(at,person.focus?new THREE.Vector3(...person.focus):new THREE.Vector3(at.x+Math.sin(person.yaw),at.y,at.z+Math.cos(person.yaw)));
  person.angle=mixAngle(person.angle??person.yaw,desired,1-Math.exp(-dt*5));rig.placement.rotation.y=person.angle;
  if(moving&&local<extra.clips.startWalk.duration){transitionMotion(rig,extra,'startWalk',local,time,{blend:.4,rootScale:.2,neutralHeading:true});}
  else if(moving){transitionMotion(rig,motion,'walk',(local*.75)%motion.clips.walk.duration,time,{blend:.45,rootScale:.25,neutralHeading:true});}
  else{
   const talkClip=person.index%2===0?'talk':'bartender';
   transitionMotion(rig,extra,talkClip,(local+person.index)%extra.clips[talkClip].duration,time,{blend:.65,rootScale:.15,neutralHeading:true});
  }
  plantFeet(rig,person.home.y);return moving?'walking':'talking';
 }
 function updateNurse(person,time,dt,stage,patientPosition){
  const {rig}=person,side=stage>=3;
  if(side!==person.lastSide){person.lastSide=side;const target=side?bedside:person.home;person.move={from:rig.placement.position.clone(),to:target.clone(),start:time,duration:Math.max(2.4,rig.placement.position.distanceTo(target)/.45)};}
  let moving=false;
  if(person.move){const p=(time-person.move.start)/person.move.duration;if(p<1&&person.move.from.distanceTo(person.move.to)>.04){moving=true;rig.placement.position.lerpVectors(person.move.from,person.move.to,ease(p));}else{rig.placement.position.copy(person.move.to);person.move=null;}}
  const target=moving?person.move.to:patientPosition,desired=facingYaw(rig.placement.position,target);person.angle=mixAngle(person.angle??person.yaw,desired,1-Math.exp(-dt*5));rig.placement.rotation.y=person.angle;
  if(moving)transitionMotion(rig,motion,'walk',time*.8%motion.clips.walk.duration,time,{blend:.5,rootScale:.2,neutralHeading:true});
  else{transitionMotion(rig,extra,'talk',time%extra.clips.talk.duration,time,{blend:.65,rootScale:.15,neutralHeading:true});if(side)rig.joints.head.rotation.x+=.28;}
  plantFeet(rig,person.home.y+(patientLayer?.position.y||0));return moving?'approaching-bed':side?'talking-at-bed':'talking-in-room';
 }
 function update(time,dt,stage,patientPosition){
  let seated=0,walking=0,talking=0;const activity=[];
  for(const person of people){let action;
   if(person.role==='seated'){action=updateSeated(person,time);seated++;}
   else if(person.role==='pharmacist'){
    transitionMotion(person.rig,extra,'bartender',time%extra.clips.bartender.duration,time,{blend:.6,rootScale:.15,neutralHeading:true});person.rig.placement.position.copy(person.home);person.rig.placement.rotation.y=person.yaw;plantFeet(person.rig,person.home.y);action='pharmacy-counter';
   }else if(person.role==='room-nurse')action=updateNurse(person,time,dt,stage,patientPosition);
   else{action=updateStanding(person,time,dt);if(action==='walking')walking++;else talking++;}
   activity.push(`${person.id}:${action}`);
   if(person===nurse){container.dataset.nurseAction=action;container.dataset.nursePosition=person.rig.placement.position.toArray().map(n=>n.toFixed(3)).join(',');container.dataset.nurseFacing=String(person.angle);}
  }
  container.dataset.lobbyActivity=`${seated} seated · ${walking} walking · ${talking} talking`;
  container.dataset.npcActions=activity.join('|');
 }
 container.dataset.npcCount=String(people.length);
 return {update};
}
