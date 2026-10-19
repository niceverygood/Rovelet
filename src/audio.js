import {setCannonImpactVolume,stopCannonImpacts} from './cannon-audio.js';
export function effectiveVolume(settings,channel='sfx'){if(!settings?.sound)return 0;const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:1));return clamp(settings.volume??.35)*clamp(settings[channel+'Volume']??1);}
export const MUSIC_THEMES={home:{tempo:.58,notes:[60,64,67,72,69,67,64,62,60,64,69,72,74,72,67,64]},meadow:{tempo:.46,notes:[60,64,67,69,72,69,67,64,62,65,69,72,74,72,69,65]},volcano:{tempo:.5,notes:[57,60,64,67,69,67,64,60,55,59,62,67,69,67,62,59]},glacier:{tempo:.64,notes:[62,66,69,73,74,73,69,66,59,62,66,69,73,69,66,62]}};
export function scheduleMusicNote(audio,destination,midi,when,duration=1.6){const gain=audio.createGain(),tone=audio.createOscillator(),overtone=audio.createOscillator();tone.type='sine';overtone.type='sine';tone.frequency.value=440*2**((midi-69)/12);overtone.frequency.value=tone.frequency.value*2.001;gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(.075,when+.02);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);tone.connect(gain);overtone.connect(gain);gain.connect(destination);tone.start(when);overtone.start(when);tone.stop(when+duration+.02);overtone.stop(when+duration+.02);const voice={tone,overtone,gain};tone.onended=()=>{tone.disconnect();overtone.disconnect();gain.disconnect();};return voice;}
// Serialize AudioContext transitions; elapsed wall time does not cancel a native request.
const AUDIO_CONTEXT_INTENTS=new WeakMap();
function desiredContextState(manager){return manager.hidden||!manager.game.save.settings.sound?'suspended':manager.unlocked?'running':null;}
function syncContextState(manager){
 const audio=manager.game.audio;if(!audio)return;
 let owner=AUDIO_CONTEXT_INTENTS.get(manager);if(!owner){owner={current:null,contexts:new WeakMap()};AUDIO_CONTEXT_INTENTS.set(manager,owner);}
 let record=owner.contexts.get(audio);if(!record){record={audio,pending:null};owner.contexts.set(audio,record);}owner.current=record;
 let target,current;try{target=desiredContextState(manager);current=audio.state;}catch{return;}
 if(record.pending||!target||current==='closed'||current===target)return;
 const request={target};record.pending=request;
 function settled(){
  if(record.pending!==request)return;record.pending=null;
  if(AUDIO_CONTEXT_INTENTS.get(manager)!==owner||owner.current!==record||manager.game.audio!==audio)return;
  let latest;try{latest=desiredContextState(manager);}catch{return;}
  // Only a different latest intent is reconciled; rejection/no-op never spins.
  if(latest&&latest!==target)syncContextState(manager);
 }
 try{Promise.resolve(audio[target==='running'?'resume':'suspend']()).then(settled,settled);}catch{settled();}
}
export class JourneyAudio{
 constructor(game){this.game=game;this.unlocked=false;this.hidden=false;this.voices=[];this.next=0;this.index=0;this.theme='';this.stats={notes:0,vibrations:0};}
 unlock(){if(!this.game.save.settings.sound)return;try{this.game.audio??=new (window.AudioContext||window.webkitAudioContext)();this.unlocked=true;this.applySettings();}catch{}}
 applySettings(){const a=this.game.audio;if(!a)return;const sfx=effectiveVolume(this.game.save.settings);setCannonImpactVolume(a,sfx);if(sfx<=0)stopCannonImpacts(a);if(this.bus)this.bus.gain.setTargetAtTime(effectiveVolume(this.game.save.settings,'bgm'),a.currentTime,.03);if(!this.game.save.settings.sound)this.stopMusic();syncContextState(this);}
 stopMusic(){for(const voice of this.voices)for(const node of [voice.tone,voice.overtone])try{node.stop();}catch{}this.voices=[];this.next=0;}
 setHidden(hidden){this.hidden=hidden;if(hidden){stopCannonImpacts(this.game.audio);this.stopMusic();if(!this.game.nativeMode)try{globalThis.navigator?.vibrate?.(0);}catch{}syncContextState(this);}else this.applySettings();}
 vibrate(kind='hit'){if(this.game.nativeMode)return this.game.nativeHaptics?.vibrate(kind)??false;if(!this.game.save.settings.vibration||this.hidden)return false;const now=globalThis.performance?.now()??Date.now();if(now-(this.lastVibration??-1000)<120)return false;this.lastVibration=now;try{const ok=globalThis.navigator?.vibrate?.(kind==='hit'?[30,20,15]:12)??false;if(ok)this.stats.vibrations++;return ok;}catch{return false;}}
 update(){const a=this.game.audio;if(!a||!this.unlocked||this.hidden||a.state!=='running'||effectiveVolume(this.game.save.settings,'bgm')<=0)return;const theme=this.game.mode==='run'||this.game.mode==='lab'?this.game.stageInfo().region:'home';if(theme!==this.theme){this.stopMusic();this.theme=theme;this.index=0;}this.bus??=a.createGain();if(!this.connected){this.bus.connect(a.destination);this.connected=true;}this.bus.gain.setTargetAtTime(effectiveVolume(this.game.save.settings,'bgm'),a.currentTime,.03);this.voices=this.voices.filter(v=>v.end>a.currentTime);const music=MUSIC_THEMES[theme]??MUSIC_THEMES.home;if(this.next<a.currentTime)this.next=a.currentTime+.02;while(this.next<a.currentTime+.15&&this.voices.length<16){const midi=music.notes[this.index++%music.notes.length],voice=scheduleMusicNote(a,this.bus,midi,this.next,music.tempo*2.8);voice.end=this.next+music.tempo*2.8+.02;this.voices.push(voice);if(this.index%4===1&&this.voices.length<16){const bass=scheduleMusicNote(a,this.bus,midi-24,this.next,music.tempo*3.5);bass.end=this.next+music.tempo*3.5+.02;this.voices.push(bass);}this.next+=music.tempo;this.stats.notes++;}}
}

