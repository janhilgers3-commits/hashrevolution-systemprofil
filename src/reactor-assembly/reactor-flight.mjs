import * as THREE from 'three';
import {approachPose,viewportPose,flightTiming,tunnelTravel,ease} from './flight-path.mjs';
import {definitions} from './assembly-parts.mjs';
import {createTunnelPatterns,tunnelProfiles} from './tunnel-patterns.mjs';
import {createTunnelReflections} from './tunnel-reflections.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};

 // Continuous WebGL entry; progression remains owned by the application.
export function createReactorFlight({scene,camera,pass,nodes,stage,arrivalVeil,onEnd,onPhase}){
 const tunnel=new THREE.Scene();tunnel.background=new THREE.Color(0x030405);tunnel.fog=new THREE.FogExp2(0x080605,.013);
 const eye=new THREE.PerspectiveCamera(56,1,.08,160),metal=new THREE.MeshPhysicalMaterial({color:0x25303a,metalness:.88,roughness:.27,clearcoat:.24,clearcoatRoughness:.18}),dark=new THREE.MeshStandardMaterial({color:0x090e12,metalness:.75,roughness:.39}),copper=new THREE.MeshPhysicalMaterial({color:0xaf6740,metalness:.85,roughness:.26,clearcoat:.18,clearcoatRoughness:.2});
 tunnel.environment=scene.environment;tunnel.environmentIntensity=.9;tunnel.add(new THREE.HemisphereLight(0x7d9cac,0x120a05,1.1));
 const wall=new THREE.Mesh(new THREE.CylinderGeometry(3.8,3.8,120,48,1,true),new THREE.MeshPhysicalMaterial({color:0x11191f,metalness:.84,roughness:.3,clearcoat:.2,clearcoatRoughness:.22,side:THREE.BackSide}));wall.rotation.x=Math.PI/2;wall.position.z=-40;tunnel.add(wall);
 const glow=new THREE.MeshStandardMaterial({color:0xffbd75,emissive:0xff8734,emissiveIntensity:4,metalness:.3,roughness:.25});
 const orbitals=[],runningLight=new THREE.MeshBasicMaterial({color:0xffd1a0,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
 for(let k=0;k<30;k++){
  const z=18-k*4;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.66,.11,8,64),metal);rim.position.z=z;tunnel.add(rim);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(3.5,.025,5,64),glow);inner.position.z=z-.13;tunnel.add(inner);
  // Signal Array's circulating ring impulses continue on the tunnel walls.
  for(let j=0;j<2;j++){const arc=new THREE.Mesh(new THREE.TorusGeometry(3.47,.045,5,20,Math.PI*.24),runningLight);arc.position.z=z-.18;arc.userData.phase=k*.47+j*Math.PI;tunnel.add(arc);orbitals.push(arc);}
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,block=new THREE.Mesh(new THREE.BoxGeometry(.34,.38,.3),i%3===0?copper:dark);block.position.set(Math.cos(a)*3.64,Math.sin(a)*3.64,z);block.rotation.z=a;tunnel.add(block);
   if(i%3===0){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.16,.28,.1),glow);lamp.position.set(Math.cos(a)*3.41,Math.sin(a)*3.41,z-.18);lamp.rotation.z=a;tunnel.add(lamp);}
  }
  // Reallocate four fixed lights to moving reflections; no added shadow maps.
  if(k%5===0){const light=new THREE.PointLight(0xffa55f,2.4,4,2);light.position.set(0,3.46,z-.18);tunnel.add(light);}
 }
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8,cable=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,116,6),i%2?copper:metal);cable.rotation.x=Math.PI/2;cable.position.set(Math.cos(a)*3.68,Math.sin(a)*3.68,-40);tunnel.add(cable);
 }
 const flakes=new Float32Array(240*3);for(let i=0;i<240;i++){const a=i*2.399963,r=1.5+(i%17)/17*1.65;flakes.set([Math.cos(a)*r,Math.sin(a)*r,18-(i*.618034%1)*116],i*3);}
 const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(flakes,3)),new THREE.PointsMaterial({color:0xffbe72,size:.035,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));tunnel.add(sparks);
 const streakPositions=new Float32Array(120*6);for(let i=0;i<120;i++){const a=i*2.399963,r=2.8+(i%9)/9*.52,z=18-(i*.618034%1)*100;streakPositions.set([Math.cos(a)*r,Math.sin(a)*r,z,Math.cos(a)*r,Math.sin(a)*r,z-.5-(i%7)*.16],i*6);}
 const streaks=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(streakPositions,3)),new THREE.LineBasicMaterial({color:0xffb678,transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending}));tunnel.add(streaks);
 const exitMaterial=new THREE.ShaderMaterial({depthWrite:false,uniforms:{accent:{value:new THREE.Color(0xff8734)},gain:{value:1.5}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec3 accent;uniform float gain;void main(){float r=length(v-.5)*2.;if(r>1.)discard;float core=1.-smoothstep(.05,.95,r);vec3 c=mix(accent*.8,mix(vec3(1.),accent,.12)*2.6,core);gl_FragColor=vec4(c*gain,1.);}'});
 const exitLight=new THREE.Mesh(new THREE.PlaneGeometry(7.16,7.16),exitMaterial);exitLight.position.z=-65;tunnel.add(exitLight);
 const headlamp=new THREE.PointLight(0xb1c7d9,4,11,2);tunnel.add(headlamp);
 const flare=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{power:{value:0},tint:{value:new THREE.Color(0xffa25b)}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 v;uniform float power;uniform vec3 tint;void main(){float r=length(v-.5);float a=(exp(-r*r*14.)*.6+.14)*power;gl_FragColor=vec4(tint,a);}'}));flare.frustumCulled=false;flare.renderOrder=999;scene.add(flare);
 const tunnelFlare=flare.clone();tunnel.add(tunnelFlare);
 let mode='overview',start=0,lastSeconds=0,index=0,phase='',origin,originFov,originRect,initialized=false;
 const visibility=new Map();
 const patterns=createTunnelPatterns(tunnel);
 const reflections=createTunnelReflections(tunnel);
 function selectTunnel(i){const d=definitions[i],tint=new THREE.Color(d.color);patterns.select(i);glow.color.copy(tint);glow.emissive.copy(tint);runningLight.color.copy(tint).lerp(new THREE.Color(0xffffff),.25).multiplyScalar(1.7);sparks.material.color.copy(tint);streaks.material.color.copy(tint);exitMaterial.uniforms.accent.value.copy(tint);flare.material.uniforms.tint.value.copy(tint).lerp(new THREE.Color(0xffffff),.2);tunnel.traverse(n=>{if(n.isPointLight&&n!==headlamp)n.color.copy(tint);});headlamp.color.copy(tint).lerp(new THREE.Color(0xffffff),.65);orbitals.forEach(n=>n.visible=i<2);if(arrivalVeil){const light=tint.clone().lerp(new THREE.Color(0xffffff),.85),middle=tint.clone().lerp(new THREE.Color(0xffffff),.55);arrivalVeil.style.background=`radial-gradient(ellipse at center,#${light.getHexString()} 0%,#${middle.getHexString()} 58%,#${tint.getHexString()} 100%)`;arrivalVeil.dataset.reactor=String(i+1);}stage.dataset.tunnelPattern=tunnelProfiles[i].kind;stage.style.setProperty('--preview-accent',`#${tint.getHexString()}`);}
 function selectReflections(i){reflections.select(i,new THREE.Color(definitions[i].color));stage.dataset.tunnelReflections='moving-specular-and-surface-glints';}
 function cover(value){if(arrivalVeil){arrivalVeil.style.opacity=String(value);arrivalVeil.style.visibility=value>0?'visible':'hidden';}}
 function announce(next){if(phase!==next){phase=next;onPhase(next);}}
 function hideForDetail(){scene.children.forEach(n=>{if(!visibility.has(n))visibility.set(n,n.visible);n.visible=n.isLight||n===nodes[index].root;});nodes[index].root.traverse(n=>{if(n.userData.detailGeometry)n.geometry=n.userData.detailGeometry;});stage.dataset.bridgeVisible='false';}
 function detailCamera(){const p=nodes[index].root.position;camera.up.set(0,1,0);camera.position.copy(p).add(new THREE.Vector3(...(index===5?[3.8,6.25,5.4]:[4.5,6.7,6.1])));camera.lookAt(p.clone().add(new THREE.Vector3(0,index===5?.15:-.65,0)));camera.fov=index===5?45:43;camera.updateProjectionMatrix();stage.dataset.detailView='elevated-interior';}
 return {
  async prepare(renderer){patterns.prepare();await renderer.compileAsync(tunnel,eye);patterns.select(0);},
  fly(i,seconds){if(mode==='flight'||mode==='arrival')return;index=i;selectTunnel(i);selectReflections(i);mode='flight';cover(0);start=seconds;origin=camera.position.clone();originFov=camera.fov;originRect=stage.getBoundingClientRect();initialized=true;announce('approach');},
  detail(i=0){index=i;if(mode==='arrival')return;selectTunnel(i);mode='detail';cover(0);announce('case');},
  overview(){if(mode==='flight')return;mode='overview';cover(0);stage.style.clipPath='';visibility.forEach((v,n)=>n.visible=v);visibility.clear();nodes.forEach(n=>n.root.traverse(o=>{if(o.userData.overviewGeometry)o.geometry=o.userData.overviewGeometry;}));stage.dataset.bridgeVisible='true';flare.visible=true;pass.scene=scene;pass.camera=camera;flare.material.uniforms.power.value=0;announce('overview');},
  get active(){return mode==='flight'||mode==='arrival'||mode==='detail';},
  get mode(){return mode;},
  update(seconds,reduced){
   lastSeconds=seconds;eye.aspect=camera.aspect;eye.updateProjectionMatrix();
   if(mode==='arrival'){
    hideForDetail();pass.scene=scene;pass.camera=camera;detailCamera();
    const age=reduced?flightTiming.end:seconds-start;cover(1-ease((age-flightTiming.tunnelEnd-.12)/.88));
    if(age>=flightTiming.end){mode='detail';cover(0);announce('case');}return;
   }
   if(mode==='detail'){stage.style.clipPath='';hideForDetail();pass.scene=scene;pass.camera=camera;detailCamera();return;}
   if(mode!=='flight')return;
   const age=reduced?flightTiming.end:seconds-start,p=nodes[index].root.position;
   if(age<flightTiming.entry){
    const pose=approachPose(age,origin,p,originFov),view=viewportPose(age,originRect,innerWidth,innerHeight);announce(pose.phase);
    camera.position.set(pose.x,pose.y,pose.z);camera.up.set(0,0,-1);camera.rotation.set(pose.pitch,0,0,'XYZ');
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(pose.fov)/2)*innerHeight/view.height));
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();camera.projectionMatrix.elements[8]=-view.shiftX;camera.projectionMatrix.elements[9]=-view.shiftY;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    stage.style.clipPath=age<.9?`inset(${view.top}px ${view.right}px ${view.bottom}px ${view.left}px)`:'none';
    flare.material.uniforms.power.value=ease((age-3.08)/.52)*1.8;pass.scene=scene;pass.camera=camera;
   }else if(age<flightTiming.tunnelEnd){
    stage.style.clipPath='none';announce('tunnel');pass.scene=tunnel;pass.camera=eye;const travel=tunnelTravel(age),t=travel.progress,distance=travel.distance;
    eye.position.set(0,0,19-distance);eye.lookAt(0,0,eye.position.z-20);headlamp.position.copy(eye.position);headlamp.position.z-=2;
    flare.material.uniforms.power.value=1.8*(1-smooth((age-flightTiming.entry)/.55));cover(travel.cover);
    orbitals.forEach(arc=>arc.rotation.z=seconds*2.8+arc.userData.phase);patterns.update(seconds);reflections.update(seconds,eye.position.z,stage.clientHeight*Math.min(devicePixelRatio,1.25));exitMaterial.uniforms.gain.value=1.5+ease(t)*2.5;
    streaks.material.opacity=.16+.25*Math.sin(t*Math.PI);
    sparks.rotation.z=seconds*.045;glow.emissiveIntensity=3.5+.4*Math.sin(seconds*4);
   }else{
    // Switch to the real case only behind an opaque, reactor-coloured light.
    // Never show a separate fullscreen reactor after the tunnel.
    stage.style.clipPath='none';mode=reduced?'detail':'arrival';cover(reduced?0:1);announce(reduced?'case':'arrival');flare.material.uniforms.power.value=0;hideForDetail();pass.scene=scene;pass.camera=camera;detailCamera();onEnd(index+1);
   }
  },
  inspect(){return {mode,phase,seconds:lastSeconds,flightAge:initialized?lastSeconds-start:0,actualCameraFlight:true,unchangedModel:true,tunnelRings:30,tunnelDistance:82,tunnelDuration:flightTiming.tunnelEnd-flightTiming.entry,exit:'reactor-coloured-light',wallMotion:stage.dataset.tunnelPattern,reflections:reflections.inspect(),detailView:'elevated-interior'}},
  dispose(){const g=new Set(),m=new Set();tunnel.traverse(n=>{if(n.geometry)g.add(n.geometry);if(n.material)m.add(n.material)});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());}
 };
}
