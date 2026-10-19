import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {UI} from '../src/ui.js';
import {freshSave,SAVE_KEY} from '../src/data.js';
import {getLanguage,setLanguage} from '../src/i18n.js';

// Only the event target surface is faked. The constructor listener, placement,
// purchase/save methods and the UI action used by native activation are real.
function element(tag,attrs={},parent=null){
 return {tag,attrs,parent,dataset:{},get isContentEditable(){return attrs.contenteditable===undefined?parent?.isContentEditable??false:attrs.contenteditable!=='false';},
  matches(selector){return selector.split(',').some(part=>{const match=part.trim().match(/^([a-z]+)?(?:\[([a-z]+)(?:="([^"]*)")?\])?$/);return !!match&&(!match[1]||match[1]===tag)&&(!match[2]||Object.hasOwn(attrs,match[2])&&(match[3]===undefined||attrs[match[2]]===match[3]));});},
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null;}
 };
}
function withPlacement(check){
 const old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,language:getLanguage()},listeners=new Map(),map=new Map(),writes=[];
 const save=freshSave();save.settings.sound=false;map.set(SAVE_KEY,JSON.stringify(save));map.set(SAVE_KEY+':backup',JSON.stringify({...save,coins:130}));
 globalThis.window={addEventListener:(name,listener)=>listeners.set(name,listener)};
 globalThis.document={documentElement:{lang:'ko'},title:'',addEventListener(){}};
 globalThis.localStorage={getItem:key=>map.get(key)??null,setItem:(key,value)=>{writes.push(['set',key]);map.set(key,String(value));},removeItem:key=>{writes.push(['remove',key]);map.delete(key);}};
 const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),cancelled:0,updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},castle(){const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);return root;},villageDecorObstacles:()=>[],previewBuilding(){},setPreview(){},cancelPreview(){this.cancelled++;}};
 try{
  const g=new Game(world),ui=Object.create(UI.prototype);Object.assign(ui,{game:g,renderScreen(){},updatePlacement(){},toast(){}});g.ui=ui;g.mode='village';g.beginPlacement('greenhouse');assert.equal(g.screen,'placement');assert.equal(g.placement.status.ok,true);
  const before={save:structuredClone(g.save),storage:Object.fromEntries(map),position:{...g.placement.position}},canvas=element('canvas');
  const key=(code,target=canvas,repeat=false,modifiers={})=>{const e={code,target,repeat,...modifiers,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};listeners.get('keydown')(e);return e;};
  const keyup=(code,target=canvas)=>listeners.get('keyup')({code,target});
  check({g,ui,world,map,writes,before,key,keyup,canvas});
 }finally{globalThis.window=old.window;globalThis.document=old.document;globalThis.localStorage=old.localStorage;setLanguage(old.language);}
}
function noSave({g,map,writes,before}){assert.deepEqual(g.save,before.save);assert.deepEqual(Object.fromEntries(map),before.storage);assert.deepEqual(writes,[]);assert.equal(g.keys.size,0);}

for(const code of ['Enter','Space'])test('focused Cancel '+code+' leaves native activation intact and never purchases',()=>withPlacement(f=>{
 const button=element('button'),target=element('span',{},button),event=f.key(code,target);assert.equal(event.defaultPrevented,false);assert.ok(f.g.placement);noSave(f);
 // Browser default activation is represented only after the listener returns.
 f.ui.action('place-cancel',button);assert.equal(f.g.placement,null);assert.equal(f.g.screen,'village');assert.equal(f.world.cancelled,1);assert.equal(f.key(code,target,true).defaultPrevented,true);f.keyup(code,target);noSave(f);
}));

test('native Rotate, Reselect and Nudge Enter perform only their own UI actions',()=>{
 for(const [action,tag,attrs]of [['place-rotate','button',{}],['place-reselect','a',{href:'#placement'}],['place-nudge','div',{role:'button'}]])withPlacement(f=>{
  const control=element(tag,attrs);control.dataset={x:'1',z:'0'};f.g.placement.locked=true;const original={...f.g.placement.position};assert.equal(f.key('Enter',element('span',{},control)).defaultPrevented,false);assert.deepEqual(f.g.placement.position,original);
  f.ui.action(action,control);assert.ok(f.g.placement);assert.equal(f.g.screen,'placement');if(action==='place-rotate')assert.equal(f.g.placement.position.rotation,(original.rotation+Math.PI/2)%(Math.PI*2));if(action==='place-reselect')assert.equal(f.g.placement.locked,false);if(action==='place-nudge')assert.equal(f.g.placement.position.x,original.x+.5);noSave(f);
 });
});

