import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game.js';
import {UI} from '../src/ui.js';
import {freshSave,SAVE_KEY} from '../src/data.js';
import {RUN_KEY} from '../src/checkpoint.js';
import {villageStats} from '../src/village-stats.js';
import {getLanguage,setLanguage,t} from '../src/i18n.js';

function withUI(check){
 const old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,language:getLanguage()},windowListeners=new Map(),documentListeners=new Map(),storage=new Map(),writes=[],focusCalls=[];
 const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,[]);map.get(name).push(fn);};
 let screens;
 function node(tag='div',attrs={},host=null){
  const n={tag,attrs,host,style:{},children:[],isConnected:true,hidden:false,scrollTop:0,disabled:false,offscreen:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},
   dataset:Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5),value])),
   getAttribute:key=>Object.hasOwn(attrs,key)?attrs[key]:null,setAttribute(key,value){attrs[key]=String(value);},get tabIndex(){return Number(attrs.tabindex??-1);},set tabIndex(value){attrs.tabindex=String(value);},
   matches(selector){return selector.split(',').some(part=>{const match=part.trim().match(/^([a-z]+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);return !!match&&(!match[1]||match[1]===tag)&&(!match[2]||Object.hasOwn(attrs,match[2])&&(match[3]===undefined||attrs[match[2]]===match[3]));});},
   closest(selector){if(selector==='[hidden],[inert]')return this.hidden?this:this.host?.inert?this.host:null;return this.matches(selector)?this:null;},
   getClientRects(){return this.hidden||!this.isConnected||this.host?.inert?[]:[this.getBoundingClientRect()];},
   getBoundingClientRect(){return {top:this.offscreen?500:30,bottom:this.offscreen?540:60,left:10,right:150};},
   focus(options){focusCalls.push({node:this,options});if(!this.isConnected||this.disabled||this.host?.inert)return;document.activeElement=this;if(this.offscreen&&!options?.preventScroll){(this.host.modal??this.host).scrollTop=200;this.offscreen=false;}},
   scrollIntoView(){if(this.host)(this.host.modal??this.host).scrollTop=200;this.offscreen=false;},
   append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},querySelector(){return null;},querySelectorAll(){return [];}
  };return n;
 }
 function parseControls(html,host){return [...html.matchAll(/<(button|input|select|textarea|a)\b([^>]*)>/g)].map(match=>{const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(item=>[item[1],item[2]])),n=node(match[1],attrs,host);n.disabled=/\sdisabled(?:\s|$)/.test(match[2]);return n;});}
 screens=node();screens.inert=true;screens.controls=[];screens.modal=null;let screenHTML='';
 Object.defineProperty(screens,'innerHTML',{get:()=>screenHTML,set(value){screenHTML=value;for(const control of screens.controls)control.isConnected=false;screens.controls=parseControls(value,screens);screens.modal=value.includes('class="modal')?node():null;if(screens.modal)screens.modal.getBoundingClientRect=()=>({top:0,bottom:400,left:0,right:600});}});
 screens.getBoundingClientRect=()=>({top:0,bottom:400,left:0,right:600});screens.contains=target=>screens.controls.includes(target)||target===screens;
 screens.querySelectorAll=selector=>selector==='[data-town-resident]'?[]:selector==='[data-setting]'?screens.controls.filter(n=>n.getAttribute('data-setting')!==null):screens.controls;
 screens.querySelector=selector=>{if(selector==='.modal')return screens.modal;if(selector==='.settings-list')return {insertAdjacentHTML(_position,html){screens.controls.unshift(...parseControls(html,screens));},querySelector:selector=>screens.querySelector(selector)};return screens.controls.find(n=>n.matches(selector))??null;};
 const hud=node();hud.inert=true;const hudValue=node();hud.querySelector=()=>hudValue;hud.querySelectorAll=()=>[hudValue];hudValue.querySelector=()=>hudValue;
 const canvas=node('canvas'),toasts=node(),body=node();body.dataset={};body.getBoundingClientRect=()=>({top:0,bottom:800,left:0,right:600});
 globalThis.document={baseURI:'http://127.0.0.1:4176/',documentElement:{lang:'ko'},title:'',hidden:false,activeElement:body,body,
  addEventListener:(name,fn)=>listen(documentListeners,name,fn),querySelector(selector){return selector==='#hud'?hud:selector==='#screens'?screens:selector==='#scene canvas'?canvas:selector==='#toasts'?toasts:screens.querySelector(selector);},
  createElement(tag){const root=node(tag),stick=node('span');root.querySelector=()=>stick;return root;}
 };
 globalThis.window={addEventListener:(name,fn)=>listen(windowListeners,name,fn)};
 const save=freshSave();save.settings.sound=false;storage.set(SAVE_KEY,JSON.stringify(save));storage.set(SAVE_KEY+':backup',JSON.stringify({...save,coins:130}));
 const run={id:'earned-upgrade-regression',stageId:'meadow-1',duration:360,time:49.9,stage:1,level:2,hp:200,maxHp:220,coins:7,kills:3,xp:0,weapons:{cannon:1},cooldowns:{cannon:.1},villageStats:villageStats(save),outcome:null,choices:[{type:'weapon',key:'frostbomb',level:1},{type:'weapon',key:'fireball',level:1},{type:'weapon',key:'tornado',level:1}],boostCd:0,boostTime:0,shieldCd:0,shieldTime:0,repairCd:0,invuln:0,midSpawned:false,midDefeated:false,bossSpawned:false};
 const checkpoint={version:1,run,screen:'upgrade',position:[1,0,2],rotation:.4,enemies:[],loot:[]};storage.set(RUN_KEY,JSON.stringify(checkpoint));storage.set(RUN_KEY+':backup',JSON.stringify(checkpoint));
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{writes.push(['set',key]);storage.set(key,String(value));},removeItem:key=>{writes.push(['remove',key]);storage.delete(key);}};
 const world={actors:new THREE.Group(),cameraTarget:new THREE.Vector3(),residents:{people:[]},updateBuildings(){},clearActors(){this.actors.clear();},setHome(){},setRegion(){},update(){},cancelPreview(){},castle(){const root=new THREE.Group();root.userData.model=new THREE.Group();root.add(root.userData.model);this.actors.add(root);return root;},ring:()=>new THREE.Group(),project:()=>({visible:false})};
 try{
  const g=new Game(world),ui=new UI(g);g.rebuildAttachments=()=>{};ui.enemyBars={update(){}};ui.bossBars={update(){}};
  const event=(code,options={})=>({code,target:document.activeElement,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...options});
  const key=(code,options={})=>{const e=event(code,options);for(const listener of documentListeners.get('keydown')??[])listener(e);for(const listener of windowListeners.get('keydown')??[])listener(e);return e;};
  const snapshot=()=>({screen:g.screen,mode:g.mode,save:structuredClone(g.save),run:structuredClone(g.run),checkpoint:structuredClone(g.checkpoint),storage:Object.fromEntries(storage)});
  check({g,ui,hud,screens,canvas,body,toasts,storage,writes,focusCalls,event,key,snapshot,documentListeners});
 }finally{for(const toast of toasts.children)clearTimeout(toast.toastTimer);globalThis.window=old.window;globalThis.document=old.document;globalThis.localStorage=old.localStorage;setLanguage(old.language);}
}

