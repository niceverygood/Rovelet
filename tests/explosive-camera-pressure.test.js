import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
// Exercise the actual production paths without a source loader.
const src=new URL('../src/',import.meta.url),THREE=await import(new URL('../node_modules/three/build/three.module.js',src));
const {Game}=await import(new URL('game.js',src)),{AdvancedCombat}=await import(new URL('advanced-weapons.js',src)),{World}=await import(new URL('world.js',src)),{CombatFeedback}=await import(new URL('combat-feedback.js',src)),{createParticlePool,createFragmentPool,createProjectilePool}=await import(new URL('effect-pool.js',src)),{freshSave,weaponStats,SAVE_KEY}=await import(new URL('data.js',src)),fx=await import(new URL('weapon-fx.js',src));
const amounts={rocket:.10,meteor:.16,clusterbomb:.08,landmine:.13},counts={rocket:8,meteor:12,clusterbomb:6,landmine:9},keys=Object.keys(amounts),kinds=['impact-core','impact-afterglow','impact-ground'];
const near=(a,b,label='value',epsilon=1e-10)=>assert.ok(Math.abs(a-b)<=epsilon,`${label}: ${a} != ${b}`),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const spec=key=>key==='cluster-fragment'?{...weaponStats('clusterbomb',1),key,damage:28*.35,radius:.8,speed:5,clusters:0}:{...weaponStats(key,1),key};
function fixture({xs=[0,.4,.8],reduced=false,heightAt=()=>0}={}){
 const map=new THREE.DataTexture(new Uint8Array([81,120,160,255]),1,1),normal=new THREE.DataTexture(new Uint8Array([127,127,255,255]),1,1),orm=new THREE.DataTexture(new Uint8Array([255,91,180,255]),1,1),geometry=new THREE.BoxGeometry(.8,.4,.6),material=new THREE.MeshStandardMaterial({color:0x617889,map,normalMap:normal,roughnessMap:orm,metalnessMap:orm,roughness:.37,metalness:.71});geometry.userData.sharedAsset=material.userData.sharedAsset=true;
 const source=new THREE.Group(),nested=new THREE.Group(),mesh=new THREE.Mesh(geometry,[material,material]);geometry.groups.forEach((group,i)=>group.materialIndex=i%2);nested.position.set(.2,.1,-.3);nested.rotation.set(.13,.23,.17);nested.add(mesh);source.add(nested);source.position.set(.3,-.1,.2);
 const events=[],world=Object.create(World.prototype);Object.assign(world,{fragmentPool:createFragmentPool(()=>source),particlePool:createParticlePool(),projectilePool:createProjectilePool(),effects:new THREE.Group(),actors:new THREE.Group(),camera:new THREE.PerspectiveCamera(),heightAt,smoke:[],flashes:[],puffs:[],puff(...args){this.puffs.push(args);},resolveCollision(){}});world.camera.rotation.set(.2,.4,.1);world.camera.updateMatrixWorld();world.feedback=new CombatFeedback(world);const originalFragment=world.fragment;world.fragment=function(){events.push('fragment');return originalFragment.call(this);};
 const game=Object.create(Game.prototype),save=freshSave(),player=new THREE.Group();save.settings.sound=false;save.settings.reducedMotion=reduced;player.position.set(0,0,-4);const enemies=xs.map((x,i)=>{const root=new THREE.Group();root.position.set(x,heightAt(x,0),0);root.userData.healthHeight=2;return {id:'victim-'+i,kind:'cannon',root,hp:1000,maxHp:1000,hit:0};});Object.assign(game,{world,mode:'run',screen:'',save,clock:10,hitStop:0,player:{root:player},enemies,run:{id:'explosive-fixture',stageId:'meadow-1',stage:1,time:400,hp:220,maxHp:220,kills:0,coins:0,outcome:null,weapons:{}},ui:{toast(){}},show(screen){this.screen=screen;},sound(){},dropLoot(){}});
 const damage=[];game.damageEnemy=function(enemy,amount,details){events.push('damage');const row={id:enemy.id,amount,key:details.key,beforeHp:enemy.hp};damage.push(row);const value=Game.prototype.damageEnemy.call(this,enemy,amount,details);row.afterHp=enemy.hp;events.push('damage-end');return value;};const originalAdd=world.feedback.add;world.feedback.add=function(...args){events.push(args[0]?.userData.importedFragment?'add-imported':args[3]==='number'?'number':'add-legacy');return originalAdd.apply(this,args);};
 world.game=game;world.actors.add(player,...enemies.map(e=>e.root));game.ui.flash=()=>{};const combat=new AdvancedCombat(game);game.advanced=combat;return {game,combat,world,feedback:world.feedback,enemies,source,geometry,material,textures:[map,normal,orm],events,damage,initialSave:structuredClone(save)};
}
function withCanvas(callback){const old=globalThis.document;globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return {strokeText(){},fillText(){}};}};}};try{return callback();}finally{globalThis.document=old;}}
function withStorage(callback){const old=globalThis.localStorage,store=new Map();globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};try{return callback(store);}finally{globalThis.localStorage=old;}}
const newParticles=f=>f.feedback.particles.filter(p=>p.explosionKey),shards=f=>newParticles(f).filter(p=>p.mesh.userData.importedFragment),layers=f=>newParticles(f).filter(p=>p.envelope);
function burst(f,key,position=new THREE.Vector3(2,.4,-3),direction=new THREE.Vector3(1,-1,0)){assert.equal(typeof f.feedback.explosionBurst,'function','The bounded cosmetic burst API must exist.');f.feedback.explosionBurst(position,key,direction);}
function advance(f,time,fps){for(let remaining=time;remaining>1e-12;){const dt=Math.min(1/fps,remaining);f.feedback.update(dt,f.world.camera);remaining-=dt;}}
function sourceState(f){return {source:[f.source.position.toArray(),f.source.quaternion.toArray(),f.source.scale.toArray()],nested:[f.source.children[0].position.toArray(),f.source.children[0].quaternion.toArray()],groups:structuredClone(f.geometry.groups),attributes:Object.fromEntries(Object.entries(f.geometry.attributes).map(([name,attr])=>[name,hash(Buffer.from(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength))])),index:hash(Buffer.from(f.geometry.index.array.buffer)),bbox:f.geometry.boundingBox,material:{color:f.material.color.getHex(),roughness:f.material.roughness,metalness:f.material.metalness,opacity:f.material.opacity,transparent:f.material.transparent,depthWrite:f.material.depthWrite},textures:f.textures.map(t=>[...t.image.data])};}
const point=()=>new THREE.Vector3(0,.05,0),observe=f=>{const calls=[],method=f.feedback.cameraKick;f.feedback.cameraKick=function(amount,reduced){calls.push({amount,reduced});return method.call(this,amount,reduced);};return calls;};
function invariant(f){return {run:structuredClone(f.game.run),save:structuredClone(f.game.save),hitStop:f.game.hitStop,clock:f.game.clock,player:f.game.player.root.position.toArray(),source:sourceState(f)};}

