import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {Game} from '../src/game.js';import {UI} from '../src/ui.js';import {freshSave,SAVE_KEY} from '../src/data.js';import {STAGES} from '../src/campaign.js';import {villageStats} from '../src/village-stats.js';import {RUN_KEY} from '../src/checkpoint.js';import {getLanguage,setLanguage} from '../src/i18n.js';
const copy=value=>structuredClone(value);
function withFixture(origin,options,check){
 const previous={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,language:getLanguage()},listeners=new Map(),map=new Map(),writes=[];
 globalThis.window={addEventListener:(name,listener)=>listeners.set(name,listener)};globalThis.document={documentElement:{lang:'ko'},title:'',querySelector:()=>null,baseURI:'http://127.0.0.1:4176/',body:{dataset:{},classList:{toggle(){}}},addEventListener(){}};
 const save=freshSave(),ids=STAGES.map(stage=>stage.id);save.settings.sound=false;save.buildings={garage:6,smithy:6,greenhouse:6};save.coins=4000;save.campaign={unlocked:15,selected:ids.at(-1),completed:options.complete===false?ids.slice(0,-1):ids,best:Object.fromEntries(ids.map(id=>[id,500]))};save.runs=save.victories=save.campaign.completed.length;save.totalKills=5496;save.bestTime=500;save.settledRuns=save.campaign.completed.map((_,index)=>'earned-'+index);
 map.set(SAVE_KEY,JSON.stringify(save));map.set(SAVE_KEY+':backup',JSON.stringify({...save,coins:3990}));
 if(options.checkpoint){const run={id:'unfinished-expedition',stageId:'meadow-1',duration:360,time:120,stage:1,level:1,hp:180,maxHp:400,coins:17,kills:3,xp:2,weapons:{cannon:1},cooldowns:{},villageStats:villageStats(save),outcome:null,choices:[]},checkpoint={version:1,run,screen:'',position:[1,0,2],rotation:.4,enemies:[],loot:[]};map.set(RUN_KEY,JSON.stringify(checkpoint));map.set(RUN_KEY+':backup',JSON.stringify({...checkpoint,run:{...run,time:119}}));map.set(SAVE_KEY+':pending','{"qa":"untouched-invalid-journal"}');}
 globalThis.localStorage={getItem:key=>map.get(key)??null,setItem:(key,value)=>{writes.push(['set',key]);map.set(key,String(value));},removeItem:key=>{writes.push(['remove',key]);map.delete(key);}};
 const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},setRegion(){},castle(){const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);this.actors.add(root);return root;},ring:()=>new THREE.Group()};
 try{
  const g=new Game(world),ui=Object.create(UI.prototype);Object.assign(ui,{game:g,screens:{className:'',innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]},clearToasts(){},toast(){},touchControls:{setActive(){}}});g.ui=ui;g.rebuildAttachments=()=>{};
  if(origin==='village')g.mode='village';if(origin==='result'){g.mode='run';g.run={id:save.settledRuns.at(-1),outcome:'victory',settled:true,time:500,stage:3,kills:20,reward:1000,rewardBreakdown:{base:900,bonus:100,multiplier:1.24}};}
  g.show(origin);const before={save:copy(g.save),run:copy(g.run),checkpoint:copy(g.checkpoint),storage:Object.fromEntries(map),mode:g.mode};
  const f={g,ui,map,writes,before,escape:()=>listeners.get('keydown')({code:'Escape',repeat:false,target:{matches:()=>false},preventDefault(){}})};check(f);
 }finally{globalThis.window=previous.window;globalThis.document=previous.document;globalThis.localStorage=previous.localStorage;setLanguage(previous.language);}
}
function unchanged({g,map,writes,before}){assert.deepEqual(g.save,before.save);assert.deepEqual(g.run,before.run);assert.deepEqual(g.checkpoint,before.checkpoint);assert.deepEqual(Object.fromEntries(map),before.storage);assert.deepEqual(writes,[]);}

