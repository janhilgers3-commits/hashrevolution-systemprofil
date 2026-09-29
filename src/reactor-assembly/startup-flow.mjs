const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const v=clamp(x);return v*v*(3-2*v)};

// A reactor starts locally. Nothing is transmitted from the central audit.
export function radialGain(age,radius){
 const start=radius<=.70?0:2.8+clamp((radius-.70)/1.3)*2.65;
 const duration=radius<=.70?2.8:1.45;
 return smooth((age-start)/duration);
}
export function startupTiming(age,reduced=false){
 if(reduced)age=7;
 const ramp=clamp((age-4.7)/2.3);
 return {age,ready:age>=7,progress:clamp(age/7),coreGain:radialGain(age,.4),innerRingGain:radialGain(age,.9),middleRingGain:radialGain(age,1.3),outerRingGain:radialGain(age,1.8),energyGain:smooth((age-5.2)/1.8),motionSeconds:2.3*(ramp**3-.5*ramp**4)+Math.max(0,age-7),phase:age<2.8?'Reaktorkern hochfahren':age<5.2?'Spulen von innen nach außen aktivieren':age<7?'Energiefeld stabilisieren':'Betriebsbereit'};
}
export function createStartupFlow(){
 let index=-1,started=0,state=null;
 return {
  begin(i,seconds){index=i;started=seconds;state=null;},
  clear(){index=-1;state=null;},
  update(seconds,reduced){
   if(index<0)return null;
   state={...startupTiming(Math.max(0,seconds-started),reduced),index,direction:'reactor-core-to-outer-rings',auditFeed:false};
   return state;
  },getState(){return state;}
 };
}

// Fade the whole additional interior, including reflective metal and glass.
// Root-space radius covers merged rings and instanced peripheral lamps.
export function createInteriorStartupMask(root,THREE){
 const motif=root.children.find(n=>n.name.endsWith(' technology motif'));
 const uniforms={hrBootAge:{value:7},hrBootEnabled:{value:0},hrBootRootInverse:{value:new THREE.Matrix4()}};
 root.updateWorldMatrix(true,true);uniforms.hrBootRootInverse.value.copy(root.matrixWorld).invert();
 const materials=new Map();
 const shadowMaterials=[];
 motif.traverse(n=>{for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){
  if(materials.has(m))continue;
  materials.set(m,{transparent:m.transparent,depthWrite:m.depthWrite});
  const previous=m.onBeforeCompile;
  m.onBeforeCompile=(shader,renderer)=>{
   previous.call(m,shader,renderer);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='uniform mat4 hrBootRootInverse; varying float hrBootRadius;\n'+shader.vertexShader;
   const vertex=`vec4 hrBootPosition=vec4(position,1.0);
    #ifdef USE_INSTANCING
     hrBootPosition=instanceMatrix*hrBootPosition;
    #endif
    hrBootRadius=length((hrBootRootInverse*modelMatrix*hrBootPosition).xz);`;
   shader.vertexShader=shader.vertexShader.replace(/void\s+main\s*\(\s*\)\s*\{/,match=>match+'\n'+vertex+'\n');
   shader.fragmentShader='uniform float hrBootAge; uniform float hrBootEnabled; varying float hrBootRadius;\n'+shader.fragmentShader;
   // Never switch an opaque/transmissive material into the transparent render
   // queue for startup: that changes occlusion abruptly when startup ends.
   const coverage=m.transparent?`gl_FragColor.a*=hrGain;
     if(gl_FragColor.a<.00001)discard;`:`float coverage=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
     if(hrGain<.00001||coverage>hrGain)discard;`;
   const mask=`
    if(hrBootEnabled>.5){
     float hrStart=hrBootRadius<=.70?0.:2.8+clamp((hrBootRadius-.70)/1.3,0.,1.)*2.65;
     float hrDuration=hrBootRadius<=.70?2.8:1.45;
     float hrGain=smoothstep(hrStart,hrStart+hrDuration,hrBootAge);
     ${coverage}
    }
   `;
   shader.fragmentShader=shader.fragmentShader.replace(/}\s*$/,mask+'\n}');
  };
  m.customProgramCacheKey=()=>`local-radial-startup-v3-stable-depth-${m.type}-${m.transparent}`;
  m.needsUpdate=true;
 }});
 // Invisible added hardware must not cast its finished-state shadow at t=0.
 // A stable shadow-map coverage ramp follows the same radial reveal.
 motif.traverse(n=>{if(!n.isMesh||!n.castShadow)return;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  depth.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='uniform mat4 hrBootRootInverse; varying float hrBootRadius;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('void main() {',`void main() {
    vec4 hrP=vec4(position,1.);
    #ifdef USE_INSTANCING
     hrP=instanceMatrix*hrP;
    #endif
    hrBootRadius=length((hrBootRootInverse*modelMatrix*hrP).xz);`);
   shader.fragmentShader='uniform float hrBootAge; uniform float hrBootEnabled; varying float hrBootRadius;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
    if(hrBootEnabled>.5){
     float hrStart=hrBootRadius<=.70?0.:2.8+clamp((hrBootRadius-.70)/1.3,0.,1.)*2.65;
     float hrDuration=hrBootRadius<=.70?2.8:1.45;
     float gain=smoothstep(hrStart,hrStart+hrDuration,hrBootAge);
     float coverage=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
     if(gain<.00001||coverage>gain)discard;
    }`);
  };
  depth.customProgramCacheKey=()=> 'local-startup-shadow-v2';
  n.customDepthMaterial=depth;shadowMaterials.push(depth);
 });
 let fading=false;
 return {update(age,enabled){
  uniforms.hrBootAge.value=age;uniforms.hrBootEnabled.value=enabled?1:0;
  fading=enabled;
  // Uniform-only transition. Original depth, transmission and blending remain
  // identical before, during and after the seven-second startup boundary.
 },inspect(){return {materials:materials.size,enabled:fading,age:uniforms.hrBootAge.value}},dispose(){shadowMaterials.forEach(m=>m.dispose())}};
}
