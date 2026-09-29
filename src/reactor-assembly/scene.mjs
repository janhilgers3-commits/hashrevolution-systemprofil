import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {makeEnergyField} from './energy-field.mjs';
import {definitions,createAudit,addTechnology,refineMachineMaterial,lightProfiles} from './assembly-parts.mjs';
import {layout,createMachineHall,createIndustrialLightRig} from './assembly-environment.mjs';
import {createConvergence,auditStartupTiming} from './assembly-energy.mjs';
import {createStartupFlow,createInteriorStartupMask} from './startup-flow.mjs';
import {createOverviewLifecycle} from './overview-lifecycle.mjs';
import {createReactorFlight} from './reactor-flight.mjs';
import {bridgeFreeIndices} from './detail-geometry.mjs';
import {createSoundEvents} from './sound-events.mjs';

// Approved startup, bound to authoritative snapshots. Cache is visual-only.
export function createReactorScene({stage,canvas,arrivalVeil,snapshot:initial,onReady,onAuditReady,onLayout,onError,onStartup=()=>{},onConvergence=()=>{},restoreProgress,onProgress=()=>{},onFlightEnd=()=>{},onFlightPhase=()=>{},onSound=()=>{},onSoundRunning=()=>{}}) {
  const media=matchMedia('(prefers-reduced-motion: reduce)'),nodes=[];
  let snapshot=initial,disposed=false,ready=false,paused=false,visible=true,raf=0,previousTime=0,lastRender=0,seconds=0,frameCount=0,pendingDetail=null;
  let renderer,composer,scene,camera,hall,convergence,auditVisual,environmentTarget,sceneTriangles=0,reportedAuditReady=false,flight,renderPass;
  const lifecycle=createOverviewLifecycle(initial,restoreProgress),startups=Array.from({length:5},()=>createStartupFlow());
  const soundEvents=createSoundEvents(onSound);let soundRunning=null;
  let lastProgress="",lastReadiness="";
  function reconcileStartup(next){lifecycle.reconcile(next);startups.forEach((flow,i)=>{if(!next.reactors[i].openable)flow.clear();else if(lifecycle.needsBoot(i,next)&&!flow.getState())flow.begin(i,seconds);});}
  function reportProgress(){const progress=lifecycle.save(),key=JSON.stringify(progress);if(key!==lastProgress){lastProgress=key;onProgress(progress);}}
  const canAnimate=()=>ready&&!disposed&&!paused&&!media.matches&&!document.hidden&&visible;
  function reportAudit(value){if(value!==reportedAuditReady){reportedAuditReady=value;onAuditReady(value);}}
  function updateMaterials(){
    const boots=startups.map((flow,i)=>{const boot=flow.update(seconds,media.matches);if(boot?.ready)lifecycle.finishBoot(i);return boot;});
    const access=boots.map((boot,i)=>snapshot.reactors[i].openable&&(!lifecycle.needsBoot(i,snapshot)||boot?.ready===true));
    const readiness=JSON.stringify(access);if(readiness!==lastReadiness){lastReadiness=readiness;onStartup(access);}
    hall.updateHaze(seconds);
    const power=convergence.update({seconds,states:snapshot.charged.map(charged=>charged?'submitted':'active'),reducedMotion:media.matches,animated:canAnimate(),auditEligible:snapshot.auditEligible});
    const activeAudit=snapshot.auditEligible&&power.unlocked;
    const running=canAnimate();if(soundRunning!==running){soundRunning=running;onSoundRunning(running);}
    soundEvents({boots,branches:convergence.getState().branches,auditEligible:snapshot.auditEligible,unlocked:power.unlocked,ignitionAge:power.ignitionAge});
    const auditBoot=auditStartupTiming(power.ignitionAge,media.matches);
    reportAudit(activeAudit&&auditBoot.ready);
    nodes.forEach((n,i)=>{
      for(const [obj,key,value] of n.bootRestore||[])obj[key]=value;n.bootRestore=[];
      const state=snapshot.reactors[i].visual,active=state!=='locked',submitted=state==='submitted',period=submitted?3.2:4.8;
      const boot=boots[i],starting=boot?.index===i,localTime=starting?boot.motionSeconds:seconds;
      const pulse=canAnimate()?.5+.5*Math.sin(seconds*Math.PI*2/period-i*.38):.55;
      if(i===5){auditVisual.update({active:activeAudit,pulse,age:power.ignitionAge,seconds,submitted,reducedMotion:media.matches,cameraQuaternion:camera.quaternion,coilCharges:power.coilCharges,linkCharges:power.linkCharges});n.spill.intensity=activeAudit?auditBoot.hardware*(1.7+pulse*1.6):0;return;}
      const tint=new THREE.Color(state==='revision'?0xf27866:definitions[i].color),l=.2126*tint.r+.7152*tint.g+.0722*tint.b;tint.multiplyScalar(1/Math.max(.28,l));
      const colourGain=active?(starting?boot.coreGain:1):0;
      n.baseColours.forEach(({material,off,on})=>material.color.copy(off).lerp(on,colourGain));
      const profile=lightProfiles[i];n.lights.forEach(m=>{m.emissive.setHex(0x99a9b2).lerp(tint,colourGain);m.emissiveIntensity=active?(m.name==='coreLight'?profile.aperture:1.15)*(submitted?.7+pulse*1.15:.65+pulse*.65):.015;});
      n.spill.color.setHex(state==='revision'?0xf27866:definitions[i].color);n.spill.intensity=active?profile.fill*(submitted?.78+pulse*.62:.72+pulse*.34):0;
      n.energy?.update({seconds:localTime,active,submitted,animated:canAnimate(),tint,pulse,pixelRatio:renderer.getPixelRatio()});
      n.motif?.update(localTime,pulse,active,canAnimate(),submitted,state==='revision');
      n.startupMask?.update(starting?boot.age:7,starting&&!boot.ready);
      if(starting&&!boot.ready){
        const scale=(obj,key,gain)=>{n.bootRestore.push([obj,key,obj[key]]);obj[key]*=gain;};
        n.spill.intensity*=boot.energyGain;
        for(const m of n.lights)m.emissiveIntensity=.015+(m.emissiveIntensity-.015)*(m.name==='statusLight'?boot.outerRingGain:boot.coreGain);
        for(const m of n.energyMaterials){
          if(m.transparent&&m.blending===THREE.AdditiveBlending&&!m.isShaderMaterial)scale(m,'opacity',boot.energyGain);
          for(const key of ['power','opacity'])if(typeof m.uniforms?.[key]?.value==='number')scale(m.uniforms[key],'value',boot.energyGain);
        }
      }
    });
    lifecycle.settle(snapshot,convergence.getState(),reportedAuditReady);reportProgress();
    onConvergence({...convergence.getState(),audit:auditVisual.getStartupState(),ready:reportedAuditReady,seconds});
  }
  function render(){if(!ready||disposed)return;try{updateMaterials();flight?.update(seconds,media.matches);renderer.info.reset();composer.render();frameCount++;}catch{fail();}}
  function resize(){if(!ready||disposed)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;
    renderer.setSize(w,h,false);composer.setSize(w,h);const center=new THREE.Vector3(0,0,1.1),halfHeight=Math.max(layout.halfHeight,layout.halfWidth/aspect);
    camera.aspect=aspect;if(!flight?.active){camera.up.set(0,1,0);camera.position.copy(center).add(new THREE.Vector3(0,28,30));camera.fov=2*Math.atan(halfHeight/Math.hypot(28,30))*180/Math.PI;camera.lookAt(center);}camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    onLayout(nodes.map(n=>{const p=n.root.position.clone().add(new THREE.Vector3(0,.6,0)).project(camera);return {x:(p.x*.5+.5)*100,y:(-p.y*.5+.5)*100};}));render();
  }
  function tick(t){raf=0;if(!canAnimate()){previousTime=0;return;}if(previousTime)seconds+=Math.min((t-previousTime)/1000,.25);previousTime=t;if(t-lastRender>=1000/30){render();lastRender=t;}if(canAnimate())raf=requestAnimationFrame(tick);}
  function start(){if(raf)cancelAnimationFrame(raf);raf=0;previousTime=0;render();if(canAnimate())raf=requestAnimationFrame(tick);}
  function fail(){if(disposed)return;ready=false;if(raf)cancelAnimationFrame(raf);raf=0;reportAudit(false);onReady(false);onError();}
  const contextLost=e=>{e.preventDefault();fail();};
  const resizeObserver=new ResizeObserver(resize),intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();},{threshold:.02});
  resizeObserver.observe(stage);intersectionObserver.observe(stage);media.addEventListener('change',start);document.addEventListener('visibilitychange',start);canvas.addEventListener('webglcontextlost',contextLost);
  function disposeResources(object){const geometries=new Set(),materials=new Set(),textures=new Set();object?.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])materials.add(m);if(n.shadow)n.shadow.dispose();});for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();}
  async function initialize(){
    try{
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.info.autoReset=false;
      scene=new THREE.Scene();scene.background=new THREE.Color(0x070d10);camera=new THREE.PerspectiveCamera(23,16/9,.1,150);
      const pmrem=new THREE.PMREMGenerator(renderer),room=createIndustrialLightRig();environmentTarget=pmrem.fromScene(room,.03);scene.environment=environmentTarget.texture;scene.environmentIntensity=.88;disposeResources(room);pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xc3e1ef,0x061016,.58));const key=new THREE.DirectionalLight(0xffe2c1,1.8);key.position.set(-10,18,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:70});key.shadow.normalBias=.025;key.shadow.bias=-.0001;scene.add(key);const fill=new THREE.DirectionalLight(0x8ac4dc,1.3);fill.position.set(10,8,-12);scene.add(fill);
      // Embedded images use img-src's existing blob permission. ImageBitmapLoader
      // would fetch blob URLs through connect-src, which intentionally stays self-only.
      const loader=new GLTFLoader().register(parser=>{
        parser.textureLoader=new THREE.TextureLoader(parser.options.manager).setCrossOrigin(parser.options.crossOrigin);
        return {name:'HR_EMBEDDED_TEXTURE_IMAGES'};
      });
      const gltf=await loader.loadAsync(new URL('./reactor-assembly/signal-array-pilot-v3.glb',import.meta.url).href);if(disposed){disposeResources(gltf.scene);return;}
      const textures=await gltf.parser.getDependencies('texture');
      if(textures.length!==10||textures.some(texture=>!texture?.image?.width||!texture.image.height)){
        disposeResources(gltf.scene);throw Error('Approved material textures are incomplete');
      }
      if(disposed){disposeResources(gltf.scene);return;}
      const materials={},bridgeIndices=new Map();let modelTriangles=0;gltf.scene.traverse(n=>{if(n.isMesh){materials[n.material.name]=n.material;bridgeIndices.set(n.geometry,bridgeFreeIndices(n.geometry,n.material.name));modelTriangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;}});if(modelTriangles!==62684)throw Error('Unexpected approved model geometry');
      hall=createMachineHall(scene,materials,definitions);
      for(const d of definitions.slice(0,5)){
        const root=new THREE.Group();root.name=d.name;const a=d.angle*Math.PI/180;root.position.set(Math.sin(a)*layout.radius,0,Math.cos(a)*layout.radius);root.rotation.y=a+Math.PI;root.scale.set(layout.outerScale,.94,layout.outerScale);scene.add(root);
        const model=gltf.scene.clone(true),lights=[],baseColours=[];model.traverse(n=>{if(!n.isMesh)return;n.material=refineMachineMaterial(n.material,d);if(['copper','brass'].includes(n.material.name))baseColours.push({material:n.material,on:n.material.color.clone(),off:new THREE.Color(n.material.name==='copper'?0x9bb2bc:0xb0c3c8)});n.geometry=n.geometry.clone();const p=n.geometry.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j),r=Math.hypot(x,z);if(r>2.7){const ratio=(2.7+(r-2.7)*.43)/r;p.setX(j,x*ratio);p.setZ(j,z*ratio);}}n.geometry.computeVertexNormals();n.castShadow=true;n.receiveShadow=true;if(['coreLight','statusLight'].includes(n.material.name))lights.push(n.material);});
        const originals=[];gltf.scene.traverse(n=>{if(n.isMesh)originals.push(n);});let meshIndex=0;model.traverse(n=>{if(!n.isMesh)return;const cut=bridgeIndices.get(originals[meshIndex++].geometry);if(cut){const detail=new THREE.BufferGeometry();for(const [key,value] of Object.entries(n.geometry.attributes))detail.setAttribute(key,value);detail.setIndex(cut.indices);n.userData.overviewGeometry=n.geometry;n.userData.detailGeometry=detail;n.userData.removedBridgeTriangles=cut.removedTriangles;}});
        root.add(model);const energy=makeEnergyField(root),energyMaterials=new Set();root.children.filter(n=>['Outer energy flow','Status light sparks'].includes(n.name)).forEach(n=>n.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])energyMaterials.add(m)}));
        const motif=addTechnology(root,d),spill=new THREE.PointLight(d.color,3,5,2);spill.position.set(0,1.35,0);root.add(spill);const startupMask=createInteriorStartupMask(root,THREE);nodes.push({root,lights,energy,motif,spill,energyMaterials,startupMask,baseColours});
      }
      const audit=createAudit(scene,materials),spill=new THREE.PointLight(0x748cff,0,9,2);auditVisual=audit;audit.root.scale.setScalar(layout.auditScale);spill.position.set(0,1.6,0);audit.root.add(spill);nodes.push({root:audit.root,lights:audit.lights,spill});convergence=createConvergence(scene,definitions);
      scene.traverse(n=>{if(n.isMesh)sceneTriangles+=((n.geometry.index?.count||n.geometry.attributes.position.count)/3)*(n.isInstancedMesh?n.count:1);});if(sceneTriangles<450000||sceneTriangles>550000)throw Error('Reactor geometry exceeds the reviewed budget');
      const seed=lifecycle.seed();convergence.update({seconds:-20,states:seed.charged.map(v=>v?'submitted':'active'),reducedMotion:true,auditEligible:seed.audit&&snapshot.auditEligible});reconcileStartup(snapshot);
      const target=new THREE.WebGLRenderTarget(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight),{type:THREE.HalfFloatType,samples:4});composer=new EffectComposer(renderer,target);renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);composer.addPass(new UnrealBloomPass(new THREE.Vector2(512,512),.44,.27,2.2));composer.addPass(new OutputPass());
      flight=createReactorFlight({scene,camera,pass:renderPass,nodes,stage,arrivalVeil,onEnd:onFlightEnd,onPhase:onFlightPhase});await flight.prepare(renderer);
      if(pendingDetail!==null)flight.detail(pendingDetail);ready=true;onReady(true);resize();start();
    }catch{fail();}
  }
  void initialize();
  return {
    fly(index=0){paused=false;flight.fly(index,seconds);previousTime=0;if(!raf)raf=requestAnimationFrame(tick);},
    detail(index=0){pendingDetail=index;flight?.detail(index);start();},
    overview(){pendingDetail=null;flight?.overview();resize();start();},
    update(next){snapshot=next;reconcileStartup(next);if(!next.auditEligible)reportAudit(false);start();},
    pause(value){paused=value;start();},
    inspect(){return {flight:flight?.inspect(),ready,frameCount,seconds,sceneTriangles,charged:[...snapshot.charged],serverAuditEligible:snapshot.auditEligible,auditReady:reportedAuditReady,auditField:auditVisual?.field.getState(),auditStartup:auditVisual?.getStartupState(),convergence:convergence?.getState(),startup:startups.map(flow=>flow.getState()),interiorMasks:nodes.slice(0,5).map(n=>n.startupMask.inspect()),outerMaterials:nodes.slice(0,5).map(n=>n.baseColours.map(c=>({name:c.material.name,colour:c.material.color.getHexString(),approvedColour:c.on.getHexString(),offColour:c.off.getHexString()}))),startupBeamCount:0};},
    dispose(){if(disposed)return;disposed=true;ready=false;if(raf)cancelAnimationFrame(raf);resizeObserver.disconnect();intersectionObserver.disconnect();media.removeEventListener('change',start);document.removeEventListener('visibilitychange',start);canvas.removeEventListener('webglcontextlost',contextLost);flight?.dispose();nodes.forEach(n=>n.startupMask?.dispose());disposeResources(scene);environmentTarget?.dispose();composer?.passes.forEach(pass=>pass.dispose?.());composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();}
  };
}
