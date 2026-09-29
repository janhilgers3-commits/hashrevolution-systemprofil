import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPrismaticField,auditStartupTiming} from './assembly-energy.mjs';

// Linear-light calibration is per technology, not a common exposure increase.
// Aperture brightness and the area of illuminated hardware are separate controls.
export const lightProfiles=[
 {body:1.52,aperture:.69,fill:1.70,sleeve:1.95,floor:1.95,emission:0xff6525,frame:0xa26545},
 {body:1.38,aperture:.70,fill:2.15,sleeve:1.95,floor:1.68,emission:0x167cff,frame:0x668bab},
 {body:1.00,aperture:.61,fill:1.40,sleeve:1.35,floor:.92,emission:0x25d267,frame:0x689b7b},
 {body:.84,aperture:.66,fill:1.40,sleeve:1.48,floor:1.12,emission:0xff990b,frame:0xba8944},
 {body:1.04,aperture:.64,fill:.72,sleeve:1.20,floor:1.08,emission:0x04bbd6,frame:0x54888f}
];
let finishMaps;
function machinedFinish(){
 if(finishMaps)return finishMaps;
 const size=512,normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,grain=hash(x,y),brush=hash(0,y),scratch=brush>.995&&hash(Math.floor(x/48),y)>.45;
  normal[i]=128+(grain-.5)*3;normal[i+1]=128+(brush-.5)*9;normal[i+2]=255;normal[i+3]=255;
  const r=192+brush*25+grain*12-(scratch?25:0);rough[i]=255;rough[i+1]=r;rough[i+2]=255;rough[i+3]=255;
 }
 const texture=data=>{const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;};
 return finishMaps={normal:texture(normal),roughness:texture(rough)};
}
export function refineMachineMaterial(source,d){
 const name=source.name;
 if(!['steel','copper','brass','housing','seam','cavity'].includes(name))return source.clone();
 const f=machinedFinish(),conductor=['steel','copper','brass'].includes(name),copper=d.slug==='iot',gold=d.slug==='blockchain';
 // The old dark colour map multiplied the metal tint a second time. Keep
 // micro-roughness, but give the conductor its actual reflectance colour.
 const color=name==='steel'?0xb8c9d0:name==='copper'?(copper?0xbb673e:gold?0xc49346:0x9bb2bc):name==='brass'?(copper?0xd0a36b:gold?0xe1ba72:0xb0c3c8):name==='housing'?0x27353d:name==='seam'?0x111b20:0x172831;
 return new THREE.MeshPhysicalMaterial({name,color,metalness:conductor?.94:.83,roughness:conductor?(name==='steel'?.29:.31):.39,normalMap:f.normal,normalScale:new THREE.Vector2(.22,.22),roughnessMap:f.roughness,envMapIntensity:conductor?.94:.76,clearcoat:conductor?.17:.10,clearcoatRoughness:.24,anisotropy:conductor?.38:.12});
}

function instrumentGlass(color){
 return new THREE.MeshPhysicalMaterial({color,metalness:0,roughness:.085,transmission:.96,thickness:.08,ior:1.46,attenuationColor:color,attenuationDistance:2.2,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:1.1});
}

function addMachinedFaceplates(root,d){
 const material=refineMachineMaterial({name:'steel'},d);material.color.setHex(0x87979f);material.roughness=.34;material.envMapIntensity=.86;
 const profile=[[2.16,.993],[2.16,1.010],[2.176,1.025],[2.425,1.025],[2.441,1.010],[2.441,.993],[2.16,.993]].map(([r,y])=>new THREE.Vector2(r,y));
 const plate=new THREE.LatheGeometry(profile,4,.027,Math.PI/12-.054),segments=new THREE.InstancedMesh(plate,material,24);
 segments.name='Beveled machined rim segments';segments.castShadow=true;segments.receiveShadow=true;
 for(let i=0;i<24;i++){
  segments.setMatrixAt(i,new THREE.Matrix4().makeRotationY(i*Math.PI/12));
  const shade=.76+(i%5)*.038;segments.setColorAt(i,new THREE.Color(shade,shade,shade));
 }
 root.add(segments);
 // Shallow cut-outs on each plate preserve the segmented industrial surface,
 // with clear dark seams instead of another uninterrupted decorative ring.
 const dark=refineMachineMaterial({name:'seam'},d),slots=batch(dark);
 for(let i=0;i<24;i++){const a=(i+.5)*Math.PI/12;for(const side of [-1,1])slots.add(new THREE.BoxGeometry(.028,.005,.094),Math.sin(a)*2.30+Math.cos(a)*side*.08,1.029,Math.cos(a)*2.30-Math.sin(a)*side*.08,a);}
 slots.finish(root);
}

