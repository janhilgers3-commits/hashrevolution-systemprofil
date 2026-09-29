export const profiles = [
 {id:1,name:'IoT · Signal Array',pitch:1,pulse:.8,kind:'orbit',interval:.24},
 {id:2,name:'Big Data',pitch:.87,pulse:1.05,kind:'packets',interval:.22},
 {id:3,name:'KI',pitch:1.08,pulse:.68,kind:'network',interval:.28},
 {id:4,name:'Blockchain',pitch:.94,pulse:.9,kind:'chain',interval:.32},
 {id:5,name:'Cloud',pitch:1.18,pulse:.52,kind:'spiral',interval:.19},
 {id:6,name:'Final Convergence Audit',pitch:.75,pulse:.6,kind:'prism',interval:.26},
];
export function profile(id){return profiles.find(p=>p.id===Number(id))||profiles[0];}
// Five distinct incoming voices resolve into one final resonant spectrum.
// Times are relative to the central-core ignition, after the incoming coils.
export const finalActivation={duration:6.5,resolveAt:3.8,burstAt:5.2,
 voices:[
  {from:69,to:55,pan:-.85}, {from:123,to:82.5,pan:.85},
  {from:151,to:110,pan:-.55}, {from:247,to:165,pan:.55},
  {from:287,to:220,pan:0},
 ]};
export function tunnelPulses(id){const p=profile(id),out=[];for(let i=0;i*p.interval<4.1;i++){
 const time=i*p.interval,pan=p.kind==='spiral'?Math.sin(i*.72)*.8:i%2?-.8:.8;
 out.push({time,pan,endPan:-pan,duration:p.kind==='spiral'?.58:.38,
 frequency:(650+i*26)*p.pitch,tone:(290+i*9)*p.pitch,
 gain:p.kind==='spiral'?.12:p.kind==='prism'?.105:.15});
 if(p.kind==='packets'&&i%3===0)out.push({time:time+.09,pan:-pan,endPan:pan,duration:.18,frequency:1150*p.pitch,tone:390*p.pitch,gain:.08});
 }return out;}
