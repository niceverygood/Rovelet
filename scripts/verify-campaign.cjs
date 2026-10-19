const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {auditCampaign,samePrimary,cleanSettlement,isolatedQaUrl,diagnoseCheckpoint}=require('./campaign-audit.cjs');
const root=path.resolve(__dirname,'..'),url=isolatedQaUrl(process.env.GAME_QA_URL??'http://127.0.0.1:4176/');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const seed=20261017,commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;
const startedAt=new Date().toISOString(),runId=startedAt.replace(/[:.]/g,'-')+'-'+commit.slice(0,8)+'-seed'+seed;
const directory=path.join(root,'verification','campaign',runId),work=path.resolve(root,'../../work',runId);
for(const parent of [path.dirname(directory),path.dirname(work)])fs.mkdirSync(parent,{recursive:true});
fs.mkdirSync(directory);fs.mkdirSync(work); // Existing run directories are refused.
const balanceBytes=fs.readFileSync(path.join(root,'src/balance.json')),balance=JSON.parse(balanceBytes);
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
function sourceSnapshot(){const files=[],walk=folder=>{for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true})){const file=folder+'/'+entry.name;if(entry.isDirectory())walk(file);else if(entry.isFile())files.push(file);}};walk('src');return Object.fromEntries(files.sort().map(file=>[file,hashFile(file)]));}
const workingTreeStatus=execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8',windowsHide:true}).trimEnd().split(/\r?\n/).filter(Boolean);
const report={runId,baselineCommit:commit,workingTreeStatus,sourceSnapshot:sourceSnapshot(),qaTools:{'scripts/verify-campaign.cjs':hashFile('scripts/verify-campaign.cjs'),'scripts/campaign-audit.cjs':hashFile('scripts/campaign-audit.cjs')},runtimeManifestSha256:hashFile('runtime-models/manifest.json'),version,seed,startedAt,status:'starting',url,directory,work,balanceSha256:crypto.createHash('sha256').update(balanceBytes).digest('hex'),method:'Real Game.update(1/30), including movement, effects, hitstop, collisions and regional hazards. Original seeded orbit/loot driver, offered choices and normal repair/shield/boost only. Fresh 140 gold, legitimate greenhouse(90), crystal start; earned gold buys facilities between stages. No altered health, damage, invulnerability, enemy state or economy. Live RAF updates and GPU draws are suppressed; UI/render are sampled at chunk boundaries. This is accelerated engine/settlement regression, not real-time FPS or human difficulty evidence. Direct Game.start preserves the existing driver; onboarding UX is verified separately. Folder gitshort denotes baselineCommit; actual source/tool hashes and dirty working tree are recorded separately.',tick:1/30,ticksPerChunk:1200,maxChunks:450,rows:[],purchases:[],stages:[],diagnostics:[],endFlow:[]};
report.modelSource='Isolated DEV server public/models. Runtime manifest SHA is recorded as a production-cache reference; runtime GLB pixel equivalence is separate evidence.';
report.checkpointFailures=[];
function log(event){const line=JSON.stringify({at:new Date().toISOString(),...event});fs.appendFileSync(path.join(work,'run.log'),line+'\n');console.log(line);}
function flush(){fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(work,'progress.json'),JSON.stringify({runId,status:report.status,stages:report.stages.length,last:report.rows.at(-1),error:report.error??null},null,2));}
function diagnostics(type,detail){report.diagnostics.push({type,...detail});}
async function state(page){return page.evaluate(()=>{const g=__hearth.game,keys=Object.keys(localStorage).filter(key=>key.startsWith('wandering-hearth:'));return {save:JSON.parse(JSON.stringify(g.save)),primary:localStorage.getItem('wandering-hearth:v1'),storage:Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),mode:g.mode,screen:g.screen,checkpoint:g.checkpoint,run:g.run?JSON.parse(JSON.stringify(g.run)):null};});}
(async()=>{
 let browser,page;
 try{
  log({event:'start',directory,work,baselineCommit:commit});flush();
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(120000);
  await context.addInitScript(()=>{window.__campaignStorageBeforeBoot=Object.keys(localStorage);});
  page.on('pageerror',error=>diagnostics('pageerror',{message:error.message}));page.on('console',message=>{if(message.type()==='error')diagnostics('console.error',{message:message.text()});});page.on('crash',()=>diagnostics('crash',{}));
  page.on('requestfailed',request=>diagnostics('requestfailed',{url:request.url(),message:request.failure()?.errorText}));page.on('response',response=>{if(response.status()>=400)diagnostics('http',{url:response.url(),status:response.status()});});
  await page.route('**/*',route=>{const request=route.request();if(request.isNavigationRequest()&&request.frame()===page.mainFrame()&&request.url()!==url){diagnostics('blocked-navigation',{url:request.url()});return route.abort();}return route.continue();});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__hearth);assert.equal(page.url(),url,'QA origin changed');
  const setup=await page.evaluate(async()=>{
   const check=(ok,message)=>{if(!ok)throw Error(message);},clone=value=>JSON.parse(JSON.stringify(value));
   check(window.__campaignStorageBeforeBoot.length===0&&localStorage.length===0,'Fresh isolated context storage must be empty');
   const g=__hearth.game,w=__hearth.world,{freshSave,unlockedWeapons,buildingCost}=await import('/src/data.js'),{buyBuilding}=await import('/src/persistence.js'),{normalizeCheckpoint}=await import('/src/checkpoint.js');
   let seed=20261017;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
   const q=g.campaignQA={purchases:[],departures:[],choices:[],saveChecks:{persist:0,explicit:0,checkpointSuccess:0,checkpointSkipped:0}};
   const persist=g.persist.bind(g),checkpoint=g.checkpointRun.bind(g);
   g.persist=function(...args){const ok=persist(...args);check(ok,'Game.persist failed');q.saveChecks.persist++;return ok;};
   g.checkpointRun=function(...args){const expected=g.mode!=='lab'&&g.run&&!g.run.outcome,ok=checkpoint(...args);if(expected&&!ok){
    const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'&&!Number.isFinite(v)?{qaNumber:String(v)}:v===undefined?{qaUndefined:true}:v));
    const payload={version:1,run:g.run,screen:g.screen==='upgrade'?'upgrade':'',position:g.player.root.position.toArray(),rotation:g.player.root.rotation.y,loot:g.loot.map(l=>({position:l.mesh.position.toArray(),value:l.value,gold:l.gold??2})),enemies:g.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,bossId:e.boss?.profile.id,bossIndex:e.boss?.index,hp:e.hp,maxHp:e.maxHp,attack:e.attack,position:e.root.position.toArray()}))};
    let normalization='returned-null',normalizationError=null;try{if(normalizeCheckpoint(payload,g.save))normalization='accepted';}catch(error){normalization='threw';normalizationError=error.message;}
    let storage={},storageReadError=null;try{storage=Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('wandering-hearth:')).map(key=>[key,localStorage.getItem(key)]));}catch(error){storageReadError=error.message;}
    q.checkpointFailure={clock:g.clock,mode:g.mode,screen:g.screen,normalization,normalizationError,storageReadError,checkpoint:encode(payload),save:encode(g.save),storage,liveEnemies:encode(g.enemies.map(e=>({id:e.id,kind:e.kind,hp:e.hp,maxHp:e.maxHp,attack:e.attack,position:e.root.position.toArray(),included:e.hp>0})))};
    throw Error('Game.checkpointRun failed; live payload captured');
   }q.saveChecks[ok?'checkpointSuccess':'checkpointSkipped']++;return ok;};
   g.qaTick=g.update.bind(g);g.update=()=>{};g.qaUi=g.ui.update.bind(g.ui);g.ui.update=()=>{};w.qaRender=w.renderer.render.bind(w.renderer);w.renderer.render=()=>{};
   g.save=freshSave();q.initialSave=clone(g.save);check(g.save.coins===140,'Fresh gold must be 140');check(Object.values(g.save.buildings).every(level=>level===0),'Fresh facilities must be empty');
   const before=clone(g.save),result=buyBuilding(g.save,'greenhouse');check(result.ok,'Initial greenhouse purchase failed');g.save=result.save;
   check(buildingCost('greenhouse',0)===90&&g.save.coins===50&&g.save.buildings.greenhouse===1,'Initial greenhouse must cost 90 and leave 50');check(unlockedWeapons(g.save).includes('crystal'),'Greenhouse did not unlock crystal');
   q.purchases.push({afterStage:0,key:'greenhouse',beforeLevel:0,afterLevel:1,cost:before.coins-g.save.coins,beforeCoins:before.coins,afterCoins:g.save.coins,persisted:false,batch:'initial'});
   g.save.weapon='crystal';g.save.settings.sound=false;check(g.persist(),'Initial save failed');q.purchases[0].persisted=true;
   q.captureDeparture=()=>{check(unlockedWeapons(g.save).includes(g.save.weapon),'Selected starting weapon is locked');const departure={save:clone(g.save),primary:localStorage.getItem('wandering-hearth:v1'),run:clone(g.run)};check(g.run.time===0,'Departure time changed');check(g.run.weapons[g.save.weapon]===1,'Starting weapon was replaced');q.departures.push(departure);return departure;};
   g.start();const departure=q.captureDeparture();return {initialSave:q.initialSave,purchases:q.purchases,departure,saveChecks:q.saveChecks};
  });
  report.initialSave=setup.initialSave;report.purchases=setup.purchases;report.saveChecks=setup.saveChecks;report.status='running';flush();
  for(let chunk=0;chunk<report.maxChunks;chunk++){
   const sample=await page.evaluate(()=>{
    const g=__hearth.game,w=__hearth.world,q=g.campaignQA,clone=value=>JSON.parse(JSON.stringify(value));
    for(let i=0;i<1200&&!g.run.outcome;i++){
     const r=g.run;
     if(g.screen==='upgrade'){
      const scores=r.choices.map(c=>{if(c.type==='grow')return 100;if(c.type==='heal')return r.hp<r.maxHp*.5?95:0;if(c.type==='armor')return 50;if(c.type==='engine')return 10;if(c.type==='weapon'){const rank={crystal:80,lightning:85,stormcloud:80,rocket:70,fireball:70,tornado:70,railgun:65,beehive:60,sniper:60,mortar:60,steam:45};return (rank[c.key]??35)+(r.weapons[c.key]?10:0);}return 0;});
      const selected=scores.indexOf(Math.max(...scores));if(selected<0||!r.choices[selected])throw Error('Driver selected an unoffered choice');q.choices.push({stageId:r.stageId,level:r.level,offered:clone(r.choices),selected});g.choose(selected);
     }
     const root=g.player.root,p=root.position,angle=Math.atan2(p.x,p.z),radius=5+r.stage*1.5,targetAngle=angle+.65;let tx=Math.sin(targetAngle)*radius,tz=Math.cos(targetAngle)*radius;
     const loot=g.loot.filter(l=>Math.hypot(l.mesh.position.x-p.x,l.mesh.position.z-p.z)>4.4).sort((a,b)=>p.distanceTo(a.mesh.position)-p.distanceTo(b.mesh.position))[0];
     if(loot&&r.level<8&&r.hp>r.maxHp*.6&&p.distanceTo(loot.mesh.position)<8){tx=loot.mesh.position.x;tz=loot.mesh.position.z;}
     const wanted=Math.atan2(tx-p.x,tz-p.z),delta=Math.atan2(Math.sin(wanted-root.rotation.y),Math.cos(wanted-root.rotation.y));g.touchInput={throttle:1,steer:Math.max(-1,Math.min(1,-delta*3))};
     if(r.hp<r.maxHp*.75)g.repair();if(r.hp<r.maxHp*.8)g.shield();if(r.hp<r.maxHp*.4)g.boost();g.qaTick(1/30);
    }
    g.qaUi(.2);w.qaRender(w.scene,w.camera);g.checkpointRun();
    const storage=Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('wandering-hearth:')).map(key=>[key,localStorage.getItem(key)])),r=g.run;
    return {row:{stage:r.stageId,time:+r.time.toFixed(2),hp:+r.hp.toFixed(2),maxHp:r.maxHp,level:r.level,kills:r.kills,mid:r.midDefeated,outcome:r.outcome,weapons:clone(r.weapons),coins:g.save.coins,completed:g.save.campaign.completed.length,position:[+g.player.root.position.x.toFixed(1),+g.player.root.position.z.toFixed(1)]},storage,purchases:clone(q.purchases),saveChecks:clone(q.saveChecks),choices:clone(q.choices),finished:r.outcome?{departure:clone(q.departures.at(-1)),run:clone(r),save:clone(g.save),primary:localStorage.getItem('wandering-hearth:v1'),storage}:null};
   });
   report.rows.push(sample.row);report.purchases=sample.purchases;report.saveChecks=sample.saveChecks;report.choices=sample.choices;fs.writeFileSync(path.join(work,'storage.json'),JSON.stringify(sample.storage,null,2));
   if(sample.finished){
    report.stages.push(sample.finished);flush();
    await page.screenshot({path:path.join(directory,'stage-'+String(report.stages.length).padStart(2,'0')+'.png'),timeout:120000});
    report.audit=auditCampaign({...report,finalSave:sample.finished.save},balance,{complete:report.stages.length===15});
   }
   flush();log({event:'chunk',chunk,...sample.row});
   assert.equal(report.diagnostics.length,0,'Browser diagnostics: '+JSON.stringify(report.diagnostics));
   if(sample.finished){
    if(report.stages.length===15)break;
    await page.evaluate(async afterStage=>{
     const g=__hearth.game,q=g.campaignQA,{buyBuilding,saveGame}=await import('/src/persistence.js'),{buildingCost,unlockedWeapons}=await import('/src/data.js'),start=q.purchases.length;
     g.village();
     for(let i=0;i<18;i++){let changed=false;for(const key of ['greenhouse','smithy','garage']){const beforeLevel=g.save.buildings[key],beforeCoins=g.save.coins,result=buyBuilding(g.save,key);if(result.ok){g.save=result.save;const cost=buildingCost(key,beforeLevel);if(g.save.coins!==beforeCoins-cost||g.save.buildings[key]!==beforeLevel+1)throw Error('Facility purchase delta mismatch');q.purchases.push({afterStage,key,beforeLevel,afterLevel:g.save.buildings[key],cost,beforeCoins,afterCoins:g.save.coins,persisted:false,batch:'after-stage-'+afterStage});changed=true;}}if(!changed)break;}
     g.save.weapon=g.save.buildings.greenhouse>=3?'lightning':'crystal';if(!unlockedWeapons(g.save).includes(g.save.weapon))throw Error('Between-stage weapon is locked');if(!saveGame(g.save))throw Error('Facility batch saveGame failed');q.saveChecks.explicit++;for(let i=start;i<q.purchases.length;i++)q.purchases[i].persisted=true;
     g.start();q.captureDeparture();
    },report.stages.length);
   }
  }
  assert.equal(report.stages.length,15,'Campaign incomplete within chunk limit');
  const earned=await state(page);report.audit=auditCampaign({...report,finalSave:earned.save},balance,{complete:true});samePrimary(earned.save,earned.primary,'earned ending');cleanSettlement(earned.storage,'earned ending');assert.equal(earned.screen,'result');
  fs.writeFileSync(path.join(directory,'earned-save.json'),JSON.stringify(earned.save,null,2));report.status='checking-end-flow';flush();
  async function unchanged(label,expectedScreen){const current=await state(page);assert.equal(current.screen,expectedScreen,label+' screen');assert.deepEqual(current.save,earned.save,label+' save');assert.equal(current.primary,earned.primary,label+' primary');cleanSettlement(current.storage,label);report.endFlow.push({step:label,mode:current.mode,screen:current.screen,saveUnchanged:true,primaryUnchanged:true,settlementKeysAbsent:true});flush();return current;}
  await page.locator('[data-action="ending"]').click();await unchanged('ending','ending');await page.screenshot({path:path.join(directory,'ending.png')});
  await page.locator('[data-action="credits"]').click();await unchanged('credits','credits');await page.locator('[data-action="help-close"]').click();await unchanged('credits-return','ending');
  await page.locator('[data-action="village"]').click();const village=await unchanged('village','village');report.saveChecks=await page.evaluate(()=>__hearth.game.campaignQA.saveChecks);fs.writeFileSync(path.join(directory,'storage.json'),JSON.stringify(village.storage,null,2));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__hearth);const reloaded=await unchanged('reload','title');assert.equal(reloaded.mode,'title');assert.equal(reloaded.run,null);assert.equal(reloaded.checkpoint,null);
  const load=await page.evaluate(async()=>{const {lastLoadStatus}=await import('/src/persistence.js');return {...lastLoadStatus};});assert.equal(load.source,'primary');assert.equal(load.recoveredReward,false);report.reload={...load,mode:reloaded.mode,screen:reloaded.screen,runAbsent:true,checkpointAbsent:true};
  await page.screenshot({path:path.join(directory,'reload.png')});fs.writeFileSync(path.join(directory,'storage.json'),JSON.stringify(reloaded.storage,null,2));
  assert.equal(report.diagnostics.length,0,'Final browser diagnostics: '+JSON.stringify(report.diagnostics));assert.deepEqual(sourceSnapshot(),report.sourceSnapshot,'Game source changed during verification');report.sourceUnchangedDuringRun=true;report.status='passed';report.finishedAt=new Date().toISOString();flush();log({event:'passed',directory,audit:report.audit});
 }catch(error){
  if(page&&!page.isClosed())try{const failure=await page.evaluate(()=>window.__hearth?.game?.campaignQA?.checkpointFailure??null);if(failure){failure.independentDiagnosis=diagnoseCheckpoint(failure.checkpoint,failure.save,balance);report.checkpointFailures.push(failure);fs.writeFileSync(path.join(directory,'checkpoint-failure.json'),JSON.stringify(failure,null,2));fs.writeFileSync(path.join(work,'checkpoint-failure-storage.json'),JSON.stringify(failure.storage,null,2));}}catch(captureError){report.checkpointCaptureError=captureError.message;}
  report.status='failed';report.error={message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();flush();log({event:'failed',message:error.message,directory});throw error;
 }
 finally{await browser?.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
