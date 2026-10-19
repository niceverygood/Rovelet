import test from 'node:test';
import assert from 'node:assert/strict';
import {UI} from '../src/ui.js';
import {freshSave} from '../src/data.js';
import {villageStats} from '../src/village-stats.js';
import {stageById} from '../src/campaign.js';
import {getLanguage,setLanguage} from '../src/i18n.js';

// Only the HUD fields touched by UI.update are represented. Initial health is
// read from the real generated markup; cached updates use distinct field nodes.
function healthHUD(){
 let markup='';const hud={renders:0,nodes:new Map(),slots:[],get innerHTML(){return markup;},set innerHTML(value){
  markup=value;this.renders++;
  const health=value.match(/class="health-track"><i style="width:([^"]+)"><\/i><\/div><b>([^<]+)<\/b>/);
  assert.ok(health,'Actual initial HUD must contain the health track and label');
  this.nodes=new Map([
   ['.health-track i',{style:{width:health[1]}}],['.health-panel b',{textContent:health[2]}],
   ['.coins b',{textContent:value.match(/class="coins">[\s\S]*?<b>([^<]+)<\/b>/)?.[1]??''}],
   ['.experience',{classList:{toggle(){}}}],['.xp-track i',{style:{}}],['.xp-track > span',{textContent:''}],
   ['.timer',{textContent:''}],['.run-objective b',{textContent:''}],['.surface-hint',{textContent:''}],
   ['[data-action="boost"] kbd',{textContent:''}],['[data-action="shield"] kbd',{textContent:''}],['[data-action="repair"] kbd',{textContent:''}],
   ['.boss-health',{}],['.enemy-health',{}]
  ]);
  const equipped=value.match(/<div class="equipped-weapons">([\s\S]*?)<\/div><\/div>/)?.[1]??'';
  this.slots=[...equipped.matchAll(/<span>(●*)<\/span>/g)].map(match=>{const span={textContent:match[1]};return {querySelector(selector){assert.equal(selector,'span');return span;}};});
 },querySelector(selector){assert.ok(this.nodes.has(selector),'Unexpected HUD field: '+selector);return this.nodes.get(selector);},querySelectorAll(selector){assert.equal(selector,'.equipped-weapons > .weapon-slot');return this.slots;}};return hud;
}
function withDisplay({mode,garage=0,staleRun=false},check){
 const previous={document:globalThis.document,language:getLanguage()};
 globalThis.document={baseURI:'http://127.0.0.1:4176/',documentElement:{lang:'ko'},title:'',body:{classList:{toggle(){}}},querySelector:()=>null};
 setLanguage('ko');
 const save=freshSave();save.buildings.garage=garage;
 const departureSave={...save,buildings:{...save.buildings,garage:4}},departureStats=villageStats(departureSave);
 const run=mode==='run'||staleRun||mode==='lab'?{id:'unchanged-display-run',stageId:'meadow-1',duration:360,stage:2,time:49.9,level:2,xp:3,hp:mode==='lab'?220:65,maxHp:mode==='lab'?220:340,weapons:{cannon:1,crystal:2},cooldowns:{cannon:.2},boostCd:0,shieldCd:0,repairCd:0,choices:[],outcome:null,villageStats:departureStats}:null;
 const checkpoint={version:1,screen:'upgrade',run:{id:'preserved-checkpoint',hp:203,maxHp:220,time:49.9,villageStats:villageStats(save),choices:[{type:'weapon',key:'frostbomb',level:1}]},position:[1,0,2],enemies:[],loot:[]};
 const game={mode,screen:mode==='run'?'':mode==='lab'?'collection':mode,save,run,checkpoint,enemies:[],clock:5,world:{project:()=>({visible:false})},stageInfo:()=>stageById(run?.stageId)};
 const hud=healthHUD(),ui=Object.create(UI.prototype);Object.assign(ui,{game,hud,elapsed:0,enemyBars:{update(){}},bossBars:{update(){}}});
 function update(){
  const refs={save:game.save,buildings:game.save.buildings,settings:game.save.settings,run:game.run,stats:game.run?.villageStats,checkpoint:game.checkpoint,checkpointRun:game.checkpoint.run,checkpointStats:game.checkpoint.run.villageStats};
  const values=structuredClone({save:game.save,run:game.run,checkpoint:game.checkpoint});
  ui.update(.1);
  assert.equal(game.save,refs.save);assert.equal(game.save.buildings,refs.buildings);assert.equal(game.save.settings,refs.settings);assert.equal(game.run,refs.run);assert.equal(game.run?.villageStats,refs.stats);assert.equal(game.checkpoint,refs.checkpoint);assert.equal(game.checkpoint.run,refs.checkpointRun);assert.equal(game.checkpoint.run.villageStats,refs.checkpointStats);
  assert.deepEqual({save:game.save,run:game.run,checkpoint:game.checkpoint},values,'Display updates must preserve the complete save, run and checkpoint');
 }
 try{check({game,ui,hud,update});}finally{globalThis.document=previous.document;setLanguage(previous.language);}
}
function assertHealth(hud,hp,maxHp){
 assert.equal(hud.querySelector('.health-panel b').textContent,Math.ceil(hp)+' / '+maxHp);
 assert.ok(Math.abs(parseFloat(hud.querySelector('.health-track i').style.width)-hp/maxHp*100)<1e-9,'Health fill must use the same current/max values as its label');
}

