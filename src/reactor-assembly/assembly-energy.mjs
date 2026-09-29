import * as THREE from 'three';
import {layout} from './assembly-environment.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p)};
export function auditStartupTiming(age,reducedMotion=false){
 if(reducedMotion)age=6.5;
 return {age,core:smooth(age/3),hardware:smooth((age-3)/2),field:smooth((age-3.8)/2.7),fieldAge:Math.max(0,age-3.8),ready:age>=6.5};
}

// Explicit local visual state machine, mirroring the existing approved/valid handoff.
// A raw/uncertain real submission must never be mapped to `submitted` by an integration.
export function createConvergence(scene,definitions){
 const branches=definitions.slice(0,5).map((d,i)=>{
  const a=d.angle*Math.PI/180,sourceRadius=layout.radius-2.24,targetRadius=layout.auditScale*1.15,source=new THREE.Vector3(Math.sin(a)*sourceRadius,1.115,Math.cos(a)*sourceRadius),target=new THREE.Vector3(Math.sin(a)*targetRadius,layout.auditScale*.96,Math.cos(a)*targetRadius);
  const group=new THREE.Group();group.name=`Inbound ion channel ${i+1}`;scene.add(group);
  const uniforms={time:{value:0},charge:{value:0},tint:{value:new THREE.Color(d.color)},opacity:{value:1},motion:{value:1}};
  const shader={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms,
   vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 uv0;uniform vec3 tint;uniform float time,charge,opacity,motion;void main(){float reveal=1.-smoothstep(charge-.015,charge+.025,uv0.x);float head=exp(-pow((uv0.x-charge)*27.,2.));float flow=pow(.5+.5*cos(uv0.x*39.-time*10.),13.);float power=.20+.78*mix(.72,flow,motion)+head*1.4;gl_FragColor=vec4(tint*(2.0+head*2.4),reveal*power*opacity);}'
  };
  const material=new THREE.ShaderMaterial(shader),curve=new THREE.LineCurve3(source,target);
  const beam=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.031,6,false),material);group.add(beam);
  const glowMaterial=material.clone();glowMaterial.uniforms.opacity.value=.19;
  const glow=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.11,6,false),glowMaterial);group.add(glow);
  const spill=new THREE.PointLight(d.color,0,3.5,2);spill.position.copy(source).lerp(target,.42).add(new THREE.Vector3(0,.22,0));group.add(spill);
  group.visible=false;
  return {group,uniforms,glowMaterial,spill,start:null,enabled:false,progress:0,coilCharge:0,source:source.toArray(),target:target.toArray()};
 });
 // Resonator i lies at angle[i]+36 degrees: between input i and its
 // preceding input, not input i and its successor. Index 1 is the top 1–2 arc.
 const links=branches.map((_,i)=>({from:(i+4)%5,to:i,start:null,enabled:false,charge:0}));
 let ignitionStart=null,unlocked=false;
 return {update({seconds,states,reducedMotion=false,animated=true,auditEligible=true}){
  branches.forEach((b,i)=>{
   const enabled=states[i]==='submitted';
   if(enabled&&!b.enabled)b.start=seconds;
   if(!enabled)b.start=null;
   b.enabled=enabled;b.group.visible=enabled;
   b.progress=enabled?(reducedMotion?1:clamp((seconds-b.start-.12*(i+1))/1.35)):0;
   b.coilCharge=enabled?(reducedMotion?1:smooth((seconds-b.start-.12*(i+1)-1.35)/1.1)):0;
   b.uniforms.time.value=seconds;b.uniforms.charge.value=b.progress;b.uniforms.motion.value=animated?1:0;
   b.glowMaterial.uniforms.time.value=seconds;b.glowMaterial.uniforms.charge.value=b.progress;b.glowMaterial.uniforms.motion.value=animated?1:0;
   b.spill.intensity=enabled?b.progress*2.2:0;
  });
  links.forEach(link=>{
   const enabled=branches[link.from].coilCharge===1&&branches[link.to].coilCharge===1;
   if(enabled&&!link.enabled)link.start=seconds;
   if(!enabled)link.start=null;
   link.enabled=enabled;link.charge=enabled?(reducedMotion?1:smooth((seconds-link.start)/.85)):0;
  });
  const next=auditEligible&&links.every(link=>link.charge===1);
  if(next&&!unlocked)ignitionStart=seconds;
  if(!next)ignitionStart=null;
  unlocked=next;
  return {unlocked,ignitionAge:unlocked?(reducedMotion?6.5:seconds-ignitionStart):0,coilCharges:branches.map(b=>b.coilCharge),linkCharges:links.map(link=>link.charge)};
 },getState(){return {unlocked,ignitionStart,branches:branches.map((b,i)=>({id:i+1,enabled:b.enabled,progress:b.progress,coilCharge:b.coilCharge,direction:'reactor-to-audit',source:b.source,target:b.target})),links:links.map(link=>({from:link.from+1,to:link.to+1,enabled:link.enabled,charge:link.charge}))};}};
}

