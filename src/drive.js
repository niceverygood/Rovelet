const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
export function createDrive(heading=0){return {heading,speed:0,steering:0,distance:0,acceleration:0,yawRate:0};}
// +Z is the canonical vehicle nose. Positive steering means the driver's right.
export function stepDrive(state,input,dt){
 const stage=clamp(input.stage??1,1,3),mass=1+(stage-1)*.32;
 const throttle=clamp(input.throttle??0,-1,1),steer=clamp(input.steer??0,-1,1);
 const boosted=!!input.boost&&throttle>0;
 const maxSpeed=(4.2-(stage-1)*.22+(input.bonus??0))*(boosted?1.85:1)*(input.speedScale??1);
 const maxReverse=1.7/mass*(input.speedScale??1);
 const grip=clamp(input.grip??1,.3,1),oldSpeed=state.speed;
 let speed=oldSpeed;
 if(throttle!==0){
  const braking=speed*throttle<-.02;
  const force=(braking?6.5*grip:2.9*(boosted?2.2:1)*Math.max(.3,Math.abs(throttle)))/mass;
  speed=approach(speed,(throttle>0?maxSpeed:-maxReverse)*Math.abs(throttle),force*dt);
 }else speed=approach(speed,0,(1.3/mass+Math.abs(speed)*.18)*dt*grip);
 // Boost expiry lowers the target speed, not the current speed: decelerate smoothly.
 speed=clamp(speed,-maxReverse,(4.2-(stage-1)*.22+(input.bonus??0))*1.85);
 const steering=approach(state.steering,steer*.52*grip,dt*1.55);
 const wheelbase=1.8+(stage-1)*.55;
 const effectiveSteering=steering/(1+speed*speed*.018);
 // Optional hard-contact assist changes only the speed used for yaw.
 const contactSpeed=input.contactTurnSpeed;
 const yawSpeed=Number.isFinite(contactSpeed)&&contactSpeed>0&&throttle!==0&&steer!==0&&oldSpeed*throttle>=0&&speed*throttle>=0&&(input.speedScale??1)>0?Math.sign(throttle)*Math.max(Math.abs(speed),contactSpeed):speed;
 const yawRate=-yawSpeed/wheelbase*Math.tan(effectiveSteering);
 const heading=state.heading+yawRate*dt;
 const midpoint=state.heading+yawRate*dt*.5;
 const travel=(oldSpeed+speed)*.5*dt;
 return {heading,speed,steering,yawRate,acceleration:(speed-oldSpeed)/Math.max(dt,.0001),distance:state.distance+Math.abs(travel),dx:Math.sin(midpoint)*travel,dz:Math.cos(midpoint)*travel};
}
