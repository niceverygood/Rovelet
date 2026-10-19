import {RUNTIME_LIMITS} from './runtime-limits.js';
import {IMPACT_ENVELOPES,PRIMARY_EXPLOSION_PROFILES,sampleImpactEnvelope,sampleImpactGround} from './impact-envelope.js';
import * as THREE from 'three';
const flashColor=new THREE.Color(0xffe8bd);
export function springStep(position,velocity,dt,stiffness=130,damping=17){let t=dt;while(t>0){const h=Math.min(t,1/120);velocity+=(-stiffness*position-damping*velocity)*h;position+=velocity*h;t-=h;}return {position,velocity};}
export class CombatFeedback{
 constructor(world){this.world=world;this.particles=[];this.bodies=new Set();this.retirements=new Map();this.retirementHandled=new WeakSet();this.shake=0;this.clock=0;this.textures=new Map();this.numberGroups=new Map();this.numberOwners=new WeakMap();this.numberLayerHidden=new Set();this.stats={shots:0,hits:0,playerHits:0};}
 impulse(root,direction,strength=1,kind='hit',reduced=false){
  if(!root?.visualRig)return;
  let state=root.feedbackState;
  if(!state){state={x:0,y:0,z:0,vx:0,vy:0,vz:0,roll:0,vr:0,pitch:0,vp:0,flash:0,shells:[]};root.feedbackState=state;this.bodies.add(root);}
  if(kind!=='shot'){state.flash=Math.max(state.flash,.11);state.flashMaterials??=[];state.flashSet??=new Set();const clones=new Map();const flashMaterial=material=>{if(!material.isMeshStandardMaterial||state.flashSet.has(material))return material;if(clones.has(material))return clones.get(material);const copy=material.clone();copy.userData.sharedAsset=false;clones.set(material,copy);state.flashSet.add(copy);state.flashMaterials.push({material:copy,emissive:copy.emissive.clone(),intensity:copy.emissiveIntensity});return copy;};root.visualRig.traverse(node=>{if(node.isMesh)node.material=Array.isArray(node.material)?node.material.map(flashMaterial):flashMaterial(node.material);});}
  if(reduced)return;
  const local=direction.clone().setY(0).normalize().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert());const force=(kind==='shot'?.55:1.7)*strength;
  state.vx=THREE.MathUtils.clamp(state.vx+local.x*force,-3,3);state.vz=THREE.MathUtils.clamp(state.vz+local.z*force,-3,3);state.vy=Math.min(1.2,state.vy+(kind==='shot'?.12:.48)*strength);state.vr=THREE.MathUtils.clamp(state.vr-local.x*.9*strength,-1.5,1.5);state.vp=THREE.MathUtils.clamp(state.vp+local.z*.65*strength,-1.5,1.5);
 }
 // Dead actors leave simulation immediately; this bounded queue owns only visuals.
 ownsRetired(root){return !!root&&this.retirementHandled.has(root);}
 retire(root,direction,{boss=false,reduced=false}={}){
  if(!root?.visualRig||!this.world.effects?.attach)return false;
  if(this.retirementHandled.has(root))return true;
  this.retirementHandled.add(root);this.bodies.delete(root);
  const rig=root.visualRig;
  if(reduced||this.retirements.size>=4){this.restoreRetirementFlash(root);this.world.remove(root);return true;}
  const local=new THREE.Vector3();
  if(direction?.isVector3&&[direction.x,direction.y,direction.z].every(Number.isFinite))local.copy(direction).setY(0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert()).setY(0).normalize();
  // Current actor/effect hosts are identity groups. attach also preserves world pose
  // for the tested translated/rotated/uniformly-scaled host control.
  this.world.effects.attach(root);
  this.retirements.set(root,{root,rig,rootPosition:root.position.clone(),elapsed:0,duration:boss?.40:.28,tilt:boss?.12:.18,position:rig.position.clone(),quaternion:rig.quaternion.clone(),scale:rig.scale.clone(),direction:local,lean:new THREE.Quaternion(),euler:new THREE.Euler(0,0,0,'XYZ')});
  return true;
 }
 restoreRetirementFlash(root){const state=root.feedbackState;if(!state)return;state.flash=0;for(const entry of state.flashMaterials??[]){entry.material.emissive.copy(entry.emissive);entry.material.emissiveIntensity=entry.intensity;}}
 finishRetirement(root){if(!this.retirements.delete(root))return;this.restoreRetirementFlash(root);if(root.parent===this.world.effects)this.world.remove(root);}
 updateRetirements(dt,reduced){
  const elapsed=Number.isFinite(dt)&&dt>0?dt:0;
  for(const [root,record]of this.retirements){
   if(root.parent!==this.world.effects){this.retirements.delete(root);this.restoreRetirementFlash(root);continue;}
   // Existing hit callers can push/pull an hp0 root after handoff. Keep only
   // this cosmetic root at its handoff position before each rendered frame.
   root.position.copy(record.rootPosition);
   if(reduced){this.finishRetirement(root);continue;}
   record.elapsed+=elapsed;
   if(record.elapsed>=record.duration-1e-12){this.finishRetirement(root);continue;}
   const progress=record.elapsed/record.duration,pulse=Math.sin(Math.PI*progress),collapse=THREE.MathUtils.smoothstep(progress,.4,1),tilt=record.tilt*pulse;
   record.rig.position.copy(record.position).addScaledVector(record.direction,.12*pulse);record.rig.position.y+=.06*pulse-.16*collapse;
   record.lean.setFromEuler(record.euler.set(record.direction.z*tilt,0,-record.direction.x*tilt));record.rig.quaternion.copy(record.lean).multiply(record.quaternion);
   record.rig.scale.copy(record.scale).multiplyScalar(1-.96*collapse);
   const state=root.feedbackState;if(state){state.flash=Math.max(0,state.flash-elapsed);for(const entry of state.flashMaterials??[]){entry.material.emissive.copy(entry.emissive).lerp(flashColor,state.flash/.11*.65);entry.material.emissiveIntensity=state.flash>0?Math.max(entry.intensity,.9):entry.intensity;}}
  }
 }
 clearNumberLayer(){
  try{this.numberPresenterClear?.();}catch{}
  for(const p of this.numberLayerHidden)if(p.mesh.parent===this.world.effects&&p.mesh.visible===false)p.mesh.visible=true;
  this.numberLayerHidden.clear();
 }
 presentNumberLayer(camera){
  let drawn;try{drawn=this.numberPresenter?.(this.particles,camera,this.numberLayerHidden);}catch{}
  if(!Array.isArray(drawn)){this.clearNumberLayer();return;}
  for(const p of this.numberLayerHidden)if(!drawn.includes(p)||p.mesh.parent!==this.world.effects){if(p.mesh.parent===this.world.effects&&p.mesh.visible===false)p.mesh.visible=true;this.numberLayerHidden.delete(p);}
  for(const p of drawn)if(p.damageActorId&&p.life>0&&p.mesh.parent===this.world.effects&&(p.mesh.visible||this.numberLayerHidden.has(p))){p.mesh.visible=false;this.numberLayerHidden.add(p);}
 }
 cameraKick(amount,reduced=false){if(!reduced)this.shake=Math.min(.22,this.shake+amount);}
 add(mesh,velocity,life,type='chip',gravity=7){if(this.particles.length>=RUNTIME_LIMITS.particles){this.world.remove(mesh);return null;}const unique=new Set();mesh.traverse(o=>{if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material])unique.add(material);});const materials=[...unique].map(material=>{const opacity=material.opacity;material.transparent=true;material.depthWrite=false;return [material,opacity];});this.world.effects.add(mesh);const particle={mesh,velocity,life,max:life,type,gravity,materials};this.particles.push(particle);return particle;}
 updateEnvelope(particle,dt,camera){const envelope=particle.envelope;envelope.elapsed+=dt;const state=sampleImpactEnvelope(envelope.kind,envelope.elapsed/(envelope.timeScale??1),envelope.strength);particle.life=Math.max(0,particle.max-envelope.elapsed);particle.mesh.scale.setScalar(state.scale);if(!IMPACT_ENVELOPES[envelope.kind].ground)particle.mesh.quaternion.copy(camera.quaternion);for(const [material]of particle.materials)material.opacity=state.opacity*(envelope.opacityScale??1);return state.done;}
 impactEnvelope(position,strength,options){
  if(!this.world.particle)return;
  const timeScale=options?.timeScale??1,opacityScale=options?.opacityScale??1,groundScale=options?.groundScale??1;if(!Number.isFinite(timeScale)||timeScale<=0||!Number.isFinite(opacityScale)||opacityScale<0||opacityScale>1||!Number.isFinite(groundScale)||groundScale<=0)throw new RangeError('Impact envelope options must be finite and bounded.');
  for(const [kind,definition]of Object.entries(IMPACT_ENVELOPES)){
   if(definition.ground&&options?.ground===false)continue;
   // Admit the original ring/sparks/fragments first; these optional layers
   // never displace an existing effect or allocate at the global cap.
   if(this.particles.length>=RUNTIME_LIMITS.particles)break;
   const mesh=this.world.particle(kind,definition.color);mesh.position.copy(position);
   if(definition.ground){const frame=sampleImpactGround(this.world.heightAt?(x,z)=>this.world.heightAt(x,z):null,position.x,position.z);mesh.position.y=frame.height+.035;mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...frame.normal));}
   const particle=this.add(mesh,new THREE.Vector3(),definition.duration*timeScale,kind,0);if(!particle)continue;particle.envelope=options?{kind,elapsed:0,strength:definition.ground?strength*groundScale:strength,timeScale,opacityScale}:{kind,elapsed:0,strength};if(options?.explosionKey)particle.explosionKey=options.explosionKey;this.updateEnvelope(particle,0,this.world.camera);
  }
 }
 explosionBurst(position,key,direction){
  const profile=Object.hasOwn(PRIMARY_EXPLOSION_PROFILES,key)?PRIMARY_EXPLOSION_PROFILES[key]:null;
  if(!profile||!position?.isVector3||![position.x,position.y,position.z].every(Number.isFinite))return;
  const incoming=direction?.isVector3&&[direction.x,direction.y,direction.z].every(Number.isFinite)&&direction.lengthSq()>1e-12?direction.clone().normalize():new THREE.Vector3(0,-1,0);
  for(let i=0;i<profile.count;i++){
   if(this.particles.length>=RUNTIME_LIMITS.particles)break;
   const mesh=this.world.fragment?.();if(!mesh)continue;
   // Index/key motion is deterministic. Cold Three UUID allocation is separate.
   const fraction=(i+.5)/profile.count,angle=i*2.399963229728653+key.length*.37,speed=THREE.MathUtils.lerp(profile.horizontalMin,profile.horizontalMax,fraction),up=THREE.MathUtils.lerp(profile.upMax,profile.upMin,((i*5)%profile.count+.5)/profile.count),life=THREE.MathUtils.lerp(profile.lifeMax,profile.lifeMin,fraction);
   mesh.position.copy(position);mesh.rotation.set(angle,.7+i*.31,angle*.6);
   const velocity=new THREE.Vector3(Math.cos(angle)*speed,up,Math.sin(angle)*speed).addScaledVector(incoming,-profile.backBias),particle=this.add(mesh,velocity,life,'chip',profile.gravity);if(particle)particle.explosionKey=key;
  }
  this.impactEnvelope(position,profile.scale,{timeScale:profile.timeScale,opacityScale:profile.opacityScale,ground:profile.ground,groundScale:profile.groundScale,explosionKey:key});
 }
 ring(position,color=0xffdd86,scale=1){const mesh=this.world.particle?this.world.particle('ring',color):new THREE.Mesh(new THREE.RingGeometry(.12,.18,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));mesh.material.opacity=.9;mesh.position.copy(position);mesh.quaternion.copy(this.world.camera.quaternion);mesh.scale.setScalar(scale);this.add(mesh,new THREE.Vector3(),.24,'ring',0);return mesh;}
 impact(position,direction,{strength=1,shield=false,reduced=false,physicalShard=false,fragmentDirection}={}){
  this.stats.hits++;this.ring(position,shield?0xa3e5ff:0xffe29c,strength);
  const count=reduced?4:Math.round(9+strength*4),physical=physicalShard&&!shield&&!reduced;
  for(let i=0;i<count;i++){const spark=i<5,color=shield?0x9fddff:spark?[0xfff1b0,0xffc74e,0xffe188][i%3]:[0xd3c8a5,0x9c6a41,0xeadab5][i%3];const fragment=!spark&&physical?this.world.fragment?.():null;const mesh=fragment??(this.world.particle?this.world.particle(spark?'spark':'chip',color):new THREE.Mesh(spark?new THREE.BoxGeometry(.035,.16,.035):new THREE.BoxGeometry(.07,.07,.11),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1})));mesh.position.copy(position);const velocity=new THREE.Vector3((Math.random()-.5)*3,.8+Math.random()*2,(Math.random()-.5)*3).addScaledVector(fragment?(fragmentDirection??direction):direction,-.7).multiplyScalar(strength);mesh.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);if(spark&&physical)mesh.scale.y=1.7;this.add(mesh,velocity,spark?.20+Math.random()*.14:.48+Math.random()*.2,spark?'spark':'chip',spark?2:8);}
  if(physical)this.impactEnvelope(position,strength);
  this.world.puff(position,shield?0xc6efff:0xe6d6b8,reduced?1:3);
 }
 shot(position,direction,root,{enemy=false,reduced=false,distance=0}={}){this.stats.shots++;this.impulse(root,direction.clone().negate(),enemy?.75:1,'shot',reduced);this.ring(position,0xffdf8d,.55);const attenuation=enemy?1/(1+distance*.15):1;this.cameraKick((enemy?.022:.04)*attenuation,reduced);}
 // The admitted particle lifetime owns its lane, never the actor/model.
 // Logical renderer size is CSS pixels; drawing-buffer DPR does not set glyph size.
 damageNumberScale(particle,camera){
  const renderer=this.world.renderer;if(!camera.isOrthographicCamera||typeof renderer?.getSize!=='function')return 1;
  const size=new THREE.Vector2();try{renderer.getSize(size);}catch{return 1;}
  if(!Number.isFinite(size.x)||!Number.isFinite(size.y)||size.x<=size.y||size.y<=0)return 1;
  const matrix=camera.projectionMatrix.elements,halfWidth=particle.mesh.scale.x*Math.abs(matrix[0])/2,halfHeight=particle.mesh.scale.y*Math.abs(matrix[5])/2,cssHeight=halfHeight*size.y;
  if(!Number.isFinite(cssHeight)||cssHeight<=0||halfWidth<=0)return 1;
  const target=Math.min(1.9,Math.max(1,20/cssHeight));if(target===1)return 1;
  const center=particle.mesh.position.clone().project(camera);if(![center.x,center.y,center.z].every(Number.isFinite)||center.z<-1||center.z>1)return 1;
  const fit=Math.min((1-Math.abs(center.x))/halfWidth,(1-Math.abs(center.y))/halfHeight);
  return Math.max(1,Math.min(target,fit<target?fit*(1-1e-9):fit));
 }
 forgetDamageNumber(particle){const owner=this.numberOwners.get(particle);if(!owner)return;particle.mesh.removeEventListener('removed',owner.removed);owner.group.entries.delete(particle);this.numberOwners.delete(particle);if(!owner.group.entries.size&&this.numberGroups.get(owner.id)===owner.group)this.numberGroups.delete(owner.id);}
 layoutDamageNumber(particle,position,actorId){
  if(!particle||typeof actorId!=='string'||!actorId.trim()||actorId.length>128||![position.x,position.y,position.z].every(Number.isFinite))return;
  const columnStep=1.35,rowStep=.78,camera=this.world.camera;if(!camera?.isCamera||![...camera.quaternion.toArray(),...camera.matrixWorldInverse.elements,...camera.projectionMatrix.elements].every(Number.isFinite))return;
  const sizeFactor=this.damageNumberScale(particle,camera);if(sizeFactor>1){particle.mesh.scale.x*=sizeFactor;particle.mesh.scale.y*=sizeFactor;}
  const screen=position.clone().project(camera);if(![screen.x,screen.y,screen.z].every(Number.isFinite)||screen.z<-1||screen.z>1)return;
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),bounds=(center,scale=particle.mesh.scale)=>{const points=[];for(const dx of[-scale.x/2,scale.x/2])for(const dy of[-scale.y/2,scale.y/2])points.push(center.clone().addScaledVector(right,dx).addScaledVector(up,dy).project(camera));return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};};
  let group=this.numberGroups.get(actorId);if(group)for(const p of [...group.entries.keys()])if(p.life<=0||p.mesh.parent!==this.world.effects)this.forgetDamageNumber(p);
  group=this.numberGroups.get(actorId);if(group&&group.anchor.distanceToSquared(position)>2.5**2)group=null;
  if(!group){const base=bounds(particle.mesh.position);if(base.left<-1||base.right>1||base.bottom<-1||base.top>1)return;let side=screen.x<0?-1:1,row=-1;const column=bounds(particle.mesh.position.clone().addScaledVector(right,side*columnStep*sizeFactor)),rows=bounds(particle.mesh.position.clone().addScaledVector(up,-2*rowStep*sizeFactor));if(column.left<-1||column.right>1)side*=-1;if(rows.bottom<-1||rows.top>1)row=1;group={anchor:position.clone(),side,row,entries:new Map()};}
  // Free slots can be crossed by later-born labels still rising from a lower
  // row. Test only the bounded active quads, without moving an earlier label.
  const used=new Set(group.entries.values()),active=[...group.entries.keys()].map(p=>bounds(p.mesh.position,p.mesh.scale));let lane=0,candidate;
  for(;lane<6;lane++){if(used.has(lane))continue;candidate=particle.mesh.position.clone().addScaledVector(right,(lane%2)*columnStep*sizeFactor*group.side).addScaledVector(up,Math.floor(lane/2)*rowStep*sizeFactor*group.row);const rect=bounds(candidate);if(rect.left<-1||rect.right>1||rect.bottom<-1||rect.top>1)continue;if(!active.some(other=>Math.min(rect.right,other.right)>Math.max(rect.left,other.left)&&Math.min(rect.top,other.top)>Math.max(rect.bottom,other.bottom)))break;}
  if(lane>=6)return;
  // Slot0 remains byte-for-byte the original position/velocity/life/flags.
  if(lane)particle.mesh.position.copy(candidate);
  this.numberGroups.set(actorId,group);group.entries.set(particle,lane);const removed=()=>this.forgetDamageNumber(particle);this.numberOwners.set(particle,{id:actorId,group,lane,removed});particle.mesh.addEventListener('removed',removed);
 }
 damageNumber(position,value,player=false,options){const key=(player?'-':'')+Math.ceil(value);let texture=this.textures.get(key);if(!texture){const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const c=canvas.getContext('2d');c.font='900 48px Arial';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=8;c.strokeStyle=player?'#703c2b':'#775529';c.strokeText(key,80,42);c.fillStyle=player?'#ffb19a':'#fff0a3';c.fillText(key,80,42);texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;if(this.textures.size<64)this.textures.set(key,texture);else{texture.dispose();return;}}
  const mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));mesh.position.copy(position).add(new THREE.Vector3(0,.45,0));mesh.scale.set(1.15,.575,1);const particle=this.add(mesh,new THREE.Vector3((Math.random()-.5)*.25,1.4,0),.75,'number',0);if(!player){const id=options?.actorId;if(particle&&typeof id==='string'&&id.trim()&&id.length<=128)particle.damageActorId=id;this.layoutDamageNumber(particle,position,id);}
 }
 update(dt,camera,reduced=false){this.clock+=dt;this.updateRetirements(dt,reduced);
  for(const root of this.bodies){if(!root.parent){for(const shell of root.feedbackState.shells)shell.material.dispose();this.bodies.delete(root);continue;}const s=root.feedbackState;
   for(const [p,v]of[['x','vx'],['y','vy'],['z','vz'],['roll','vr'],['pitch','vp']]){const next=springStep(s[p],s[v],dt);s[p]=reduced?0:next.position;s[v]=reduced?0:next.velocity;}
   root.visualRig.position.set(s.x,s.y,s.z);root.visualRig.rotation.set(s.pitch,0,s.roll);s.flash=Math.max(0,s.flash-dt);for(const entry of s.flashMaterials??[]){entry.material.emissive.copy(entry.emissive).lerp(flashColor,s.flash/.11*.65);entry.material.emissiveIntensity=s.flash>0?Math.max(entry.intensity,.9):entry.intensity;}
  }
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];if(p.envelope){if(this.updateEnvelope(p,dt,camera)){this.world.remove(p.mesh);this.particles.splice(i,1);}continue;}p.life-=dt;p.velocity.y-=p.gravity*dt;p.mesh.position.addScaledVector(p.velocity,dt);if(p.type==='chip'){p.mesh.rotation.x+=dt*9;p.mesh.rotation.z+=dt*6;const floor=(this.world.heightAt?.(p.mesh.position.x,p.mesh.position.z)??0)+.06;if(p.mesh.position.y<floor){p.mesh.position.y=floor;p.velocity.y=Math.abs(p.velocity.y)*.35;p.velocity.x*=.6;p.velocity.z*=.6;}}else if(p.type==='spark')p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p.velocity.clone().normalize());else if(p.type==='ring'){p.mesh.scale.multiplyScalar(1+dt*8);p.mesh.quaternion.copy(camera.quaternion);}const fade=Math.min(1,Math.max(0,p.life/(p.type==='number'?.22:p.max)));for(const [material,opacity]of p.materials)material.opacity=fade*opacity;if(p.life<=0){if(p.type!=='number'||p.mesh.parent)this.world.remove(p.mesh);this.forgetDamageNumber(p);this.particles.splice(i,1);}}
  if(reduced)this.shake=0;else{this.shake*=Math.exp(-dt*16);const amount=this.shake;camera.position.x+=Math.sin(this.clock*101)*amount;camera.position.y+=Math.sin(this.clock*79+1)*amount*.5;camera.position.z+=Math.cos(this.clock*113)*amount;}
  this.presentNumberLayer(camera);
 }
 reset(){this.clearNumberLayer();for(const root of this.retirements.keys())this.finishRetirement(root);for(const p of this.particles){if(p.type!=='number'||p.mesh.parent)this.world.remove(p.mesh);this.forgetDamageNumber(p);}this.particles=[];this.numberGroups.clear();this.numberOwners=new WeakMap();for(const root of this.bodies)for(const shell of root.feedbackState.shells)shell.material.dispose();this.bodies.clear();this.shake=0;}
}