export function createPrismaticField(root){
 const plasma=createAuditPlasma(root);
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(8.8,8.8),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{power:{value:0},time:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 uv0;uniform float power,time;void main(){vec2 p=(uv0-.5)*2.;float r=length(p);float angle=atan(p.y,p.x);vec3 cyan=vec3(.13,.67,1.),violet=vec3(.47,.19,1.),pink=vec3(.92,.22,.74);vec3 col=mix(cyan,violet,smoothstep(.17,.52,r));col=mix(col,pink,.23*(.5+.5*sin(angle*3.+time*.23)));float disk=exp(-r*r*17.)*.09;float field=exp(-pow((r-.44)*6.,2.))*.18;float ray=pow(abs(cos(angle*3.+.4)),44.)*exp(-r*5.)*.22;float alpha=(disk+field+ray)*power*smoothstep(.18,.34,r);gl_FragColor=vec4(col*2.3,alpha);}'
 }));halo.rotation.x=-Math.PI/2;halo.position.y=.105;root.add(halo);
 // Optical scattering is camera-facing, like the original AuditPrismBurst
 // canvas. It is separate from the hardware and does not erase its centre.
 const corona=new THREE.Mesh(new THREE.PlaneGeometry(17,17),new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
  uniforms:{power:{value:0},time:{value:0},ignition:{value:0}},
  vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 uv0;uniform float power,time,ignition;
   void main(){vec2 p=(uv0-.5)*2.;float r=length(p);vec3 c=vec3(0.);
    float clearCore=smoothstep(.065,.17,r);
    float haze=(exp(-r*r*6.)*.12+exp(-pow((r-.27)*4.2,2.))*.055)*clearCore;
    vec3 spectral=mix(vec3(.20,.66,1.),vec3(.58,.26,1.),smoothstep(.15,.62,r));c+=spectral*haze;
    for(int i=0;i<5;i++){float n=float(i),a=-.62+n*.83+sin(time*.36+n)*.025;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
     float w=.006+n*.0015,ray=exp(-pow(abs(q.y)/w,1.45))*pow(max(0.,1.-abs(q.x)),2.4);
     vec3 tint=i==0?vec3(.3,.85,1.):i==1?vec3(.35,1.,.75):i==2?vec3(1.,.76,.35):i==3?vec3(.85,.35,.95):vec3(.55,.42,1.);
     c+=tint*ray*(.17+ignition*.16)*smoothstep(.04,.14,r);
    }
    c+=vec3(.75,.95,1.)*exp(-r*r*1800.)*(.20+ignition*.3);
    float edge=1.-smoothstep(.78,1.,r);gl_FragColor=vec4(c*power*edge,1.);
   }`
 }));corona.name='Audit optical spectral radiance';corona.position.y=1.40;corona.renderOrder=30;root.add(corona);
 const count=192,positions=new Float32Array(count*6),colors=new Float32Array(count*6),directions=[];
 const palette=[0x74e0ff,0x79f4c7,0xffdc74,0xef8bee,0xa68eff];
 for(let i=0;i<count;i++){
  const a=i*2.399963,dir=new THREE.Vector3(Math.cos(a),.10+.08*Math.sin(i*2.1),Math.sin(a));directions.push({dir,delay:(i*.618034)%1*.28,speed:3+(i%13)*.16});
  const c=new THREE.Color(palette[i%5]);c.multiplyScalar(2.8);c.toArray(colors,i*6);c.clone().lerp(new THREE.Color(0xffffff),.35).toArray(colors,i*6+3);
 }
 const g=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)).setAttribute('color',new THREE.BufferAttribute(colors,3));
 const burst=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));burst.frustumCulled=false;root.add(burst);
 const idlePositions=new Float32Array(72*3);for(let i=0;i<72;i++){const a=i*2.399963,r=.7+(i%9)*.18;idlePositions.set([Math.cos(a)*r,1.1+(i%5)*.10,Math.sin(a)*r],i*3);}
 const idle=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(idlePositions,3)),new THREE.PointsMaterial({color:0x9975ff,size:.035,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(idle);
 return {update({active,seconds,age,pulse,submitted,reducedMotion,cameraQuaternion,gain=1}){
  plasma.update({active,seconds,pulse,age,reducedMotion,gain});
  halo.visible=active;corona.visible=active;idle.visible=active;burst.visible=active&&!reducedMotion&&age<2.55;
  const ignition=age<2.2?Math.sin(clamp(age/2.2)*Math.PI):0;
  halo.material.uniforms.power.value=((submitted?.92:.74)+pulse*.28+ignition*.85)*gain;halo.material.uniforms.time.value=seconds;
  corona.material.uniforms.power.value=(1.2+pulse*.65+ignition*1.1)*gain;corona.material.uniforms.time.value=seconds;corona.material.uniforms.ignition.value=ignition;
  if(cameraQuaternion)corona.quaternion.copy(cameraQuaternion);
  idle.rotation.y=seconds*.09;idle.material.opacity=(.35+pulse*.45)*gain;
  if(burst.visible){
   directions.forEach((p,i)=>{const t=Math.max(0,age-p.delay),r=.18+p.speed*(1-Math.exp(-t*1.4))/1.4,trail=.12+Math.exp(-t*1.4)*.4;
    p.dir.clone().multiplyScalar(Math.max(.1,r-trail)).add(new THREE.Vector3(0,1.22,0)).toArray(positions,i*6);
    p.dir.clone().multiplyScalar(r).add(new THREE.Vector3(0,1.22,0)).toArray(positions,i*6+3);
   });g.attributes.position.needsUpdate=true;burst.material.opacity=clamp(age/.12)*(1-clamp((age-.7)/1.85))*gain;
  }
 },getState(){return {palette,haloVisible:halo.visible,coronaVisible:corona.visible,coronaSpan:17,spectralRays:5,coronaPower:corona.material.uniforms.power.value,burstVisible:burst.visible,burstParticles:count,plasma:plasma.getState()};}};
}

function createAuditPlasma(root){
 // The same bounded-volume technique as Cloud, with a taller twisting annular
 // density and spectral emission. This is animated shader density, not CFD.
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{eye:{value:new THREE.Vector3()},time:{value:0},power:{value:0},gain:{value:1}},
  vertexShader:'varying vec3 localPosition;void main(){localPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 localPosition;uniform vec3 eye;uniform float time,power,gain;
   float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float density(vec3 p){float r=length(p.xz),angle=atan(p.z,p.x),twist=time*.38+p.y*.85;mat2 rot=mat2(cos(twist),-sin(twist),sin(twist),cos(twist));vec3 q=p;q.xz=rot*q.xz;q.y-=time*.16;
    float n=noise(q*4.7)*.56+noise(q*11.3+vec3(0,time*.12,0))*.29+noise(q*24.1)*.15;
    float middle=1.17-.18*p.y+.12*sin(angle*3.-time*.9+p.y*2.4);
    float ring=1.-smoothstep(.14,.38,abs(r-middle));float height=smoothstep(-.92,-.46,p.y)*(1.-smoothstep(.56,1.12,p.y));
    float strand=.30+.70*pow(.5+.5*sin(angle*7.-p.y*5.8+time*1.1+n*4.),2.);
    return ring*height*smoothstep(.60,.83,r)*smoothstep(.43,.76,n)*strand;
   }
   void main(){vec3 ray=normalize(localPosition-eye);vec3 lo=(vec3(-1.96,-1.15,-1.96)-eye)/ray,hi=(vec3(1.96,1.15,1.96)-eye)/ray;vec3 nearT=min(lo,hi),farT=max(lo,hi);float begin=max(0.,max(max(nearT.x,nearT.y),nearT.z)),end=min(min(farT.x,farT.y),farT.z),stepSize=(end-begin)/44.;if(stepSize<=0.)discard;
    vec4 total=vec4(0.);for(int i=0;i<44;i++){vec3 p=eye+ray*(begin+(float(i)+.5)*stepSize);float d=density(p),a=1.-exp(-d*stepSize*3.2);
     float spectral=.5+.5*sin(atan(p.z,p.x)*2.+p.y*2.1-time*.42);vec3 color=mix(vec3(.04,.35,1.20),vec3(.67,.12,1.20),spectral);color+=vec3(.15,.20,.35)*smoothstep(.18,.52,d);
     total.rgb+=(1.-total.a)*a*color*power;total.a+=(1.-total.a)*a;if(total.a>.74)break;
    }if(total.a<.006)discard;gl_FragColor=vec4(total.rgb/max(.001,total.a),total.a*gain);
   }`
 });
 const volume=new THREE.Mesh(new THREE.BoxGeometry(3.92,2.3,3.92),material);volume.name='Audit circulating spectral plasma';volume.position.y=1.17;volume.renderOrder=4;
 volume.onBeforeRender=(_renderer,_scene,camera)=>material.uniforms.eye.value.copy(volume.worldToLocal(camera.getWorldPosition(new THREE.Vector3())));root.add(volume);
 return {update({active,seconds,pulse,age,reducedMotion,gain=1}){volume.visible=active;material.uniforms.time.value=seconds;material.uniforms.gain.value=gain;const ignition=!reducedMotion&&age<2.2?Math.sin(clamp(age/2.2)*Math.PI):0;material.uniforms.power.value=active?1.15+pulse*.35+ignition*.55:0;},getState(){return {visible:volume.visible,time:material.uniforms.time.value,power:material.uniforms.power.value,gain:material.uniforms.gain.value,raySteps:44,volumeHeight:2.3,kind:'animated-twisting-annular-plasma'};}};
}