test('actual UI constructor and zero-duration warmup retain boot inert until the explicit ready handoff',()=>withUI(f=>{
 assert.equal(f.ui.inputReady,false);assert.equal(f.hud.inert,true);assert.equal(f.screens.inert,true);const before=f.snapshot();f.g.update(0);for(let i=0;i<20;i++){f.ui.handleModalKeydown(f.event('Tab'));f.key('Enter');}assert.deepEqual(f.snapshot(),before);assert.equal(f.focusCalls.length,0);assert.equal(f.hud.inert,true);assert.equal(f.screens.inert,true);
 f.ui.enableInteraction();assert.equal(f.ui.inputReady,true);assert.equal(f.hud.inert,false);assert.equal(f.screens.inert,false);assert.equal(f.focusCalls.length,0);assert.deepEqual(f.writes,[]);
}));

test('mandatory upgrade rejects every stale pause/resume/retreat action without changing its checkpoint or reward state',()=>withUI(f=>{
 assert.equal(f.g.resumeRun(),true);f.ui.enableInteraction();const before=f.snapshot();assert.equal(f.hud.inert,true);assert.equal(f.screens.inert,false);assert.equal(document.activeElement.getAttribute('data-action'),'choose');
 for(const action of ['pause','resume','retreat','confirm-retreat'])for(let i=0;i<2;i++)f.ui.action(action);assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.writes,[]);
 f.ui.action('choose',{dataset:{index:'0'}});assert.equal(f.g.screen,'');assert.equal(f.g.run.time,49.9);assert.equal(f.g.run.weapons.frostbomb,1);assert.equal(f.g.run.weapons.cannon,1);assert.equal(document.activeElement,f.canvas);assert.equal(f.canvas.tabIndex,-1);assert.equal(f.hud.inert,false);assert.deepEqual(Object.fromEntries(f.storage),before.storage);assert.deepEqual(f.g.save,before.save);
 let boosts=0;f.g.boost=()=>boosts++;f.key('Space');assert.equal(boosts,1);assert.equal(f.g.screen,'');
}));

