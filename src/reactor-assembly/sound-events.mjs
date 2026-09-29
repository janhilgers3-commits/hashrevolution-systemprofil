// Observe visual lifecycle only. Never derive or mutate game permissions.
export function createSoundEvents(emit){
 const boots=new Set(),charges=new Set();let audit=false;
 return frame=>{
  for(const b of frame.boots){
   if(!b){continue;}if(b.age<.5&&!boots.has(b.index)){boots.add(b.index);emit('startup',b.index+1);}
   if(b.age>=.5)boots.add(b.index);
  }
  for(const b of frame.branches){
   if(!b.enabled){charges.delete(b.id);continue;}
   if(!charges.has(b.id)){charges.add(b.id);if(b.progress<1)emit('transfer',b.id);}
  }
  if(!frame.auditEligible)audit=false;
  if(frame.unlocked&&!audit){audit=true;if(frame.ignitionAge<.5)emit('startup',6);}
 };
}
