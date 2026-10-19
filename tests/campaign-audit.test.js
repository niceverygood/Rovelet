import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const {auditCampaign,departureStats,stageIds,isolatedQaUrl,diagnoseCheckpoint}=createRequire(import.meta.url)('../scripts/campaign-audit.cjs');
const balance=JSON.parse(fs.readFileSync(new URL('../src/balance.json',import.meta.url))),copy=value=>structuredClone(value),key='wandering-hearth:v1';
function fixture(){
 const ids=stageIds(balance),initialSave={version:1,schemaVersion:2,coins:140,buildings:{garage:0,smithy:0,greenhouse:0},runs:0,victories:0,totalKills:0,bestTime:0,settledRuns:[],settings:{sound:false},weapon:'crystal',campaign:{unlocked:1,selected:ids[0],completed:[],best:{}}},save=copy(initialSave),purchases=[],stages=[];
 function buy(name,afterStage){const level=save.buildings[name],cost=balance.facilities.cost[name]*(level+1);if(level>=balance.facilities.maxLevel||save.coins<cost)return;const p={afterStage,key:name,beforeLevel:level,afterLevel:level+1,cost,beforeCoins:save.coins,afterCoins:save.coins-cost,persisted:true};purchases.push(p);save.coins-=cost;save.buildings[name]++;}
 buy('greenhouse',0);
 for(let i=0;i<ids.length;i++){
  if(i)for(const name of ['greenhouse','smithy','garage'])buy(name,i);
  const stats=departureStats(save.buildings,balance),weapon=save.buildings.greenhouse>=3?'lightning':'crystal';save.weapon=weapon;
  const departureRun={id:'run-'+i,stageId:ids[i],time:0,stage:1,level:1,hp:stats.maxHp,maxHp:stats.maxHp,duration:balance.campaign.durationsMinutes[Math.floor(i/5)][i%5]*60,villageStats:copy(stats),weapons:{[weapon]:1}},departure={save:copy(save),primary:JSON.stringify(save),run:copy(departureRun)};
  const kills=i+1,coins=17+i*3,time=departureRun.duration-20+.123456789,base=coins+kills*balance.rewards.kill+balance.rewards.victory,reward=Math.floor(base*stats.rewardMultiplier),run={...departureRun,time,kills,coins,reward,rewardBreakdown:{base:Math.floor(base),bonus:reward-Math.floor(base),multiplier:stats.rewardMultiplier},outcome:'victory',settled:true,midSpawned:true,midDefeated:true,bossSpawned:true,maxHp:stats.maxHp+120,stage:3};
  save.coins+=reward;save.runs++;save.victories++;save.totalKills+=kills;save.bestTime=Math.max(save.bestTime,time);save.settledRuns.push(run.id);save.campaign.completed.push(ids[i]);save.campaign.unlocked=Math.min(15,i+2);save.campaign.selected=ids[Math.min(14,i+1)];save.campaign.best[ids[i]]=time;
  const primary=JSON.stringify(save);stages.push({departure,run,save:copy(save),primary,storage:{[key]:primary,[key+':backup']:departure.primary}});
 }
 return {initialSave,purchases,stages,finalSave:copy(save)};
}
test('campaign automation rejects production, another port, credentials, and non-root URLs before browsing',()=>{
 assert.equal(isolatedQaUrl('http://127.0.0.1:4176'),'http://127.0.0.1:4176/');
 for(const url of ['http://127.0.0.1:4180/','http://localhost:4176/','https://127.0.0.1:4176/','http://name@127.0.0.1:4176/','http://127.0.0.1:4176/hearth/','http://127.0.0.1:4176/?fixture=1'])assert.throws(()=>isolatedQaUrl(url));
});
test('independent audit accepts 15 exact settlements and a fractional reward base before multiplication',()=>{
 const data=fixture(),result=auditCampaign(data,balance,{complete:true});assert.equal(result.stages,15);assert.equal(result.totalKills,120);assert.equal(data.stages[0].run.reward,144);assert.equal(Math.floor(data.stages[0].run.rewardBreakdown.base*1.04),143);assert.ok(result.totalSpent>90);assert.equal(result.coins,140+result.totalReward-result.totalSpent);
});
test('post-settlement kills, altered rewards, rounded raw times, and inconsistent totals are rejected',()=>{
 for(const corrupt of [d=>d.stages[14].run.kills++,d=>d.stages[0].run.reward++,d=>d.stages[14].run.time=Number(d.stages[14].run.time.toFixed(2)),d=>d.finalSave.totalKills++,d=>d.finalSave.coins++]){const data=fixture();corrupt(data);assert.throws(()=>auditCampaign(data,balance,{complete:true}));}
});
test('facility ledger cannot forge cost, funding, level, persistence, or purchase ordering',()=>{
 for(const corrupt of [d=>d.purchases[1].cost++,d=>d.purchases[1].beforeCoins++,d=>d.purchases[1].afterLevel++,d=>d.purchases[1].persisted=false,d=>d.purchases[1].afterStage=14]){const data=fixture();corrupt(data);assert.throws(()=>auditCampaign(data,balance,{complete:true}));}
});
test('departure facility snapshot is audited against canonical balance rather than trusting the run multiplier',()=>{
 const data=fixture();data.stages[3].departure.run.villageStats.rewardMultiplier+=.1;data.stages[3].run.villageStats.rewardMultiplier+=.1;assert.throws(()=>auditCampaign(data,balance,{complete:true}),/departure stats/);
});
test('duplicate run IDs, incomplete campaign history, and memory versus primary corruption are rejected',()=>{
 for(const corrupt of [d=>{d.stages[1].run.id=d.stages[0].run.id;d.stages[1].departure.run.id=d.stages[0].run.id;},d=>d.stages[8].save.campaign.completed.pop(),d=>{const wrong=copy(d.stages[5].save);wrong.settings.sound=true;d.stages[5].primary=JSON.stringify(wrong);},d=>d.finalSave.settledRuns.pop()]){const data=fixture();corrupt(data);assert.throws(()=>auditCampaign(data,balance,{complete:true}));}
});
test('any pending settlement or run checkpoint after a completed stage is rejected',()=>{
 for(const staleKey of [key+':pending','wandering-hearth:run','wandering-hearth:run:backup']){const data=fixture();data.stages[6].storage[staleKey]='stale';assert.throws(()=>auditCampaign(data,balance,{complete:true}),/leftover/);}
});
test('a victory record cannot skip the middle boss or final-boss spawn gates',()=>{
 for(const flag of ['midSpawned','midDefeated','bossSpawned']){const data=fixture();data.stages[4].run[flag]=false;assert.throws(()=>auditCampaign(data,balance,{complete:true}),new RegExp(flag));}
});
test('checkpoint diagnosis distinguishes a rejected attack timer and tiny positive enemy HP',()=>{
 const data=fixture(),save=data.initialSave,checkpoint={version:1,run:{...data.stages[0].departure.run,coins:0,kills:0,xp:0},screen:'',position:[0,0,0],rotation:0,enemies:[{kind:'cannon',hp:1,maxHp:65,attack:0,position:[0,0,3]}]};assert.equal(diagnoseCheckpoint(checkpoint,save,balance).valid,true);
 checkpoint.enemies[0].attack=-10.01;assert.deepEqual(diagnoseCheckpoint(checkpoint,save,balance).failures.map(f=>f.field),['enemies[0].attack']);checkpoint.enemies[0].attack=0;checkpoint.enemies[0].hp=.0001;assert.deepEqual(diagnoseCheckpoint(checkpoint,save,balance).failures.map(f=>f.field),['enemies[0].hp']);
});
