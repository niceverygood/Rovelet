import test from 'node:test';
import assert from 'node:assert/strict';
import {JourneyAudio,effectiveVolume} from '../src/audio.js';

const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function context(initial='running'){
 const a={state:initial,currentTime:5,destination:{},operations:[],active:0,peak:0,throwNext:false,nodes:[]};
 function request(kind){
  a.operations.push({kind,settled:false});const op=a.operations.at(-1);
  if(a.throwNext){a.throwNext=false;op.settled=true;throw Error('declared context method throw');}
  a.active++;a.peak=Math.max(a.peak,a.active);
  return new Promise((resolve,reject)=>{op.resolve=()=>{assert.equal(op.settled,false);op.settled=true;a.active--;a.state=kind==='suspend'?'suspended':'running';resolve();};op.reject=()=>{assert.equal(op.settled,false);op.settled=true;a.active--;reject(Error('declared native rejection'));};});
 }
 a.suspend=()=>request('suspend');a.resume=()=>request('resume');
 a.complete=kind=>{const op=a.operations.find(x=>!x.settled&&(!kind||x.kind===kind));assert.ok(op,'pending '+kind);op.resolve();};
 a.reject=kind=>{const op=a.operations.find(x=>!x.settled&&(!kind||x.kind===kind));assert.ok(op,'pending '+kind);op.reject();};
 const parameter=()=>({value:0,events:[],setValueAtTime(...args){this.events.push(['set',...args]);},exponentialRampToValueAtTime(...args){this.events.push(['exp',...args]);},setTargetAtTime(...args){this.events.push(['target',...args]);}});
 const node=kind=>{const n={kind,connections:[],starts:[],stops:[],gain:parameter(),frequency:parameter(),connect(v){this.connections.push(v);},disconnect(){},start(t){this.starts.push(t);},stop(t){this.stops.push(t);}};a.nodes.push(n);return n;};
 a.createGain=()=>node('gain');a.createOscillator=()=>node('oscillator');return a;
}
function manager(audio=context(),overrides={}){const game={audio,mode:'village',save:{settings:{sound:true,volume:.5,sfxVolume:.6,bgmVolume:.2,vibration:false,...overrides}}},m=new JourneyAudio(game);m.unlocked=true;return {game,m,a:audio};}
const kinds=a=>a.operations.map(x=>x.kind);