test('actual Advanced blasts add one primary response independent of zero,one or three victims, preserving damage,stats,time,economy and PBR',()=>withCanvas(()=>{
 for(const key of keys)for(const xs of [[],[0],[0,.4,.8]]){
  const f=fixture({xs}),calls=observe(f),before=invariant(f),w=spec(key);f.combat.blast(point(),w,new THREE.Vector3(1,-2,.4));
  assert.equal(calls.length,1,`${key}/${xs.length}: one primary response`);near(calls[0].amount,amounts[key]/1.6,'distance4');assert.equal(calls[0].reduced,false);near(f.feedback.shake,amounts[key]/1.6);
  assert.equal(f.damage.length,xs.length);for(const e of f.enemies)near(e.hp,1000-w.damage);assert.equal(f.combat.stats.hits[key]??0,xs.length);assert.equal(shards(f).length,counts[key]);assert.equal(layers(f).length,3);assert.ok(f.feedback.particles.length<=190);assert.ok(f.world.fragmentPool.stats.active<=24);
  assert.deepEqual(invariant(f),before);f.world.clearActors();
 }
}));

test('response uses actual player world XZ and decreases at3/12m despite camera lag,parent translation and height',()=>{
 for(const key of keys){const observed=[];for(const distance of [0,3,12]){
  const f=fixture({xs:[]});f.world.actors.position.set(10,2,-9);f.game.player.root.position.set(2,5,3);f.world.camera.position.set(1000,-1000,800);f.world.cameraTarget=new THREE.Vector3(-900,700,400);const p=new THREE.Vector3(12+distance,500,-6),before=invariant(f),direction=new THREE.Vector3(1,-2,3),dir=direction.toArray(),calls=observe(f);
  fx.primaryExplosion(f.world,p,key,false,direction);assert.equal(calls.length,1);near(calls[0].amount,amounts[key]/(1+.15*distance));observed.push(calls[0].amount);assert.deepEqual(p.toArray(),[12+distance,500,-6]);assert.deepEqual(direction.toArray(),dir);assert.deepEqual(invariant(f),before);f.world.clearActors();
 }assert.ok(observed[0]>observed[1]&&observed[1]>observed[2]);}
});