for(const mode of ['title','village'])test('fresh '+mode+' displays the unchanged 220 home capacity on initial and cached HUD paths',()=>withDisplay({mode},({hud,update})=>{
 update();assertHealth(hud,220,220);const label=hud.querySelector('.health-panel b'),fill=hud.querySelector('.health-track i');update();assertHealth(hud,220,220);assert.equal(hud.renders,1);assert.equal(hud.querySelector('.health-panel b'),label);assert.equal(hud.querySelector('.health-track i'),fill);
}));

for(const mode of ['title','village'])test('garage6 '+mode+' displays home400 and ignores a stale injured run on initial and cached paths',()=>withDisplay({mode,garage:6,staleRun:true},({game,hud,update})=>{
 assert.equal(game.run.hp,65);assert.equal(game.run.maxHp,340);update();assertHealth(hud,400,400);update();assertHealth(hud,400,400);assert.equal(hud.renders,1);
}));

test('garage upgrade changes a cached village capacity to250 without replacing its HUD nodes',()=>withDisplay({mode:'village'},({game,hud,update})=>{
 update();assertHealth(hud,220,220);const label=hud.querySelector('.health-panel b'),fill=hud.querySelector('.health-track i');game.save.buildings.garage=1;update();assertHealth(hud,250,250);assert.equal(hud.renders,1);assert.equal(hud.querySelector('.health-panel b'),label);assert.equal(hud.querySelector('.health-track i'),fill);
}));

test('active injured run keeps65of340 rather than home400 and cached damage retains the same health nodes',()=>withDisplay({mode:'run',garage:6},({game,hud,update})=>{
 assert.equal(villageStats(game.save).maxHp,400);update();assertHealth(hud,65,340);const label=hud.querySelector('.health-panel b'),fill=hud.querySelector('.health-track i');update();assertHealth(hud,65,340);game.run.hp=64.2;update();assertHealth(hud,64.2,340);assert.equal(hud.renders,1);assert.equal(hud.querySelector('.health-panel b'),label);assert.equal(hud.querySelector('.health-track i'),fill);
}));

test('weapon lab retains its220 fixture capacity despite a garage6 home on both HUD paths',()=>withDisplay({mode:'lab',garage:6},({hud,update})=>{
 update();assertHealth(hud,220,220);update();assertHealth(hud,220,220);assert.equal(hud.renders,1);
}));