test('repeated focused button Enter and Space cannot rotate or purchase twice',()=>{
 for(const code of ['Enter','Space'])for(const action of ['place-rotate','place-confirm'])withPlacement(f=>{
  const control=element('button'),event=f.key(code,control);assert.equal(event.defaultPrevented,false);f.ui.action(action,control);const save=structuredClone(f.g.save),storage=Object.fromEntries(f.map),writeCount=f.writes.length,position=f.g.placement?{...f.g.placement.position}:null;
  for(let i=0;i<5;i++)assert.equal(f.key(code,control,true).defaultPrevented,true);assert.deepEqual(f.g.save,save);assert.deepEqual(Object.fromEntries(f.map),storage);assert.equal(f.writes.length,writeCount);assert.deepEqual(f.g.placement?.position??null,position);assert.equal(f.g.keys.size,0);
  if(action==='place-confirm'){assert.equal(f.g.save.buildings.greenhouse,0);const job=f.g.save.construction.jobs.greenhouse;assert.equal(job.fromLevel,0);assert.equal(job.toLevel,1);assert.equal(job.paidCost,90);assert.equal(job.durationMs,10000);assert.equal(job.finishesAt-job.startedAt,10000);const persisted=JSON.parse(f.map.get(SAVE_KEY));assert.equal(persisted.buildings.greenhouse,0);assert.deepEqual(persisted.construction.jobs.greenhouse,job);assert.equal(f.g.save.coins,50);assert.equal(f.g.screen,'village');}else noSave(f);
 });
});

test('focused controls and inherited contenteditable preserve typing and repeated defaults without placement shortcuts',()=>{
 const editable=element('div',{contenteditable:'plaintext-only'}),targets=[element('input'),element('select'),element('textarea'),element('div',{contenteditable:''}),element('span',{},editable)];
 for(const target of targets)withPlacement(f=>{
  for(const code of ['Enter','Space','KeyR','ArrowUp','ArrowRight','KeyW'])for(const repeat of [false,true]){f.g.keys.add(code);assert.equal(f.key(code,target,repeat).defaultPrevented,false);assert.equal(f.g.keys.size,0);assert.deepEqual(f.g.placement.position,f.before.position);}
  noSave(f);
 });
});

test('button/link/role-button focus bypasses R and arrows without leaving held keys',()=>{
 for(const control of [element('button'),element('a',{href:'#placement'}),element('div',{role:'button'}),element('span',{role:'link'})])withPlacement(f=>{
  for(const code of ['KeyR','ArrowUp','ArrowRight','Space']){assert.equal(f.key(code,element('span',{},control)).defaultPrevented,false);assert.deepEqual(f.g.placement.position,f.before.position);assert.equal(f.g.keys.size,0);}noSave(f);
 });
});

test('Escape cancels placement from a focused button or editable field and its repeat cannot cancel again',()=>{
 for(const target of [element('button'),element('input'),element('div',{contenteditable:'true'})])withPlacement(f=>{
  f.key('Escape',target);assert.equal(f.g.placement,null);assert.equal(f.g.screen,'village');assert.equal(f.world.cancelled,1);assert.equal(f.key('Escape',target,true).defaultPrevented,true);assert.equal(f.world.cancelled,1);noSave(f);
 });
});

test('canvas placement rotation, half-unit arrows and confirmation consume defaults and keep held keys empty',()=>withPlacement(f=>{
 const original={...f.g.placement.position};assert.equal(f.key('KeyR').defaultPrevented,true);assert.equal(f.g.placement.position.rotation,(original.rotation+Math.PI/2)%(Math.PI*2));assert.equal(f.key('KeyR',f.canvas,true).defaultPrevented,true);assert.equal(f.g.placement.position.rotation,(original.rotation+Math.PI/2)%(Math.PI*2));
 assert.equal(f.key('ArrowRight').defaultPrevented,true);assert.equal(f.g.placement.position.x,original.x+.5);assert.equal(f.key('ArrowRight',f.canvas,true).defaultPrevented,true);assert.equal(f.g.placement.position.x,original.x+1);assert.equal(f.g.keys.size,0);noSave(f);
 assert.equal(f.key('Enter').defaultPrevented,true);assert.equal(f.g.screen,'village');assert.equal(f.g.placement,null);assert.equal(f.g.save.buildings.greenhouse,0);const job=f.g.save.construction.jobs.greenhouse;assert.equal(job.fromLevel,0);assert.equal(job.toLevel,1);assert.equal(job.paidCost,90);assert.equal(job.durationMs,10000);assert.equal(job.finishesAt-job.startedAt,10000);const persisted=JSON.parse(f.map.get(SAVE_KEY));assert.equal(persisted.buildings.greenhouse,0);assert.deepEqual(persisted.construction.jobs.greenhouse,job);assert.equal(f.g.save.coins,50);assert.equal(f.g.save.buildingPositions.greenhouse.x,original.x+1);assert.equal(f.g.keys.size,0);
 const storage=Object.fromEntries(f.map),writeCount=f.writes.length;assert.equal(f.key('Enter',f.canvas,true).defaultPrevented,true);assert.deepEqual(Object.fromEntries(f.map),storage);assert.equal(f.writes.length,writeCount);
}));

