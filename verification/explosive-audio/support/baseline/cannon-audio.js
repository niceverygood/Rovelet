// Original synthesized cannon impacts, isolated from Game/audio imports.
const states=new WeakMap(),zeroStats=()=>({scheduled:0,rejected:0,finished:0,stopped:0,failed:0,peak:0,bufferBuilds:0});
const volumeValue=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
function stateFor(audio){let state=states.get(audio);if(!state){state={voices:new Set(),buffer:null,bus:null,volume:0,stats:zeroStats()};states.set(audio,state);}return state;}
export function cannonImpactSnapshot(audio){const state=states.get(audio),voices=state?[...state.voices]:[];return {...(state?.stats??zeroStats()),active:voices.length,outgoing:voices.filter(voice=>!voice.incoming).length,incoming:voices.filter(voice=>voice.incoming).length,volume:state?.volume??0};}
export function setCannonImpactVolume(audio,volume){const state=states.get(audio);if(!state?.bus)return false;const value=volumeValue(volume),now=audio.currentTime;if(!Number.isFinite(now))return false;if(value===state.volume)return true;try{const gain=state.bus.gain;if(value===0){gain.cancelScheduledValues(now);gain.setValueAtTime(0,now);}else{if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(now);else{const held=volumeValue(gain.value);gain.cancelScheduledValues(now);gain.setValueAtTime(held,now);}gain.linearRampToValueAtTime(value,now+.012);}state.volume=value;return true;}catch{return false;}}
export function stopCannonImpacts(audio){const state=states.get(audio);if(!state)return;for(const voice of [...state.voices])voice.stop();}
function noiseBuffer(audio,state){if(state.buffer)return state.buffer;const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.30),audio.sampleRate),data=buffer.getChannelData(0);let seed=0x5ca11a;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}state.buffer=buffer;state.stats.bufferBuilds++;return buffer;
}
function sharedBus(audio,state,volume){if(!state.bus){const bus=audio.createGain();try{bus.gain.setValueAtTime(volume,audio.currentTime);bus.connect(audio.destination);state.bus=bus;state.volume=volume;}catch(error){try{bus.disconnect();}catch{}throw error;}}if(!setCannonImpactVolume(audio,volume))throw new Error('Cannon bus gain unavailable.');return state.bus;}
export function scheduleCannonImpact(audio,{volume=1,incoming=false,distance=0}={}){
 if(!audio||typeof audio.createGain!=='function'||!Number.isFinite(audio.currentTime)||audio.state==='closed')return null;
 const level=volumeValue(volume);if(level<=0){setCannonImpactVolume(audio,0);stopCannonImpacts(audio);return null;}
 const state=stateFor(audio),now=audio.currentTime;
 // onended normally closes the voice. Reap overdue voices if event delivery
 // was delayed, so delayed callbacks cannot consume future reservation slots.
 for(const voice of [...state.voices])if(voice.end<=now)voice.finish('finished',true);
 setCannonImpactVolume(audio,level);const isIncoming=incoming===true,count=[...state.voices].filter(voice=>voice.incoming===isIncoming).length;
 if(state.voices.size>=8||count>=(isIncoming?2:6)){state.stats.rejected++;return null;}
 const d=isIncoming?0:Number.isFinite(distance)?Math.max(0,distance):0,attenuation=1/(1+.08*d),cutoff=900+2300/(1+.06*d),nodes=[],sources=[],ended=new Set();
 const voice={incoming:isIncoming,start:now,end:now+.290,sources,nodes,finished:false,stop(){voice.finish('stopped',true);},finish(reason,stopSources=false){if(voice.finished)return;voice.finished=true;state.voices.delete(voice);if(stopSources)for(const source of sources)try{source.stop(audio.currentTime);}catch{}for(const node of nodes)try{node.disconnect();}catch{}state.stats[reason]++;}};
 const own=node=>{nodes.push(node);return node;},filter=(type,frequency,q)=>{const node=own(audio.createBiquadFilter());node.type=type;node.frequency.setValueAtTime(frequency,now);node.Q.setValueAtTime(q,now);return node;};
 const gain=(start,peakTime,end,peak)=>{const node=own(audio.createGain());node.gain.setValueAtTime(.0001,now+start);node.gain.exponentialRampToValueAtTime(peak,now+peakTime);node.gain.exponentialRampToValueAtTime(.0001,now+end);return node;};
 try{
  const bus=sharedBus(audio,state,level),buffer=noiseBuffer(audio,state),finalFilter=filter('lowpass',cutoff,Math.SQRT1_2),distanceGain=own(audio.createGain());distanceGain.gain.setValueAtTime(attenuation,now);finalFilter.connect(distanceGain);distanceGain.connect(bus);
  const attack=own(audio.createBufferSource());sources.push(attack);attack.buffer=buffer;const attackFilter=filter('lowpass',isIncoming?2200:4500,Math.SQRT1_2),attackGain=gain(0,.002,.022,isIncoming?.060:.045);attack.connect(attackFilter);attackFilter.connect(attackGain);attackGain.connect(finalFilter);
  const body=own(audio.createOscillator());sources.push(body);body.type='triangle';body.frequency.setValueAtTime(isIncoming?90:130,now+.004);body.frequency.exponentialRampToValueAtTime(isIncoming?38:50,now+.165);const bodyGain=gain(.004,.012,.165,isIncoming?.120:.085);body.connect(bodyGain);bodyGain.connect(finalFilter);
  const tail=own(audio.createBufferSource());sources.push(tail);tail.buffer=buffer;const tailFilter=filter('bandpass',isIncoming?720:1100,1.1),tailGain=gain(.020,.035,.280,isIncoming?.030:.025);tail.connect(tailFilter);tailFilter.connect(tailGain);tailGain.connect(finalFilter);
  for(const source of sources)source.onended=()=>{ended.add(source);if(ended.size===sources.length)voice.finish('finished');};
  state.voices.add(voice);attack.start(now);attack.stop(now+.025);body.start(now+.004);body.stop(now+.175);tail.start(now+.020);tail.stop(now+.290);state.stats.scheduled++;state.stats.peak=Math.max(state.stats.peak,state.voices.size);return voice;
 }catch{voice.finish('failed',true);return null;}
}
