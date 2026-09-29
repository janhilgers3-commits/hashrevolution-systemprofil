import {profile,tunnelPulses,finalActivation} from './sound-profiles.mjs';
export function createReactorAudio(){
 let ctx,master,limiter,bus,convolver,bed,reactorId=1,flightId=1,enabled=false,disposed=false;
 const active=new Set(),status={textContent:''},vol={value:35};
 function noiseBuffer(seconds=3){const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),a=b.getChannelData(0);let seed=17431,last=0;for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;last=(last+.025*(seed/2147483648-1))/1.025;a[i]=last*5;}return b;}
function output(node,pan=0,wet=.12){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(bus);const g=ctx.createGain();g.gain.value=wet;p.connect(g).connect(convolver);return p;}
function track(source,nodes,end){active.add(source);source.onended=()=>{active.delete(source);[source,...nodes].forEach(x=>{try{x.disconnect();}catch{}})};source.stop(end);}
function tone(t,d,f0,f1,gain,type='sine',pan=0){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(.15,d*.2));g.gain.exponentialRampToValueAtTime(.0001,t+d);const p=output(g,pan);o.connect(g);o.start(t);track(o,[g,p],t+d+.1);}
function air(t,d,f0,f1,gain,pan=0){const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noiseBuffer();n.loop=true;f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+d*.35);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(f).connect(g);const p=output(g,pan,.25);n.start(t);track(n,[f,g,p],t+d+.1);return p;}
function latch(t,weight=1){
 // Damped two-stage bolt engagement: pressure release, heavy contact, catch.
 // Short falling resonances deliberately replace the former bell-like notes.
 air(t,.12,520,180,.20*weight,-.12);
 tone(t,.23,112,49,.095*weight,'triangle',-.1);
 air(t+.095,.22,280,85,.20*weight,.1);
 tone(t+.09,.48,68,33,.12*weight,'sine',.08);
 tone(t+.12,.27,145,74,.027*weight,'triangle',.05);
}
function stop(){if(!ctx)return;for(const n of active){try{n.stop(ctx.currentTime+.12);}catch{}}active.clear();if(bed){for(const n of bed){try{n.stop(ctx.currentTime+.12);}catch{}}bed=null;}if(bus){bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.setTargetAtTime(0,ctx.currentTime,.025);const old=bus;setTimeout(()=>old.disconnect(),180);bus=ctx.createGain();bus.connect(master);} }
function idle(level=.016){if(bed)return;const p=profile(flightId),a=ctx.createOscillator(),b=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();a.frequency.value=58*p.pitch;b.frequency.value=116.4*p.pitch;lfo.frequency.value=p.pulse;lg.gain.value=level*.23;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.setTargetAtTime(level,ctx.currentTime,.7);lfo.connect(lg).connect(g.gain);a.connect(g);b.connect(g);g.connect(bus);[a,b,lfo].forEach(n=>n.start());bed=[a,b,lfo];}
function finalIgnition(t){
 const plan=finalActivation;status.textContent='FINAL CONVERGENCE · fünf Signale werden eins';
 for(const [i,voice] of plan.voices.entries()){
  const o=ctx.createOscillator(),g=ctx.createGain(),begin=t+i*.12;
  o.type=i===0?'triangle':'sine';o.frequency.setValueAtTime(voice.from,begin);
  o.frequency.exponentialRampToValueAtTime(voice.to,t+plan.resolveAt);
  g.gain.setValueAtTime(0,begin);g.gain.linearRampToValueAtTime(.008,begin+.6);
  g.gain.exponentialRampToValueAtTime(i===0?.14:.075,t+plan.resolveAt);
  g.gain.setValueAtTime(i===0?.14:.075,t+plan.burstAt);
  g.gain.exponentialRampToValueAtTime(.0001,t+7.8);
  const pan=output(g,voice.pan,.3);pan.pan.setValueAtTime(voice.pan,begin);pan.pan.linearRampToValueAtTime(voice.pan*.18,t+plan.resolveAt);
  o.connect(g);o.start(begin);track(o,[g,pan],t+8);
 }
 // Pressure builds under the converging resonators, then a broad spectral
 // bloom accompanies the visible field. No sharp gunshot/explosion sample.
 air(t+.25,5.2,70,800,.38,-.55);air(t+1,4.7,110,1050,.30,.55);
 tone(t+.3,5.8,29,39,.20);tone(t+.5,5.5,58,78,.12,'triangle');
 tone(t+3.8,3.5,45,29,.28);tone(t+3.8,3.2,90,58,.13);
 air(t+3.8,2.7,850,145,.39);
 for(let i=0;i<7;i++){const at=t+2.5+i*.36;air(at,.45,240+i*25,90,.10,Math.sin(i*1.4)*.7);}
 tone(t+plan.burstAt,2.7,72,30,.30);
 tone(t+plan.burstAt,2.5,144,60,.12,'triangle');
 air(t+plan.burstAt,2.3,720,110,.33);
 latch(t+6.2,1.7);
}
function startup(delay=0){stop();status.textContent=profile(reactorId).name+' · Kern fährt hoch';const t=ctx.currentTime+delay,k=profile(reactorId).pitch;
 if(reactorId===6){finalIgnition(t);return;}
 // Smooth ignition: low fundamentals, an ascending turbine and staggered coils.
 tone(t,7.2,25*k,48*k,.22);tone(t+.3,6.6,50*k,96*k,.10,'triangle');air(t+.2,6.9,110*k,680*k,.23);
 for(let i=0;i<5;i++){const at=t+2.8+i*.55;tone(at,1.65,(118+i*21)*k,(180+i*28)*k,.045,'sine',(i%2?1:-1)*.45);air(at,1,450*k,1400*k,.075,(i%2?1:-1)*.5);}
 latch(t+6.45);
}
function approach(){stop();status.textContent=profile(flightId).name+' · Einzug in den Kern';const t=ctx.currentTime,k=profile(flightId).pitch;tone(t,3.7,40*k,76*k,.19);air(t,3.65,120*k,800*k,.29);tone(t+.8,2.8,80*k,152*k,.07,'triangle');}
function tunnel(){stop();const theme=profile(flightId),k=theme.pitch;status.textContent=theme.name+' · Tunnel';const t=ctx.currentTime;air(t,4.6,200*k,1100*k,.43);tone(t,4.5,43*k,68*k,.20);tone(t,4.5,86*k,136*k,.075,'triangle');
 for(const event of tunnelPulses(flightId)){const at=t+event.time,p=air(at,event.duration,event.frequency,1750*k,event.gain,event.pan);p.pan.setValueAtTime(event.pan,at);p.pan.linearRampToValueAtTime(event.endPan,at+event.duration);tone(at,.22,event.tone,event.tone*.64,.016,'sine',event.pan*.8);
 if(theme.kind==='chain')tone(at+.11,.17,event.tone*.5,event.tone*.49,.02,'triangle',-event.pan);
 if(theme.kind==='network')tone(at+.08,.4,event.tone*1.5,event.tone*1.2,.012,'sine',-event.pan);
 if(theme.kind==='prism')tone(at+.12,.65,event.tone*2,event.tone*1.5,.008,'sine',-event.pan);
 }}
