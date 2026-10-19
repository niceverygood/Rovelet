import {t,messageKey,localize} from './i18n.js';
// Position overlays on the same rendered frame as the camera and actors.
// Keep DOM nodes by enemy ID; update health independently of screen position.
export class EnemyBars{
 constructor(){this.container=null;this.nodes=new Map();}
 update(container,enemies,project,active=true){
  if(this.container!==container){this.container=container;this.nodes.clear();}
  if(!container)return;
  container.hidden=!active;if(!active)return;
  const alive=new Set();
  for(const enemy of enemies){
   if(enemy.hp<=0)continue;alive.add(enemy.id);
   let entry=this.nodes.get(enemy.id);
   if(!entry){const bar=document.createElement('div');bar.className='enemy-bar'+(enemy.kind==='boss'?' boss':'');bar.dataset.enemyId=enemy.id;bar.style.left='0';bar.style.top='0';const fill=document.createElement('i');bar.append(fill);if(enemy.kind==='boss'){const label=document.createElement('b');label.textContent=t("enemy-bars.074");bar.append(label);}container.append(bar);entry={bar,fill,label:bar.querySelector('b'),fraction:null};this.nodes.set(enemy.id,entry);}
   if(entry.label){const name=enemy.boss?.profile.name??t('enemy-bars.074');if(entry.label.textContent!==name)entry.label.textContent=name;}
   const anchor=enemy.root.position.clone();anchor.y+=enemy.root.userData.healthHeight??(enemy.kind==='boss'?5.75:2);
   const point=project(anchor);entry.bar.hidden=!point.visible;
   if(point.visible)entry.bar.style.transform=`translate3d(${point.x.toFixed(2)}px,${point.y.toFixed(2)}px,0) translate(-50%,-50%)`;
   const fraction=Math.max(0,Math.min(1,enemy.hp/Math.max(enemy.maxHp,1)));
   if(entry.fraction!==fraction){entry.fill.style.transform=`scaleX(${fraction})`;entry.fraction=fraction;}
  }
  for(const[id,entry]of this.nodes)if(!alive.has(id)){entry.bar.remove();this.nodes.delete(id);}
 }
}