test('reduced,child and unsupported keys retain legacy effects and damage without pressure',()=>withCanvas(()=>{
 for(const key of [...keys,'cluster-fragment','cannon','mortar','steam','fireball','frostbomb','acidflask'])for(const reduced of [false,true]){
  if(!reduced&&keys.includes(key))continue;const f=fixture({reduced}),calls=observe(f),before=invariant(f);f.combat.blast(point(),spec(key));assert.equal(calls.length,0,key+' pressure exclusion');assert.equal(f.feedback.shake,0);assert.equal(f.damage.length,3);before.hitStop=!reduced&&['cannon','mortar'].includes(key)?.025:0;assert.deepEqual(invariant(f),before);if(reduced)assert.equal(newParticles(f).length,0);f.world.clearActors();
 }
}));

test('actual cluster parent and six floor children keep independent damage but only the parent requests pressure',()=>withCanvas(()=>{
 const f=fixture(),calls=observe(f),before=invariant(f),w=spec('clusterbomb');f.combat.shot(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),w,{velocity:new THREE.Vector3(0,-57.6,0),gravity:0,delay:0,target:null});f.combat.update(1/60);assert.equal(f.combat.shots.length,6);assert.equal(calls.length,1);f.combat.update(1/60);assert.equal(f.combat.shots.length,0);assert.equal(calls.length,1);assert.equal(f.damage.length,21);for(const e of f.enemies)near(e.hp,1000-28-6*9.8,'parent plus six child hits',1e-6);assert.deepEqual(invariant(f),before);f.combat.reset();f.world.clearActors();
}));

test('190 feedback and24 shared shards exhaustion cannot suppress primary scalar or allocate beyond existing caps',()=>withCanvas(()=>{
 const f=fixture(),held=Array.from({length:24},()=>f.world.fragment());for(let i=0;i<190;i++)f.feedback.add(f.world.particle('chip'),new THREE.Vector3(),3);let primaryPool;const originalBurst=f.feedback.explosionBurst;f.feedback.explosionBurst=function(...args){const before={particle:f.world.particlePool.snapshot(),fragment:f.world.fragmentPool.snapshot()};const result=originalBurst.apply(this,args);primaryPool={before,after:{particle:f.world.particlePool.snapshot(),fragment:f.world.fragmentPool.snapshot()}};return result;};const source=sourceState(f),calls=observe(f),run=structuredClone(f.game.run),save=structuredClone(f.game.save);
 f.combat.blast(point(),spec('meteor'));assert.equal(calls.length,1);near(f.feedback.shake,.16/1.6);assert.equal(f.feedback.particles.length,190);assert.equal(f.world.fragmentPool.stats.active,24);assert.ok(primaryPool);assert.deepEqual(primaryPool.after,primaryPool.before,'primary adds no allocation at full caps; legacy victim acquire/release is separate');assert.equal(f.damage.length,3);assert.deepEqual(f.game.run,run);assert.deepEqual(f.game.save,save);assert.deepEqual(sourceState(f),source);for(const mesh of held)f.world.remove(mesh);f.world.clearActors();assert.equal(f.feedback.particles.length,0);assert.equal(f.world.fragmentPool.stats.active,0);
}));

test('finite guards keep legacy burst before skipping invalid player,position or prototype keys without NaN',()=>{
 for(const configure of [f=>{delete f.world.game;},f=>{delete f.game.player;},f=>{f.game.player.root.position.x=NaN;},f=>{f.game.player.root.position.z=Infinity;},f=>{f.game.player.root={position:new THREE.Vector3()};},f=>{}]){
  const f=fixture({xs:[]});let bursts=0;f.feedback.explosionBurst=()=>bursts++;configure(f);const calls=observe(f),p=point();if(bursts===0&&f.world.game?.player?.root?.isObject3D&&Number.isFinite(f.game.player.root.position.x)&&Number.isFinite(f.game.player.root.position.z))p.y=NaN;
  fx.primaryExplosion(f.world,p,'rocket');assert.equal(bursts,1);assert.equal(calls.length,0);assert.equal(f.feedback.shake,0);f.world.clearActors();
 }
 for(const key of ['__proto__','constructor','toString','unknown','cluster-fragment',null,{}]){const f=fixture({xs:[]});let bursts=0;f.feedback.explosionBurst=()=>bursts++;const calls=observe(f);fx.primaryExplosion(f.world,point(),key);assert.equal(bursts,1);assert.equal(calls.length,0);assert.equal(f.feedback.shake,0);f.world.clearActors();}
 const f=fixture({xs:[]});f.feedback.explosionBurst=()=>{throw new Error('Reduced must skip the existing burst.');};fx.primaryExplosion(f.world,point(),'meteor',true);assert.equal(f.feedback.shake,0);f.world.clearActors();
});