test('terminal result cannot be turned into a pause or blank terminal battle by stale actions',()=>withUI(f=>{
 f.g.mode='run';f.g.run={...structuredClone(f.g.checkpoint.run),outcome:'victory',settled:true,reward:140,rewardBreakdown:{base:140,bonus:0,multiplier:1}};f.g.show('result');f.ui.enableInteraction();const before=f.snapshot();
 for(const action of ['pause','resume','retreat','confirm-retreat'])f.ui.action(action);assert.deepEqual(f.snapshot(),before);assert.ok(f.screens.controls.some(node=>node.getAttribute('data-action')==='village'));assert.equal(f.hud.inert,true);assert.deepEqual(f.writes,[]);
}));

test('normal live pause resume and retreat cancellation remain valid and confirmation settles only its own screen',()=>withUI(f=>{
 f.g.resumeRun();f.ui.enableInteraction();f.ui.action('choose',{dataset:{index:'0'}});f.ui.action('retreat');assert.equal(f.g.screen,'');f.ui.action('confirm-retreat');assert.equal(f.g.run.outcome,null);
 f.ui.action('pause');assert.equal(f.g.screen,'pause');assert.equal(f.hud.inert,true);f.ui.action('resume');assert.equal(f.g.screen,'');assert.equal(document.activeElement,f.canvas);
 f.ui.action('pause');f.ui.action('retreat');assert.equal(f.g.screen,'retreat');f.ui.action('resume');assert.equal(f.g.screen,'');assert.equal(f.g.run.outcome,null);assert.deepEqual(f.writes,[]);
 f.ui.action('pause');f.ui.action('retreat');f.ui.action('confirm-retreat');assert.equal(f.g.screen,'result');assert.equal(f.g.run.outcome,'retreat');assert.equal(f.g.save.runs,1);const before=f.snapshot();f.ui.action('confirm-retreat');f.ui.action('resume');assert.deepEqual(f.snapshot(),before);
}));

test('non-running and missing-run modes cannot execute battle transition actions',()=>withUI(f=>{
 for(const mode of ['title','village','lab','run']){f.g.mode=mode;f.g.screen='pause';f.g.run=mode==='run'?null:structuredClone(f.g.checkpoint.run);const before=f.snapshot();for(const action of ['pause','resume','retreat','confirm-retreat'])f.ui.action(action);assert.deepEqual(f.snapshot(),before);}assert.deepEqual(f.writes,[]);
}));

test('Tab and ShiftTab stay inside the modal and boundary focus allows offscreen controls to scroll into view',()=>withUI(f=>{
 f.g.resumeRun();f.ui.enableInteraction();const controls=f.ui.modalControls(),first=controls[0],last=controls.at(-1);last.offscreen=true;first.focus();f.focusCalls.length=0;
 const backward=f.event('Tab',{shiftKey:true});f.ui.handleModalKeydown(backward);assert.equal(backward.defaultPrevented,true);assert.equal(document.activeElement,last);assert.equal(f.focusCalls[0].options,undefined);assert.equal(last.offscreen,false);
 const forward=f.event('Tab');f.ui.handleModalKeydown(forward);assert.equal(forward.defaultPrevented,true);assert.equal(document.activeElement,first);assert.equal(f.ui.handleModalKeydown(f.event('Tab')),undefined);const ordinary=f.event('Tab');f.ui.handleModalKeydown(ordinary);assert.equal(ordinary.defaultPrevented,false);
 document.activeElement=f.body;const outside=f.event('Tab');f.ui.handleModalKeydown(outside);assert.equal(outside.defaultPrevented,true);assert.equal(document.activeElement,first);
}));

test('modal Tab ignores disabled hidden and negative-tabindex controls and preserves browser modifier combinations',()=>withUI(f=>{
 f.g.resumeRun();f.ui.enableInteraction();const controls=f.screens.controls;controls[0].disabled=true;controls[1].hidden=true;assert.deepEqual(f.ui.modalControls(),[controls[2]]);controls[2].tabIndex=-1;assert.deepEqual(f.ui.modalControls(),[]);const empty=f.event('Tab');f.ui.handleModalKeydown(empty);assert.equal(empty.defaultPrevented,true);assert.equal(document.activeElement,f.screens);
 const calls=f.focusCalls.length;for(const modifier of ['ctrlKey','altKey','metaKey']){const e=f.event('Tab',{[modifier]:true});f.ui.handleModalKeydown(e);assert.equal(e.defaultPrevented,false);}assert.equal(f.focusCalls.length,calls);
}));

