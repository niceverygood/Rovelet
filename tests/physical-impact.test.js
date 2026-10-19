import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {Game} from '../src/game.js';import {freshSave} from '../src/data.js';import {CombatFeedback} from '../src/combat-feedback.js';
import {BossSystem} from '../src/bosses.js';
function gameFixture(){
 const game=Object.create(Game.prototype),save=freshSave(),root=new THREE.Group(),enemyRoot=new THREE.Group(),impacts=[],numbers=[],removed=[];save.settings.sound=false;save.settings.reducedMotion=false;enemyRoot.userData.healthHeight=2;
 const enemy={id:'physical-target',hp:1000,maxHp:1000,root:enemyRoot,kind:'cannon'};
 Object.assign(game,{save,clock:10,hitStop:0,player:{root},enemies:[enemy],bullets:[],advanced:{update(){}},run:{outcome:null,stage:1,hp:220,shieldTime:0,invuln:0,kills:0,coins:0},world:{heightAt:()=>0,remove(m){removed.push(m);},puff(){},feedback:{stats:{playerHits:0},impact(point,direction,options){impacts.push({point,direction,options});},impulse(){},damageNumber(...args){numbers.push(args);},cameraKick(){},ring(){},add(){}}},ui:{flash(){}},combatSound(){}});return {game,enemy,impacts,numbers,removed};
}
test('explicit player cannon damage opts into directional fragments without changing its single damage event',()=>{
 const f=gameFixture(),direction=new THREE.Vector3(1,0,0);f.game.damageEnemy(f.enemy,17,{key:'cannon',physicalShard:true,direction});assert.equal(f.enemy.hp,983);assert.equal(f.impacts.length,1);assert.equal(f.numbers.length,1);assert.equal(f.impacts[0].options.physicalShard,true);assert.equal(f.impacts[0].options.fragmentDirection,direction);
});
test('missing-key splash and other weapon feedback retain the old fallback without physical cannon fragments',()=>{
 for(const details of [{},{key:'cannon'},{key:'mortar'},{key:'ballista'},{key:'steam'}]){const f=gameFixture();f.game.damageEnemy(f.enemy,17,details);assert.equal(f.enemy.hp,983);assert.equal(f.impacts.length,1);assert.notEqual(f.impacts[0].options.physicalShard,true);}
});
test('actual enemy projectile collision forwards its own key to player damage once',()=>{
 for(const key of ['cannon','mortar']){const f=gameFixture(),received=[],mesh=new THREE.Group();mesh.position.y=1;f.game.save.settings.reducedMotion=true;f.game.takeDamage=(amount,details)=>received.push({amount,details});f.game.bullets.push({owner:'enemy',key,mesh,velocity:new THREE.Vector3(),damage:17,life:2,hit:new Set()});f.game.updateBullets(1/60);assert.equal(received.length,1);assert.equal(received[0].amount,17);assert.equal(received[0].details.key,key);assert.equal(received[0].details.physicalShard,key==='cannon');assert.deepEqual(f.removed,[mesh]);assert.equal(f.game.bullets.length,0);}
});
test('actual player projectile collision marks only a basic cannon impact as physical',()=>{
 for(const key of ['cannon','ballista']){const f=gameFixture(),received=[],mesh=new THREE.Group();mesh.position.y=1;f.game.save.settings.reducedMotion=true;f.game.damageEnemy=(enemy,amount,details)=>received.push({enemy,amount,details});f.game.bullets.push({owner:'player',key,mesh,velocity:new THREE.Vector3(),damage:17,life:2,hit:new Set()});f.game.updateBullets(1/60);assert.equal(received.length,1);assert.equal(received[0].amount,17);assert.equal(received[0].details.key,key);assert.equal(received[0].details.physicalShard,key==='cannon');}
});
test('actual meadow boss cannon-named area blast keeps legacy impacts and a single hull damage event',()=>{
 const f=gameFixture(),system=new BossSystem(f.game),owner={boss:{profile:{region:'meadow',damage:20}}};system.blast(owner,new THREE.Vector3(),1);assert.equal(f.game.run.hp,200);assert.equal(f.impacts.length,2);assert.ok(f.impacts.every(i=>i.options.physicalShard!==true));assert.equal(f.game.world.feedback.stats.playerHits,1);assert.equal(f.numbers.length,1);
});
test('player hull cannon impact opts in while shield, invulnerability, terminal and untyped hits do not',()=>{
 const f=gameFixture(),direction=new THREE.Vector3(0,0,1);f.game.takeDamage(17,{key:'cannon',physicalShard:true,direction});assert.equal(f.game.run.hp,203);assert.equal(f.impacts.length,1);assert.equal(f.game.world.feedback.stats.playerHits,1);assert.equal(f.impacts[0].options.physicalShard,true);
 for(const kind of ['untyped','typed','shield','invulnerable','terminal','steam']){const s=gameFixture();if(kind==='shield')s.game.run.shieldTime=1;if(kind==='invulnerable')s.game.run.invuln=1;if(kind==='terminal')s.game.run.outcome='retreat';s.game.takeDamage(17,kind==='untyped'?{}:kind==='typed'?{key:'cannon'}:{key:kind==='steam'?'steam':'cannon',physicalShard:true});assert.ok(s.impacts.every(i=>i.options.physicalShard!==true));assert.equal(s.game.run.hp,['shield','invulnerable','terminal'].includes(kind)?220:203);}
});
function feedbackFixture({available=true}={}){
 const fragments=[],removed=[],ordinary=[];let fragmentCalls=0;const world={effects:new THREE.Group(),camera:new THREE.PerspectiveCamera(),heightAt:()=>.8,puff(){},remove(m){removed.push(m);m.removeFromParent();},particle(kind){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.11),new THREE.MeshBasicMaterial({opacity:1}));ordinary.push({kind,mesh});return mesh;},fragment(){fragmentCalls++;if(!available)return null;const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.16),new THREE.MeshStandardMaterial({opacity:1})));fragments.push(group);return group;}};const feedback=new CombatFeedback(world);return {world,feedback,fragments,removed,ordinary,calls:()=>fragmentCalls};
}
test('physical impact substitutes only its eight chips and uses the incoming direction without an extra hit',()=>{
 const f=feedbackFixture(),random=Math.random;try{Math.random=()=>.5;f.feedback.impact(new THREE.Vector3(0,1.6,0),new THREE.Vector3(0,-1,0),{physicalShard:true,fragmentDirection:new THREE.Vector3(1,0,0)});}finally{Math.random=random;}
 assert.equal(f.feedback.stats.hits,1);assert.equal(f.calls(),8);assert.equal(f.fragments.length,8);assert.equal(f.ordinary.filter(p=>p.kind==='spark').length,5);assert.equal(f.ordinary.filter(p=>p.kind==='chip').length,0);const shards=f.feedback.particles.filter(p=>f.fragments.includes(p.mesh));assert.equal(shards.length,8);for(const p of shards){assert.equal(p.type,'chip');assert.equal(p.gravity,8);assert.deepEqual(p.velocity.toArray(),[-.7,1.8,0]);}
});
test('exhausted shard capacity falls back to chips and shield or reduced motion never acquires fragments',()=>{
 const capped=feedbackFixture({available:false});capped.feedback.impact(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0),{physicalShard:true});assert.equal(capped.calls(),8);assert.equal(capped.ordinary.filter(p=>p.kind==='chip').length,8);assert.equal(capped.feedback.stats.hits,1);
 for(const options of [{shield:true},{reduced:true},{}]){const f=feedbackFixture();f.feedback.impact(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0),{physicalShard:!!(options.shield||options.reduced),...options});assert.equal(f.calls(),0);assert.equal(f.fragments.length,0);}
});
test('global particle rejection removes acquired fragments and normal gravity bounce fade expiry clears them',()=>{
 const capped=feedbackFixture();capped.feedback.particles=Array.from({length:190},()=>({}));capped.feedback.impact(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0),{physicalShard:true});assert.equal(capped.fragments.length,8);assert.ok(capped.fragments.every(m=>capped.removed.includes(m)));assert.equal(capped.feedback.particles.length,190);
 const f=feedbackFixture();f.feedback.impact(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),{physicalShard:true});assert.equal(f.fragments.length,8);f.feedback.update(.4,f.world.camera);for(const mesh of f.fragments){assert.ok(mesh.position.y>=.86-1e-10);assert.ok(mesh.rotation.x>0&&mesh.rotation.z>0);assert.ok(mesh.children[0].material.opacity>0&&mesh.children[0].material.opacity<1);}f.feedback.update(1,f.world.camera);assert.equal(f.feedback.particles.length,0);assert.ok(f.fragments.every(m=>f.removed.includes(m)));
});
