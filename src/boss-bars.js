import {t} from './i18n.js';

export class BossBars{
 constructor(){this.container=null;this.nodes=new Map();}
 reset(container){for(const entry of this.nodes.values())entry.panel.remove();this.nodes.clear();this.container=container;}
 create(container,id){
  const document=container.ownerDocument??globalThis.document,panel=document.createElement('div'),heading=document.createElement('b'),name=document.createElement('span'),phase=document.createElement('small'),track=document.createElement('div'),fill=document.createElement('i');
  panel.className='boss-panel';panel.dataset.bossId=id;track.className='boss-track';track.setAttribute('role','progressbar');heading.append(name,phase);track.append(fill);panel.append(heading,track);container.append(panel);
  const entry={panel,name,phase,track,fill};this.nodes.set(id,entry);return entry;
 }
 update(container,enemies,active=true){
  if(this.container!==container)this.reset(container);
  if(!container)return;
  if(container.hidden===active)container.hidden=!active;
  if(!active)return;
  const alive=new Set();
  for(const enemy of enemies){
   if(enemy.hp<=0||!enemy.boss)continue;
   alive.add(enemy.id);const entry=this.nodes.get(enemy.id)??this.create(container,enemy.id),name=enemy.boss.profile.name,phase=(enemy.bossRole==='mid'?t('ui.119'):t('ui.118'))+' · '+t('hud.bossPhase').replace('{phase}',enemy.boss.phase+1),maxHp=Math.max(1,enemy.maxHp),hp=Math.max(0,Math.min(enemy.hp,maxHp)),now=Math.min(maxHp,Math.ceil(hp)),fraction=hp/maxHp;
   if(entry.lastName!==name){entry.name.textContent=name;entry.track.setAttribute('aria-label',name);entry.lastName=name;}
   if(entry.lastPhase!==phase){entry.phase.textContent=phase;entry.lastPhase=phase;}
   if(entry.lastNow!==now){entry.track.setAttribute('aria-valuenow',String(now));entry.lastNow=now;}
   if(entry.lastMax!==maxHp){entry.track.setAttribute('aria-valuemax',String(maxHp));entry.lastMax=maxHp;}
   if(entry.lastFraction!==fraction){entry.fill.style.transform='scaleX('+fraction+')';entry.lastFraction=fraction;}
  }
  for(const[id,entry]of this.nodes)if(!alive.has(id)){entry.panel.remove();this.nodes.delete(id);}
 }
}
