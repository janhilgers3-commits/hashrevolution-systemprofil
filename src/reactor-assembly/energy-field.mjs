import * as THREE from 'three';

export function makeEnergyField(scene){
 const group=new THREE.Group();group.name='Outer energy flow';scene.add(group);
 const arcMaterial=new THREE.MeshBasicMaterial({color:0xff865e,toneMapped:false,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false});
 // Follow the actual outer copper wires at r=1.795, y=.30 and .69.
 const wireRadius=1.795,wireHeights=[.317,.707],speed={active:2.8,submitted:3.8};
 for(const y of wireHeights)for(const [start,length] of [[0,.42],[2.1,.65],[4.4,.31]]){
  const radius=wireRadius;
  const points=Array.from({length:36},(_,i)=>{const a=start+length*i/35;return new THREE.Vector3(Math.sin(a)*radius,y,Math.cos(a)*radius);});
  const arc=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),35,.012,5,false),arcMaterial);group.add(arc);
 }
 const veilMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},tint:{value:new THREE.Color(0xff865e)},power:{value:.14}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform vec3 tint;uniform float power;void main(){float w=pow(max(0.,sin(vUv.x*31.4159-time)),9.);float h=pow(max(0.,sin(vUv.y*3.14159)),2.);gl_FragColor=vec4(tint,w*h*power);}' });
 for(const y of wireHeights){const veil=new THREE.Mesh(new THREE.CylinderGeometry(wireRadius,wireRadius,.032,72,1,true),veilMaterial);veil.position.y=y;group.add(veil);}
 const position=new Float32Array(96*3),phase=new Float32Array(96);
 for(let i=0;i<96;i++){const a=i*2.399963,r=wireRadius;position[i*3]=Math.sin(a)*r;position[i*3+1]=wireHeights[i%2];position[i*3+2]=Math.cos(a)*r;phase[i]=(i*.618033)%1;}
 const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(position,3)).setAttribute('phase',new THREE.BufferAttribute(phase,1));
 const sparksMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},tint:{value:new THREE.Color(0xff865e)},power:{value:.65},animate:{value:1},pixelRatio:{value:1}},vertexShader:'attribute float phase;varying float vLight;uniform float time;uniform float animate;uniform float pixelRatio;void main(){float wave=.5+.5*sin(time*1.7+phase*6.28318);vLight=mix(.7,pow(wave,5.),animate);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp((4.+vLight*10.)*pixelRatio*5./-mv.z,2.,12.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float vLight;uniform vec3 tint;uniform float power;void main(){vec2 p=gl_PointCoord*2.-1.;float d=length(p);if(d>1.)discard;float core=pow(max(0.,1.-d),3.);float star=exp(-abs(p.x)*22.)*exp(-abs(p.y)*2.)+exp(-abs(p.y)*22.)*exp(-abs(p.x)*2.);float a=(core+.23*star)*vLight*power;gl_FragColor=vec4(tint*(1.+core*2.),a);}' });
 const sparks=new THREE.Points(geometry,sparksMaterial);sparks.name='Status light sparks';scene.add(sparks);
 let lastAngle=0,angularSpeed=speed.active;
 return {update({seconds,active,submitted,animated,tint,pulse,pixelRatio}){
  group.visible=active;sparks.visible=active;
  if(!active)return;
  angularSpeed=submitted?speed.submitted:speed.active;
  if(animated)lastAngle=seconds*angularSpeed;
  group.rotation.y=lastAngle;sparks.rotation.y=lastAngle;
  arcMaterial.color.copy(tint).multiplyScalar(3.4);arcMaterial.opacity=submitted?.88:.60;
  veilMaterial.uniforms.tint.value.copy(tint).multiplyScalar(1.7);veilMaterial.uniforms.time.value=lastAngle*2.8;veilMaterial.uniforms.power.value=(submitted?.25:.13)+pulse*.09;
  sparksMaterial.uniforms.tint.value.copy(tint).multiplyScalar(3);sparksMaterial.uniforms.time.value=seconds;sparksMaterial.uniforms.animate.value=animated?1:0;sparksMaterial.uniforms.power.value=submitted?1.25:.55;sparksMaterial.uniforms.pixelRatio.value=pixelRatio;
  geometry.setDrawRange(0,submitted?96:32);
 },getState(){return {rotation:group.rotation.y,sparkCount:geometry.drawRange.count,visible:group.visible,wireRadius,wireHeights,angularSpeed,secondsPerTurn:2*Math.PI/angularSpeed}}};
}
