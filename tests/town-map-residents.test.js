import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UI} from '../src/ui.js';
import {freshSave} from '../src/data.js';
import {mapPoint} from '../src/map-theme.js';
import {getLanguage,setLanguage} from '../src/i18n.js';

function mapHost(writes){
 let html='';return {circles:[],buttons:[],renders:0,scrollTop:0,className:'',
  get innerHTML(){return html;},set innerHTML(value){html=value;this.renders++;for(const node of this.circles)node.isConnected=false;this.circles=[];this.buttons=[];
   for(const match of html.matchAll(/<circle\b([^>]*)\/?\s*>/g)){const attrs=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(item=>[item[1],item[2]]));if(!Object.hasOwn(attrs,'data-town-resident'))continue;this.circles.push({attrs,isConnected:true,getAttribute:key=>attrs[key]??null,setAttribute(key,value){writes.push([attrs['data-town-resident'],key,String(value)]);attrs[key]=String(value);}});}
   for(const match of html.matchAll(/<button\b[^>]*data-action="building"[^>]*>/g))this.buttons.push({markup:match[0]});
  },querySelectorAll(selector){return selector==='[data-town-resident]'?this.circles:[];},querySelector(){return null;},contains(node){return this.circles.includes(node);}
 };
}
function withMap(check,{reducedMotion=false}={}){
 const previous={document:globalThis.document,language:getLanguage()},writes=[],screens=mapHost(writes),save=freshSave();save.settings.reducedMotion=reducedMotion;
 globalThis.document={baseURI:'http://127.0.0.1:4176/',documentElement:{lang:'ko'},title:'',activeElement:null,querySelector:()=>null,body:{dataset:{},classList:{toggle(){}}}};
 const hudNode={style:{},classList:{toggle(){}},textContent:''},hud={innerHTML:'',querySelector:()=>hudNode,querySelectorAll:()=>[]};
 const people=Array.from({length:9},(_,i)=>({root:{position:new THREE.Vector3(i*.2,0,-i*.15)}})),g={save,screen:'town-map',mode:'village',enemies:[],world:{residents:{people},project(){return {};}}},ui=Object.create(UI.prototype);
 Object.assign(ui,{game:g,screens,hud,elapsed:0,enemyBars:{update(){}},bossBars:{update(){}}});g.show=screen=>{g.screen=screen;ui.renderScreen();};
 try{ui.renderScreen();assert.equal(screens.circles.length,9);const before=structuredClone(save);check({ui,g,screens,writes,people});assert.deepEqual(save,before);}finally{globalThis.document=previous.document;setLanguage(previous.language);}
}
const coordinates=node=>({x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy'))});

test('stationary town residents perform no DOM writes and retain modal focus scroll and buttons',()=>withMap(f=>{
 const nodes=[...f.screens.circles],buttons=[...f.screens.buttons],cache=f.ui.townMapResidents;document.activeElement=buttons[0];f.screens.scrollTop=81;
 for(let i=0;i<100;i++)f.ui.update(.1);
 assert.equal(f.screens.renders,1);assert.deepEqual(f.writes,[]);assert.deepEqual(f.screens.circles,nodes);assert.deepEqual(f.screens.buttons,buttons);assert.equal(f.ui.townMapResidents,cache);assert.equal(document.activeElement,buttons[0]);assert.equal(f.screens.scrollTop,81);
}));

test('moving residents update exact live map coordinates with at most two attribute writes each',()=>withMap(f=>{
 const nodes=[...f.screens.circles],button=f.screens.buttons[0];document.activeElement=button;f.screens.scrollTop=72;
 for(const person of f.people){person.root.position.x+=1;person.root.position.z+=2;}f.ui.updateTownMapResidents();assert.equal(f.writes.length,18);
 for(let i=0;i<9;i++)assert.deepEqual(coordinates(nodes[i]),mapPoint(f.people[i].root.position.x,f.people[i].root.position.z));
 f.writes.length=0;f.ui.updateTownMapResidents();assert.deepEqual(f.writes,[]);f.people[0].root.position.x+=1;f.ui.updateTownMapResidents();assert.deepEqual(f.writes.map(write=>write[1]),['cx']);
 assert.equal(f.screens.renders,1);assert.deepEqual(f.screens.circles,nodes);assert.equal(document.activeElement,button);assert.equal(f.screens.scrollTop,72);
}));

test('resident movement uses the existing UI cadence instead of rebuilding the modal each frame',()=>withMap(f=>{
 f.people[0].root.position.set(2,0,3);f.ui.update(.04);f.ui.update(.04);assert.deepEqual(f.writes,[]);f.ui.update(.02);assert.equal(f.writes.length,2);assert.deepEqual(coordinates(f.screens.circles[0]),mapPoint(2,3));
 f.writes.length=0;f.people[0].root.position.x=4;f.ui.update(.04);f.ui.update(.04);assert.deepEqual(f.writes,[]);f.ui.update(.02);assert.deepEqual(f.writes.map(write=>write[1]),['cx']);assert.equal(f.screens.renders,1);
}));

test('town dots retain existing clamping and skip nonfinite live positions',()=>withMap(f=>{
 f.people[0].root.position.set(100,0,-100);f.people[1].root.position.set(-100,0,100);f.ui.updateTownMapResidents();assert.deepEqual(coordinates(f.screens.circles[0]),{x:100,y:0});assert.deepEqual(coordinates(f.screens.circles[1]),{x:0,y:100});
 const previous=coordinates(f.screens.circles[2]);f.writes.length=0;f.people[2].root.position.set(NaN,0,Infinity);f.ui.updateTownMapResidents();assert.deepEqual(coordinates(f.screens.circles[2]),previous);assert.deepEqual(f.writes,[]);
}));

test('town dots follow the current world resident array after replacement and reordering',()=>withMap(f=>{
 const replacement=f.people.map((_,i)=>({root:{position:new THREE.Vector3(12-i,0,i-10)}})).reverse();f.g.world.residents.people=replacement;f.ui.updateTownMapResidents();assert.ok(f.writes.length<=18);
 for(let i=0;i<9;i++)assert.deepEqual(coordinates(f.screens.circles[i]),mapPoint(replacement[i].root.position.x,replacement[i].root.position.z));assert.equal(f.screens.renders,1);
}));

test('leaving and reopening the map releases detached nodes and binds newly rendered resident dots',()=>withMap(f=>{
 const oldNodes=[...f.screens.circles],oldCoordinates=oldNodes.map(coordinates);f.g.show('village');assert.equal(f.ui.townMapResidents,null);f.people[0].root.position.x+=4;f.ui.updateTownMapResidents();assert.deepEqual(f.writes,[]);assert.deepEqual(oldNodes.map(coordinates),oldCoordinates);
 f.g.show('town-map');assert.equal(f.ui.townMapResidents.length,9);assert.notEqual(f.screens.circles[0],oldNodes[0]);assert.deepEqual(coordinates(f.screens.circles[0]),mapPoint(f.people[0].root.position.x,f.people[0].root.position.z));f.ui.updateTownMapResidents();assert.deepEqual(f.writes,[]);
 f.people[0].root.position.z+=1;f.ui.updateTownMapResidents();assert.deepEqual(f.writes.map(write=>write[1]),['cy']);assert.deepEqual(oldNodes.map(coordinates),oldCoordinates);
}));

test('language rerender replaces the cache once and updates only the new translated map',()=>withMap(f=>{
 const oldNodes=[...f.screens.circles],oldCoordinates=oldNodes.map(coordinates),oldMarkup=f.screens.innerHTML;setLanguage('en');f.ui.renderScreen();assert.notEqual(f.screens.innerHTML,oldMarkup);assert.notEqual(f.ui.townMapResidents[0].node,oldNodes[0]);f.ui.updateTownMapResidents();assert.deepEqual(f.writes,[]);
 f.people[1].root.position.x+=1;f.ui.updateTownMapResidents();assert.equal(f.writes.length,1);assert.deepEqual(oldNodes.map(coordinates),oldCoordinates);assert.equal(f.screens.renders,2);
}));

test('external map DOM replacement drops stale references before any detached attribute writes',()=>withMap(f=>{
 const oldNodes=[...f.screens.circles],oldCoordinates=oldNodes.map(coordinates);f.screens.innerHTML='<div>another panel</div>';f.people[0].root.position.x+=4;f.ui.updateTownMapResidents();assert.equal(f.ui.townMapResidents,null);assert.deepEqual(f.writes,[]);assert.deepEqual(oldNodes.map(coordinates),oldCoordinates);
}));

test('reduced motion still maps resident translation without adding modal renders',()=>withMap(f=>{
 f.people[0].root.position.set(-3,0,2);f.ui.update(.1);assert.deepEqual(coordinates(f.screens.circles[0]),mapPoint(-3,2));assert.equal(f.writes.length,2);assert.equal(f.screens.renders,1);
},{reducedMotion:true}));