function illuminatedInternals(group,d,accent){
 const profile=lightProfiles[d.id-1],metal=refineMachineMaterial({name:'steel'},d),warm=refineMachineMaterial({name:'brass'},d);
 metal.color.setHex(profile.frame);metal.envMapIntensity=.70;metal.roughness=.34;
 const glow=new THREE.MeshStandardMaterial({color:new THREE.Color(profile.emission).multiplyScalar(.32),emissive:profile.emission,emissiveIntensity:1.5,metalness:.06,roughness:.44});
 // A luminous cylinder wall behind 40 separate metal ribs gives the central
 // drum volume. The top aperture is not used to fake this interior light.
 const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.619,.619,.50,80,1,true),glow);sleeve.position.y=.43;group.add(sleeve);
 const frames=batch(metal),coils=batch(warm);
 for(let i=0;i<40;i++){const a=i*Math.PI/20;frames.add(new THREE.BoxGeometry(.022,.56,.029),Math.sin(a)*.64,.43,Math.cos(a)*.64,a);}
 for(const y of [.15,.19,.67,.71]){const g=new THREE.TorusGeometry(.635,.016,5,64);g.rotateX(Math.PI/2);frames.add(g,0,y,0);}
 for(let i=0;i<(d.slug==='data'?3:10);i++){const r=.78+i*(d.slug==='data'?.4:.105),g=new THREE.TorusGeometry(r,.008,4,64);g.rotateX(Math.PI/2);coils.add(g,0,.17+(i%3)*.008,0);}
 frames.finish(group);coils.finish(group);
 const traces=batch(glow);
 for(let i=0;i<48;i++){const a=i*Math.PI/24;traces.add(new THREE.BoxGeometry(.012,.012,1.00),Math.sin(a)*1.30,.165,Math.cos(a)*1.30,a);}
 traces.finish(group);
 // Very low broad illumination under the engineering, with gaps and light
 // falloff; it remains below the metal, not an opaque glowing cover plate.
 const floorMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{tint:{value:accent},power:{value:1}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;uniform vec3 tint;uniform float power;void main(){float r=length(p.xz),a=atan(p.x,p.z);float band=pow(.5+.5*cos(r*79.),9.);float spoke=pow(.5+.5*cos(a*48.),24.);float envelope=smoothstep(.65,.85,r)*(1.-smoothstep(1.69,1.95,r));float light=envelope*(.035+band*.115+spoke*.10)*power;gl_FragColor=vec4(tint*1.25,light);}`});
 const floor=new THREE.Mesh(new THREE.RingGeometry(.65,1.96,112,1),floorMat);floor.geometry.rotateX(-Math.PI/2);floor.position.y=.105;group.add(floor);
 // A ring of glazed signal lamps with real metal collars. Existing terminals
 // are retained; these are their illuminated inner sections.
 const lamps=new THREE.InstancedMesh(new THREE.CylinderGeometry(.038,.038,.49,10),glow,24),collars=batch(metal);
 for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.sin(a)*1.79,z=Math.cos(a)*1.79;lamps.setMatrixAt(i,new THREE.Matrix4().makeTranslation(x,.53,z));for(const y of [.275,.785])collars.add(new THREE.CylinderGeometry(.052,.052,.025,10),x,y,z);}
 group.add(lamps);collars.finish(group);
 return {update(pulse,submitted,revision){glow.emissive.setHex(revision?0xff441b:profile.emission);floorMat.uniforms.tint.value.setHex(revision?0xff5533:d.color);glow.emissiveIntensity=profile.sleeve*(submitted?.80+pulse*.85:.72+pulse*.42);floorMat.uniforms.power.value=profile.floor*(submitted?.88+pulse*.75:.72+pulse*.4);},profile};
}

export const definitions=[
 {id:1,name:'SIGNAL ARRAY',topic:'IoT',slug:'iot',color:0xff865e,angle:-144},
 {id:2,name:'DATA CHAMBER',topic:'Big Data',slug:'data',color:0x5ba7ff,angle:144},
 {id:3,name:'NEURAL LATTICE',topic:'KI',slug:'ai',color:0x62d793,angle:72},
 {id:4,name:'LEDGER CORE',topic:'Blockchain',slug:'blockchain',color:0xffc45d,angle:0},
 {id:5,name:'CLOUD TURBINE',topic:'Cloud',slug:'cloud',color:0x5ed6e5,angle:-72},
 {id:6,name:'FINAL CONVERGENCE',topic:'Audit',slug:'audit',color:0xa58cff,angle:0}
];
function batch(material){const geometries=[];return {add(geometry,x=0,y=0,z=0,rotation=0){geometry.rotateY(rotation);geometry.translate(x,y,z);geometries.push(geometry);},finish(parent){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}};}
export function createPlatform(scene,materials){
 const root=new THREE.Group();root.name='Assembly platform';scene.add(root);
 const housing=materials.housing.clone(),steel=materials.steel.clone(),seam=materials.seam.clone();
 const plate=new THREE.Mesh(new THREE.CylinderGeometry(12.35,12.65,.48,128),housing);plate.position.y=-.93;plate.receiveShadow=true;root.add(plate);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(12.15,.045,6,144),steel);rim.rotation.x=Math.PI/2;rim.position.y=-.67;root.add(rim);
 const ribs=batch(seam),details=batch(steel),rails=batch(steel);
 for(let i=0;i<60;i++){const a=i*Math.PI*2/60;const x=Math.sin(a),z=Math.cos(a);ribs.add(new THREE.BoxGeometry(.035,.019,8.8),x*7.55,-.675,z*7.55,a);details.add(new THREE.BoxGeometry(.16,.026,.05),x*11.9,-.66,z*11.9,a);}
 for(const d of definitions.slice(0,5)){const a=d.angle*Math.PI/180;const r=3.45;const x=Math.sin(a),z=Math.cos(a);rails.add(new THREE.BoxGeometry(.58,.22,3.1),x*r,.7,z*r,a);for(const side of [-1,1])details.add(new THREE.BoxGeometry(.026,.022,3.12),x*r+Math.cos(a)*side*.225,.824,z*r-Math.sin(a)*side*.225,a);for(let i=0;i<24;i++){const t=2+i*.122;ribs.add(new THREE.BoxGeometry(.36,.026,.025),x*t,.826,z*t,a);}}
 ribs.finish(root);details.finish(root);rails.finish(root);
 return root;
}
export function createAudit(scene,materials){
 const root=new THREE.Group();root.name='Central audit reactor';scene.add(root);
 const d={slug:'audit'},housing=refineMachineMaterial(materials.housing,d),steel=refineMachineMaterial(materials.steel,d),seam=refineMachineMaterial(materials.seam,d);
 // These lathed/merged parts do not carry authored tangent directions. An
 // anisotropic highlight produces white streaks across their fine ribs; use
 // the brushed micro-normal/roughness maps with an isotropic metal response.
 steel.color.setHex(0x9aadc3);steel.roughness=.40;steel.envMapIntensity=.65;steel.clearcoat=0;steel.anisotropy=0;
 const light=new THREE.MeshStandardMaterial({color:0x284257,emissive:0xb8edff,emissiveIntensity:0,metalness:.04,roughness:.52,envMapIntensity:.10});
 const cyan=light.clone(),violet=light.clone();cyan.color.setHex(0x184e94);cyan.emissive.setHex(0x167fff);violet.color.setHex(0x392a78);violet.emissive.setHex(0x8550ff);
 const plasmaBlue=cyan.clone(),plasmaViolet=violet.clone();plasmaBlue.emissive.setHex(0x4c9bff);plasmaViolet.emissive.setHex(0xa078ff);
 const primaryWhite=light.clone(),primaryBlue=cyan.clone(),primaryViolet=violet.clone();
 const receiverLights=[],resonatorLights=[];
 // Open mechanical chamber. No solid disk covering the cavity and no glowing
 // plane pretending to be a reactor: all lit surfaces belong to actual parts.
 const shell=new THREE.Mesh(new THREE.LatheGeometry([[1.87,-.50],[2.37,-.50],[2.42,-.38],[2.39,.72],[2.23,.84],[1.88,.84],[1.87,-.50]].map(([r,y])=>new THREE.Vector2(r,y)),80),housing);shell.castShadow=true;shell.receiveShadow=true;root.add(shell);
 // Segmented machined jacket with recessed seams and fasteners; the dark
 // backing remains behind it, so the shell reads as assembled metal, not a
 // smooth blue plastic sleeve. This does not alter the collector sequence.
 const jacketMaterial=steel.clone();jacketMaterial.color.setHex(0x536373);jacketMaterial.roughness=.44;jacketMaterial.envMapIntensity=.49;
 const jacketProfile=[[2.417,-.35],[2.449,-.34],[2.456,-.29],[2.421,.65],[2.407,.69],[2.395,.65],[2.417,-.35]].map(([r,y])=>new THREE.Vector2(r,y));
 const jacket=new THREE.InstancedMesh(new THREE.LatheGeometry(jacketProfile,5,.018,Math.PI/12-.036),jacketMaterial,24);jacket.name='Machined audit casing panels';jacket.castShadow=true;jacket.receiveShadow=true;
 for(let i=0;i<24;i++){jacket.setMatrixAt(i,new THREE.Matrix4().makeRotationY(i*Math.PI/12));const tone=.78+(i%4)*.045;jacket.setColorAt(i,new THREE.Color(tone,tone,tone));}root.add(jacket);
 const jacketRibs=batch(steel),jacketSlots=batch(seam);
 for(let i=0;i<48;i++){const a=i*Math.PI/24,x=Math.sin(a),z=Math.cos(a);jacketRibs.add(new THREE.BoxGeometry(.021,.81,.017),x*2.431,.12,z*2.431,a);if(i%2===0){for(const y of [-.23,.55]){const bolt=new THREE.CylinderGeometry(.027,.027,.018,6);bolt.rotateX(Math.PI/2);jacketRibs.add(bolt,x*2.448,y,z*2.448,a);}for(let j=0;j<5;j++)jacketSlots.add(new THREE.BoxGeometry(.075,.018,.013),x*2.435,-.1+j*.065,z*2.435,a);}}
 jacketRibs.finish(root);jacketSlots.finish(root);
 const cylinder=(r,h,y,m,segments=64)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),m);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 const ring=(r,t,y,m,segments=72)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,6,segments),m);mesh.rotation.x=Math.PI/2;mesh.position.y=y;root.add(mesh);return mesh;};
 cylinder(2.29,.13,-.22,housing);cylinder(1.87,.07,-.115,seam);cylinder(.73,.13,.04,housing);cylinder(.63,.09,.18,steel);
 for(const [r,t,y,m] of [[2.31,.042,.80,steel],[1.90,.041,.81,steel],[1.74,.035,.16,steel],[1.60,.013,.12,cyan],[1.41,.021,.13,steel],[1.22,.010,.14,violet],[.72,.036,.23,steel]])ring(r,t,y,m);
 const chamber=new THREE.Group();chamber.name='Convergence pressure chamber';root.add(chamber);
 const glass=instrumentGlass(0xb8c8ff);glass.ior=1.38;glass.thickness=.06;glass.roughness=.13;glass.specularIntensity=.45;glass.clearcoat=.25;glass.envMapIntensity=.22;
 const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.465,.465,1.04,64,1,true),glass);sleeve.position.y=.77;chamber.add(sleeve);
 const inner=new THREE.Mesh(new THREE.CylinderGeometry(.285,.285,.91,64),primaryBlue);inner.position.y=.77;chamber.add(inner);
 const filament=new THREE.Mesh(new THREE.CylinderGeometry(.067,.067,.96,20),primaryWhite);filament.position.y=.78;chamber.add(filament);
 // Raised crown, with an open centre and a small white-hot lens.
 const crown=new THREE.Mesh(new THREE.LatheGeometry([[.28,1.235],[.565,1.235],[.606,1.260],[.606,1.312],[.58,1.334],[.28,1.334],[.28,1.235]].map(([r,y])=>new THREE.Vector2(r,y)),48),steel);crown.castShadow=true;root.add(crown);
 cylinder(.267,.042,1.265,seam);cylinder(.138,.023,1.291,primaryWhite,40);
 ring(.292,.016,1.34,primaryViolet);ring(.563,.014,1.34,steel);ring(.183,.009,1.316,primaryBlue);
 const ribs=batch(steel),slots=batch(seam),conductors=batch(cyan),cooling=batch(housing);
 for(let i=0;i<40;i++){const a=i*Math.PI/20;slots.add(new THREE.BoxGeometry(.06,.032,.17),Math.sin(a)*2.18,.83,Math.cos(a)*2.18,a);cooling.add(new THREE.BoxGeometry(.031,.20,.24),Math.sin(a)*.75,.13,Math.cos(a)*.75,a);if(i%2===0)ribs.add(new THREE.CylinderGeometry(.025,.025,.025,6),Math.sin(a)*2.29,.85,Math.cos(a)*2.29);}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;ribs.add(new THREE.BoxGeometry(.022,.94,.030),Math.sin(a)*.49,.77,Math.cos(a)*.49,a);if(i%2===0)ribs.add(new THREE.CylinderGeometry(.025,.025,.018,6),Math.sin(a)*.53,1.351,Math.cos(a)*.53);}
 for(const y of [.27,.31,1.19,1.23])ring(.493,.017,y,steel,64);
 for(const y of [.45,.62,.79,.96,1.12]){const g=new THREE.TorusGeometry(.492,.010,3,32);g.rotateX(Math.PI/2);ribs.add(g,0,y,0);}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;slots.add(new THREE.BoxGeometry(.018,.88,.030),Math.sin(a)*.296,.77,Math.cos(a)*.296,a);}
 for(let j=0;j<2;j++){
  const points=Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*8+j*Math.PI;return new THREE.Vector3(Math.sin(a)*.369,.32+i/96*.87,Math.cos(a)*.369);});
  const coil=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.014,4,false),j?primaryViolet:primaryWhite);coil.name=j?'Violet helical winding':'Cyan helical winding';chamber.add(coil);
 }
 // Five independently recognizable collector cells correspond to the five
 // incoming reactor feeds. They are hardware, not extra tasks or controls.
 const collectors=[];
 for(let i=0;i<5;i++){
  const a=definitions[i].angle*Math.PI/180,x=Math.sin(a)*1.15,z=Math.cos(a)*1.15,cell=new THREE.Group();cell.name='Convergence collector '+(i+1);cell.position.set(x,0,z);root.add(cell);collectors.push(cell);
  const jar=new THREE.Mesh(new THREE.CylinderGeometry(.175,.175,.67,24,1,true),glass);jar.position.y=.62;cell.add(jar);
  const receiver=(i%2?violet:cyan).clone();receiverLights.push(receiver);
  const energy=new THREE.Mesh(new THREE.CylinderGeometry(.102,.102,.61,20),receiver);energy.position.y=.62;cell.add(energy);
  for(const y of [.25,.96]){const cap=new THREE.Mesh(new THREE.LatheGeometry([[.10,-.03],[.204,-.03],[.215,-.018],[.215,.025],[.198,.036],[.10,.036],[.10,-.03]].map(([r,h])=>new THREE.Vector2(r,h)),16),steel);cap.position.y=y;cap.castShadow=true;cell.add(cap);}
  for(const y of [.29,.48,.73,.91]){const collar=new THREE.Mesh(new THREE.TorusGeometry(.183,.012,3,16),steel);collar.rotation.x=Math.PI/2;collar.position.y=y;cell.add(collar);}
  for(let j=0;j<10;j++){const q=j*Math.PI/5;const pin=new THREE.Mesh(new THREE.BoxGeometry(.014,.64,.019),steel);pin.position.set(Math.sin(q)*.185,.62,Math.cos(q)*.185);cell.add(pin);}
  const path=[];for(let j=0;j<25;j++){const t=j/24,r=.56+t*.58;path.push(new THREE.Vector3(Math.sin(a)*r,.29+Math.sin(t*Math.PI)*.16,Math.cos(a)*r));}
  const conduit=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),24,.025,5,false),receiver);root.add(conduit);
  for(let j=0;j<9;j++){const r=1.39+j*.06;conductors.add(new THREE.BoxGeometry(.025,.021,.032),Math.sin(a)*r,.135,Math.cos(a)*r,a);}
 }
 // Five suspended toroidal resonators fill the cavity between the collectors.
 // Each is a real helical metal winding around a curved blue/violet light tube,
 // with supports and an air gap above the floor, not a flat spiral decal.
 for(let i=0;i<5;i++){
  const middle=(definitions[i].angle+36)*Math.PI/180,span=.70,coilPoints=[],axisPoints=[];
  for(let j=0;j<=112;j++){
   const t=j/112,a=middle+(t-.5)*span,w=t*Math.PI*14,r=1.51+.16*Math.cos(w),y=.76+.18*Math.sin(t*Math.PI)+.30*Math.sin(w);
   coilPoints.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r));
  }
  for(let j=0;j<=32;j++){const t=j/32,a=middle+(t-.5)*span;axisPoints.push(new THREE.Vector3(Math.sin(a)*1.51,.76+.18*Math.sin(t*Math.PI),Math.cos(a)*1.51));}
  const winding=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints),112,.018,4,false),steel);winding.name='Suspended toroidal resonator '+(i+1);winding.castShadow=true;winding.receiveShadow=true;root.add(winding);
  const resonator=(i%2?plasmaViolet:plasmaBlue).clone();resonatorLights.push(resonator);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(axisPoints),32,.095,6,false),resonator);tube.name='Resonator inner light tube '+(i+1);root.add(tube);
  for(const t of [0,.5,1]){const a=middle+(t-.5)*span;
   for(const r of [1.29,1.74])ribs.add(new THREE.BoxGeometry(.055,.67,.08),Math.sin(a)*r,.415,Math.cos(a)*r,a);
   const saddle=new THREE.BoxGeometry(.057,.047,.51);ribs.add(saddle,Math.sin(a)*1.51,.43,Math.cos(a)*1.51,a);
  }
  for(let j=0;j<5;j++){const a=middle+(j-2)*.11;cooling.add(new THREE.BoxGeometry(.031,.46,.075),Math.sin(a)*1.843,.39,Math.cos(a)*1.843,a);}
 }
 ribs.finish(root);slots.finish(root);conductors.finish(root);cooling.finish(root);
 // With an implicit scene environment Three.js uses scene.environmentIntensity,
 // overriding per-material intensity. Bind the same shared map explicitly so
 // the audit's reflection calibration actually reaches the shader.
 root.traverse(n=>{if(n.isMesh&&n.material.isMeshStandardMaterial)n.material.envMap=scene.environment;});
 const radiance=new THREE.PointLight(0x869bff,0,24,2);radiance.position.set(0,2.8,0);root.add(radiance);
 const field=createPrismaticField(root);let startupState={core:0,hardware:0,field:0,ready:false},charges=[0,0,0,0,0],connections=[0,0,0,0,0];
 return {root,light,lights:[light,cyan,violet,plasmaBlue,plasmaViolet,primaryWhite,primaryBlue,primaryViolet,...receiverLights,...resonatorLights],field,hardware:{kind:'open-convergence-chamber',collectorCells:collectors.length,helicalWindings:2,toroidalResonators:5,resonatorAxisHeight:[.76,.94],resonatorTubeRadius:.095,outerWallHeight:.84,glassChamber:true,raisedCrown:true},getStartupState(){return {...startupState,coilCharges:[...charges],linkCharges:[...connections],receiverIntensity:receiverLights.map(m=>m.emissiveIntensity),resonatorIntensity:resonatorLights.map(m=>m.emissiveIntensity)}},update({active,pulse,age,seconds,submitted,reducedMotion,cameraQuaternion,coilCharges=[0,0,0,0,0],linkCharges=[0,0,0,0,0]}){
  charges=[...coilCharges];connections=[...linkCharges];const boot=active?auditStartupTiming(age,reducedMotion):{age:0,core:0,hardware:0,field:0,fieldAge:0,ready:false};startupState=boot;
  const ignition=active&&!reducedMotion&&boot.fieldAge<2.2?Math.sin(Math.min(1,boot.fieldAge/2.2)*Math.PI):0;
  const intensity=1.2+pulse*1.45+ignition*3.3+(submitted?.75:0);
  primaryWhite.emissiveIntensity=intensity*.62*boot.core;primaryBlue.emissiveIntensity=intensity*1.25*boot.core;primaryViolet.emissiveIntensity=intensity*1.55*boot.core;
  light.emissiveIntensity=intensity*.62*boot.hardware;cyan.emissiveIntensity=intensity*1.25*boot.hardware;violet.emissiveIntensity=intensity*1.55*boot.hardware;glass.envMapIntensity=.08+boot.core*.20;
  receiverLights.forEach((m,i)=>{m.emissiveIntensity=coilCharges[i]*(2.1+pulse*.65+boot.hardware*(.65+ignition*1.5));});
  resonatorLights.forEach((m,i)=>{m.emissiveIntensity=linkCharges[i]*((i%2?3.5:3.1)+pulse*(i%2?2.6:2.4)+ignition*(i%2?3.8:3.5)*boot.field);});
  radiance.intensity=boot.core*3+boot.field*(9+pulse*16+ignition*30);
  field.update({active:active&&boot.field>0,seconds,age:boot.fieldAge,pulse,submitted,reducedMotion,cameraQuaternion,gain:boot.field});
 }};
}
export function addTechnology(root,d){
 const accent=new THREE.Color(d.color),lights=[];
 const lit=new THREE.MeshBasicMaterial({color:accent.clone().multiplyScalar(1.75),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
 addMachinedFaceplates(root,d);
 const group=new THREE.Group();group.name=d.name+' technology motif';root.add(group);
 const internals=illuminatedInternals(group,d,accent),animatedMaterials=[],motions=[];
 let kind=d.slug;
 if(d.slug==='iot'){
  const copper=refineMachineMaterial({name:'copper'},d),coils=batch(copper),glow=new THREE.MeshStandardMaterial({color:0xc86931,emissive:0xff6635,emissiveIntensity:1.1,metalness:.28,roughness:.26});animatedMaterials.push(glow);
  const filaments=batch(glow);
  for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.sin(a)*1.48,z=Math.cos(a)*1.48,h=.45+(i%4)*.09;
   for(let j=0;j<10;j++){const r=.047,g=new THREE.TorusGeometry(r,.008,3,8);g.rotateX(Math.PI/2);coils.add(g,x,.22+j*h/10,z);}
   filaments.add(new THREE.CylinderGeometry(.016,.016,h,8),x,.20+h/2,z);
  }
  for(const [r,y] of [[.87,.28],[1.08,.31],[1.31,.36],[1.59,.40],[1.73,.58]]){const g=new THREE.TorusGeometry(r,.010,4,64);g.rotateX(Math.PI/2);filaments.add(g,0,y,0);}
  coils.finish(group);filaments.finish(group);
 }else if(d.slug==='data'){
  const glass=instrumentGlass(0x80beff),glow=new THREE.MeshStandardMaterial({color:0x1857a0,emissive:0x1375ff,emissiveIntensity:1.8,metalness:.08,roughness:.34});animatedMaterials.push(glow);
  glass.envMap=root.parent?.environment??null;glass.envMapIntensity=.30;glass.clearcoat=.20;glass.specularIntensity=.30;glass.roughness=.15;
  const chamber=new THREE.Mesh(new THREE.CylinderGeometry(.674,.674,.59,64,1,true),glass);chamber.position.y=.44;group.add(chamber);
  const bars=batch(refineMachineMaterial({name:'steel'},d)),lumens=batch(glow);
  // Four offset data planes are visibly different from the IoT coil array.
  // Their real glass edges, metal rails and vertical buses leave air gaps.
  const paneProfile=[[.84,-.018],[1.71,-.018],[1.74,0],[1.71,.018],[.84,.018],[.82,0],[.84,-.018]].map(([r,y])=>new THREE.Vector2(r,y));
  const paneGeometry=new THREE.LatheGeometry(paneProfile,12,.07,Math.PI/4-.14),panes=new THREE.InstancedMesh(paneGeometry,glass,32);panes.name='Four stacked segmented data planes';
  for(let level=0;level<4;level++)for(let sector=0;sector<8;sector++){
   const a=sector*Math.PI/4+(level%2)*.055,y=.25+level*.19;
   panes.setMatrixAt(level*8+sector,new THREE.Matrix4().makeRotationY(a).setPosition(0,y,0));
   for(const edge of [.07,Math.PI/4-.07]){const q=a+edge;bars.add(new THREE.BoxGeometry(.018,.026,.91),Math.sin(q)*1.28,y-.023,Math.cos(q)*1.28,q);lumens.add(new THREE.BoxGeometry(.014,.012,.82),Math.sin(q)*1.28,y+.017,Math.cos(q)*1.28,q);}
   const rim=new THREE.TorusGeometry(1.716,.013,4,20,Math.PI/4-.14);rim.rotateX(Math.PI/2);rim.rotateY(a+.07);lumens.add(rim,0,y,0);
  }group.add(panes);
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,x=Math.sin(a)*1.76,z=Math.cos(a)*1.76;bars.add(new THREE.BoxGeometry(.045,.82,.063),x,.55,z,a);lumens.add(new THREE.BoxGeometry(.021,.74,.024),x*.985,.55,z*.985,a);for(const y of [.17,1.])bars.add(new THREE.BoxGeometry(.11,.028,.11),x,y,z,a);}
  const packets=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.05,.07),lit,32);packets.name='Data packets on vertical and inward buses';group.add(packets);
  motions.push(t=>{for(let i=0;i<32;i++){const a=(i%8+.5)*Math.PI/4,p=(t*.36+Math.floor(i/8)*.25+i*.031)%1,r=p<.5?1.735:1.735-(p-.5)*1.75,y=p<.5?.2+p*1.3:.85;packets.setMatrixAt(i,new THREE.Matrix4().makeRotationY(a).setPosition(Math.sin(a)*r,y,Math.cos(a)*r));}packets.instanceMatrix.needsUpdate=true;});
  bars.finish(group);lumens.finish(group);
 }else if(d.slug==='ai'){
  const points=[];for(let i=0;i<48;i++){const a=i*Math.PI/24,r=i%3===0?1.07:1.73;points.push(new THREE.Vector3(Math.sin(a)*r,.35+(i%4)*.17,Math.cos(a)*r));}
  const lines=[];for(let i=0;i<48;i++)for(const step of [1,5,11]){lines.push(...points[i].toArray(),...points[(i+step)%48].toArray());}
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  const net=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:new THREE.Color(0x35d575).multiplyScalar(1.85),transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(net);lights.push(net.material);
  const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.022,6,4),lit,48);points.forEach((p,i)=>dots.setMatrixAt(i,new THREE.Matrix4().makeTranslation(...p.toArray())));group.add(dots);
 }else if(d.slug==='blockchain'){
  const crystal=instrumentGlass(0xffd78c),metal=refineMachineMaterial({name:'brass'},d),glow=new THREE.MeshStandardMaterial({color:0xb2691b,emissive:0xff9515,emissiveIntensity:1.3,metalness:.04,roughness:.33});animatedMaterials.push(glow);
  // Bevels produce actual specular faces. The light guide and metal collars
  // inside each glass prism remain distinct from its refractive outer shell.
  const section=new THREE.Shape();section.moveTo(-.083,-.077);section.lineTo(.083,-.077);section.lineTo(.083,.077);section.lineTo(-.083,.077);section.closePath();
  const prismGeometry=new THREE.ExtrudeGeometry(section,{depth:.92,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.014,bevelThickness:.025,curveSegments:1});prismGeometry.rotateX(-Math.PI/2);prismGeometry.translate(0,-.46,0);
  const instanced=new THREE.InstancedMesh(prismGeometry,crystal,72),cores=batch(glow),brackets=batch(metal);
  for(let i=0;i<72;i++){const a=i*2.399963,r=.82+(i%4)*.26,h=.36+((i*7)%13)*.046,x=Math.sin(a)*r,z=Math.cos(a)*r;
   const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,.15+h/2,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),a),new THREE.Vector3(1,h,1));instanced.setMatrixAt(i,matrix);
   cores.add(new THREE.BoxGeometry(.029,h*.91,.032),x,.15+h/2,z,a);
   for(const y of [.145,.15+h*.57,.15+h])for(const s of [-1,1]){
    brackets.add(new THREE.BoxGeometry(.184,.010,.009),x+Math.sin(a)*s*.080,y,z+Math.cos(a)*s*.080,a);
    brackets.add(new THREE.BoxGeometry(.009,.010,.170),x+Math.cos(a)*s*.086,y,z-Math.sin(a)*s*.086,a);
   }
  }
  group.add(instanced);cores.finish(group);brackets.finish(group);
 }else if(d.slug==='cloud'){
  const rotor=new THREE.Group();rotor.name='Turbine rotor';group.add(rotor);
  const bladeMaterial=refineMachineMaterial({name:'steel'},d);bladeMaterial.side=THREE.DoubleSide;bladeMaterial.roughness=.46;bladeMaterial.color.setHex(0x54858d);bladeMaterial.envMapIntensity=.65;
  const blades=batch(bladeMaterial),bladeLights=batch(new THREE.MeshStandardMaterial({color:0x248e9f,emissive:0x22bdd4,emissiveIntensity:.65,metalness:.3,roughness:.27}));
  for(let i=0;i<28;i++){const a=i*Math.PI/14,g=new THREE.BoxGeometry(.085,.023,.85);g.rotateZ(.38);blades.add(g,Math.sin(a)*1.13,.44,Math.cos(a)*1.13,a+.35);bladeLights.add(new THREE.BoxGeometry(.012,.025,.76),Math.sin(a)*1.13,.453,Math.cos(a)*1.13,a+.35);}blades.finish(rotor);bladeLights.finish(rotor);
  // Bounded volumetric vapor: ray-march the annular density, not white polygon puffs.
  const mistMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{eye:{value:new THREE.Vector3()},time:{value:0},power:{value:1}},
   vertexShader:'varying vec3 localPosition;void main(){localPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec3 localPosition;uniform vec3 eye;uniform float time,power;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float density(vec3 p){float a=time*.065;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));p.xz=rot*p.xz;float n=noise(p*5.4+vec3(time*.025,0,0))*.58+noise(p*12.3)*.28+noise(p*26.1)*.14;float ring=length(vec2(length(p.xz)-1.31,p.y*1.5));return (1.-smoothstep(.09,.44,ring))*smoothstep(.32,.73,n);}
void main(){vec3 ray=normalize(localPosition-eye);vec3 lo=(vec3(-2.05,-.72,-2.05)-eye)/ray,hi=(vec3(2.05,.72,2.05)-eye)/ray;vec3 nearT=min(lo,hi),farT=max(lo,hi);float begin=max(max(nearT.x,nearT.y),nearT.z),end=min(min(farT.x,farT.y),farT.z);float stepSize=(end-max(0.,begin))/48.;if(stepSize<=0.)discard;vec4 total=vec4(0.);for(int i=0;i<48;i++){vec3 p=eye+ray*(max(0.,begin)+(float(i)+.5)*stepSize);float d=density(p);float a=1.-exp(-d*stepSize*4.3);float lighting=clamp(.52+(d-density(p+vec3(-.09,.17,.05)))*1.7,.15,.90);vec3 color=mix(vec3(.008,.15,.20),vec3(.075,.68,.80),lighting);total.rgb+=(1.-total.a)*a*color*power;total.a+=(1.-total.a)*a;if(total.a>.90)break;}if(total.a<.008)discard;gl_FragColor=vec4(total.rgb/max(.001,total.a),total.a);}`});
  const vapor=new THREE.Mesh(new THREE.BoxGeometry(4.1,1.44,4.1),mistMaterial);vapor.position.y=.58;vapor.renderOrder=3;vapor.onBeforeRender=(_r,_s,camera)=>mistMaterial.uniforms.eye.value.copy(vapor.worldToLocal(camera.position.clone()));group.add(vapor);
  return {kind,profile:internals.profile,update(t,pulse,active,animate,submitted,revision){group.visible=active;internals.update(pulse,submitted,revision);mistMaterial.uniforms.power.value=.91+pulse*.18;if(animate){rotor.rotation.y=t*.45;mistMaterial.uniforms.time.value=t;}}};
 }
 const originalLit=lit.color.clone(),originalLineColors=lights.map(m=>m.color.clone()),originalEmitters=animatedMaterials.map(m=>m.emissive.clone());
 return {kind,profile:internals.profile,update(t,pulse,active,animate,submitted,revision){group.visible=active;internals.update(pulse,submitted,revision);motions.forEach(move=>move(animate?t:0));lit.color.copy(revision?new THREE.Color(0xff5533).multiplyScalar(1.75):originalLit);lit.opacity=.50+pulse*.32;lights.forEach((m,i)=>{m.color.copy(revision?new THREE.Color(0xff4422).multiplyScalar(1.85):originalLineColors[i]);m.opacity=.52+pulse*.25;});animatedMaterials.forEach((m,i)=>{m.emissive.copy(revision?new THREE.Color(0xff4422):originalEmitters[i]);m.emissiveIntensity=(submitted?1.20+pulse*1.25:1.00+pulse*.55)*internals.profile.body;});}};
}