test('settings language rerender keeps the new logical control and both scroll positions without refocusing every UI tick',()=>withUI(f=>{
 f.ui.enableInteraction();f.g.mode='village';f.g.show('settings');const language=f.screens.controls.find(node=>node.getAttribute('data-setting')==='language');language.focus({preventScroll:true});language.value='en';f.screens.scrollTop=42;f.screens.modal.scrollTop=97;f.focusCalls.length=0;
 for(const listener of f.documentListeners.get('change'))listener({target:language});const fresh=f.screens.controls.find(node=>node.getAttribute('data-setting')==='language');assert.notEqual(fresh,language);assert.equal(language.isConnected,false);assert.equal(document.activeElement,fresh);assert.equal(f.screens.scrollTop,42);assert.equal(f.screens.modal.scrollTop,97);assert.equal(f.focusCalls.length,1);assert.deepEqual(f.focusCalls[0].options,{preventScroll:true});assert.equal(f.g.save.settings.language,'en');
 f.focusCalls.length=0;for(let i=0;i<10;i++)f.ui.update(.1);assert.equal(f.focusCalls.length,0);assert.equal(f.screens.scrollTop,42);assert.equal(f.screens.modal.scrollTop,97);
}));

test('modal rerender binds fresh focus nodes while village placement collection and title retain canvas access',()=>withUI(f=>{
 f.g.resumeRun();f.ui.enableInteraction();const old=document.activeElement;f.ui.renderScreen();assert.notEqual(document.activeElement,old);assert.equal(old.isConnected,false);assert.equal(document.activeElement.getAttribute('data-action'),'choose');
 for(const screen of ['title','village','placement','collection']){f.g.mode=screen==='title'?'title':screen==='collection'?'lab':'village';f.g.placement=screen==='placement'?{key:'greenhouse',moving:false,position:{x:7,z:0,rotation:0},status:{ok:true,reason:'ok'}}:null;f.g.show(screen);assert.equal(f.hud.inert,false);assert.equal(f.screens.inert,false);const e=f.event('Tab');f.ui.handleModalKeydown(e);assert.equal(e.defaultPrevented,false);}
}));

test('restoring a pending upgrade clears old notifications and skips only the resume information toast',()=>withUI(f=>{
 const before=f.snapshot();f.ui.toast('earlier exploration information');assert.equal(f.toasts.children.length,1);assert.equal(f.g.resumeRun(),true);assert.equal(f.g.screen,'upgrade');assert.deepEqual(f.g.run.choices,before.checkpoint.run.choices);assert.equal(f.g.run.time,before.checkpoint.run.time);assert.equal(f.toasts.children.length,0);assert.deepEqual(Object.fromEntries(f.storage),before.storage);assert.deepEqual(f.g.save,before.save);
}));

test('restoring an active checkpoint still displays the normal resume information',()=>withUI(f=>{
 f.g.checkpoint={...f.g.checkpoint,screen:'',run:{...f.g.checkpoint.run,choices:[]}};const before=f.snapshot();assert.equal(f.g.resumeRun(),true);assert.equal(f.g.screen,'');assert.equal(f.g.run.id,before.checkpoint.run.id);assert.equal(f.g.run.time,before.checkpoint.run.time);assert.deepEqual(f.toasts.children.map(node=>node.textContent),[t('game.080')]);assert.deepEqual(Object.fromEntries(f.storage),before.storage);
}));

test('a real checkpoint storage failure during the mandatory choice retains its important error notification',()=>withUI(f=>{
 f.g.resumeRun();const before=f.snapshot(),originalSetItem=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key===RUN_KEY)throw Error('explicit checkpoint quota fixture');originalSetItem(key,value);};assert.equal(f.g.checkpointRun(),false);assert.equal(f.g.screen,'upgrade');assert.deepEqual(f.g.run,before.run);assert.deepEqual(f.g.save,before.save);assert.deepEqual(f.g.checkpoint,before.checkpoint);assert.equal(f.storage.get(RUN_KEY),before.storage[RUN_KEY]);assert.deepEqual(f.toasts.children.map(node=>node.textContent),[t('game.079')]);
}));

test('the actual growth choice keeps its growth notification after leaving the upgrade screen',()=>withUI(f=>{
 f.g.resumeRun();f.g.run.choices=[{type:'grow'}];const before=f.snapshot(),stage=f.g.run.stage,maxHp=f.g.run.maxHp;f.ui.action('choose',{dataset:{index:'0'}});assert.equal(f.g.screen,'');assert.equal(f.g.run.stage,stage+1);assert.ok(f.g.run.maxHp>maxHp);assert.equal(f.g.run.time,before.run.time);assert.equal(f.g.run.id,before.run.id);assert.deepEqual(f.toasts.children.map(node=>node.textContent),[t('game.089')]);assert.deepEqual(Object.fromEntries(f.storage),before.storage);assert.deepEqual(f.g.save,before.save);
}));
