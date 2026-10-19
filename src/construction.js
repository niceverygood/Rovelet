// Optional durable construction state; completed levels remain authoritative.
import {BUILDINGS,MAX_BUILDING_LEVEL,buildingCost,SAVE_KEY} from './data.js';
import {validatePlot} from './village-layout.js';

export const CONSTRUCTION_DURATIONS_MS=Object.freeze([10000,14000,18000,22000,26000,30000]);
export const CONSTRUCTION_KEYS=Object.freeze(['garage','smithy','greenhouse']);
const timestamp=n=>Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER-30000;
const monotonic=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const position=p=>p&&[p.x,p.z,p.rotation].every(Number.isFinite)&&Math.abs(p.x)<=13&&Math.abs(p.z)<=13;
const level=n=>Number.isInteger(n)&&n>=0&&n<=MAX_BUILDING_LEVEL;
const clone=value=>structuredClone(value);
const fail=reason=>({ok:false,reason});
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function constructionDurationMs(fromLevel){return Number.isInteger(fromLevel)&&fromLevel>=0&&fromLevel<MAX_BUILDING_LEVEL?CONSTRUCTION_DURATIONS_MS[fromLevel]:null;}

// Caller first applies the existing base save sanitizer. Missing optional state
// remains missing; malformed present state rejects recovery instead of inventing
// a refund or level. The future persistence integration owns backup selection.
export function normalizeConstructionState(save){
 if(!save||!CONSTRUCTION_KEYS.every(key=>level(save.buildings?.[key])))return fail('invalid-buildings');
 if(save.construction===undefined)return {ok:true,value:undefined,jobs:{}};
 const state=save.construction;if(!state||typeof state!=='object'||Array.isArray(state)||state.version!==1||!state.jobs||typeof state.jobs!=='object'||Array.isArray(state.jobs))return fail('invalid-construction');
 const entries=Object.entries(state.jobs);if(entries.length>3)return fail('too-many-jobs');const jobs={},ids=new Set();
 for(const [key,job]of entries){
  if(!CONSTRUCTION_KEYS.includes(key)||!Object.hasOwn(BUILDINGS,key)||!job||typeof job!=='object'||Array.isArray(job)||typeof job.id!=='string'||!job.id||job.id!==job.id.trim()||job.id.length>128||ids.has(job.id))return fail('invalid-job');
  if(!Number.isInteger(job.fromLevel)||job.fromLevel<0||job.fromLevel>=MAX_BUILDING_LEVEL||job.toLevel!==job.fromLevel+1||save.buildings[key]<job.fromLevel||!Number.isFinite(job.paidCost)||job.paidCost<=0||job.paidCost>=1e9||job.durationMs!==constructionDurationMs(job.fromLevel)||!timestamp(job.startedAt)||!timestamp(job.finishesAt)||job.finishesAt-job.startedAt!==job.durationMs)return fail('invalid-job');
  if(job.fromLevel===0&&!position(save.buildingPositions?.[key]))return fail('missing-reserved-position');
  ids.add(job.id);jobs[key]={id:job.id,fromLevel:job.fromLevel,toLevel:job.toLevel,paidCost:job.paidCost,durationMs:job.durationMs,startedAt:job.startedAt,finishesAt:job.finishesAt};
 }
 return {ok:true,value:entries.length?{version:1,jobs}:undefined,jobs};
}
export function normalizeConstructionSave(raw,normalizeBase){
 if(typeof normalizeBase!=='function')throw TypeError('Existing base save normalizer is required');const base=normalizeBase(raw);if(!base)return null;const state=normalizeConstructionState(base);if(!state.ok)return null;const next=clone(base);if(state.value)next.construction=state.value;else delete next.construction;return next;
}
export function constructionReservedPlots(save){
 const state=normalizeConstructionState(save);if(!state.ok)return [];return CONSTRUCTION_KEYS.filter(key=>state.jobs[key]&&save.buildings[key]===0).map(key=>({key,...save.buildingPositions[key],radius:1.65}));
}
export function validateConstructionPlot(save,key,plot,obstacles=[]){
 if(!CONSTRUCTION_KEYS.includes(key)||!position(plot))return fail('invalid-position');const ordinary=validatePlot(plot,key,save,obstacles);if(!ordinary.ok)return fail('invalid-position');
 if(constructionReservedPlots(save).some(other=>other.key!==key&&Math.hypot(plot.x-other.x,plot.z-other.z)<1.55+other.radius+.2))return fail('construction-plot-reserved');return {ok:true};
}
function proposal(save,next,kind,metadata,noop=false){return freeze({ok:true,kind,metadata,noop,baseJson:JSON.stringify(save),next});}
export function prepareConstructionStart(save,key,{id,now,position:plot,obstacles=[],pendingSettlement=false}={}){
 if(pendingSettlement)return fail('settlement-pending');const state=normalizeConstructionState(save);if(!state.ok)return state;if(!CONSTRUCTION_KEYS.includes(key)||!Object.hasOwn(BUILDINGS,key))return fail('invalid-facility');
 if(state.jobs[key])return fail('already-constructing');const from=save.buildings[key],durationMs=constructionDurationMs(from);if(durationMs===null)return fail('max-level');if(typeof id!=='string'||!id||id!==id.trim()||id.length>128||Object.values(state.jobs).some(job=>job.id===id)||!timestamp(now)||!timestamp(now+durationMs))return fail('invalid-start');
 const cost=buildingCost(key,from);if(!Number.isFinite(save.coins)||save.coins<0||save.coins>=1e9)return fail('invalid-coins');if(save.coins<cost)return fail('insufficient-coins');
 if(from===0){if(!plot)return fail('position-required');const check=validateConstructionPlot(save,key,plot,obstacles);if(!check.ok)return check;}else if(plot&&!position(plot))return fail('invalid-position');
 try{const next=clone(save),job={id,fromLevel:from,toLevel:from+1,paidCost:cost,durationMs,startedAt:now,finishesAt:now+durationMs};next.coins-=cost;next.construction={version:1,jobs:{...state.jobs,[key]:job}};if(from===0)next.buildingPositions={...next.buildingPositions,[key]:{x:plot.x,z:plot.z,rotation:plot.rotation}};return proposal(save,next,'start',{key,id,cost,fromLevel:from,toLevel:from+1});}catch{return fail('invalid-save');}
}

