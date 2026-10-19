const assert=require('node:assert/strict');
const SAVE_KEY='wandering-hearth:v1',RUN_KEY='wandering-hearth:run';
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,`${label}: ${actual} != ${expected}`);
const stageIds=balance=>['meadow','volcano','glacier'].flatMap((region,index)=>balance.campaign.durationsMinutes[index].map((_,i)=>region+'-'+(i+1)));
function isolatedQaUrl(value){const url=new URL(value);assert.ok(url.origin==='http://127.0.0.1:4176'&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password,'Isolated QA URL must be http://127.0.0.1:4176/');return url.href;}
function departureStats(buildings,balance){
 const f=balance.facilities,g=buildings.garage,s=buildings.smithy,h=buildings.greenhouse;
 return {maxHp:f.baseHp+g*f.hpPerGarage,damageMultiplier:1+s*f.damagePerSmithy,intervalMultiplier:1-s*f.intervalPerSmithy,speedBonus:g*f.speedPerGarage,bonusSlots:Math.floor(g/f.slotEvery),regen:h*f.regenPerGreenhouse,rewardMultiplier:1+h*f.rewardPerGreenhouse,boostCooldown:Math.max(f.boostMin,f.boostBase-g*f.boostPerGarage),shieldCooldown:Math.max(f.shieldMin,f.shieldBase-h*f.shieldPerGreenhouse),repairAmount:f.repairBase+g*f.repairPerGarage+h*f.repairPerGreenhouse};
}
function cleanSettlement(storage,label){
 for(const key of [SAVE_KEY+':pending',RUN_KEY,RUN_KEY+':backup'])assert.ok(!Object.hasOwn(storage,key),`${label}: leftover ${key}`);
}
function samePrimary(save,primary,label){assert.equal(typeof primary,'string',`${label}: primary missing`);assert.deepEqual(JSON.parse(primary),save,`${label}: memory/primary mismatch`);}
function diagnoseCheckpoint(c,save,balance){
 const failures=[],r=c?.run??{},finite=(v,min=0,max=1e9)=>Number.isFinite(v)&&v>=min&&v<=max,pos=v=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n,-100,100)),check=(ok,field,actual,expected)=>{if(!ok)failures.push({field,actual,expected});};
 check(c?.version===1,'version',c?.version,'1');check(typeof r.id==='string'&&!!r.id,'run.id',r.id,'nonempty string');check(!(save?.settledRuns??[]).includes(r.id),'run.id settled',r.id,'not previously settled');check(!r.outcome,'run.outcome',r.outcome,'no outcome');check([1,2,3].includes(r.stage),'run.stage',r.stage,'1/2/3');
 for(const [field,min,max]of[['hp',.001,10000],['maxHp',r.hp,10000],['time',0,1e7],['coins',0,1e7],['kills',0,1e7],['level',1,200],['xp',0,1e7]])check(finite(r[field],min,max)&&(field!=='time'||r[field]<1e7),'run.'+field,r[field],`finite ${min}..${max}${field==='time'?' (upper exclusive)':''}`);
 check(pos(c?.position),'position',c?.position,'3 finite coordinates -100..100');check(finite(c?.rotation,-1e8,1e8),'rotation',c?.rotation,'finite -1e8..1e8');const weapons=r.weapons??{},entries=Object.entries(weapons);check(typeof weapons==='object'&&!Array.isArray(weapons)&&entries.length>=1&&entries.length<=8,'run.weapons',weapons,'1..8 weapon entries');
 for(const [key,level]of entries)check(Object.hasOwn(balance.weapons,key)&&Number.isInteger(level)&&level>=1&&level<=5,'run.weapons.'+key,level,'known weapon, integer level 1..5');
 check(Array.isArray(c?.enemies)&&c.enemies.length<=40,'enemies',c?.enemies?.length,'array length <=40');for(const [i,e]of (Array.isArray(c?.enemies)?c.enemies:[]).entries()){check(['cannon','pursuer','charger','elite','boss'].includes(e?.kind),'enemies['+i+'].kind',e?.kind,'known enemy');for(const [field,min,max]of[['hp',.001,1e9],['maxHp',e?.hp,1e9],['attack',-10,1000]])check(finite(e?.[field],min,max),'enemies['+i+'].'+field,e?.[field],`finite ${min}..${max}`);check(pos(e?.position),'enemies['+i+'].position',e?.position,'3 finite coordinates -100..100');}
 return {valid:failures.length===0,failures};
}
function auditCampaign({initialSave,purchases,stages,finalSave},balance,{complete=false}={}){
 const ids=stageIds(balance),buildings={garage:0,smithy:0,greenhouse:0};
 assert.equal(initialSave.coins,140,'fresh starting gold');assert.deepEqual(initialSave.buildings,buildings,'fresh facilities');
 for(const key of ['runs','victories','totalKills','bestTime'])assert.equal(initialSave[key],0,'fresh '+key);
 assert.deepEqual(initialSave.settledRuns,[],'fresh settlement IDs');assert.deepEqual(initialSave.campaign.completed,[],'fresh completed stages');
 assert.ok(stages.length>0&&stages.length<=ids.length,'stage count');if(complete)assert.equal(stages.length,ids.length,'all 15 stages required');
 assert.ok(purchases.length>0,'initial greenhouse purchase missing');assert.deepEqual({...purchases[0],persisted:undefined,batch:undefined},{afterStage:0,key:'greenhouse',beforeLevel:0,afterLevel:1,cost:balance.facilities.cost.greenhouse,beforeCoins:140,afterCoins:140-balance.facilities.cost.greenhouse,persisted:undefined,batch:undefined},'initial legitimate greenhouse purchase');
 let coins=140,purchaseIndex=0,totalKills=0,bestTime=0,rewards=0,spent=0;const runIds=[],completed=[],best={};
 function checkSave(save,label){
  assert.deepEqual(save.buildings,buildings,label+' facilities');assert.equal(save.coins,coins,label+' coins');assert.equal(save.runs,runIds.length,label+' runs');assert.equal(save.victories,runIds.length,label+' victories');assert.equal(save.totalKills,totalKills,label+' kills');near(save.bestTime,bestTime,label+' bestTime');
  assert.deepEqual(save.settledRuns,runIds,label+' settledRuns');assert.deepEqual(save.campaign.completed,completed,label+' completed');assert.equal(save.campaign.unlocked,Math.min(ids.length,runIds.length+1),label+' unlocked');assert.equal(save.campaign.selected,ids[Math.min(ids.length-1,runIds.length)],label+' selected');
  assert.deepEqual(Object.keys(save.campaign.best).sort(),Object.keys(best).sort(),label+' best keys');for(const id of completed)near(save.campaign.best[id],best[id],label+' best '+id);
 }
 for(let index=0;index<stages.length;index++){
  while(purchaseIndex<purchases.length&&purchases[purchaseIndex].afterStage===index){
   const p=purchases[purchaseIndex++],base=balance.facilities.cost[p.key];assert.ok(Number.isFinite(base),'unknown facility');assert.equal(p.beforeLevel,buildings[p.key],'purchase beforeLevel');assert.equal(p.afterLevel,p.beforeLevel+1,'purchase afterLevel');assert.ok(p.afterLevel<=balance.facilities.maxLevel,'purchase exceeds max level');assert.equal(p.cost,base*(p.beforeLevel+1),'canonical purchase cost');assert.equal(p.beforeCoins,coins,'purchase beforeCoins');assert.ok(coins>=p.cost,'unaffordable purchase');coins-=p.cost;spent+=p.cost;assert.equal(p.afterCoins,coins,'purchase afterCoins');assert.equal(p.persisted,true,'purchase save failed');buildings[p.key]++;}
  const record=stages[index],run=record.run,departure=record.departure,label=ids[index];
  checkSave(departure.save,label+' departure');samePrimary(departure.save,departure.primary,label+' departure');
  assert.equal(run.stageId,label,'stage order');assert.equal(departure.run.stageId,label,'departure stage');assert.equal(departure.run.id,run.id,'departure run ID');assert.equal(typeof run.id,'string','run ID');assert.ok(run.id&&!runIds.includes(run.id),'duplicate run ID');
  assert.equal(departure.run.time,0,'departure time');assert.equal(departure.run.stage,1,'departure castle stage');assert.equal(departure.run.level,1,'departure level');
  const stats=departureStats(buildings,balance);assert.deepEqual(departure.run.villageStats,stats,label+' departure stats');assert.deepEqual(run.villageStats,stats,label+' immutable departure snapshot');assert.equal(departure.run.hp,stats.maxHp,'departure HP');assert.equal(departure.run.maxHp,stats.maxHp,'departure max HP');assert.equal(departure.run.duration,balance.campaign.durationsMinutes[Math.floor(index/5)][index%5]*60,'departure duration');
  const weapon=buildings.greenhouse>=3?'lightning':'crystal';assert.equal(departure.save.weapon,weapon,'departure selected weapon');assert.deepEqual(departure.run.weapons,{[weapon]:1},'departure equipped weapon');
  assert.equal(run.outcome,'victory',label+' outcome');assert.equal(run.settled,true,label+' settlement failed');for(const flag of ['midSpawned','midDefeated','bossSpawned'])assert.equal(run[flag],true,label+' '+flag);assert.ok(Number.isInteger(run.kills)&&run.kills>=0,'raw run kills');assert.ok(Number.isFinite(run.time)&&run.time>0,'raw run time');assert.ok(Number.isFinite(run.coins)&&run.coins>=0,'raw collected coins');
  const rawBase=run.coins+run.kills*balance.rewards.kill+balance.rewards.victory,reward=Math.floor(rawBase*stats.rewardMultiplier);
  assert.equal(run.reward,reward,label+' independently calculated reward');assert.deepEqual(run.rewardBreakdown,{base:Math.floor(rawBase),bonus:reward-Math.floor(rawBase),multiplier:stats.rewardMultiplier},label+' reward breakdown');
  coins+=reward;rewards+=reward;totalKills+=run.kills;bestTime=Math.max(bestTime,run.time);runIds.push(run.id);completed.push(label);best[label]=run.time;
  checkSave(record.save,label+' settled');samePrimary(record.save,record.primary,label+' settled');assert.equal(record.storage[SAVE_KEY],record.primary,label+' exported primary');cleanSettlement(record.storage,label);
 }
 assert.equal(purchaseIndex,purchases.length,'purchase order or future purchase');checkSave(finalSave,'final');assert.equal(finalSave.coins,140+rewards-spent,'whole campaign gold ledger');
 return {stages:stages.length,totalKills,totalReward:rewards,totalSpent:spent,coins,bestTime,runIds,completed};
}
module.exports={auditCampaign,departureStats,samePrimary,cleanSettlement,stageIds,isolatedQaUrl,diagnoseCheckpoint};
