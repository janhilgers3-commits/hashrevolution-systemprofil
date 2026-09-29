// Remove complete, identified bridge components, never crop reactor triangles
// by a plane. Original geometry and the overview remain untouched.
export function bridgeFreeIndices(geometry,name){
 if(!['housing','steel','copper','seam'].includes(name))return null;
 const pos=geometry.attributes.position,idx=geometry.index,parent=Array.from({length:pos.count},(_,i)=>i),weld=new Map();
 const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));const join=(a,b)=>parent[find(a)]=find(b);
 for(let i=0;i<pos.count;i++){const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(n=>n.toFixed(5)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);}
 for(let i=0;i<idx.count;i+=3){join(idx.getX(i),idx.getX(i+1));join(idx.getX(i),idx.getX(i+2));}
 const bounds=new Map();for(let i=0;i<pos.count;i++){const key=find(i),b=bounds.get(key)||{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};[pos.getX(i),pos.getY(i),pos.getZ(i)].forEach((v,k)=>{b.min[k]=Math.min(b.min[k],v);b.max[k]=Math.max(b.max[k],v);});bounds.set(key,b);}
 const removed=new Set();for(const [key,{min,max}] of bounds){
  if(min[2]<1.27||min[0]<-.32||max[0]>.32)continue;
  const deck=name==='housing'&&((min[1]>.80&&max[1]<.985)||(min[2]>3.02&&max[1]>.93&&max[1]<.94));
  const rails=name==='steel'&&min[1]>.95&&max[1]<.99&&(min[0]>.20||max[0]<-.20);
  const wires=name==='copper'&&min[1]>.83&&max[1]<.87&&(min[0]>.28||max[0]<-.28);
  // The dark anti-slip insert is a separate material, above the deck. Leaving
  // it behind creates a floating black radial strip even after deck removal.
  const deckInsert=name==='seam'&&min[0]>-.17&&max[0]<.17&&min[1]>.93&&max[1]<.97&&min[2]>1.32&&max[2]>3.26;
  if(deck||rails||wires||deckInsert)removed.add(key);
 }
 if(!removed.size)return null;
 const kept=[];for(let i=0;i<idx.count;i+=3)if(!removed.has(find(idx.getX(i))))kept.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
 return {indices:kept,removedComponents:removed.size,removedTriangles:(idx.count-kept.length)/3};
}