// A transient clock is not saved. Wall time grants offline elapsed on loading;
// live progress uses the monotonic anchor so pause/hitstop/wall rollback do not
// extend a live job. On a reload after rollback, waiting is capped at duration.
export function constructionClock(job,{wallNow,monotonicNow}={}){
 if(!job||typeof job.id!=='string'||!job.id||!CONSTRUCTION_DURATIONS_MS.includes(job.durationMs)||!timestamp(job.startedAt)||!timestamp(job.finishesAt)||job.finishesAt-job.startedAt!==job.durationMs||!timestamp(wallNow)||!monotonic(monotonicNow))return null;return Object.freeze({id:job.id,startedAt:job.startedAt,finishesAt:job.finishesAt,durationMs:job.durationMs,remainingAtAnchor:Math.max(0,Math.min(job.durationMs,job.finishesAt-wallNow)),monotonicAtAnchor:monotonicNow});
}
export function constructionProgress(save,key,{wallNow,monotonicNow,clock}={}){
 const state=normalizeConstructionState(save),job=state.ok?state.jobs[key]:null;if(!job||!timestamp(wallNow))return null;
 const matches=clock&&clock.id===job.id&&clock.startedAt===job.startedAt&&clock.finishesAt===job.finishesAt&&clock.durationMs===job.durationMs&&Number.isFinite(clock.remainingAtAnchor)&&clock.remainingAtAnchor>=0&&clock.remainingAtAnchor<=job.durationMs&&monotonic(clock.monotonicAtAnchor)&&monotonic(monotonicNow);
 const remainingMs=save.buildings[key]>=job.toLevel?0:matches?Math.max(0,clock.remainingAtAnchor-Math.max(0,monotonicNow-clock.monotonicAtAnchor)):Math.max(0,Math.min(job.durationMs,job.finishesAt-wallNow));
 return {id:job.id,remainingMs,progress:1-remainingMs/job.durationMs,due:remainingMs===0};
}
export function prepareConstructionCompletion(save,{now,monotonicNow,clocks={},pendingSettlement=false}={}){
 if(pendingSettlement)return fail('settlement-pending');const state=normalizeConstructionState(save);if(!state.ok)return state;if(!timestamp(now))return fail('invalid-time');
 try{const next=clone(save),completed=[];for(const key of CONSTRUCTION_KEYS){const job=state.jobs[key];if(!job)continue;const progress=constructionProgress(save,key,{wallNow:now,monotonicNow,clock:clocks[key]});if(!progress.due)continue;next.buildings[key]=Math.max(next.buildings[key],job.toLevel);completed.push({key,id:job.id,fromLevel:save.buildings[key],toLevel:next.buildings[key]});}
  const jobs=Object.fromEntries(Object.entries(state.jobs).filter(([key])=>!completed.some(row=>row.key===key)));if(Object.keys(jobs).length)next.construction={version:1,jobs};else delete next.construction;return proposal(save,next,'complete',{completed},completed.length===0);
 }catch{return fail('invalid-save');}
}

// The only IO adapter. It does not clear/recover settlements or checkpoints.
// A failed write returns the exact caller state; adopting the candidate before
// true would violate this API. Future Game code supplies its existing saveGame.
export function commitConstruction(current,prepared,{storage,persist}={}){
 const reject=(reason,error)=>({ok:false,save:current,reason,...(error?{error:String(error.message??error)}:{})});if(!prepared?.ok)return reject(prepared?.reason??'invalid-proposal');
 try{if(JSON.stringify(current)!==prepared.baseJson)return reject('stale-proposal');if(prepared.noop)return {ok:true,save:current,noop:true};if(!storage||typeof storage.getItem!=='function'||typeof persist!=='function')return reject('storage-unavailable');let pending;try{pending=storage.getItem(SAVE_KEY+':pending');}catch(error){return reject('settlement-read-failed',error);}if(pending!==null&&pending!==undefined)return reject('settlement-pending');const next=clone(prepared.next);if(!normalizeConstructionState(next).ok)return reject('invalid-proposal');if(persist(next,storage)!==true)return reject('persist-failed');return {ok:true,save:next,kind:prepared.kind,metadata:clone(prepared.metadata)};}catch(error){return reject('persist-failed',error);}
}