test('tabbable touch role-group still receives gameplay controls and keyup always releases movement',()=>withPlacement(f=>{
 f.g.cancelPlacement();f.g.mode='run';f.g.screen='';let boosts=0;f.g.boost=()=>boosts++;const group=element('div',{role:'group',tabindex:'0'});
 assert.equal(f.key('ArrowUp',group).defaultPrevented,true);assert.equal(f.g.keys.has('ArrowUp'),true);f.keyup('ArrowUp',element('input'));assert.equal(f.g.keys.has('ArrowUp'),false);
 assert.equal(f.key('Space',group).defaultPrevented,true);assert.equal(boosts,1);assert.equal(f.key('Space',group,true).defaultPrevented,true);assert.equal(boosts,1);f.keyup('Space',group);assert.equal(f.g.keys.size,0);
 assert.equal(f.key('KeyW',element('input')).defaultPrevented,false);assert.equal(f.g.keys.size,0);
}));

test('persistent active battle HUD focus retains movement and skills while native Space activates only once',()=>{
 for(const control of [element('button'),element('a',{href:'#battle'}),element('div',{role:'button'})])withPlacement(f=>{
  f.g.cancelPlacement();f.g.mode='run';f.g.screen='';const skills={boost:0,shield:0,repair:0};for(const skill of Object.keys(skills))f.g[skill]=()=>skills[skill]++;
  const target=element('span',{},control);
  for(const code of ['KeyW','KeyD','ArrowUp','ArrowRight']){const event=f.key(code,target);assert.equal(event.defaultPrevented,code.startsWith('Arrow'));assert.equal(f.g.keys.has(code),true);f.keyup(code,target);assert.equal(f.g.keys.size,0);}
  for(const [code,skill]of [['Digit1','shield'],['Digit2','repair']]){f.key(code,target);assert.equal(skills[skill],1);assert.equal(f.key(code,target,true).defaultPrevented,true);assert.equal(skills[skill],1);f.keyup(code,target);}
  assert.equal(f.key('Space',target).defaultPrevented,false);assert.equal(skills.boost,0);f.ui.action('boost',control);assert.equal(skills.boost,1);assert.equal(f.key('Space',target,true).defaultPrevented,true);assert.equal(skills.boost,1);assert.equal(f.g.keys.size,0);
  for(const code of ['KeyW','Digit1','Space'])assert.equal(f.key(code,element('input'),true).defaultPrevented,false);assert.deepEqual(skills,{boost:1,shield:1,repair:1});assert.equal(f.g.keys.size,0);
 });
});

test('Ctrl Alt and Meta browser combinations bypass placement shortcuts and do not leave held keys',()=>withPlacement(f=>{
 for(const [code,modifiers]of [['KeyR',{ctrlKey:true}],['Enter',{ctrlKey:true}],['ArrowLeft',{altKey:true}],['KeyR',{metaKey:true}]])for(const repeat of [false,true]){
  f.g.keys.add(code);assert.equal(f.key(code,f.canvas,repeat,modifiers).defaultPrevented,false);assert.deepEqual(f.g.placement.position,f.before.position);assert.equal(f.g.screen,'placement');noSave(f);
 }
 assert.equal(f.key('KeyR',f.canvas,false,{shiftKey:true}).defaultPrevented,true);assert.equal(f.g.placement.position.rotation,(f.before.position.rotation+Math.PI/2)%(Math.PI*2));noSave(f);
}));

test('modified controls and active battle shortcuts preserve native defaults while Shift movement remains active',()=>withPlacement(f=>{
 const input=element('input');for(const code of ['Enter','KeyR','Space'])assert.equal(f.key(code,input,true,{ctrlKey:true}).defaultPrevented,false);noSave(f);
 f.g.cancelPlacement();f.g.mode='run';f.g.screen='';let skills=0;for(const name of ['boost','shield','repair'])f.g[name]=()=>skills++;
 const button=element('button');for(const [code,modifiers]of [['KeyW',{ctrlKey:true}],['ArrowRight',{altKey:true}],['Space',{metaKey:true}],['Digit1',{ctrlKey:true}],['Digit2',{altKey:true}]])for(const target of [f.canvas,button,input]){
  f.g.keys.add(code);assert.equal(f.key(code,target,true,modifiers).defaultPrevented,false);assert.equal(f.g.keys.size,0);assert.equal(skills,0);
 }
 assert.equal(f.key('KeyW',button,false,{shiftKey:true}).defaultPrevented,false);assert.equal(f.g.keys.has('KeyW'),true);f.keyup('KeyW',input);assert.equal(f.g.keys.size,0);noSave(f);
}));
