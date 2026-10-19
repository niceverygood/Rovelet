import test from 'node:test';
import assert from 'node:assert/strict';
import {BossBars} from '../src/boss-bars.js';
import {BOSS_PROFILES} from '../src/bosses.js';
import {getLanguage,setLanguage,t} from '../src/i18n.js';

class Element{
 constructor(tag,ownerDocument){this.tagName=tag;this.ownerDocument=ownerDocument;this.children=[];this.parentNode=null;this.dataset={};this.attributes=new Map();this.className='';this.hidden=false;this.attributeWrites=0;this.textWrites=0;this.styleWrites=0;this.style=new Proxy({},{set:(target,key,value)=>{this.styleWrites++;target[key]=value;return true;}});this._text='';}
 append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parentNode=this;}}
 remove(){if(!this.parentNode)return;const parent=this.parentNode;parent.children.splice(parent.children.indexOf(this),1);this.parentNode=null;}
 setAttribute(key,value){this.attributeWrites++;this.attributes.set(key,String(value));}
 getAttribute(key){return this.attributes.get(key)??null;}
 set textContent(value){this.textWrites++;this._text=String(value);}
 get textContent(){return this.children.length?this.children.map(child=>child.textContent).join(''):this._text;}
}
function setup(){const document={created:0,createElement(tag){this.created++;return new Element(tag,this);}},container=document.createElement('div');return {document,container,bars:new BossBars()};}
function boss(id='a'){return {id,kind:'boss',hp:100,maxHp:100,bossRole:'mid',boss:{profile:{name:'Sentinel'},phase:0}};}

test('boss panels retain their nodes and avoid repeated DOM writes for unchanged actors',()=>{
 const {document,container,bars}=setup(),a=boss(),b=boss('b');bars.update(container,[a,b,{id:'ordinary',hp:100}]);
 const entry=bars.nodes.get('a'),created=document.created,writes=[entry.name.textWrites,entry.phase.textWrites,entry.track.attributeWrites,entry.fill.styleWrites];
 assert.equal(container.children.length,2);assert.equal(entry.panel.className,'boss-panel');assert.equal(entry.panel.children[0].tagName,'b');assert.equal(entry.name.tagName,'span');assert.equal(entry.phase.tagName,'small');assert.equal(entry.track.className,'boss-track');assert.equal(entry.track.getAttribute('role'),'progressbar');assert.equal(entry.fill.tagName,'i');
 for(let i=0;i<600;i++)bars.update(container,[a,b]);
 assert.equal(bars.nodes.get('a'),entry);assert.equal(container.children[0],entry.panel);assert.equal(document.created,created);assert.deepEqual([entry.name.textWrites,entry.phase.textWrites,entry.track.attributeWrites,entry.fill.styleWrites],writes);
});

test('health, phase, role and names update in place with accessible health values',()=>{
 const {container,bars}=setup(),enemy=boss();bars.update(container,[enemy]);const entry=bars.nodes.get(enemy.id);
 enemy.hp=50.2;enemy.maxHp=200;enemy.boss.phase=1;enemy.bossRole='final';enemy.boss.profile.name='<Strong & steady>';bars.update(container,[enemy]);
 assert.equal(bars.nodes.get(enemy.id),entry);assert.equal(entry.name.textContent,'<Strong & steady>');assert.equal(entry.track.getAttribute('aria-label'),'<Strong & steady>');assert.equal(entry.track.getAttribute('aria-valuenow'),'51');assert.equal(entry.track.getAttribute('aria-valuemax'),'200');assert.equal(entry.fill.style.transform,'scaleX(0.251)');assert.equal(entry.phase.textContent,t('ui.118')+' · '+t('hud.bossPhase').replace('{phase}',2));
 enemy.hp=300;bars.update(container,[enemy]);assert.equal(entry.track.getAttribute('aria-valuenow'),'200');assert.equal(entry.fill.style.transform,'scaleX(1)');
});

test('existing panel names and phase labels follow language changes without HTML fragments',()=>{
 const previous=getLanguage();try{setLanguage('ko');const {container,bars}=setup(),enemy=boss();enemy.boss.profile=BOSS_PROFILES['meadow-1-mid'];bars.update(container,[enemy]);const entry=bars.nodes.get(enemy.id),name=entry.name.textContent;
  assert.ok(!/[<>]/.test(entry.phase.textContent));setLanguage('en');bars.update(container,[enemy]);assert.equal(bars.nodes.get(enemy.id),entry);assert.notEqual(entry.name.textContent,name);assert.equal(entry.name.textContent,enemy.boss.profile.name);assert.equal(entry.phase.textContent,t('ui.119')+' · Phase 1');assert.equal(entry.track.getAttribute('aria-label'),enemy.boss.profile.name);
 }finally{setLanguage(previous);}
});

test('dead or missing bosses are removed while surviving panels retain identity',()=>{
 const {container,bars}=setup(),a=boss(),b=boss('b');bars.update(container,[a,b]);const old=bars.nodes.get('a'),survivor=bars.nodes.get('b');a.hp=0;bars.update(container,[a,b]);assert.equal(old.panel.parentNode,null);assert.equal(bars.nodes.has('a'),false);assert.equal(bars.nodes.get('b'),survivor);assert.equal(container.children.length,1);bars.update(container,[]);assert.equal(container.children.length,0);assert.equal(bars.nodes.size,0);
});

test('HUD container replacement clears obsolete nodes and inactive updates keep panels hidden',()=>{
 const {document,container,bars}=setup(),enemy=boss();bars.update(container,[enemy]);const old=bars.nodes.get(enemy.id);bars.update(container,[enemy],false);assert.equal(container.hidden,true);assert.equal(bars.nodes.get(enemy.id),old);bars.update(container,[enemy]);assert.equal(container.hidden,false);assert.equal(bars.nodes.get(enemy.id),old);
 const replacement=document.createElement('div');bars.update(replacement,[enemy]);assert.equal(container.children.length,0);assert.equal(old.panel.parentNode,null);assert.notEqual(bars.nodes.get(enemy.id),old);assert.equal(replacement.children.length,1);bars.update(null,[]);assert.equal(replacement.children.length,0);assert.equal(bars.nodes.size,0);assert.equal(bars.container,null);
});
