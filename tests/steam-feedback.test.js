import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {freshSave,WEAPONS} from '../src/data.js';
import {soundProfile} from '../src/weapon-audio.js';

function observableAudio(){
 const oscillators=[],noise=[];
 const parameter=events=>({value:0,setValueAtTime(value,time){events.push({method:'set',value,time});},exponentialRampToValueAtTime(value,time){events.push({method:'ramp',value,time});}});
 const node=()=>({connect(){return this;},start(time){this.started=time;},stop(time){this.stopped=time;}});
 return {currentTime:10,state:'running',sampleRate:8000,destination:{},oscillators,noise,
  createOscillator(){const result={...node(),frequencyEvents:[]};result.frequency=parameter(result.frequencyEvents);oscillators.push(result);return result;},
  createGain(){return {...node(),gain:parameter([])};},
  createBuffer(channels,length,sampleRate){assert.equal(channels,1);const data=new Float32Array(length);return {length,sampleRate,getChannelData(channel){assert.equal(channel,0);return data;}};},
  createBufferSource(){const result=node();noise.push(result);return result;},
  createBiquadFilter(){return {...node(),frequency:{value:0}};}
 };
}
function fixture({sound=true,hidden=false}={}){
 const game=Object.create(Game.prototype),save=freshSave(),root=new THREE.Group(),mount=new THREE.Group(),emitter=new THREE.Object3D(),effects=new THREE.Group();
 mount.add(emitter);mount.emitter=emitter;root.add(mount);root.weaponEmitters={steam:mount};
 const enemyRoot=new THREE.Group();enemyRoot.position.set(2,0,0);enemyRoot.userData.healthHeight=2;
 const enemy={id:'surviving-steam-target',kind:'cannon',hp:1000,maxHp:1000,root:enemyRoot},rings=[],puffs=[],impacts=[],impulses=[],numbers=[];save.settings.sound=sound;
 Object.assign(game,{save,mode:'run',screen:'',clock:10,hitStop:0,audio:observableAudio(),audioManager:{hidden},bullets:[],telegraphs:[],enemies:[enemy],player:{root},run:{id:'steam-unit-integration',weapons:{steam:1},outcome:null,kills:0,coins:0,stage:1},world:{
  effects,ring(radius,color,opacity){const mesh=new THREE.Group();effects.add(mesh);rings.push({radius,color,opacity,mesh});return mesh;},
  puff(position,color,count){puffs.push({position:position.toArray(),color,count});},
  feedback:{impact(position,direction,options){impacts.push({position:position.toArray(),direction:direction.toArray(),options});},impulse(target,direction,strength,kind,reduced){impulses.push({target,direction:direction.toArray(),strength,kind,reduced});},damageNumber(position,value){numbers.push({position:position.toArray(),value});}}
 }});
 return {game,enemy,rings,puffs,impacts,impulses,numbers};
}
function assertCombat(f){
 assert.equal(f.enemy.hp,984,'The actual steam area hit still deals16 damage.');
 assert.deepEqual(f.enemy.root.position.toArray(),[3.4,0,0],'Steam pushes the target1.4m.');
 assert.equal(f.enemy.hit,.15);assert.equal(f.impacts.length,1);assert.equal(f.impulses.length,1);assert.equal(f.numbers.length,1);assert.equal(f.numbers[0].value,16);
 assert.equal(f.rings.length,1);assert.equal(f.rings[0].radius,WEAPONS.steam.range);assert.equal(f.rings[0].color,0xfff6dc);assert.equal(f.rings[0].opacity,.7);assert.deepEqual(f.rings[0].mesh.position.toArray(),[0,.08,0]);
 assert.equal(f.game.telegraphs.length,1);assert.equal(f.game.telegraphs[0].mesh,f.rings[0].mesh);assert.equal(f.game.telegraphs[0].life,.45);assert.equal(f.game.telegraphs[0].max,.45);assert.equal(f.game.telegraphs[0].type,'effect');
 assert.deepEqual(f.puffs,[{position:[0,0,0],color:0xfff8e5,count:6}]);assert.equal(f.game.bullets.length,0);assert.equal(f.game.run.kills,0);assert.equal(f.game.run.outcome,null);
 assert.equal(f.game.hitStop,0,'Steam intentionally does not inherit the cannon hit-stop.');
}

test('actual steam fire schedules one steam shot and one steam impact while retaining damage, push and ring/puff',()=>{
 const f=fixture();assert.equal(f.game.fireWeapon('steam'),true);
 assert.deepEqual(Object.keys(f.game.weaponSoundTimes??{}).sort(),['steamimpact','steamshot'],'Actual firing must reach both steam-specific WebAudio slots.');
 assert.equal(f.game.weaponSoundTimes.steamshot,10);assert.equal(f.game.weaponSoundTimes.steamimpact,10);assert.equal(f.game.audio.oscillators.length,2);
 const frequencies=f.game.audio.oscillators.map(oscillator=>oscillator.frequencyEvents[0].value).sort((a,b)=>a-b);
 assert.deepEqual(frequencies,['shot','impact'].map(kind=>soundProfile('steam',kind).frequency).sort((a,b)=>a-b),'Actual oscillator nodes use the steam sound profiles.');
 for(const oscillator of f.game.audio.oscillators){assert.equal(oscillator.started,10);assert.ok(oscillator.stopped>oscillator.started);}
 assert.equal(f.game.audio.noise.length,2);assertCombat(f);
});

test('muted steam retains the same combat feedback without scheduling audio',()=>{
 const f=fixture({sound:false});assert.equal(f.game.fireWeapon('steam'),true);
 assert.equal(f.game.audio.oscillators.length,0);assert.equal(f.game.audio.noise.length,0);assert.deepEqual(Object.keys(f.game.weaponSoundTimes??{}),[]);assertCombat(f);
});

test('hidden-tab steam retains the same combat feedback without scheduling audio',()=>{
 const f=fixture({hidden:true});assert.equal(f.game.fireWeapon('steam'),true);
 assert.equal(f.game.audio.oscillators.length,0);assert.equal(f.game.audio.noise.length,0);assert.deepEqual(Object.keys(f.game.weaponSoundTimes??{}),[]);assertCombat(f);
});

test('terminal steam firing and late damage produce no audio, combat mutation or effects',()=>{
 for(const outcome of ['victory','defeat','retreat']){
  const f=fixture();f.game.run.outcome=outcome;const before=structuredClone(f.game.run);
  assert.equal(f.game.fireWeapon('steam'),false);f.game.damageEnemy(f.enemy,16,{key:'steam'});
  assert.deepEqual(f.game.run,before);assert.equal(f.enemy.hp,1000);assert.deepEqual(f.enemy.root.position.toArray(),[2,0,0]);
  assert.equal(f.game.audio.oscillators.length,0);assert.equal(f.game.audio.noise.length,0);assert.deepEqual(Object.keys(f.game.weaponSoundTimes??{}),[]);
  assert.equal(f.game.world.effects.children.length,0);assert.equal(f.game.telegraphs.length,0);assert.equal(f.game.bullets.length,0);assert.equal(f.game.hitStop,0);
  for(const list of [f.rings,f.puffs,f.impacts,f.impulses,f.numbers])assert.equal(list.length,0);
 }
});