function arrival(){stop();status.textContent=profile(flightId).name+' · Ankunft';const t=ctx.currentTime,k=profile(flightId).pitch;air(t,1.5,650*k,150*k,.2);tone(t,1.8,76*k,38*k,.15);latch(t+.12,flightId===6?1.35:.7);idle(.016);}
function transfer(id){const t=ctx.currentTime+.12*id,k=profile(id).pitch,pan=Math.sin(id*Math.PI*.4)*.7;const p=air(t,1.35,190*k,850*k,.26,pan);p.pan.setValueAtTime(pan,t);p.pan.linearRampToValueAtTime(0,t+1.35);tone(t,1.4,65*k,110*k,.11,'triangle',pan);latch(t+1.35,.75);if(id>1)latch(t+2.45,.5);}
function configureAudio(context){
 ctx=context;master=ctx.createGain();master.gain.value=Number(vol.value)/100;
 const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=150;bass.gain.value=4.5;
 const warmth=ctx.createBiquadFilter();warmth.type='lowpass';warmth.frequency.value=1350;warmth.Q.value=.6;
 limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.25;
 const ceiling=ctx.createWaveShaper(),curve=new Float32Array(4096);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.98*Math.tanh(x);}ceiling.curve=curve;ceiling.oversample='2x';
 master.connect(bass).connect(warmth).connect(limiter).connect(ceiling).connect(ctx.destination);
 bus=ctx.createGain();bus.connect(master);convolver=ctx.createConvolver();const ir=ctx.createBuffer(2,ctx.sampleRate*1.3,ctx.sampleRate);for(let c=0;c<2;c++){const a=ir.getChannelData(c);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/ctx.sampleRate*6)*.22;}convolver.buffer=ir;convolver.connect(master);
}

 return {
  async enable(value=true){if(disposed)return false;enabled=value;if(!value){stop();await ctx?.suspend();return false;}try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;configureAudio(new C());}await ctx.resume();return ctx.state==='running';}catch{enabled=false;return false;}},
  volume(value){vol.value=Math.max(0,Math.min(100,Number(value)||0));if(master)master.gain.setTargetAtTime(vol.value/100,ctx.currentTime,.04);},
  running(value){if(!ctx||!enabled||disposed)return;try{if(value){void ctx.resume().catch(()=>{});}else{void ctx.suspend().catch(()=>{});}}catch{}},
  event(type,id){if(!ctx||!enabled||disposed)return;try{reactorId=id;flightId=id;if(type==='startup')startup();else if(type==='transfer')transfer(id);else if(type==='approach')approach();else if(type==='tunnel')tunnel();else if(type==='arrival')arrival();else if(type==='case')idle(.012);else if(type==='overview')stop();}catch{/* Audio must never block a case or animation. */}},
  dispose(){if(disposed)return;disposed=true;stop();void ctx?.close().catch(()=>{});}
 };
}
