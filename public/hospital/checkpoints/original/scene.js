import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {SVGRenderer} from './vendor/SVGRenderer.js';
export function createWard(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let renderer,software=false;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{renderer=new SVGRenderer();software=true;renderer.setQuality('high');}
 if(!software){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;}container.append(renderer.domElement);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,80);scene.background=null;
 scene.add(new THREE.HemisphereLight(0xfffbec,0x98ad8b,2.6));const sun=new THREE.DirectionalLight(0xfff7e7,3.4);sun.position.set(3.5,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6});sun.shadow.normalBias=.03;sun.shadow.bias=-.0001;scene.add(sun);
 if(software){scene.add(new THREE.AmbientLight(0xa6b3a1,.8));sun.intensity=.58;}
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...extra});
 const C={floor:mat(0xd2ddc2),tile:mat(0xe4e9d8),wall:mat(0xf4f3e4),white:mat(0xfbf9e9),metal:mat(0xb2c2af,{metalness:.25}),green:mat(0x799d7a),mint:mat(0xadc7a2),blanket:mat(0xa6bf76),dark:mat(0x305c49),screen:mat(0x14352f),wood:mat(0xc8ac7c),skin:mat(0xcba483)};
 const box=(w,h,d,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,software?10:18,software?6:12),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
 const cylinder=(r,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
 function label(text,bg='#f2f2e3',fg='#456d50',w=256,h=100){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 38px sans-serif';ctx.fillText(text,w/2,h/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});}
 box(6.5,.24,4.9,C.floor,0,-.03,0);box(6.3,.07,4.7,C.tile,0,.12,0);
 const grout=mat(0xcbd7be);for(let i=-3;i<=3;i++)box(.011,.009,4.65,grout,i,.16,0);for(let i=-2;i<=2;i++)box(6.25,.009,.011,grout,0,.16,i);
 box(6.35,2.8,.12,C.wall,0,1.58,-2.3);box(.12,2.8,4.65,C.wall,-3.1,1.58,0);box(6.35,.13,.15,C.mint,0,.29,-2.2);box(.15,.13,4.65,C.mint,-3,.29,0);
 // Door, wall sign, clock and a softly lit side window.
 box(1.08,2.3,.06,C.mint,1.95,1.33,-2.2);box(.69,.72,.04,mat(0xcee0d0),1.95,1.77,-2.15);box(.14,.035,.055,C.dark,2.31,1.27,-2.13);box(1.22,.08,.16,C.white,1.95,2.52,-2.18);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.48,.18),label('WARD 07'));sign.position.set(1.95,2.7,-2.22);scene.add(sign);
 box(.42,.42,.03,C.green,.25,2.19,-2.2);box(.075,.26,.025,C.white,.25,2.19,-2.175);box(.26,.075,.025,C.white,.25,2.19,-2.17);
 const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.24,32),C.white);clockFace.position.set(-1.9,2.28,-2.205);scene.add(clockFace);box(.014,.16,.02,C.dark,-1.9,2.32,-2.17);const hand=box(.13,.014,.02,C.dark,-1.84,2.28,-2.17);hand.rotation.z=-.3;
 box(.04,1.13,1.64,C.white,-3.01,1.9,-.4);box(.05,.91,1.42,mat(0xc4ded6,{emissive:0x29493f,emissiveIntensity:.12}),-2.98,1.9,-.4);box(.06,1.0,.04,C.white,-2.94,1.9,-.4);box(.06,.04,1.49,C.white,-2.94,1.9,-.4);
 // Custom hospital bed. All props stay independent of the animated rig.
 const bed=new THREE.Group();bed.position.x=-.65;scene.add(bed);
 box(1.24,.17,2.32,C.metal,0,.78,0,bed);box(1.2,.22,2.28,C.white,0,.98,0,bed);box(1.3,.55,.1,C.mint,0,1.05,-1.18,bed);box(1.3,.36,.1,C.mint,0,.86,1.18,bed);box(1.35,.1,.12,C.white,0,1.34,-1.18,bed);
 for(const x of [-.48,.48])for(const z of [-.92,.92]){cylinder(.035,.5,C.metal,x,.49,z,bed);const wheel=cylinder(.09,.07,C.dark,x,.22,z,bed);wheel.rotation.z=Math.PI/2;}
 for(const x of [-.67,.67]){box(.04,.04,1.22,C.metal,x,1.28,.1,bed);for(const z of [-.5,.7])box(.035,.34,.035,C.metal,x,1.1,z,bed);}
 const pillow=box(.85,.15,.4,C.white,0,1.14,-.83,bed);pillow.rotation.x=-.08;
 const blanket=box(1.12,.12,1.22,C.blanket,0,1.21,.49,bed);box(1.13,.045,.16,C.mint,0,1.285,-.04,bed);
 // Bedside locker and lamp.
 box(.67,.75,.63,C.white,-2.15,.56,-1.28);box(.74,.06,.69,C.wood,-2.15,.96,-1.28);box(.52,.018,.025,C.metal,-2.15,.62,-.953);sphere(.025,C.dark,-2.15,.72,-.94);cylinder(.04,.28,C.metal,-2.15,1.1,-1.28);const lamp=new THREE.Mesh(new THREE.ConeGeometry(.16,.24,16,1,true),C.mint);lamp.position.set(-2.15,1.33,-1.28);scene.add(lamp);
 // ECG station and animated screen.
 cylinder(.045,1.07,C.metal,.75,.73,-1.5);box(.6,.065,.45,C.metal,.75,.22,-1.5);box(.73,.53,.22,C.white,.75,1.57,-1.5);box(.61,.4,.025,C.screen,.75,1.58,-1.377);
 const monitorCanvas=document.createElement('canvas');monitorCanvas.width=256;monitorCanvas.height=160;const mctx=monitorCanvas.getContext('2d'),monitorTexture=new THREE.CanvasTexture(monitorCanvas);monitorTexture.colorSpace=THREE.SRGBColorSpace;const monitor=new THREE.Mesh(new THREE.PlaneGeometry(.58,.36),new THREE.MeshBasicMaterial({map:monitorTexture}));monitor.position.set(.75,1.59,-1.358);scene.add(monitor);
 // Ventilator, oxygen tank and IV stand.
 const ventilator=new THREE.Group();ventilator.position.set(-2.14,0,.25);scene.add(ventilator);box(.62,.64,.5,C.white,0,.82,0,ventilator);box(.52,.35,.32,C.mint,0,1.31,0,ventilator);box(.37,.22,.025,C.screen,0,1.34,.171,ventilator);box(.48,.07,.45,C.metal,0,.39,0,ventilator);cylinder(.035,.55,C.metal,0,.4,0,ventilator);for(const x of [-.2,.2]){const w=cylinder(.07,.06,C.dark,x,.22,.1,ventilator);w.rotation.z=Math.PI/2;}
 const tank=new THREE.Group();tank.position.set(-1.65,0,1.2);scene.add(tank);cylinder(.14,.79,C.mint,0,.59,0,tank);sphere(.14,C.mint,0,.98,0,tank);box(.12,.08,.08,C.metal,0,1.13,0,tank);box(.32,.07,.3,C.metal,0,.2,0,tank);
 cylinder(.025,1.9,C.metal,.35,1.13,.68);box(.5,.035,.035,C.metal,.35,2.05,.68);box(.43,.045,.43,C.metal,.35,.21,.68);const bag=box(.21,.34,.095,mat(0xdbe8d5,{transparent:true,opacity:.75}),.55,1.82,.68);box(.18,.12,.099,C.mint,.55,1.73,.68);
 function tube(points,r,color){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,software?16:36,r,software?4:8,false),mat(color));scene.add(mesh);return mesh;}
 const oxygenTube=tube([[-1.65,1.13,1.2],[-1.45,1.55,.8],[-.9,1.45,-.05],[-.65,1.4,-.53]],.015,0x8bb3a4);
 const ventTube=tube([[-2.14,1.34,.43],[-1.65,1.73,.25],[-1,1.55,-.2],[-.65,1.4,-.53]],.043,0x9abfaa);
 const mask=sphere(.105,mat(0xd4e9d8,{transparent:true,opacity:.6}),-.65,1.38,-.56);mask.scale.set(.8,.65,1);
 tube([[.55,1.68,.68],[.55,1.3,.7],[.05,1.18,.6],[-.25,1.2,.25]],.009,0xd6d9b6);
 // A plant and chair keep the scene warm rather than clinical and stark.
 cylinder(.18,.27,C.wood,2.52,.31,-1.65);for(let i=0;i<7;i++){const leaf=sphere(.12,C.green,2.52+Math.sin(i*2)*.13,.67+Math.cos(i)*.15,-1.65+Math.cos(i*2)*.13);leaf.scale.set(.65,1.8,.7);leaf.rotation.z=Math.sin(i)*.6;}
 box(.62,.12,.62,C.mint,2.05,.66,.2);box(.62,.58,.1,C.mint,2.05,.99,-.08);for(const x of [1.82,2.28])for(const z of [-.02,.43])cylinder(.025,.5,C.metal,x,.39,z);
 const patient=new THREE.Group();scene.add(patient);let mixer=null,model=null,clips={},action=null,condition=0,saved=false,pose='walk';
 const fallback=new THREE.Group(),fallbackLegs=[],fallbackArms=[];box(.45,.6,.26,C.mint,0,.87,0,fallback);sphere(.19,C.skin,0,1.36,0,fallback);const hair=sphere(.195,C.dark,0,1.43,-.02,fallback);hair.scale.y=.55;for(const x of [-.065,.065])sphere(.019,C.dark,x,1.38,.17,fallback);box(.05,.018,.018,C.dark,0,1.28,.184,fallback);for(const x of [-.14,.14]){const leg=new THREE.Group();leg.position.set(x,.65,0);fallback.add(leg);box(.14,.34,.15,C.dark,0,-.17,0,leg);const knee=new THREE.Group();knee.position.y=-.34;leg.add(knee);box(.13,.31,.15,C.dark,0,-.155,0,knee);box(.16,.09,.24,C.white,0,-.32,.045,knee);fallbackLegs.push({leg,knee});}for(const x of [-.31,.31]){const arm=new THREE.Group();arm.position.set(x,1.12,0);fallback.add(arm);box(.13,.45,.14,C.mint,0,-.2,0,arm);sphere(.075,C.skin,0,-.43,0,arm);fallbackArms.push(arm);}patient.add(fallback);
 function play(name){if(!mixer||pose===name&&action)return;pose=name;const clip=clips[name]||clips.idle;if(!clip)return;const next=mixer.clipAction(clip);next.reset().play();if(action&&action!==next)action.fadeOut(.22);next.fadeIn(.22);action=next;}
 if(!software)new GLTFLoader().load('./assets/kenney/character-male-a.glb',g=>{model=g.scene;model.scale.setScalar(2.45);model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;}});patient.remove(fallback);patient.add(model);mixer=new THREE.AnimationMixer(model);g.animations.forEach(c=>{const clone=c.clone();if(c.name==='walk')clone.tracks=clone.tracks.map(t=>{if(t.name==='root.position'){for(let i=0;i<t.values.length;i+=3){t.values[i]=0;t.values[i+2]=0;}}return t;});clips[c.name]=clone;});pose='';setCondition(condition,saved);document.querySelector('#scene-loader').hidden=true;},undefined,()=>{document.querySelector('#scene-loader').hidden=true;});
 else document.querySelector('#scene-loader').hidden=true;
 const monitorLineGeometry=new THREE.BufferGeometry(),monitorLine=new THREE.Line(monitorLineGeometry,new THREE.LineBasicMaterial({color:0xc3df9d}));scene.add(monitorLine);monitorLine.visible=software;
 const target=new THREE.Vector3(1.45,.18,1.1);let targetRotation=0,tilt=0,yaw=.66,targetYaw=.66,drag=false,lastX=0;
 function setCondition(stage,won=false){condition=stage;saved=won;blanket.visible=stage>=3;oxygenTube.visible=stage===4;ventTube.visible=stage>=5;mask.visible=stage>=4;targetRotation=0;tilt=0;
   if(stage===0){target.set(1.35,.18,1.15);play('walk');}
   else if(stage===1){target.set(1.28,.18,.7);play('idle');}
   else if(stage===2){target.set(-.65,1.02,.65);play('sit');}
   else{target.set(-.65,1.17,1.0);targetRotation=-Math.PI/2;play('idle');}
   if(software&&stage===2)target.y=.55;fallbackLegs.forEach(({leg,knee})=>{leg.rotation.x=stage===2?-Math.PI/2:0;knee.rotation.x=stage===2?Math.PI/2:0;});
   // Pose transitions are custom transforms around the same animated character.
   if(stage>=3)tilt=0;sun.color.set(stage>=6?0xf1e8da:0xfff7e7);
 }
 container.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;container.setPointerCapture(e.pointerId);});container.addEventListener('pointermove',e=>{if(!drag)return;targetYaw=THREE.MathUtils.clamp(targetYaw+(e.clientX-lastX)*.004,-.1,1.25);lastX=e.clientX;});container.addEventListener('pointerup',()=>drag=false);container.addEventListener('pointercancel',()=>drag=false);
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;const half=Math.max(3.12,3.85/(w/h));camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}new ResizeObserver(resize).observe(container);resize();
 patient.position.copy(target);const clock=new THREE.Clock();let elapsed=0;
 function animate(){if(!container.clientWidth||document.visibilityState==='hidden')return;const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;if(mixer){mixer.update(condition===7?0:dt*(reduced?.1:1));}const smooth=reduced?1:1-Math.exp(-dt*5);patient.position.lerp(target,smooth);patient.rotation.x=THREE.MathUtils.lerp(patient.rotation.x,targetRotation,smooth);patient.rotation.y=THREE.MathUtils.lerp(patient.rotation.y,condition<2?.55:0,smooth);
   if(condition===0&&!reduced){patient.position.z=target.z+Math.sin(elapsed*.55)*.32;patient.position.x=target.x+Math.sin(elapsed*.55)*.15;}
   if(software){if(condition===0&&!reduced){fallbackLegs.forEach(({leg},i)=>leg.rotation.x=Math.sin(elapsed*6+i*Math.PI)*.35);fallbackArms.forEach((arm,i)=>arm.rotation.x=Math.sin(elapsed*6+(i+1)*Math.PI)*.25);}else fallbackArms.forEach(arm=>arm.rotation.x=0);const points=[];for(let i=0;i<=28;i++){const x=.49+i*.0185,p=i/28;let y=1.57;if(condition!==7){if(p>.35&&p<.42)y-=.05;if(p>.42&&p<.52)y+=.12;if(p>.52&&p<.59)y-=.06;}points.push(new THREE.Vector3(x,y,-1.335));}monitorLineGeometry.setFromPoints(points);}
   if(condition>=3&&condition<7&&!reduced)patient.position.y=target.y+Math.sin(elapsed*(condition>=5?2.8:1.7))*.005;
   yaw=THREE.MathUtils.lerp(yaw,targetYaw,smooth);camera.position.set(Math.sin(yaw)*11,7.1,Math.cos(yaw)*11);camera.lookAt(0,.85,0);
   mctx.fillStyle='#173b34';mctx.fillRect(0,0,256,160);mctx.fillStyle=condition>=6?'#ebc4a0':'#c5e7b4';mctx.font='bold 27px monospace';mctx.fillText(condition===7?'--':String([78,90,102,113,124,136,148][condition]),15,39);mctx.font='13px monospace';mctx.fillText('WARD 07',135,33);mctx.strokeStyle=condition>=6?'#e4bda2':'#b6df8e';mctx.lineWidth=3;mctx.beginPath();for(let x=0;x<256;x++){const p=((x+elapsed*45)%65)/65;let y=91;if(condition!==7){if(p>.4&&p<.46)y+=12;if(p>.46&&p<.51)y-=36;if(p>.51&&p<.57)y+=17;}x?mctx.lineTo(x,y):mctx.moveTo(x,y);}mctx.stroke();mctx.fillStyle='#8fb6a0';mctx.font='15px monospace';mctx.fillText(condition===7?'SpO2 --':'SpO2 '+[98,97,94,92,89,86,80][condition]+'%',14,142);monitorTexture.needsUpdate=true;
   renderer.render(scene,camera);
 }
 if(software){let last=0;const loop=t=>{if(t-last>65){animate();last=t;}requestAnimationFrame(loop);};requestAnimationFrame(loop);}else renderer.setAnimationLoop(animate);setCondition(0);return {setCondition,resetCamera(){targetYaw=.66;}};
}
