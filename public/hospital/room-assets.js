import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// SVGRenderer reads tightly packed attributes. GLB exporters commonly interleave
// them, so copy each attribute into its own buffer before rendering or skinning.
function unpackGeometry(root){root.traverse(n=>{if(!n.isMesh)return;for(const [name,a] of Object.entries(n.geometry.attributes)){if(!a.isInterleavedBufferAttribute)continue;const values=new a.data.array.constructor(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.data.array[i*a.data.stride+a.offset+k];n.geometry.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize,a.normalized));}});}

export function fitModel(object,{height,length,position=[0,.16,0],rotation=0,stretchY=1}={}){
 unpackGeometry(object);
 const group=new THREE.Group();group.add(object);object.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 object.position.x-=center.x;object.position.y-=bounds.min.y;object.position.z-=center.z;
 const scale=length?length/size.z:height/size.y;group.scale.set(scale,scale*stretchY,scale);group.rotation.y=rotation;group.position.set(...position);
 object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;if(n.material){for(const m of Array.isArray(n.material)?n.material:[n.material]){m.roughness=.88;m.metalness=0;}}}});
 return {group,scale,sourceCenter:center,sourceMinY:bounds.min.y};
}

export function attachRoomAssets({scene,software,original,monitorTexture,onReady}){
 const loader=new GLTFLoader(),layer=new THREE.Group();layer.name='uploaded-room-props';scene.add(layer);
 let ready=false,useNew=true,doorMixer=null,doorClip=null;
 const baseScreen={x:.75,y:1.59,z:-1.335,width:.58,height:.36};let screen={...baseScreen};
 const path=name=>`./assets/models/${name}${software&&['hospital-bed','ecg-monitor','iv-stand','ventilator'].includes(name)?'-lite':''}.glb`;
 const load=async(name,settings)=>{const gltf=await loader.loadAsync(path(name)),fit=fitModel(gltf.scene,settings);layer.add(fit.group);return {...fit,gltf};};
 function apply(){layer.visible=ready&&useNew;for(const item of original.flat())item.visible=!(ready&&useNew);screen=ready&&useNew?newScreen:baseScreen;}
 let newScreen={...baseScreen};
 const loaded=Promise.all([
  load('hospital-bed',{length:2.32,stretchY:1.29,position:[-.65,.16,0]}),
  load('ecg-monitor',{height:1.65,position:[.75,.16,-1.5]}),
  load('iv-stand',{height:1.95,position:[.35,.16,.68]}),
  load('ventilator',{height:1.45,position:[-2.14,.16,.25]}),
  load('chair',{height:1.12,position:[2.05,.16,.2],rotation:Math.PI}),
  load('cabinet',{height:.77,position:[-2.15,.16,-1.28]}),
  load('lamp',{height:.39,position:[-2.15,.94,-1.28]}),
  load('door',{height:2.3,position:[1.95,.16,-2.14],rotation:Math.PI/2})
 ]).then(results=>{
  const monitor=results[1],s=monitor.scale,c=monitor.sourceCenter;
  newScreen={x:.75+(0-c.x)*s,y:.16+(1.2452040847-monitor.sourceMinY)*s,z:-1.5+(.23253782-c.z)*s+.005,width:.42592531*s,height:.42592531*s};
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(newScreen.width,newScreen.height),new THREE.MeshBasicMaterial({map:monitorTexture,color:software?0x173b34:0xffffff}));plane.position.set(newScreen.x,newScreen.y,newScreen.z);layer.add(plane);
  const door=results[7];if(door.gltf.animations.length){doorMixer=new THREE.AnimationMixer(door.gltf.scene);doorClip=door.gltf.animations.find(a=>a.name==='open-and-close')||door.gltf.animations[0];}
  ready=true;apply();onReady?.(true);return true;
 }).catch(error=>{console.warn('Keeping original room props because an uploaded model could not load.',error);layer.visible=false;onReady?.(false);return false;});
 layer.visible=false;
 return {loaded,setMode(value){useNew=value==='new';apply();},getScreen(){return screen;},update(dt){doorMixer?.update(dt);},openDoor(){if(doorMixer&&doorClip){const a=doorMixer.clipAction(doorClip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}}};
}

// SVGRenderer has no GPU skinning. Bake the same character rig into renderable
// mesh positions so the walk/sit animations also work in that renderer.
export function makeSkinProxies(root){
 unpackGeometry(root);
 const sources=[];root.traverse(n=>{if(n.isSkinnedMesh)sources.push(n);});
 const proxies=sources.map(source=>{const geometry=source.geometry.clone(),proxy=new THREE.Mesh(geometry,source.material);proxy.matrixAutoUpdate=false;proxy.matrix.copy(source.matrix);proxy.frustumCulled=false;source.parent.add(proxy);source.visible=false;return {source,proxy};});
 const v=new THREE.Vector3();
 return ()=>{root.updateMatrixWorld(true);for(const {source,proxy} of proxies){source.skeleton.update();proxy.matrix.copy(source.matrix);const position=proxy.geometry.getAttribute('position');for(let i=0;i<position.count;i++){source.getVertexPosition(i,v);position.setXYZ(i,v.x,v.y,v.z);}position.needsUpdate=true;proxy.geometry.computeVertexNormals();}};
}

