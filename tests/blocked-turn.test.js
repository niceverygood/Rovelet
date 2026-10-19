import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Portable blocked-contact steering tests; old Drive function is embedded.
const src=new URL('../src/',import.meta.url);
const candidate=name=>new URL(name,src);
const threeURL=new URL('../node_modules/three/build/three.module.js',src),THREE=await import(threeURL.href),asJS=t=>'data:text/javascript;base64,'+Buffer.from(t).toString('base64');
const balanceBytes=fs.readFileSync(candidate('balance.json')),balanceURL='data:application/json;base64,'+balanceBytes.toString('base64');
const driveURL=asJS(fs.readFileSync(candidate('drive.js'),'utf8')),{createDrive,stepDrive}=await import(driveURL);
const gameText=fs.readFileSync(candidate('game.js'),'utf8').replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>JSON.stringify(p==='./drive.js'?driveURL:p==='./balance.json'?balanceURL:new URL(p,src).href)).replace(/(['"])three\1/g,JSON.stringify(threeURL.href));
const {Game}=await import(asJS(gameText)),{World}=await import(new URL('world.js',src)),{freshSave,SAVE_KEY}=await import(new URL('data.js',src)),{terrainHeight}=await import(new URL('terrain-motion.js',src)),{updateWheels}=await import(new URL('wheels.js',src));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),approach=(v,t,a)=>v<t?Math.min(t,v+a):Math.max(t,v-a);
const originalStep=new Function('clamp','approach','return '+"function stepDrive(state,input,dt){\n const stage=clamp(input.stage??1,1,3),mass=1+(stage-1)*.32;\n const throttle=clamp(input.throttle??0,-1,1),steer=clamp(input.steer??0,-1,1);\n const boosted=!!input.boost&&throttle>0;\n const maxSpeed=(4.2-(stage-1)*.22+(input.bonus??0))*(boosted?1.85:1)*(input.speedScale??1);\n const maxReverse=1.7/mass*(input.speedScale??1);\n const grip=clamp(input.grip??1,.3,1),oldSpeed=state.speed;\n let speed=oldSpeed;\n if(throttle!==0){\n  const braking=speed*throttle<-.02;\n  const force=(braking?6.5*grip:2.9*(boosted?2.2:1)*Math.max(.3,Math.abs(throttle)))/mass;\n  speed=approach(speed,(throttle>0?maxSpeed:-maxReverse)*Math.abs(throttle),force*dt);\n }else speed=approach(speed,0,(1.3/mass+Math.abs(speed)*.18)*dt*grip);\n // Boost expiry lowers the target speed, not the current speed: decelerate smoothly.\n speed=clamp(speed,-maxReverse,(4.2-(stage-1)*.22+(input.bonus??0))*1.85);\n const steering=approach(state.steering,steer*.52*grip,dt*1.55);\n const wheelbase=1.8+(stage-1)*.55;\n const effectiveSteering=steering/(1+speed*speed*.018);\n const yawRate=-speed/wheelbase*Math.tan(effectiveSteering);\n const heading=state.heading+yawRate*dt;\n const midpoint=state.heading+yawRate*dt*.5;\n const travel=(oldSpeed+speed)*.5*dt;\n return {heading,speed,steering,yawRate,acceleration:(speed-oldSpeed)/Math.max(dt,.0001),distance:state.distance+Math.abs(travel),dx:Math.sin(midpoint)*travel,dz:Math.cos(midpoint)*travel};\n}")(clamp,approach);
const near=(a,b,label='',epsilon=1e-9)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=epsilon,`${label}: ${a} vs ${b}`);
function sourceAsset(){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()),yaw=new THREE.Group(),pitch=new THREE.Group(),slide=new THREE.Group(),muzzle=new THREE.Object3D();yaw.name='gun-yaw';yaw.userData={arc:Math.PI,recoil:0};pitch.name='gun-pitch';slide.name='gun-slide';muzzle.name='gun-muzzle';muzzle.position.set(-.6,0,0);root.add(mesh,yaw);yaw.add(pitch);pitch.add(slide);slide.add(muzzle);for(let i=0;i<4;i++){const pivot=new THREE.Group(),rotor=new THREE.Group();pivot.name='wheel-steer-'+i;rotor.name='wheel-roll';pivot.position.set(i%2?.4:-.4,.2,i<2?-.4:.4);pivot.userData={wheel:true,axis:'x',radius:.2,front:i>=2};pivot.add(rotor);root.add(pivot);}return root;}
function fixture(stage=1,obstacles=[{x:0,z:4,radius:.45}],grip=1){
 const descriptors=Object.fromEntries(['window','document','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),storage=new Map(),save=freshSave();save.settings.sound=false;storage.set(SAVE_KEY,JSON.stringify(save));
 globalThis.window={addEventListener(){}};globalThis.document={documentElement:{lang:'ko'},title:'',hidden:false,addEventListener(){}};globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const source=sourceAsset(),world={actors:new THREE.Group(),effects:new THREE.Group(),cameraTarget:new THREE.Vector3(),obstacles,regions:{surface:()=>({grip}),tintEnemy(){}},asset(id,height=1){const clone=source.clone(true);clone.scale.setScalar(height/2.6);return clone;},setHome(){},setRegion(){},updateBuildings(){},clearActors(){this.actors.clear();this.effects.clear();},disposeRuntime(){},heightAt:terrainHeight,puff(){},muzzleBlast(){},remove:o=>o.removeFromParent(),feedback:{stats:{playerHits:0},cameraKick(){},shot(){},impact(){},impulse(){},damageNumber(){}},update(dt,target,mode,reduced){for(const r of this.actors.children){World.prototype.poseContact.call(this,r,dt,mode,reduced);updateWheels(r,r.userData.drive?.steering??0);}}};
 for(const name of ['castle','enemy','boss','ring','resolveCollision'])world[name]=(...args)=>World.prototype[name].call(world,...args);
 const g=new Game(world);g.ui={renderScreen(){},toast(){},update(){},flash(){}};g.start();for(const e of g.enemies)world.remove(e.root);g.enemies=[];if(stage!==1){world.actors.remove(g.player.root);g.player={root:world.castle(stage),stage};g.run.stage=stage;g.rebuildAttachments();}
 g.player.root.position.set(0,0,0);g.player.root.rotation.y=0;g.run.spawnTimer=999;g.run.eliteTimer=999;g.run.midSpawned=true;g.run.midDefeated=true;g.run.bossSpawned=true;g.run.cooldowns={cannon:999};
 const profile=structuredClone(g.save),primary=storage.get(SAVE_KEY),radius=.35+stage*.18,trace=[];
 const step=(dt,keys=[])=>{g.keys=new Set(keys);const before={position:g.player.root.position.toArray(),drive:structuredClone(g.player.root.userData.drive??null)};g.update(dt);const r=g.player.root,d=r.userData.drive;for(const o of world.obstacles)assert.ok(Math.hypot(r.position.x-o.x,r.position.z-o.z)>=radius+o.radius-1e-8,'Static collider clearance is retained');assert.ok([r.position.x,r.position.z,d.speed,d.heading,d.yawRate].every(Number.isFinite));trace.push({before,position:r.position.toArray(),drive:structuredClone(d),blocked:r.userData.blockedTurn?.blocked===true,mix:r.userData.blockedTurn?.mix??0});return d;};
 const cleanup=()=>{assert.deepEqual(g.save,profile);assert.equal(storage.get(SAVE_KEY),primary);for(const [k,d]of Object.entries(descriptors)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}};
 return {g,world,storage,radius,trace,step,cleanup};
}
function use(stage,obstacles,fn,grip=1){const f=fixture(stage,obstacles,grip);try{return fn(f);}finally{f.cleanup();}}
function warmContact(f,fps){for(let n=0;n<fps*3;n++)f.step(1/fps,['KeyW']);assert.ok(Math.abs(f.g.player.root.position.z-(4-f.radius-.45))<.03,'Actual original resolver reaches front contact');return f.trace.at(-1);}

for(const stage of [1,2,3])test('actual Game and World hard-contact steer escape at stage'+stage+' across 30/60/144Hz',()=>{
 for(const fps of [30,60,144])for(const side of ['KeyA','KeyD'])use(stage,undefined,f=>{const touch=warmContact(f,fps);assert.equal(touch.blocked,true,'Actual static correction must create contact marker');assert.ok(Math.abs(touch.drive.speed)<.04);const start=f.g.player.root.position.clone();let escaped=false,maxYaw=0;for(let n=0;n<fps*8;n++){const d=f.step(1/fps,['KeyW',side]);maxYaw=Math.max(maxYaw,Math.abs(d.yawRate));const p=f.g.player.root.position;if(Math.hypot(p.x,p.z-4)>f.radius+.45+.25&&p.z>start.z+.5)escaped=true;}assert.ok(maxYaw>.08,'Rotation exceeds blocked restart crawl');assert.equal(escaped,true,'Provisional eight-second fixture escape');assert.equal(f.g.run.hp,220);assert.equal(f.g.run.kills,0);assert.equal(f.g.run.coins,0);});
});

test('no-option Drive remains exact over all normal stages/frame rates/braking/boost/grip inputs',()=>{
 for(const stage of [1,2,3])for(const fps of [30,60,144])for(const grip of [.45,1]){let s={...createDrive(.3),speed:.9,steering:-.2};for(let n=0;n<fps*2;n++){const input={stage,grip,throttle:n<fps?1:-1,steer:Math.sin(n*.08),boost:n<fps/3,speedScale:n%3?.6:1};const before=structuredClone(s),next=stepDrive(s,input,1/fps);assert.deepEqual(next,originalStep(s,input,1/fps));assert.deepEqual(s,before);s=next;}}
});

test('optional yaw speed changes no speed/acceleration/travel scalar and respects reverse/braking',()=>{
 for(const stage of [1,2,3])for(const throttle of [-1,1])for(const steer of [-1,1]){const s={...createDrive(.2),steering:steer*.4},input={stage,throttle,steer,contactTurnSpeed:1.5},next=stepDrive(s,input,1/60),old=originalStep(s,input,1/60);for(const k of ['speed','acceleration','distance','steering'])assert.equal(next[k],old[k],k);near(Math.hypot(next.dx,next.dz),Math.hypot(old.dx,old.dz),'Same physical travel');assert.ok(Math.abs(next.yawRate)>Math.abs(old.yawRate)*5);assert.equal(Math.sign(next.yawRate),-throttle*steer);}
 for(const speed of [.3,.05]){const s={...createDrive(),speed,steering:.3},input={throttle:-1,steer:1,contactTurnSpeed:1.5};assert.deepEqual(stepDrive(s,input,1/60),originalStep(s,input,1/60),'Opposite old velocity preserves braking through crossing frame');}
});

test('parked, no-throttle, no-steer, frozen-scale and invalid optional speed keep original Drive output',()=>{
 for(const input of [{throttle:0,steer:1,contactTurnSpeed:1.5},{throttle:1,steer:0,contactTurnSpeed:1.5},{throttle:1,steer:1,speedScale:0,contactTurnSpeed:1.5},...[0,-1,NaN,Infinity,undefined].map(contactTurnSpeed=>({throttle:1,steer:1,contactTurnSpeed}))]){const s=createDrive();assert.deepEqual(stepDrive(s,input,1/60),originalStep(s,input,1/60));}
});

test('arena clamp alone and zero requested overlap recovery do not create a hard-contact marker',()=>{
 use(3,[],f=>{f.g.player.root.position.z=48;for(let n=0;n<30;n++)f.step(1/60,['KeyW','KeyA']);assert.equal(Boolean(f.g.player.root.userData.blockedTurn?.blocked),false);});
 use(1,[{x:0,z:0,radius:.45}],f=>{f.step(1/60,[]);assert.equal(Boolean(f.g.player.root.userData.blockedTurn?.blocked),false);});
});

test('position and obstacle-list identity invalidate the previous real hard-contact state',()=>{
 for(const external of ['position','obstacles'])use(1,undefined,f=>{warmContact(f,60);assert.equal(f.g.player.root.userData.blockedTurn?.blocked,true);const r=f.g.player.root;if(external==='position')r.position.x+=3;else f.world.obstacles=[...f.world.obstacles];const previous=structuredClone(r.userData.drive),input={throttle:1,steer:-1,stage:1,boost:false,bonus:0,speedScale:1,grip:1},expected=originalStep(previous,input,1/60);f.step(1/60,['KeyW','KeyA']);near(r.userData.drive.yawRate,expected.yawRate,'Stale state gives no assist');assert.equal(r.userData.blockedTurn.mix,0);});
});

test('unblocked Game steering remains original and parked A/D never pivots',()=>{
 use(2,[],f=>{for(let n=0;n<120;n++){const previous=structuredClone(f.g.player.root.userData.drive??createDrive(0)),expected=originalStep(previous,{throttle:1,steer:-1,stage:2,boost:false,bonus:0,speedScale:1,grip:1},1/60);assert.deepEqual(f.step(1/60,['KeyW','KeyA']),expected);}assert.equal(Boolean(f.g.player.root.userData.blockedTurn?.blocked),false);});
 use(3,[],f=>{for(let n=0;n<60;n++)f.step(1/60,['KeyA']);assert.equal(f.g.player.root.rotation.y,0);assert.equal(f.g.player.root.userData.drive.speed,0);});
});

test('input release and pause stop assistance, growth/new checkpoints do not carry contact cache',()=>{
 use(1,undefined,f=>{warmContact(f,60);for(let n=0;n<6;n++)f.step(1/60,['KeyW','KeyA']);const r=f.g.player.root;assert.ok((r.userData.blockedTurn?.mix??0)>0);const beforeRelease=structuredClone(r.userData.drive),priorMix=r.userData.blockedTurn.mix;const released=f.step(1/60,[]),expectedRelease=originalStep(beforeRelease,{throttle:0,steer:0,stage:1,boost:false,bonus:0,speedScale:1,grip:1},1/60);near(released.yawRate,expectedRelease.yawRate,'Released input has original yaw despite remaining physical contact');assert.ok(r.userData.blockedTurn.mix<priorMix);const time=f.g.run.time,pose=r.position.toArray();f.g.show('pause');f.g.update(1/60);assert.equal(f.g.run.time,time);assert.deepEqual(r.position.toArray(),pose);f.g.show('');f.g.run.level=3;f.g.levelUp();const grow=f.g.run.choices.findIndex(c=>c.type==='grow');assert.ok(grow>=0);f.g.choose(grow);assert.notEqual(f.g.player.root,r);assert.equal(f.g.player.root.userData.blockedTurn,undefined);assert.equal(f.g.checkpointRun(),true);const cp=JSON.parse(f.storage.get('wandering-hearth:run'));assert.equal(cp.run.id,f.g.run.id);assert.equal(JSON.stringify(cp).includes('blockedTurn'),false);});
});

test('slowed hard-contact assist remains bounded and steering-disabled contact stays physical',()=>{
 use(3,undefined,f=>{warmContact(f,60);f.g.run.slowTime=20;f.g.run.slowFactor=.5;for(let n=0;n<30;n++)f.step(1/60,['KeyW','KeyD']);assert.ok(Math.abs(f.g.player.root.userData.drive.yawRate)>.05);assert.ok(Math.abs(f.g.player.root.userData.drive.yawRate)<.3);});
 use(2,undefined,f=>{warmContact(f,60);for(let n=0;n<60;n++)f.step(1/60,['KeyW']);assert.equal(f.g.player.root.rotation.y,0);assert.ok(Math.abs(f.g.player.root.userData.drive.speed)<.04);});
});
