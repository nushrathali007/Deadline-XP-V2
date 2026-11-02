import * as THREE from 'three';
const srgb=n=>n<=.0031308?n*12.92:1.055*Math.pow(n,1/2.4)-.055;

// A texture-preserving fallback for devices where WebGL is unavailable.
// The depth buffer keeps the patient, window frames and distant ward in one space.
export class SoftwareRenderer {
 constructor(){this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d',{alpha:false});this.cache=new WeakMap();this.textures=new WeakMap();this.clip=new THREE.Matrix4();this.tint=new THREE.Color();this.transparent=[];}
 setSize(w,h){const s=Math.min(1.2,680/w);this.width=Math.round(w*s);this.height=Math.round(h*s);this.domElement.width=this.width;this.domElement.height=this.height;this.domElement.style.width='100%';this.domElement.style.height='100%';this.frame=this.context.createImageData(this.width,this.height);this.pixels=new Uint32Array(this.frame.data.buffer);this.depth=new Float32Array(this.width*this.height);}
 texture(map){if(!map)return null;const cached=this.textures.get(map);if(cached&&cached.version===map.version)return cached;const im=map.image;if(!im||!(im.width&&im.height))return null;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const value={data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height,flip:map.flipY,version:map.version};this.textures.set(map,value);return value;}
 render(scene,camera){
  scene.updateMatrixWorld();camera.updateMatrixWorld();this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.pixels.fill(0xffffc87e);this.depth.fill(Infinity);this.transparent.length=0;
  scene.traverseVisible(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry,p=g.attributes.position;if(!p)return;let cache=this.cache.get(g);if(!cache){const uv=g.attributes.uv,col=g.attributes.color;cache={vertices:Array.from({length:p.count},(_,i)=>({x:p.getX(i),y:p.getY(i),z:p.getZ(i),u:uv?.getX(i)||0,v:uv?.getY(i)||0,r:col?Math.round(srgb(col.getX(i))*255):255,g:col?Math.round(srgb(col.getY(i))*255):255,b:col?Math.round(srgb(col.getZ(i))*255):255})),indices:g.index?.array};this.cache.set(g,cache);}
   const m=new THREE.Matrix4().multiplyMatrices(this.clip,mesh.matrixWorld).elements,verts=cache.vertices.map(v=>{const {x,y,z}=v;return {...v,cx:m[0]*x+m[4]*y+m[8]*z+m[12],cy:m[1]*x+m[5]*y+m[9]*z+m[13],cz:m[2]*x+m[6]*y+m[10]*z+m[14],cw:m[3]*x+m[7]*y+m[11]*z+m[15]};}),indices=cache.indices,count=indices?indices.length:verts.length;
   const groups=g.groups.length?g.groups:[{start:0,count,materialIndex:0}];
   for(const group of groups){const mat=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material;if(!mat||mat.visible===false||mat.opacity<.001)continue;this.tint.copy(mat.color||new THREE.Color(1,1,1)).convertLinearToSRGB();const style={tex:this.texture(mat.map),r:this.tint.r,g:this.tint.g,b:this.tint.b,opacity:mat.opacity??1,double:mat.side===THREE.DoubleSide,alphaTest:mat.alphaTest||0};
    for(let i=group.start;i<Math.min(count,group.start+group.count);i+=3){let polygon=[verts[indices?indices[i]:i],verts[indices?indices[i+1]:i+1],verts[indices?indices[i+2]:i+2]];if(!polygon[2])continue;if(polygon.every(v=>v.cw<=0)||polygon.every(v=>v.cx<-v.cw)||polygon.every(v=>v.cx>v.cw)||polygon.every(v=>v.cy<-v.cw)||polygon.every(v=>v.cy>v.cw)||polygon.every(v=>v.cz>v.cw))continue;
     if(polygon.some(v=>v.cz+v.cw<0)){const clipped=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],da=a.cz+a.cw,db=b.cz+b.cw;if(da>=0)clipped.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db),v={};for(const k of Object.keys(a))v[k]=a[k]+(b[k]-a[k])*t;clipped.push(v);}}polygon=clipped;}
     for(let j=1;j+1<polygon.length;j++){const tri=[polygon[0],polygon[j],polygon[j+1]].map(v=>({...v,sx:(v.cx/v.cw+1)*this.width/2,sy:(1-v.cy/v.cw)*this.height/2,sz:v.cz/v.cw,iw:1/v.cw}));if(style.opacity<1)this.transparent.push({tri,style,z:tri.reduce((s,v)=>s+v.sz,0)});else this.triangle(tri,style);}
    }
   }
  });
  this.transparent.sort((a,b)=>b.z-a.z);for(const t of this.transparent)this.triangle(t.tri,t.style);this.context.putImageData(this.frame,0,0);
 }
 triangle(v,s){let [a,b,c]=v;let area=(b.sx-a.sx)*(c.sy-a.sy)-(b.sy-a.sy)*(c.sx-a.sx);if(Math.abs(area)<.005||(!s.double&&area>=0))return;if(area<0){[b,c]=[c,b];area=-area;}const W=this.width,H=this.height,minX=Math.max(0,Math.floor(Math.min(a.sx,b.sx,c.sx))),maxX=Math.min(W-1,Math.ceil(Math.max(a.sx,b.sx,c.sx))),minY=Math.max(0,Math.floor(Math.min(a.sy,b.sy,c.sy))),maxY=Math.min(H-1,Math.ceil(Math.max(a.sy,b.sy,c.sy)));if(minX>maxX||minY>maxY)return;
  const inv=1/area,ax=(b.sy-c.sy)*inv,ay=(c.sx-b.sx)*inv,bx=(c.sy-a.sy)*inv,by=(a.sx-c.sx)*inv;
  const A=((b.sy-c.sy)*(minX+.5-c.sx)+(c.sx-b.sx)*(minY+.5-c.sy))*inv,B=((c.sy-a.sy)*(minX+.5-c.sx)+(a.sx-c.sx)*(minY+.5-c.sy))*inv;
  const t=s.tex;for(let y=minY;y<=maxY;y++){let u=A+(y-minY)*ay,q=B+(y-minY)*by;for(let x=minX;x<=maxX;x++,u+=ax,q+=bx){const r=1-u-q;if(u<-.00001||q<-.00001||r<-.00001)continue;const z=u*a.sz+q*b.sz+r*c.sz,p=y*W+x;if(z>=this.depth[p]||z>1||z< -1)continue;const d=1/(u*a.iw+q*b.iw+r*c.iw);let R,G,Bb,alpha=s.opacity;if(t){let U=(u*a.u*a.iw+q*b.u*b.iw+r*c.u*c.iw)*d,V=(u*a.v*a.iw+q*b.v*b.iw+r*c.v*c.iw)*d;if(t.flip)V=1-V;const tx=Math.max(0,Math.min(t.w-1,Math.floor(U*t.w))),ty=Math.max(0,Math.min(t.h-1,Math.floor(V*t.h))),tp=(ty*t.w+tx)*4;R=t.data[tp]*s.r;G=t.data[tp+1]*s.g;Bb=t.data[tp+2]*s.b;alpha*=t.data[tp+3]/255;}else{R=(u*a.r+q*b.r+r*c.r)*s.r;G=(u*a.g+q*b.g+r*c.g)*s.g;Bb=(u*a.b+q*b.b+r*c.b)*s.b;}
    if(alpha<s.alphaTest)continue;if(alpha<.999){const prev=this.pixels[p];R=R*alpha+(prev&255)*(1-alpha);G=G*alpha+((prev>>8)&255)*(1-alpha);Bb=Bb*alpha+((prev>>16)&255)*(1-alpha);}else this.depth[p]=z;this.pixels[p]=0xff000000|(Math.round(Bb)<<16)|(Math.round(G)<<8)|Math.round(R);
   }}
 }
}
