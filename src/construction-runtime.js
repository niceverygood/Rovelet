import {getStorage} from './storage-accessor.js';
import {constructionClock,constructionProgress,normalizeConstructionState,prepareConstructionStart,prepareConstructionCompletion,commitConstruction} from './construction.js';
import {saveGame} from './persistence.js';
import {normalizeCheckpoint,RUN_KEY} from './checkpoint.js';
import {SAVE_KEY} from './data.js';
import {villageStats} from './village-stats.js';
import {t} from './i18n.js';

// Wall deadlines survive reload; live anchors never extend on wall rollback.
export class ConstructionRuntime {
 constructor(game,{storage=game.storage??getStorage(),wallNow=()=>Date.now(),monotonicNow=()=>performance.now()}={}){this.game=game;this.storage=storage;this.wallNow=wallNow;this.monotonicNow=monotonicNow;this.clocks={};this.nextProbe=0;this.waiting=null;this.viewDirty=true;this.notices=[];this.syncClocks();}
 syncClocks(wake=false){const state=normalizeConstructionState(this.game.save),wallNow=this.wallNow(),monotonicNow=this.monotonicNow(),next={};for(const [key,job]of Object.entries(state.ok?state.jobs:{})){const old=this.clocks[key],same=old&&old.id===job.id&&old.startedAt===job.startedAt&&old.finishesAt===job.finishesAt&&old.durationMs===job.durationMs;let clock=same?old:constructionClock(job,{wallNow,monotonicNow});if(same&&(wake||monotonicNow<old.monotonicAtAnchor)){const live=constructionProgress(this.game.save,key,{wallNow,monotonicNow,clock:old}),fresh=constructionClock(job,{wallNow,monotonicNow});if(fresh)clock={...fresh,remainingAtAnchor:Math.min(live?.remainingMs??fresh.remainingAtAnchor,fresh.remainingAtAnchor)};}if(clock)next[key]=clock;}this.clocks=next;}
 status(key){const job=this.game.save.construction?.jobs?.[key];if(!job)return null;const progress=constructionProgress(this.game.save,key,{wallNow:this.wallNow(),monotonicNow:this.monotonicNow(),clock:this.clocks[key]});return progress?{...progress,job,waiting:progress.due?this.waiting:null}:null;}
 blocked(){if(this.game.run?.outcome&&this.game.run.settled!==true)return 'settlement-pending';try{if(this.storage?.getItem(SAVE_KEY+':pending')!=null)return 'settlement-pending';}catch{return 'settlement-read-failed';}return null;}
 preserveCheckpointStats(){
  // Both recovery slots must retain the old departure stats, even if the
  // primary later corrupts. Invalid unrelated payloads are never overwritten.
  const keys=Object.keys(villageStats(this.game.save));for(const key of [RUN_KEY,RUN_KEY+':backup']){let raw;try{raw=JSON.parse(this.storage.getItem(key));}catch(error){if(error instanceof SyntaxError)continue;return false;}if(!raw)continue;const clean=normalizeCheckpoint(raw,this.game.save);if(!clean)continue;const complete=keys.every(k=>Number.isFinite(raw.run?.villageStats?.[k])&&raw.run.villageStats[k]>=0&&raw.run.villageStats[k]<=10000);if(complete)continue;try{this.storage.setItem(key,JSON.stringify(clean));}catch{return false;}}
  return true;
 }
 start(key,position){const g=this.game;if(g.mode!=='village'||g.save.construction?.jobs?.[key])return {ok:false,reason:'already-constructing'};const blocked=this.blocked();if(blocked)return {ok:false,reason:blocked};const proposal=prepareConstructionStart(g.save,key,{id:crypto.randomUUID(),now:this.wallNow(),position,obstacles:g.world.villageDecorObstacles?.()??[]});const result=commitConstruction(g.save,proposal,{storage:this.storage,persist:saveGame});if(result.ok){g.save=result.save;this.waiting=null;this.viewDirty=true;this.syncClocks();}return result;}
 flush(force=false){const mono=this.monotonicNow();if(!force&&mono<this.nextProbe)return !this.waiting;this.nextProbe=mono+250;this.syncClocks();if(this.game.save.construction===undefined){this.waiting=null;return true;}const proposal=prepareConstructionCompletion(this.game.save,{now:this.wallNow(),monotonicNow:mono,clocks:this.clocks});if(!proposal.ok){this.waiting=proposal.reason;this.nextProbe=mono+1000;return false;}if(proposal.noop){this.waiting=null;return true;}const blocked=this.blocked();if(blocked||!this.preserveCheckpointStats()){this.waiting=blocked??'checkpoint-persist-failed';this.nextProbe=mono+1000;return false;}const result=commitConstruction(this.game.save,proposal,{storage:this.storage,persist:saveGame});if(!result.ok){this.waiting=result.reason;this.nextProbe=mono+1000;return false;}this.game.save=result.save;this.notices.push(...result.metadata.completed.map(row=>row.key));this.waiting=null;this.viewDirty=true;this.syncClocks();return true;}
 wake(){this.syncClocks(true);this.nextProbe=0;}
 refreshView(force=false){const g=this.game;if(!g.world.home?.visible||!['title','village'].includes(g.mode)||!force&&!this.viewDirty)return false;g.world.updateBuildings(g.save.buildings,g.save.buildingPositions,g.save.construction);this.viewDirty=false;return true;}
 update(){const ok=this.flush();if(this.refreshView())this.game.ui?.renderScreen();if(['title','village'].includes(this.game.mode)&&this.game.ui&&this.notices.length){this.notices.length=0;this.game.ui.toast(t('construction.completed'));}return ok;}
 message(reason){return t(['settlement-pending','settlement-read-failed'].includes(reason)?'construction.settlementWaiting':reason==='insufficient-coins'?'persistence.114':reason==='max-level'?'persistence.113':reason==='already-constructing'?'construction.inProgress':'construction.saveWaiting');}
}
