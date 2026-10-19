const MENU_INTERVAL=1000/30;
const CLOCK_EPSILON=1e-7;

// Keep the complete world/UI tick together so projected health bars use the
// same camera and actor poses as the canvas. Only inactive visible screens wait.
export class FrameSchedule{
 constructor(now=0){this.mode=undefined;this.screen=undefined;this.hidden=false;this.reset(now);}
 reset(now){this.lastUpdate=now;this.deadline=now;this.forced=true;}
 invalidate(){this.forced=true;}
 step(now,{mode,screen,hidden=false}){
  if(hidden){this.reset(now);this.hidden=true;return null;}
  if(this.hidden||now<this.lastUpdate){this.reset(now);this.hidden=false;}
  const wasFullRate=this.mode==='lab'||this.mode==='run'&&!this.screen;
  const fullRate=mode==='lab'||mode==='run'&&!screen;
  // Time accumulated behind a menu belongs to that menu, not to newly resumed
  // combat or a new lab preview. Draw the new active scene with dt=0 first.
  if(fullRate&&!wasFullRate)this.lastUpdate=now;
  if(mode!==this.mode||screen!==this.screen){this.mode=mode;this.screen=screen;this.invalidate();}
  if(!fullRate&&!this.forced&&now+CLOCK_EPSILON<this.deadline)return null;
  const dt=Math.min(Math.max(0,now-this.lastUpdate)/1000,.05);
  this.lastUpdate=now;
  if(fullRate||this.forced)this.deadline=now+MENU_INTERVAL;
  else{
   // Carry the fractional deadline rather than restarting it at each RAF.
   // Skip missed deadlines after a stall; never replay a burst of old ticks.
   const periods=Math.max(0,Math.floor((now-this.deadline+CLOCK_EPSILON)/MENU_INTERVAL))+1;
   this.deadline+=periods*MENU_INTERVAL;
  }
  this.forced=false;
  return dt;
 }
}
