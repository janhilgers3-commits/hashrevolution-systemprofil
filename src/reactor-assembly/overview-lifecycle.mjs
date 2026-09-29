// Visual progress only. Neither cached values nor animation completion grant access.
export function createOverviewLifecycle(snapshot, restored) {
  const mask = value => Array.from({length:5},(_,i)=>value?.[i]===true);
  const valid = restored?.version===1;
  const booted=valid?mask(restored.booted):[false,false,false,false,false];
  const charged=valid?mask(restored.charged):mask(snapshot.charged);
  let audit=valid?restored.audit===true:Boolean(snapshot.auditEligible);
  const reconcile=next=>{
    next.reactors.slice(0,5).forEach((r,i)=>{if(r.visual==='locked')booted[i]=false;if(!next.charged[i])charged[i]=false;});
    if(!next.auditEligible)audit=false;
  };
  reconcile(snapshot);
  return {
    reconcile,
    needsBoot:(index,next)=>next.reactors[index].openable&&!booted[index],
    finishBoot:index=>{booted[index]=true;},
    seed:()=>({charged:[...charged],audit}),
    settle(next,power,auditReady){
      reconcile(next);
      power.branches.forEach((branch,i)=>{charged[i]=next.charged[i]&&branch.coilCharge===1;});
      audit=next.auditEligible&&auditReady;
    },
    save:()=>({version:1,booted:[...booted],charged:[...charged],audit})
  };
}
