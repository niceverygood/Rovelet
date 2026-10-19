import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {UI} from '../src/ui.js';
import {freshSave} from '../src/data.js';
import {prepareConstructionStart} from '../src/construction.js';
import {layoutFor} from '../src/village-layout.js';
import {getLanguage,setLanguage,t} from '../src/i18n.js';

function fixture(language,check,{reserved=false}={}){
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),priorLanguage=getLanguage();
 const status={textContent:'',invalid:null,classList:{toggle(name,value){assert.equal(name,'invalid');status.invalid=value;}}},confirm={disabled:null};
 globalThis.document={documentElement:{lang:language},title:'',querySelector:s=>s==='#placement-status'?status:s==='[data-action="place-confirm"]'?confirm:null};
 try{setLanguage(language);let save=freshSave();if(reserved){save.coins=1000;const proposal=prepareConstructionStart(save,'smithy',{id:'declared-pending-smithy',now:100000,position:layoutFor(save).smithy});assert.equal(proposal.ok,true);save=proposal.next;}
  const g={mode:'village',save,construction:{blocked:()=>null},world:{villageDecorObstacles:()=>[],previewBuilding(){},setPreview(){}},show(screen){this.screen=screen;}},ui={game:g,toast(){},updatePlacement(){UI.prototype.updatePlacement.call(this);}};g.ui=ui;
  const before=structuredClone(save);Game.prototype.beginPlacement.call(g,'greenhouse');assert.equal(g.screen,'placement');check({g,ui,status,confirm,before});assert.deepEqual(g.save,before,'Displaying placement feedback never spends or persists');
 }finally{setLanguage(priorLanguage);if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
}
for(const language of ['ko','en']){
 test(language+' actual construction valid placement displays localized success rather than undefined',()=>fixture(language,({g,ui,status,confirm})=>{assert.equal(g.placement.status.ok,true);assert.equal(g.placement.status.reason,undefined);ui.updatePlacement();assert.equal(status.textContent,t('village-layout.283')+' · 7.0, 0.0');assert.equal(status.invalid,false);assert.equal(confirm.disabled,false);}));
 test(language+' actual boundary rejection displays its localized reason and stays disabled',()=>fixture(language,({g,ui,status,confirm})=>{g.placement.position.x=14;Game.prototype.refreshPlacement.call(g);assert.equal(g.placement.status.reason,'invalid-position');assert.equal(status.textContent,t('village-layout.281')+' · 14.0, 0.0');assert.equal(status.invalid,true);assert.equal(confirm.disabled,true);ui.updatePlacement();assert.ok(!status.textContent.includes('invalid-position'));}));
 test(language+' actual plaza overlap displays localized overlap and preserves the rejection',()=>fixture(language,({g,status,confirm})=>{Object.assign(g.placement.position,{x:0,z:0});Game.prototype.refreshPlacement.call(g);assert.equal(g.placement.status.reason,'invalid-position');assert.equal(status.textContent,t('village-layout.282')+' · 0.0, 0.0');assert.equal(status.invalid,true);assert.equal(confirm.disabled,true);}));
 test(language+' pending construction plot displays localized overlap without exposing its code',()=>fixture(language,({g,status,confirm})=>{Object.assign(g.placement.position,layoutFor(g.save).smithy);Game.prototype.refreshPlacement.call(g);assert.equal(g.placement.status.reason,'construction-plot-reserved');assert.equal(status.textContent,t('village-layout.282')+' · 4.0, -7.0');assert.equal(status.invalid,true);assert.equal(confirm.disabled,true);},{reserved:true}));
 test(language+' already localized legacy reasons remain intact',()=>fixture(language,({g,ui,status,confirm})=>{g.placement.status={ok:false,reason:t('village-layout.281')};ui.updatePlacement();assert.equal(status.textContent,t('village-layout.281')+' · 7.0, 0.0');assert.equal(confirm.disabled,true);}));
 test(language+' coordinate formatting and locked hint preserve their original values',()=>fixture(language,({g,ui,status})=>{Object.assign(g.placement.position,{x:7.125,z:.25});g.placement.locked=true;ui.updatePlacement();assert.equal(status.textContent,t('village-layout.283')+' · 7.1, 0.3'+t('ui.280'));}));
}
test('no active placement performs no DOM writes',()=>{let queried=false;const prior=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={querySelector(){queried=true;throw Error('No placement should query');}};try{UI.prototype.updatePlacement.call({game:{placement:null}});assert.equal(queried,false);}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}});
