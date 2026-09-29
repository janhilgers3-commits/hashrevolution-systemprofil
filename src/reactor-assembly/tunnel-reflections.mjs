import * as THREE from 'three';

// Moving illumination really affects the PBR wall, rails and copper, while the
// small, surface-bound glints carry the overview's fast travelling highlights.
// No fullscreen flash and no additional luminous tube geometry.
export function createTunnelReflections(scene){
 const root=new THREE.Group();root.name='Travelling tunnel reflections';scene.add(root);
 const lights=Array.from({length:4},(_,i)=>{const light=new THREE.PointLight(0xffffff,8,5.2,2);light.name='Conductor reflection '+(i+1);light.castShadow=false;root.add(light);return light;});
 const count=90,positions=new Float32Array(count*3),weights=new Float32Array(count);
 const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)).setAttribute('weight',new THREE.BufferAttribute(weights,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{tint:{value:new THREE.Color(0xff865e)},viewportHeight:{value:1050}},
  vertexShader:`attribute float weight;varying float strength;uniform float viewportHeight;
   void main(){strength=weight;vec4 mv=modelViewMatrix*vec4(position,1.);
    gl_PointSize=clamp((.07+weight*.08)*viewportHeight/max(1.,-mv.z),2.,25.);
    gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float strength;uniform vec3 tint;
   void main(){vec2 p=gl_PointCoord*2.-1.;float d=length(p);if(d>1.)discard;
    float halo=exp(-d*d*7.),core=exp(-d*d*65.);
    float glint=exp(-abs(p.x)*34.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*34.)*exp(-abs(p.x)*4.);
    float alpha=(halo*.09+core*.65+glint*.20)*strength*(1.-smoothstep(.55,1.,d));
    gl_FragColor=vec4(mix(tint*1.9,vec3(2.8),core*.58),alpha);}`});
 const glints=new THREE.Points(geometry,material);glints.name='Surface-bound moving glints';glints.frustumCulled=false;root.add(glints);
 let active=0,lastTime=0;
 const angle=(time,phase,z)=>{
  if(active===1)return time*2.3+phase+Math.sin(time*.8+z*.07)*.3;
  if(active===2)return time*2.45+phase+Math.sin(time*1.3+z*.12)*.45;
  if(active===3)return time*2.8+phase+z*.055;
  if(active===4)return time*3.1+phase-z*.36;
  if(active===5)return time*(phase>3?-2.6:2.6)+phase+z*.24;
  return time*2.8+phase;
 };
 return {
  select(index,tint){active=index;material.uniforms.tint.value.copy(tint);lights.forEach((light,i)=>light.color.copy(index===5&&i%2===0?new THREE.Color(0x6abaff):tint).lerp(new THREE.Color(0xffffff),.18));},
  update(seconds,eyeZ,viewportHeight){
   lastTime=seconds;material.uniforms.viewportHeight.value=viewportHeight;
   // Fixed physical conductor rings, not lamps pulled through space in front
   // of the camera. Their small grazing highlights remain tied to the wall.
   lights.forEach((light,i)=>{const z=14-i*24-.13,a=angle(seconds,i*1.91,z);light.position.set(Math.cos(a)*3.49,Math.sin(a)*3.49,z);light.intensity=8*(.82+.18*Math.sin(seconds*2+i));});
   for(let k=0;k<30;k++)for(let j=0;j<3;j++){
    const i=k*3+j,z=18-k*4,a=angle(seconds,k*.29+j*Math.PI*2/3,z),r=3.505;
    positions.set([Math.cos(a)*r,Math.sin(a)*r,z-.155],i*3);
    const ahead=eyeZ-z;weights[i]=(ahead>0&&ahead<42?Math.exp(-Math.abs(ahead-8)/24):0)*(.7+.3*Math.sin(seconds*1.4+k*.6+j));
   }
   geometry.attributes.position.needsUpdate=true;geometry.attributes.weight.needsUpdate=true;
  },
  inspect(){return {kind:'moving-specular-and-surface-glints',anchoring:'fixed-conductor-rings',lightCount:lights.length,surfaceGlints:count,reactor:active+1,seconds:lastTime,positions:lights.map(l=>l.position.toArray()),shadowMaps:0};}
 };
}
