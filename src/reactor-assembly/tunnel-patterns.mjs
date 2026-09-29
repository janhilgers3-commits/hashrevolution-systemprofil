import * as THREE from 'three';
import {definitions} from './assembly-parts.mjs';
export const tunnelProfiles=[
 {kind:'signal-rings',label:'Umlaufende Signalimpulse'},
 {kind:'data-lanes',label:'Gestaffelte Datenbahnen'},
 {kind:'neural-network',label:'Vernetzte Lichtknoten'},
 {kind:'ledger-blocks',label:'Verkettete Kristallsegmente'},
 {kind:'turbine-spiral',label:'Rotierende Turbinen-Spiralen'},
 {kind:'convergence-helix',label:'Blau-violette Konvergenzspiralen'}
];
export function createTunnelPatterns(scene){
 const entries=definitions.map((d,index)=>{
  const root=new THREE.Group();root.name=tunnelProfiles[index].kind;scene.add(root);root.visible=false;
  const tint=new THREE.Color(d.color),material=new THREE.MeshBasicMaterial({color:tint.clone().multiplyScalar(2),transparent:true,opacity:.64,blending:THREE.AdditiveBlending,depthWrite:false});
  const lines=new THREE.LineBasicMaterial({color:tint.clone().multiplyScalar(1.5),transparent:true,opacity:.43,blending:THREE.AdditiveBlending,depthWrite:false}),paths=[],travellers=[];
  const point=(a,z,r=3.35)=>new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z);
  const path=(points,secondary=false)=>{const curve=new THREE.CatmullRomCurve3(points);paths.push(curve);const m=secondary?material.clone():material;if(secondary)m.color.setHex(0x66baff).multiplyScalar(2);const line=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*(index>=4?6:2)),index>=4?.027:.016,6,false),m);root.add(line);for(let i=0;i<4;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.055,8,5),m);root.add(dot);travellers.push({dot,curve,phase:i/4,secondary});}};
  if(index===1){
   for(let i=0;i<16;i++){const a=i*Math.PI/8;path([point(a,18),point(a,-83)]);for(let k=0;k<20;k++){const p=point(a,16-k*5),bar=new THREE.Mesh(new THREE.BoxGeometry(.065,.32,.42+(k%5)*.13),material);bar.position.copy(p);bar.rotation.z=a;root.add(bar);}}
  }else if(index===2){
   const points=[];for(let k=0;k<16;k++)for(let i=0;i<12;i++)points.push(point(i*Math.PI/6+(k%2)*Math.PI/12,16-k*6));
   for(let k=0;k<15;k++)for(let i=0;i<12;i++){const a=points[k*12+i],b=points[(k+1)*12+i],c=points[(k+1)*12+(i+1)%12];const geo=new THREE.BufferGeometry().setFromPoints([a,b,a,c]);root.add(new THREE.LineSegments(geo,lines));}
   for(let i=0;i<12;i++)path(Array.from({length:16},(_,k)=>points[k*12+i]));
   const dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.07,6,4),material,points.length);points.forEach((p,i)=>dots.setMatrixAt(i,new THREE.Matrix4().makeTranslation(...p.toArray())));root.add(dots);
  }else if(index===3){
   const metal=new THREE.MeshPhysicalMaterial({color:0x947c55,metalness:.91,roughness:.33,clearcoat:.1});
   const glass=new THREE.MeshPhysicalMaterial({color:0xffd698,metalness:0,roughness:.10,transmission:.82,thickness:.14,ior:1.46,clearcoat:.75,attenuationColor:0xffc771,attenuationDistance:1.2});
   const section=new THREE.Shape();section.moveTo(-.31,-.10);section.lineTo(-.19,-.22);section.lineTo(.19,-.22);section.lineTo(.31,-.10);section.lineTo(.31,.10);section.lineTo(.19,.22);section.lineTo(-.19,.22);section.lineTo(-.31,.10);section.closePath();
   const prism=new THREE.ExtrudeGeometry(section,{depth:.86,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.065,bevelThickness:.07});prism.translate(0,0,-.43);
   const cells=new THREE.InstancedMesh(prism,glass,216),cores=new THREE.InstancedMesh(new THREE.BoxGeometry(.052,.07,.79),material,216),collars=new THREE.InstancedMesh(new THREE.BoxGeometry(.58,.035,.07),metal,432);cells.name='Bevelled ledger crystal light guides';root.add(cells,cores,collars);
   const edgeGeometry=new THREE.EdgesGeometry(prism,28),edgePosition=edgeGeometry.attributes.position,edgePoints=[],v=new THREE.Vector3();
   for(let i=0;i<12;i++){const a=i*Math.PI/6;path([point(a,18),point(a,-82)]);for(let k=0;k<18;k++){const n=i*18+k,z=16-k*5.4,p=point(a,z,3.25),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a-Math.PI/2),matrix=new THREE.Matrix4().compose(p,q,new THREE.Vector3(1,1,1));cells.setMatrixAt(n,matrix);for(let e=0;e<edgePosition.count;e++){v.fromBufferAttribute(edgePosition,e).applyMatrix4(matrix);edgePoints.push(v.x,v.y,v.z);}cores.setMatrixAt(n,new THREE.Matrix4().compose(point(a,z,3.2),q,new THREE.Vector3(1,1,1)));for(let s=0;s<2;s++)collars.setMatrixAt(n*2+s,new THREE.Matrix4().compose(point(a,z+(s?1:-1)*.42,3.07),q,new THREE.Vector3(1,1,1)));}}
   const facets=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(edgePoints,3)),new THREE.LineBasicMaterial({color:0xffc87b,transparent:true,opacity:.44}));facets.name='Ledger crystal facet edges';root.add(facets);edgeGeometry.dispose();
  }else if(index===4||index===5){
   const strands=index===5?7:5;
   for(let i=0;i<strands;i++)path(Array.from({length:181},(_,k)=>{const z=18-k*100/180,a=i*Math.PI*2/strands+k*(index===5?.23:.29);return point(a,z,3.22+(i%2)*.13);}),index===5&&i%2===0);
   if(index===4){for(let k=0;k<18;k++)for(let i=0;i<12;i++){const a=i*Math.PI/6+k*.18,blade=new THREE.Mesh(new THREE.BoxGeometry(.1,.58,.34),new THREE.MeshStandardMaterial({color:0x3d7783,metalness:.82,roughness:.35}));blade.position.copy(point(a,16-k*5.4,3.52));blade.rotation.set(0,.45,a+.28);root.add(blade);}}
  }
  return {root,material,travellers,index};
 });
 let active=0;
 return {prepare(){entries.forEach(e=>e.root.visible=true);},select(index){active=index;entries.forEach((e,i)=>e.root.visible=i===index);},update(seconds){const e=entries[active];e.material.opacity=.52+.15*Math.sin(seconds*3);e.travellers.forEach(({dot,curve,phase},i)=>dot.position.copy(curve.getPoint((seconds*(active>=4?.13:.19)+phase+i*.017)%1)));if(active>=4)e.root.rotation.z=seconds*(active===4?.45:.28);},inspect(){return tunnelProfiles[active];}};
}
