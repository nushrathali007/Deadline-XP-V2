import * as THREE from 'three';
import {ease} from './motion-player.js';

export function facingYaw(position,target,front='z'){return Math.atan2(target.x-position.x,target.z-position.z)-(front==='x'?Math.PI/2:0);}

// A narrow walking lane beside the bed, with slow rounded turns. Position,
// heading, gait speed and the IV grip all come from the same route clock.
const LENGTH=1.45,RADIUS=.035,ARC=Math.PI*RADIUS,PERIMETER=2*(LENGTH+ARC);
export function samplePacer(distance){
 const s=((distance%PERIMETER)+PERIMETER)%PERIMETER,cx=6.95,z0=1.3,z1=z0+LENGTH;
 if(s<LENGTH)return {x:cx-RADIUS,z:z0+s,yaw:0,arc:false,edge:Math.min(s,LENGTH-s)};
 if(s<LENGTH+ARC){const a=(s-LENGTH)/RADIUS;return {x:cx-RADIUS*Math.cos(a),z:z1+RADIUS*Math.sin(a),yaw:a,arc:true,edge:0};}
 if(s<2*LENGTH+ARC){const a=s-LENGTH-ARC;return {x:cx+RADIUS,z:z1-a,yaw:Math.PI,arc:false,edge:Math.min(a,LENGTH-a)};}
 const a=(s-2*LENGTH-ARC)/RADIUS;return {x:cx+RADIUS*Math.cos(a),z:z0-RADIUS*Math.sin(a),yaw:Math.PI+a,arc:true,edge:0};
}
export function advancePacer(state,dt,speed){
 const at=samplePacer(state.distance),turnSpeed=RADIUS*1.7;
 const target=at.arc?turnSpeed:THREE.MathUtils.lerp(turnSpeed,speed,ease(at.edge/.18));
 state.speed+= (target-state.speed)*(1-Math.exp(-dt*7));state.distance+=state.speed*dt;
 return {...samplePacer(state.distance),gaitRate:THREE.MathUtils.clamp(state.speed/speed,.28,1.2)};
}