test('legitimate repeated primary responses retain original .22 cap,exp16 decay,sine camera displacement,reduced and reset',()=>{
 const f=fixture({xs:[]});f.feedback.explosionBurst=()=>{};f.game.player.root.position.set(0,0,0);const calls=observe(f);for(const key of keys)fx.primaryExplosion(f.world,point(),key);assert.equal(calls.length,4);near(f.feedback.shake,.22);const camera=f.world.camera,initial=new THREE.Vector3(22,30,28);camera.position.copy(initial);f.feedback.clock=2;const dt=.025,amplitude=.22*Math.exp(-16*dt);f.feedback.update(dt,camera,false);near(f.feedback.shake,amplitude);near(camera.position.x,22+Math.sin(2.025*101)*amplitude);near(camera.position.y,30+Math.sin(2.025*79+1)*amplitude*.5);near(camera.position.z,28+Math.cos(2.025*113)*amplitude);f.feedback.update(.01,camera,true);assert.equal(f.feedback.shake,0);fx.primaryExplosion(f.world,point(),'rocket');assert.ok(f.feedback.shake>0);f.feedback.reset();assert.equal(f.feedback.shake,0);f.world.clearActors();
});

test('existing player/enemy cannon shots and incoming17HP impact retain exact camera reactions and hitStop',()=>withCanvas(()=>{
 for(const enemy of [false,true]){const f=fixture({xs:[]}),calls=observe(f);f.feedback.shot(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),f.game.player.root,{enemy,distance:12,reduced:false});assert.equal(calls.length,1);near(calls[0].amount,enemy?.022/2.8:.04);assert.equal(f.feedback.stats.shots,1);assert.equal(f.game.hitStop,0);f.world.clearActors();}
 const f=fixture({xs:[]}),beforeSave=structuredClone(f.game.save),calls=observe(f);f.game.takeDamage(17,{key:'cannon',physicalShard:true});assert.equal(f.game.run.hp,203);assert.equal(calls.length,1);near(calls[0].amount,.14);near(f.game.hitStop,.055);assert.equal(f.feedback.stats.playerHits,1);assert.equal(f.feedback.particles.filter(p=>p.mesh.userData.importedFragment).length,9);assert.deepEqual(f.game.save,beforeSave);f.world.clearActors();
}));

test('last-boss captured-live primary responds once after real settlement; terminal followups change no rewards or storage',()=>withCanvas(()=>withStorage(store=>{
 const f=fixture({xs:[0]}),calls=observe(f),boss=f.enemies[0];let drops=0;f.game.dropLoot=()=>drops++;boss.kind='boss';boss.bossRole='final';boss.hp=1;f.combat.blast(point(),spec('rocket'));assert.equal(calls.length,1);assert.equal(drops,12);assert.equal(f.game.run.kills,1);assert.equal(f.game.run.outcome,'victory');assert.equal(f.game.run.settled,true);assert.equal(f.game.save.runs,1);assert.equal(f.game.save.victories,1);assert.equal(f.game.save.totalKills,1);assert.ok(store.has(SAVE_KEY));const storage=JSON.stringify([...store.entries()]),run=structuredClone(f.game.run),save=structuredClone(f.game.save),beforeParticles=newParticles(f).length;f.combat.blast(point(),spec('rocket'));f.combat.update(1/60);assert.equal(calls.length,1);assert.equal(drops,12);assert.deepEqual(f.game.run,run);assert.deepEqual(f.game.save,save);assert.equal(JSON.stringify([...store.entries()]),storage);assert.equal(newParticles(f).length,beforeParticles);f.combat.reset();f.world.clearActors();
})));

test('the pressure-only addition consumes no random and changes no direction,source,simulation or save state',()=>{
 const f=fixture({xs:[]});f.feedback.explosionBurst=()=>{};const before=invariant(f),p=point(),direction=new THREE.Vector3(2,-3,4),dir=direction.toArray(),random=Math.random;try{Math.random=()=>{throw new Error('Pressure-only branch must consume no RNG.');};fx.primaryExplosion(f.world,p,'rocket',false,direction);}finally{Math.random=random;}assert.ok(f.feedback.shake>0);assert.deepEqual(invariant(f),before);assert.deepEqual(direction.toArray(),dir);assert.deepEqual(p.toArray(),[0,.05,0]);f.world.clearActors();
});
