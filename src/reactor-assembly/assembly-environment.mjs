import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All geometry is local and procedural. Original reference images remain untouched.
export const layout={radius:7.95,outerScale:1.45,auditScale:1.38,halfHeight:8.75,halfWidth:12.90};
export function createIndustrialLightRig(){
 const room=new THREE.Scene();room.background=new THREE.Color(0x111b23);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(44,30,44),new THREE.MeshBasicMaterial({color:0x26323a,side:THREE.BackSide}));room.add(wall);
 for(const [x,y,z,w,l,angle,strength] of [[-9,12,0,2.2,16,.4,7],[8,10,-5,1.4,13,-.65,5],[0,13,8,12,1.7,0,4.5],[-2,11,-12,9,2,.15,3]]){
  const strip=new THREE.Mesh(new THREE.BoxGeometry(w,.14,l),new THREE.MeshBasicMaterial({color:new THREE.Color(.72,.88,1).multiplyScalar(strength)}));strip.position.set(x,y,z);strip.rotation.y=angle;room.add(strip);
 }
 return room;
}
function collection(material,parent){const shapes=[];return {
 add(g,x=0,y=0,z=0,angle=0){g.rotateY(angle);g.translate(x,y,z);shapes.push(g);},
 finish(){const mesh=new THREE.Mesh(mergeGeometries(shapes),material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
};}
function ring(parent,radius,tube,y,material,start=0,arc=Math.PI*2){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,6,Math.ceil(144*arc/(Math.PI*2)),arc),material);mesh.rotation.x=Math.PI/2;mesh.rotation.z=start;mesh.position.y=y;mesh.castShadow=true;parent.add(mesh);return mesh;}
function lathe(profile,material,parent){const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),144),material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function createMachineHall(scene,materials,definitions){
 const root=new THREE.Group();root.name='Concentric machinery hall';scene.add(root);
 const dark=materials.housing.clone(),steel=materials.steel.clone(),seam=materials.seam.clone();
 dark.color.setHex(0x809ba7);dark.roughness=.44;steel.color.setHex(0xa3bbc7);steel.roughness=.25;steel.envMapIntensity=1.1;
 const panels=steel.clone();panels.color.setHex(0x557080);panels.roughness=.36;
 const silver=steel.clone();silver.color.setHex(0xd5e3e8);silver.roughness=.20;
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(22,22,.4,144),dark);floor.position.y=-1.40;floor.receiveShadow=true;root.add(floor);
 lathe([[0,-1],[11.2,-1],[11.2,-.66],[0,-.66]],dark,root);
 // Deep circular cable trench, sloped segmented perimeter and structural ribs.
 lathe([[11.3,-1.2],[11.8,-1.2],[11.8,-.54],[12.15,-.54],[12.15,-.8],[12.55,-.8],[13.7,1.15],[14.6,1.4],[15.5,1.4],[15.5,-1.4]],dark,root);
 for(const [r,y,t] of [[11.3,-.55,.06],[11.68,-.65,.07],[12.15,-.3,.10],[12.55,.12,.09],[13.6,1.08,.055],[14.2,1.35,.075],[15.1,1.45,.10]])ring(root,r,t,y,silver);
 const grooves=collection(seam,root),metal=collection(panels,root),fasteners=collection(silver,root),pipework=collection(steel,root);
 for(let i=0;i<60;i++){
  const a=i*Math.PI/30,x=Math.sin(a),z=Math.cos(a);
  grooves.add(new THREE.BoxGeometry(.045,.028,9),x*7,-.638,z*7,a);
  // Raised wedge segments recreate the radial framing of the reference.
  const g=new THREE.RingGeometry(12.5,14.3,4,1,a+.012,Math.PI/30-.024);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;for(let j=0;j<p.count;j++){const r=Math.hypot(p.getX(j),p.getZ(j));p.setY(j,.08+(r-12.5)*.73);}g.computeVertexNormals();metal.add(g);
  if(i%3===0){const brace=new THREE.BoxGeometry(.21,.15,2.4);brace.rotateX(-.55);pipework.add(brace,x*13.35,.72,z*13.35,a);}
  for(const r of [11.12,13.8,14.65]){fasteners.add(new THREE.CylinderGeometry(.045,.045,.025,6),x*r,r<12?-.60:1.4,z*r);}
 }
 const lamps=new THREE.MeshStandardMaterial({color:0xc5e2f4,emissive:0xb7d9ed,emissiveIntensity:2.3,metalness:.25,roughness:.2});
 for(let i=0;i<15;i++){
  const a=i*Math.PI*2/15;ring(root,13.88,.031,1.19,lamps,a+.055,.13);
  const x=Math.sin(a),z=Math.cos(a);metal.add(new THREE.BoxGeometry(.40,.11,.23),x*13.95,1.32,z*13.95,a);
 }
 // Five service wedges between the reactor housings: panels, conduits and vents.
 for(const d of definitions.slice(0,5)){
  const a=(d.angle+36)*Math.PI/180,x=Math.sin(a),z=Math.cos(a);
  for(const [r,w,len] of [[4.3,.8,1.1],[6.0,1.2,1.45],[9.65,1.45,1.85]]){
   metal.add(new THREE.BoxGeometry(w,.11,len),x*r,-.535,z*r,a);
   for(const side of [-1,1])for(const end of [-1,1])fasteners.add(new THREE.CylinderGeometry(.025,.025,.024,6),x*r+Math.cos(a)*side*w*.42+Math.sin(a)*end*len*.41,-.461,z*r-Math.sin(a)*side*w*.42+Math.cos(a)*end*len*.41);
   for(let j=0;j<8;j++)grooves.add(new THREE.BoxGeometry(w*.72,.014,.026),x*(r+(j-3.5)*.095),-.471,z*(r+(j-3.5)*.095),a);
  }
  for(const offset of [-.27,0,.27]){const g=new THREE.CylinderGeometry(.047,.047,5.45,6);g.rotateX(Math.PI/2);pipework.add(g,x*8.1+Math.cos(a)*offset,-.37,z*8.1-Math.sin(a)*offset,a);}
  const a2=d.angle*Math.PI/180,s=Math.sin(a2),c=Math.cos(a2),inner=layout.auditScale*1.15-.10,outer=layout.radius-2.15,len=outer-inner,mid=(inner+outer)/2;
  const innerY=layout.auditScale*.96-.09,outerY=1.04,tilt=Math.atan2(innerY-outerY,len),length=Math.hypot(len,innerY-outerY),yAt=r=>innerY+(outerY-innerY)*(r-inner)/len;
  // Physical bridge with twin insulated light channels and individual brackets.
  const bridgeBox=(w,h,l)=>{const g=new THREE.BoxGeometry(w,h,l);g.rotateX(tilt);return g;};
  metal.add(bridgeBox(.79,.21,length),s*mid,yAt(mid)-.13,c*mid,a2);
  grooves.add(bridgeBox(.48,.026,length-.05),s*mid,yAt(mid)-.013,c*mid,a2);
  for(const side of [-1,1])pipework.add(bridgeBox(.086,.10,length+.06),s*mid+Math.cos(a2)*side*.355,yAt(mid),c*mid-Math.sin(a2)*side*.355,a2);
  for(let j=0;j<30;j++){const r=inner+.07+j*(len-.14)/29;fasteners.add(bridgeBox(.64,.021,.027),s*r,yAt(r)+.012,c*r,a2);}
 }
 grooves.finish();metal.finish();fasteners.finish();pipework.finish();
 // Widen only the surrounding deck/trench, not the finished outer reactors.
 // Their geometry and material scale stay unchanged.
 root.traverse(n=>{if(!n.isMesh||n===floor)return;const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);if(r>10.4){const t=Math.min(1,(r-10.4)/.9),extra=(layout.radius-7.3)*t*t*(3-2*t);p.setX(i,x*(1+extra/r));p.setZ(i,z*(1+extra/r));}}p.needsUpdate=true;n.geometry.computeVertexNormals();n.geometry.computeBoundingSphere();});
 const haze=new THREE.Mesh(new THREE.PlaneGeometry(26,26),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float fog=exp(-pow((p.x-.34-sin(time*.06)*.10)*5.,2.)-pow((p.y-.59)*7.,2.))+exp(-pow((p.x-.71)*7.,2.)-pow((p.y-.31+sin(time*.045)*.08)*6.,2.));gl_FragColor=vec4(.36,.59,.66,fog*.09);}' }));haze.rotation.x=-Math.PI/2;haze.position.y=-.32;root.add(haze);
 root.userData={kind:'concentric-industrial-hall',radialSegments:60,serviceWedges:5,bridges:5,reflectivePBR:true};
 root.updateHaze=seconds=>{haze.material.uniforms.time.value=seconds;};
 return root;
}