export function createArrival({renderer,container,software,skipIntro,onFinish}){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,80),loader=new GLTFLoader();
 scene.add(new THREE.HemisphereLight(0xfffbec,0xb4c6a6,2.8));const sun=new THREE.DirectionalLight(0xfff7e7,software ? .35 : 3.1);sun.position.set(4,10,-5);scene.add(sun);if(software)scene.add(new THREE.AmbientLight(0xd0d5c5));
 let model=null,active=false,time=0,available=false,renderHospital=false,holdOverview=false,overviewBounds=null,startedAt=0,svgDrawn=false,svgViewBox=null,svgWidth=0,svgHeight=0,svgFocus={x:0,y:0};const wrap=container.closest('.scene-wrap');
 const wash=document.createElement('div');wash.className='arrival-wash';wrap.append(wash);
 const caption=document.createElement('div');caption.className='arrival-caption';caption.innerHTML='<span>WELCOME TO WARD ROUNDS</span><strong>The hospital, in a better light.</strong><small>Next stop: Room 07</small>';wrap.append(caption);
 const skip=document.createElement('button');skip.className='skip-arrival';skip.textContent='Enter Room 07 →';skip.type='button';skip.onclick=()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}holdOverview=false;time=Math.max(time,1.5);startedAt=performance.now()-time*1000;};wrap.append(skip);
 const target=new THREE.Vector3(0,.9,0),destination=new THREE.Vector3(.58,.6,-.87);
 function restoreViewBox(){if(software&&svgViewBox)renderer.domElement.setAttribute('viewBox',svgViewBox);}
 function finish(){if(!active)return;active=false;renderHospital=false;holdOverview=false;restoreViewBox();wash.style.opacity=0;wrap.classList.remove('arriving');onFinish?.();}
 function start(hold=false){if(!available)return false;time=0;startedAt=performance.now();holdOverview=hold;active=true;renderHospital=true;svgDrawn=false;wrap.classList.add('arriving');wash.style.opacity=0;frame(0);return true;}
 loader.load('./assets/models/hospital-overview.glb',g=>{unpackGeometry(g.scene);const bounds=new THREE.Box3().setFromObject(g.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());g.scene.position.set(-center.x,-bounds.min.y,-center.z);model=new THREE.Group();model.add(g.scene);model.scale.setScalar(6.5/Math.max(size.x,size.z));scene.add(model);
  const base=new THREE.Mesh(new THREE.BoxGeometry(7.1,.12,6.7),new THREE.MeshStandardMaterial({color:0xd8e2c8,roughness:1}));base.position.y=-.08;scene.add(base);
  scene.updateMatrixWorld(true);overviewBounds=new THREE.Box3().setFromObject(scene);available=true;if(!skipIntro&&!matchMedia('(prefers-reduced-motion: reduce)').matches)start();
 },undefined,error=>{console.warn('Hospital overview unavailable; entering the patient room directly.',error);});
 function frame(dt){if(!active)return false;if(!holdOverview)time=Math.max(0,(performance.now()-startedAt)/1000);const zoom=THREE.MathUtils.smoothstep(time,1.5,3.55),aspect=container.clientWidth/container.clientHeight,look=target.clone().lerp(destination,software?0:zoom);camera.position.set(look.x+7.5,look.y+6,look.z-8.5);camera.lookAt(look);camera.updateMatrixWorld(true);
  const projected=new THREE.Box3();for(const x of [overviewBounds.min.x,overviewBounds.max.x])for(const y of [overviewBounds.min.y,overviewBounds.max.y])for(const z of [overviewBounds.min.z,overviewBounds.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const cameraZoom=software?0:zoom,center=projected.getCenter(new THREE.Vector3()),size=projected.getSize(new THREE.Vector3()),half=(Math.max(size.y/2,size.x/(2*aspect))*1.16+.12)*(1-cameraZoom*.8),offsetX=center.x*(1-cameraZoom),offsetY=center.y*(1-cameraZoom);camera.left=offsetX-half*aspect;camera.right=offsetX+half*aspect;camera.top=offsetY+half;camera.bottom=offsetY-half;camera.updateProjectionMatrix();
  if(time<3.55)wash.style.opacity=String(THREE.MathUtils.smoothstep(time,3.05,3.55));
  else{renderHospital=false;restoreViewBox();wash.style.opacity=String(1-THREE.MathUtils.smoothstep(time,3.55,4.1));}
  if(renderHospital){
   if(software){
    const w=container.clientWidth,h=container.clientHeight;
    if(!svgDrawn||w!==svgWidth||h!==svgHeight){svgViewBox=`${-w/2} ${-h/2} ${w} ${h}`;renderer.domElement.setAttribute('viewBox',svgViewBox);renderer.render(scene,camera);svgWidth=w;svgHeight=h;const p=destination.clone().project(camera);svgFocus={x:p.x*w/2,y:-p.y*h/2};svgDrawn=true;}
    const scale=1-zoom*.8,vw=w*scale,vh=h*scale,cx=svgFocus.x*zoom,cy=svgFocus.y*zoom;renderer.domElement.setAttribute('viewBox',`${cx-vw/2} ${cy-vh/2} ${vw} ${vh}`);
   }else renderer.render(scene,camera);
   wrap.dataset.arrivalPhase=zoom>0?'zoom':'overview';
  }else wrap.dataset.arrivalPhase='room';if(time>4.1)finish();return renderHospital;
 }
 return {frame,start,finish,isActive:()=>active,isAvailable:()=>available};
}