for(const origin of ['title','village','result'])test('ending and credits return to '+origin+' without saving or settling again',()=>withFixture(origin,{checkpoint:origin==='title'},f=>{
 const {g,ui}=f;assert.match(ui.screens.innerHTML,/data-action="ending"/);ui.action('ending');assert.equal(g.screen,'ending');assert.equal(g.mode,f.before.mode);const route=g.endingReturn;
 assert.equal(g.openEnding(),false);assert.equal(g.openEnding(origin),false);ui.action('ending');assert.equal(g.endingReturn,route);
 ui.action('credits');ui.action('credits');assert.equal(g.screen,'credits');assert.equal(g.creditReturn,'ending');f.escape();assert.equal(g.screen,'ending');assert.equal(g.endingReturn,route);
 ui.action('credits');ui.action('help-close');assert.equal(g.screen,'ending');f.escape();assert.equal(g.screen,origin);assert.equal(g.endingReturn,null);unchanged(f);
 ui.action('ending');ui.action('ending-close');assert.equal(g.screen,origin);ui.action('ending-close');ui.action('help-close');assert.equal(g.screen,origin);unchanged(f);
}));
test('a reloaded completed title can replay and then continue its exact unfinished checkpoint',()=>withFixture('title',{checkpoint:true},f=>{
 const {g,ui,before,map,writes}=f;assert.equal(g.run,null);assert.ok(g.checkpoint);ui.action('ending');ui.action('ending-close');unchanged(f);ui.action('continue');assert.equal(g.mode,'run');assert.equal(g.screen,'');assert.equal(g.run.id,before.checkpoint.run.id);assert.equal(g.run.time,before.checkpoint.run.time);assert.equal(g.run.hp,before.checkpoint.run.hp);assert.equal(g.run.coins,before.checkpoint.run.coins);assert.equal(g.run.kills,before.checkpoint.run.kills);assert.deepEqual(g.run.villageStats,before.checkpoint.run.villageStats);assert.deepEqual(g.save,before.save);assert.deepEqual(Object.fromEntries(map),before.storage);assert.deepEqual(writes,[]);
}));
for(const origin of ['title','village','result'])test('explicit ending-to-village navigation from '+origin+' preserves every stored value',()=>withFixture(origin,{checkpoint:origin==='title'},f=>{
 f.ui.action('ending');f.ui.action('village');assert.equal(f.g.mode,'village');assert.equal(f.g.screen,'village');assert.equal(f.g.endingReturn,null);unchanged(f);f.ui.action('village');assert.equal(f.g.mode,'village');assert.equal(f.g.screen,'village');unchanged(f);
}));
test('incomplete profiles never expose or enter ending replay',()=>{
 for(const origin of ['title','village'])withFixture(origin,{complete:false},f=>{assert.doesNotMatch(f.ui.screens.innerHTML,/data-action="ending"/);assert.equal(f.g.openEnding(),false);f.ui.action('ending');assert.equal(f.g.screen,origin);unchanged(f);});
});
test('forged origins and unsettled victory results cannot open an ending',()=>withFixture('title',{},f=>{
 const {g}=f;assert.equal(g.openEnding('result'),false);assert.equal(g.openEnding('building'),false);assert.equal(g.openEnding('pause'),false);unchanged(f);
 g.mode='run';g.screen='result';g.run={id:g.save.settledRuns.at(-1),outcome:'victory',settled:false};assert.equal(g.openEnding(),false);g.run.settled=true;g.run.id='not-a-settled-run';assert.equal(g.openEnding(),false);assert.deepEqual(Object.fromEntries(f.map),f.before.storage);assert.deepEqual(f.writes,[]);
}));
test('a corrupt return route falls back to the title without rendering a missing result run',()=>withFixture('title',{},f=>{
 f.g.endingReturn={mode:'title',screen:'result',runId:'missing'};f.g.show('ending');f.escape();assert.equal(f.g.screen,'title');assert.equal(f.g.mode,'title');assert.equal(f.g.run,null);unchanged(f);
}));
test('failed final settlement cannot unlock replay through the village while its journal remains pending',()=>withFixture('village',{complete:false},f=>{
 const {g,map,ui,writes}=f,primary=map.get(SAVE_KEY),setItem=globalThis.localStorage.setItem;globalThis.localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');setItem(key,value);};
 g.mode='run';g.screen='';g.run={id:'quota-final',stageId:'glacier-5',outcome:null,time:900,stage:3,coins:80,kills:10,villageStats:villageStats(g.save)};g.finish('victory');assert.equal(g.run.settled,false);assert.equal(g.save.campaign.completed.length,15);assert.ok(map.has(SAVE_KEY+':pending'));assert.equal(map.get(SAVE_KEY),primary);
 ui.action('village');assert.equal(g.screen,'village');assert.doesNotMatch(ui.screens.innerHTML,/data-action="ending"/);const storage=Object.fromEntries(map),before=copy(g.save),writeCount=writes.length;
 assert.equal(g.openEnding(),false);ui.action('ending');assert.equal(g.screen,'village');assert.equal(g.run.settled,false);assert.deepEqual(g.save,before);assert.deepEqual(Object.fromEntries(map),storage);assert.equal(writes.length,writeCount);
}));
test('replay and Back labels resolve in Korean and English through the actual screen renderer',()=>withFixture('title',{},f=>{
 for(const [language,replay,back]of [['ko','엔딩 다시 보기','돌아가기'],['en','Replay ending','Back']]){setLanguage(language);f.ui.renderScreen();assert.ok(f.ui.screens.innerHTML.includes(replay));f.ui.action('ending');assert.match(f.ui.screens.innerHTML,/data-action="ending-close"/);assert.ok(f.ui.screens.innerHTML.includes(back));f.ui.action('ending-close');}
 unchanged(f);
}));