test('delayed background suspend completes before the one latest foreground resume',async()=>{
 const {m,a}=manager();m.setHidden(true);m.setHidden(false);
 assert.deepEqual(kinds(a),['suspend']);assert.equal(m.hidden,false);assert.equal(a.state,'running');
 a.complete('suspend');await flush();assert.deepEqual(kinds(a),['suspend','resume']);assert.equal(a.peak,1);
 a.complete('resume');await flush();assert.equal(a.state,'running');assert.equal(a.active,0);
});
test('background arriving during delayed resume waits, then ends suspended',async()=>{
 const {m,a}=manager(context('suspended'));m.applySettings();m.setHidden(true);
 assert.deepEqual(kinds(a),['resume']);assert.equal(m.hidden,true);a.complete('resume');await flush();
 assert.deepEqual(kinds(a),['resume','suspend']);assert.equal(a.peak,1);a.complete('suspend');await flush();assert.equal(a.state,'suspended');
});
test('repeated hidden and settings callbacks share one unfinished suspend',async()=>{
 const {m,a}=manager();m.setHidden(true);m.setHidden(true);m.applySettings();m.setHidden(true);
 assert.deepEqual(kinds(a),['suspend']);a.complete();await flush();assert.equal(a.state,'suspended');assert.equal(a.peak,1);
});
test('mute remains authoritative through a pending hidden-to-visible handoff',async()=>{
 const {m,a,game}=manager();m.setHidden(true);m.setHidden(false);game.save.settings.sound=false;m.applySettings();
 assert.deepEqual(kinds(a),['suspend']);a.complete();await flush();assert.deepEqual(kinds(a),['suspend']);assert.equal(a.state,'suspended');assert.equal(m.hidden,false);
});
test('unmute during pending mute suspend requests only its latest resume afterward',async()=>{
 const {m,a,game}=manager();game.save.settings.sound=false;m.applySettings();game.save.settings.sound=true;m.applySettings();
 assert.deepEqual(kinds(a),['suspend']);a.complete();await flush();assert.deepEqual(kinds(a),['suspend','resume']);a.complete();await flush();assert.equal(a.state,'running');assert.equal(a.peak,1);
});
test('multiple flips ending hidden do not enqueue obsolete foreground resume',async()=>{
 const {m,a}=manager();m.setHidden(true);m.setHidden(false);m.setHidden(true);m.setHidden(false);m.setHidden(true);
 assert.deepEqual(kinds(a),['suspend']);a.complete();await flush();assert.deepEqual(kinds(a),['suspend']);assert.equal(m.hidden,true);assert.equal(a.state,'suspended');
});
test('synchronous suspend throw is contained and does not create a retry spin',async()=>{
 const {m,a}=manager();a.throwNext=true;assert.doesNotThrow(()=>m.setHidden(true));await flush();assert.deepEqual(kinds(a),['suspend']);assert.equal(a.active,0);assert.equal(m.hidden,true);
});
test('rejected suspend is caught and a later explicit call retries once',async()=>{
 const {m,a}=manager();m.setHidden(true);a.reject();await flush();assert.deepEqual(kinds(a),['suspend']);
 m.setHidden(true);assert.deepEqual(kinds(a),['suspend','suspend']);a.complete();await flush();assert.equal(a.state,'suspended');assert.equal(a.peak,1);
});
test('rejected resume with newer hidden intent does not run stale foreground work',async()=>{
 const {m,a}=manager(context('suspended'));m.applySettings();m.setHidden(true);assert.deepEqual(kinds(a),['resume']);a.reject();await flush();
 assert.equal(m.hidden,true);assert.equal(a.state,'suspended');assert.deepEqual(kinds(a),['resume']);assert.equal(a.active,0);
});
test('context replacement makes late old completion inert for the new owner',async()=>{
 const {m,a,game}=manager();m.setHidden(true);const replacement=context('suspended');game.audio=replacement;m.setHidden(false);
 assert.deepEqual(kinds(a),['suspend']);assert.deepEqual(kinds(replacement),['resume']);
 m.setHidden(true);game.audio=a;m.applySettings();assert.deepEqual(kinds(a),['suspend']);assert.equal(a.peak,1);
 a.complete();await flush();assert.equal(a.state,'suspended');replacement.complete();await flush();assert.deepEqual(kinds(replacement),['resume']);
 m.setHidden(false);assert.deepEqual(kinds(a),['suspend','resume']);a.complete();await flush();assert.equal(game.audio,a);assert.equal(a.state,'running');assert.equal(a.peak,1);
});
test('an externally timed-out but unresolved request stays single-flight until actual completion',async()=>{
 const {m,a}=manager();m.setHidden(true);m.setHidden(false);
 // This is a caller timeout observation, not cancellation of the AudioContext Promise.
 let callerTimedOut=false;await new Promise(resolve=>setTimeout(()=>{callerTimedOut=true;resolve();},1));assert.equal(callerTimedOut,true);
 for(let observation=0;observation<6;observation++){await flush();m.applySettings();}
 assert.deepEqual(kinds(a),['suspend']);assert.equal(a.active,1);assert.equal(a.peak,1);
 a.complete();await flush();assert.deepEqual(kinds(a),['suspend','resume']);a.complete();await flush();assert.equal(a.state,'running');
});
test('unlock uses the same queue instead of issuing a second pending resume',async()=>{
 const {m,a}=manager(context('suspended'));m.unlocked=false;m.unlock();assert.equal(m.unlocked,true);
 assert.deepEqual(kinds(a),['resume']);m.unlock();assert.deepEqual(kinds(a),['resume']);a.complete();await flush();assert.equal(a.state,'running');
});
test('closed context is not reopened and locked manager does not manufacture a foreground unlock',async()=>{
 const {m,a}=manager(context('closed'));m.applySettings();m.setHidden(true);m.setHidden(false);assert.deepEqual(kinds(a),[]);
 const locked=manager(context('suspended'));locked.m.unlocked=false;locked.m.applySettings();assert.deepEqual(kinds(locked.a),[]);
});
test('master/channel settings keep original gains and no operation is needed for running nonzero volume',()=>{
 const {m,a,game}=manager();m.bus=a.createGain();m.applySettings();assert.deepEqual(m.bus.gain.events,[['target',.1,5,.03]]);assert.deepEqual(kinds(a),[]);
 game.save.settings.volume=.4;game.save.settings.bgmVolume=.25;m.applySettings();assert.deepEqual(m.bus.gain.events.at(-1),['target',.1,5,.03]);
 assert.equal(effectiveVolume(game.save.settings),.24);assert.equal(effectiveVolume({...game.save.settings,sound:false}),0);
});
test('music graph, note time and immediate hidden voice cleanup keep original behavior',()=>{
 const {m,a}=manager();m.update();assert.equal(m.voices.length,2);assert.equal(m.stats.notes,1);assert.equal(a.nodes.filter(n=>n.kind==='gain').length,3);const tones=a.nodes.filter(n=>n.kind==='oscillator');assert.equal(tones.length,4);
 for(const n of tones){assert.deepEqual(n.starts,[5.02]);assert.equal(n.type,'sine');}
 assert.ok(Math.abs(tones[0].frequency.value-261.6255653005986)<1e-10);assert.ok(Math.abs(tones[2].frequency.value-65.40639132514966)<1e-10);
 assert.ok(Math.abs(tones[0].stops[0]-6.664)<1e-12);assert.ok(Math.abs(tones[2].stops[0]-7.07)<1e-12);
 m.setHidden(true);assert.equal(m.voices.length,0);assert.equal(m.next,0);for(const n of tones)assert.equal(n.stops.length,2);const count=a.nodes.length;m.update();assert.equal(a.nodes.length,count);assert.deepEqual(kinds(a),['suspend']);
});
test('audio-free mute and original webkit constructor fallback stay synchronous without save writes',async()=>{
 const {m,game}=manager(null,{sound:false}),before=JSON.stringify(game.save);assert.equal(m.applySettings(),undefined);assert.equal(m.setHidden(true),undefined);assert.equal(m.setHidden(false),undefined);assert.equal(m.unlock(),undefined);
 assert.equal(game.audio,null);assert.equal(JSON.stringify(game.save),before);assert.equal(m.unlocked,true);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),cold=context('suspended');let built=0;
 try{
  Object.defineProperty(globalThis,'window',{value:{webkitAudioContext:function(){built++;return cold;}},configurable:true});
  const fresh=manager(null);fresh.m.unlocked=false;const saved=JSON.stringify(fresh.game.save);assert.equal(fresh.m.unlock(),undefined);assert.equal(built,1);assert.equal(fresh.game.audio,cold);assert.deepEqual(kinds(cold),['resume']);cold.complete();await flush();assert.equal(cold.state,'running');assert.equal(JSON.stringify(fresh.game.save),saved);
  Object.defineProperty(globalThis,'window',{value:{AudioContext:function(){throw Error('declared constructor failure');}},configurable:true});const failed=manager(null);failed.m.unlocked=false;assert.doesNotThrow(()=>failed.m.unlock());assert.equal(failed.game.audio,null);assert.equal(failed.m.unlocked,false);
 }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
});
