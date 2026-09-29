const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
export const flightTiming={aligned:1.7,entry:3.6,tunnelEnd:7.6,end:8.6};
export function tunnelTravel(age){
 const t=clamp((age-flightTiming.entry)/(flightTiming.tunnelEnd-flightTiming.entry));
 return {progress:t,distance:82*(.55*t+.45*ease(t)),cover:ease((age-(flightTiming.tunnelEnd-.6))/.6)};
}

// First rotate into a true overhead view; only then descend on the core axis.
// A fixed roll and azimuth keep the start free of left/right camera wobble.
export function approachPose(age,origin,core,originFov){
 const initialTarget={x:0,y:0,z:1.1};
 const dy=origin.y-initialTarget.y,dz=origin.z-initialTarget.z;
 const radius=Math.hypot(dy,dz),angle=Math.atan2(dz,dy);
 if(age<=flightTiming.aligned){
  const t=ease(age/flightTiming.aligned),a=angle*(1-t),r=radius+(9-radius)*t;
  const target={x:core.x*t,y:(core.y+.65)*t,z:initialTarget.z+(core.z-initialTarget.z)*t};
  return {x:target.x,y:target.y+Math.cos(a)*r,z:target.z+Math.sin(a)*r,pitch:a-Math.PI/2,fov:originFov+(48-originFov)*t,phase:'approach'};
 }
 const t=ease((age-flightTiming.aligned)/(flightTiming.entry-flightTiming.aligned));
 return {x:core.x,y:core.y+9.65+(0.05-9.65)*t,z:core.z,pitch:-Math.PI/2,fov:48,phase:'descent'};
}

// Expand the viewport by projection and clipping, not by reallocating the
// renderer and every bloom buffer on each CSS layout-animation frame.
export function viewportPose(age,rect,width,height){
 const t=ease(age/.9),left=rect.left*(1-t),top=rect.top*(1-t);
 const w=rect.width+(width-rect.width)*t,h=rect.height+(height-rect.height)*t;
 return {left,top,right:Math.max(0,width-left-w),bottom:Math.max(0,height-top-h),height:h,
  shiftX:2*(left+w/2)/width-1,shiftY:1-2*(top+h/2)/height};
}
