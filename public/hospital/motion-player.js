import * as THREE from 'three';

export const JOINTS=['root','torso','head','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftThigh','leftShin','rightThigh','rightShin'];
const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),yawQ=new THREE.Quaternion(),axisY=new THREE.Vector3(0,1,0);
const box=new THREE.Box3();
export const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export const mixAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

export function createRig(source){
 const model=source.clone(true),placement=new THREE.Group(),joints={};placement.add(model);
 for(const key of JOINTS){joints[key]=model.getObjectByName(key);if(!joints[key])throw Error(`Missing character joint: ${key}`);}
 return {placement,model,joints,hipY:joints.root.position.y,baseRoot:joints.root.position.clone(),clip:null,transition:null};
}
export function sampleMotion(rig,library,name,time,{rootScale=.25,neutralHeading=false}={}){
 const c=library.clips[name];if(!c)throw Error(`Missing motion: ${name}`);
 const t=THREE.MathUtils.clamp(time,0,c.duration),times=c.times;
 let i=Math.min(times.length-2,Math.max(0,Math.floor(t*library.fps)));
 while(i>0&&times[i]>t)i--;while(i+1<times.length-1&&times[i+1]<t)i++;
 const k=THREE.MathUtils.clamp((t-times[i])/(times[i+1]-times[i]),0,1);
 for(const part of JOINTS){const values=c.quaternions[part];qa.fromArray(values,i*4);qb.fromArray(values,(i+1)*4);rig.joints[part].quaternion.copy(qa.slerp(qb,k));}
 const dy=THREE.MathUtils.lerp(c.rootMotion[i*3+1],c.rootMotion[(i+1)*3+1],k);
 rig.joints.root.position.copy(rig.baseRoot);rig.joints.root.position.y+=dy*rootScale;
 if(neutralHeading&&c.rootHeadingYaw){const heading=THREE.MathUtils.lerp(c.rootHeadingYaw[i],c.rootHeadingYaw[i+1],k);yawQ.setFromAxisAngle(axisY,-heading);rig.joints.root.quaternion.premultiply(yawQ);}
 return c;
}
export function capturePose(rig){return {quaternions:Object.fromEntries(JOINTS.map(key=>[key,rig.joints[key].quaternion.clone()])),rootY:rig.joints.root.position.y};}
export function blendPose(rig,from,amount){if(!from||amount>=1)return;const t=THREE.MathUtils.clamp(amount,0,1);for(const key of JOINTS){qb.copy(rig.joints[key].quaternion);rig.joints[key].quaternion.copy(from.quaternions[key]).slerp(qb,t);}rig.joints.root.position.y=THREE.MathUtils.lerp(from.rootY,rig.joints.root.position.y,t);}
export function transitionMotion(rig,library,name,time,clock,{blend=.7,...options}={}){
 if(rig.clip!==name){rig.transition={from:capturePose(rig),at:clock};rig.clip=name;}
 sampleMotion(rig,library,name,time,options);if(rig.transition){const p=(clock-rig.transition.at)/blend;blendPose(rig,rig.transition.from,ease(p));if(p>=1)rig.transition=null;}
}
export function plantFeet(rig,floor){rig.placement.updateMatrixWorld(true);box.makeEmpty();for(const side of ['left','right'])box.expandByObject(rig.joints[side+'Thigh']);rig.placement.position.y+=floor-box.min.y;}

// Match the raised right wrist to a stable pole grip, retaining the uploaded gait.
const down=new THREE.Vector3(0,-1,0),start=new THREE.Vector3(),elbow=new THREE.Vector3(),direction=new THREE.Vector3(),bend=new THREE.Vector3(),upperEnd=new THREE.Vector3(),parentQ=new THREE.Quaternion(),goal=new THREE.Vector3();
export function holdPole(rig,localGrip){
 const upper=rig.joints.rightUpperArm,lower=rig.joints.rightLowerArm;
 rig.placement.updateMatrixWorld(true);goal.copy(localGrip);rig.placement.localToWorld(goal);upper.getWorldPosition(start);lower.getWorldPosition(elbow);
 const l1=lower.position.length(),l2=l1,d=THREE.MathUtils.clamp(start.distanceTo(goal),.05,l1+l2-.005);
 direction.copy(goal).sub(start).normalize();bend.copy(elbow).sub(start);bend.addScaledVector(direction,-bend.dot(direction));if(bend.lengthSq()<.00001)bend.set(0,0,1).addScaledVector(direction,-direction.z);bend.normalize();
 const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));upperEnd.copy(start).addScaledVector(direction,a).addScaledVector(bend,h);
 upper.parent.getWorldQuaternion(parentQ).invert();direction.copy(upperEnd).sub(start).normalize().applyQuaternion(parentQ);upper.quaternion.setFromUnitVectors(down,direction);rig.placement.updateMatrixWorld(true);
 upper.getWorldQuaternion(parentQ).invert();direction.copy(goal).sub(upperEnd).normalize().applyQuaternion(parentQ);lower.quaternion.setFromUnitVectors(down,direction);rig.placement.updateMatrixWorld(true);return goal;
}
