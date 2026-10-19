import {effectiveVolume} from './audio.js';
import {WEAPONS} from './data.js';
import {scheduleCannonImpact,PRIMARY_EXPLOSION_AUDIO,schedulePrimaryExplosion,INCOMING_CONTACT_AUDIO,scheduleIncomingContact} from './cannon-audio.js';
export function soundProfile(key,kind='shot'){const w=WEAPONS[key]??WEAPONS.cannon,index=Math.max(0,Object.keys(WEAPONS).indexOf(key)),base={straight:145,lob:85,pierce:310,chain:820,area:170,deploy:230,homing:480}[w.family];return {frequency:base*2**((index%7)/12)*(kind==='impact'?.7:1),duration:(kind==='impact'?.2:.09)+(index%4)*.025,noise:['straight','lob','area'].includes(w.family),filter:w.family==='lob'?750:w.family==='area'?1500:3200,type:w.family==='chain'||w.family==='homing'?'sine':'triangle',volume:w.family==='area'?.09:.13};}
export function scheduleWeaponSound(audio,key,volume,kind='shot'){const p=soundProfile(key,kind),now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=p.type;o.frequency.setValueAtTime(p.frequency,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,p.frequency*(kind==='impact'?.36:.7)),now+p.duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,p.volume*volume),now+.004);g.gain.exponentialRampToValueAtTime(.0001,now+p.duration);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+p.duration+.01);if(p.noise){const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*p.duration),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const n=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();n.buffer=buffer;filter.type='lowpass';filter.frequency.value=p.filter;gain.gain.setValueAtTime(volume*.09,now);gain.gain.exponentialRampToValueAtTime(.0001,now+p.duration);n.connect(filter);filter.connect(gain);gain.connect(audio.destination);n.start(now);n.stop(now+p.duration+.01);}}
export function playWeaponSound(game,key,kind='shot'){if(!game.save.settings.sound||effectiveVolume(game.save.settings)<=0||game.audioManager?.hidden)return;try{game.audio??=new (window.AudioContext||window.webkitAudioContext)();game.weaponSoundTimes??={};const id=key+kind,now=game.audio.currentTime;if(now-(game.weaponSoundTimes[id]??-1)<.05)return;game.weaponSoundTimes[id]=now;if(game.audio.state==='suspended')game.audio.resume()?.catch?.(()=>{});scheduleWeaponSound(game.audio,key,effectiveVolume(game.save.settings),kind);}catch{}}
export function playCannonImpact(game,point,{incoming=false}={}){
 const volume=effectiveVolume(game.save.settings);if(volume<=0||game.audioManager?.hidden||globalThis.document?.hidden)return null;
 try{
  game.audio??=new (window.AudioContext||window.webkitAudioContext)();const audio=game.audio,now=audio.currentTime,isIncoming=incoming===true,cache=isIncoming?(game.soundTimes??={}):(game.weaponSoundTimes??={}),id=isIncoming?'hull':'cannonimpact',gate=isIncoming?.045:.05;
  if(!Number.isFinite(now)||now-(cache[id]??-1)<gate)return null;
  const previous=cache[id],position=game.player?.root?.position;let distance=0;
  if(!isIncoming&&[point?.x,point?.z,position?.x,position?.z].every(Number.isFinite)){const value=Math.hypot(point.x-position.x,point.z-position.z);if(Number.isFinite(value))distance=value;}
  const resume=audio.state==='suspended'?audio.resume():null,voice=scheduleCannonImpact(audio,{volume,incoming:isIncoming,distance});if(voice)cache[id]=now;
  resume?.catch?.(()=>{voice?.stop();if(voice&&cache[id]===now){if(previous===undefined)delete cache[id];else cache[id]=previous;}});
  return voice;
 }catch{return null;}
}

export function playPrimaryExplosion(game,key,point){
 if(!Object.hasOwn(PRIMARY_EXPLOSION_AUDIO,key))return playWeaponSound(game,key,'impact');
 const volume=effectiveVolume(game.save.settings);if(!game.run||game.run.outcome||volume<=0||game.audioManager?.hidden||globalThis.document?.hidden)return null;
 try{
  game.audio??=new (window.AudioContext||window.webkitAudioContext)();const audio=game.audio,now=audio.currentTime;if(!Number.isFinite(now))return null;
  const cache=game.weaponSoundTimes??={},id=key+'impact';if(now-(cache[id]??-1)<.05)return null;
  // Reserve before cap/graph/resume attempts so victim legacy audio cannot leak.
  cache[id]=now;if(audio.state==='closed')return null;const position=game.player?.root?.position;let distance=0;if([point?.x,point?.z,position?.x,position?.z].every(Number.isFinite)){const value=Math.hypot(point.x-position.x,point.z-position.z);if(Number.isFinite(value))distance=value;}
  const voice=schedulePrimaryExplosion(audio,key,{volume,distance});if(!voice)return null;
  if(audio.state==='suspended'){try{audio.resume()?.catch?.(()=>voice.stop());}catch{voice.stop();return null;}}return voice;
 }catch{return null;}
}

export function playIncomingContact(game,key,point){
 if(!Object.hasOwn(INCOMING_CONTACT_AUDIO,key))return null;
 const volume=effectiveVolume(game.save.settings);if(!game.run||game.run.outcome||volume<=0||game.audioManager?.hidden||globalThis.document?.hidden)return null;
 try{
  game.audio??=new (window.AudioContext||window.webkitAudioContext)();const audio=game.audio,now=audio.currentTime;if(!Number.isFinite(now))return null;
  const cache=game.soundTimes??={},shield=key==='shield',id=shield?'shield':'hull',gate=shield?.12:.045;if(now-(cache[id]??-1)<gate)return null;
  // Reserve before closed/cap/graph/resume attempts; failed typed contacts must
  // not retry immediately or open a competing legacy hull graph.
  cache[id]=now;if(audio.state==='closed')return null;const voice=scheduleIncomingContact(audio,key,{volume});if(!voice)return null;
  if(audio.state==='suspended'){try{audio.resume()?.catch?.(()=>voice.stop());}catch{voice.stop();return null;}}return voice;
 }catch{return null;}
}
