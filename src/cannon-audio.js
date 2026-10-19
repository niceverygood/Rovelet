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

// Primary explosion voices share the original cannon lifecycle and mix bus.
export const PRIMARY_EXPLOSION_AUDIO=Object.freeze({
 rocket:Object.freeze({attackEnd:.032,attackFilterType:'bandpass',attackHz:2200,attackQ:.65,attackGain:.040,bodyStart:.006,bodyEnd:.220,bodyType:'triangle',bodyFrom:140,bodyTo:38,bodyGain:.075,tailStart:.025,tailEnd:.340,tailFilterType:'lowpass',tailHz:900,tailTo:180,tailQ:.7,tailGain:.018,nearCutoff:3800,farCutoff:700}),
 meteor:Object.freeze({attackEnd:.045,attackFilterType:'lowpass',attackHz:1800,attackQ:.7,attackGain:.045,bodyStart:.008,bodyEnd:.290,bodyType:'sine',bodyFrom:75,bodyTo:28,bodyGain:.085,tailStart:.035,tailEnd:.460,tailFilterType:'bandpass',tailHz:420,tailTo:160,tailQ:.8,tailGain:.022,nearCutoff:2200,farCutoff:450}),
 clusterbomb:Object.freeze({attackEnd:.022,attackFilterType:'bandpass',attackHz:3200,attackQ:.7,attackGain:.030,bodyStart:.004,bodyEnd:.130,bodyType:'triangle',bodyFrom:180,bodyTo:65,bodyGain:.055,tailStart:.018,tailEnd:.240,tailFilterType:'bandpass',tailHz:1500,tailTo:650,tailQ:.9,tailGain:.014,nearCutoff:4500,farCutoff:1000}),
 landmine:Object.freeze({attackEnd:.018,attackFilterType:'highpass',attackHz:3000,attackQ:.7,attackGain:.050,bodyStart:.003,bodyEnd:.200,bodyType:'triangle',bodyFrom:105,bodyTo:34,bodyGain:.080,tailStart:.025,tailEnd:.360,tailFilterType:'bandpass',tailHz:650,tailTo:230,tailQ:.8,tailGain:.018,nearCutoff:3600,farCutoff:700}),
 'cluster-fragment':Object.freeze({attackEnd:.010,attackFilterType:'bandpass',attackHz:3500,attackQ:.7,attackGain:.009,bodyStart:.002,bodyEnd:.060,bodyType:'sine',bodyFrom:260,bodyTo:120,bodyGain:.016,tailStart:.010,tailEnd:.110,tailFilterType:'bandpass',tailHz:1800,tailTo:900,tailQ:.9,tailGain:.004,nearCutoff:4200,farCutoff:1000})
});
function primaryNoiseBuffer(audio,state){if(state.primaryBuffer)return state.primaryBuffer;const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.50),audio.sampleRate),data=buffer.getChannelData(0);let seed=0xe71051;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}state.primaryBuffer=buffer;state.stats.bufferBuilds++;return buffer;
}
export function schedulePrimaryExplosion(audio,key,{volume=1,distance=0}={}){
 const profile=Object.hasOwn(PRIMARY_EXPLOSION_AUDIO,key)?PRIMARY_EXPLOSION_AUDIO[key]:null;if(!profile||!audio||typeof audio.createGain!=='function'||!Number.isFinite(audio.currentTime)||audio.state==='closed')return null;
 const level=volumeValue(volume);if(level<=0){setCannonImpactVolume(audio,0);stopCannonImpacts(audio);return null;}
 const state=stateFor(audio),now=audio.currentTime;for(const voice of [...state.voices])if(voice.end<=now)voice.finish('finished',true);
 setCannonImpactVolume(audio,level);const outgoing=[...state.voices].filter(voice=>voice.incoming===false).length;if(state.voices.size>=8||outgoing>=6){state.stats.rejected++;return null;}
 const d=Number.isFinite(distance)?Math.max(0,distance):0,attenuation=1/(1+.08*d),cutoff=profile.farCutoff+(profile.nearCutoff-profile.farCutoff)/(1+.06*d),nodes=[],sources=[],ended=new Set();
 const voice={incoming:false,key,start:now,end:now+profile.tailEnd+.010,sources,nodes,finished:false,stop(){voice.finish('stopped',true);},finish(reason,stopSources=false){if(voice.finished)return;voice.finished=true;state.voices.delete(voice);if(stopSources)for(const source of sources)try{source.stop(audio.currentTime);}catch{}for(const node of nodes)try{node.disconnect();}catch{}state.stats[reason]++;}};
 const own=node=>{nodes.push(node);return node;},filter=(type,frequency,q)=>{const node=own(audio.createBiquadFilter());node.type=type;node.frequency.setValueAtTime(frequency,now);node.Q.setValueAtTime(q,now);return node;},gain=(start,peakTime,end,peak)=>{const node=own(audio.createGain());node.gain.setValueAtTime(.0001,now+start);node.gain.exponentialRampToValueAtTime(peak,now+peakTime);node.gain.exponentialRampToValueAtTime(.0001,now+end);return node;};
 try{
  const bus=sharedBus(audio,state,level),buffer=primaryNoiseBuffer(audio,state),finalFilter=filter('lowpass',cutoff,Math.SQRT1_2),distanceGain=own(audio.createGain());distanceGain.gain.setValueAtTime(attenuation,now);finalFilter.connect(distanceGain);distanceGain.connect(bus);
  const attack=own(audio.createBufferSource());sources.push(attack);attack.buffer=buffer;const attackFilter=filter(profile.attackFilterType,profile.attackHz,profile.attackQ),attackGain=gain(0,.002,profile.attackEnd,profile.attackGain);attack.connect(attackFilter);attackFilter.connect(attackGain);attackGain.connect(finalFilter);
  const body=own(audio.createOscillator());sources.push(body);body.type=profile.bodyType;body.frequency.setValueAtTime(profile.bodyFrom,now+profile.bodyStart);body.frequency.exponentialRampToValueAtTime(profile.bodyTo,now+profile.bodyEnd);const bodyGain=gain(profile.bodyStart,profile.bodyStart+.008,profile.bodyEnd,profile.bodyGain);body.connect(bodyGain);bodyGain.connect(finalFilter);
  const tail=own(audio.createBufferSource());sources.push(tail);tail.buffer=buffer;const tailFilter=filter(profile.tailFilterType,profile.tailHz,profile.tailQ);tailFilter.frequency.exponentialRampToValueAtTime(profile.tailTo,now+profile.tailEnd);const tailGain=gain(profile.tailStart,profile.tailStart+.012,profile.tailEnd,profile.tailGain);tail.connect(tailFilter);tailFilter.connect(tailGain);tailGain.connect(finalFilter);
  for(const source of sources)source.onended=()=>{ended.add(source);if(ended.size===sources.length)voice.finish('finished');};state.voices.add(voice);attack.start(now);attack.stop(now+profile.attackEnd+.010);body.start(now+profile.bodyStart);body.stop(now+profile.bodyEnd+.010);tail.start(now+profile.tailStart);tail.stop(now+profile.tailEnd+.010);state.stats.scheduled++;state.stats.peak=Math.max(state.stats.peak,state.voices.size);return voice;
 }catch{voice.finish('failed',true);return null;}
}

// Typed incoming hull and shield contacts use the existing reserved incoming slots.
export const INCOMING_CONTACT_AUDIO=Object.freeze({
 fireball:Object.freeze({attackEnd:.028,attackFilterType:'lowpass',attackHz:1800,attackQ:.7,attackGain:.030,bodyStart:.004,bodyEnd:.150,bodyType:'triangle',bodyFrom:110,bodyTo:45,bodyGain:.065,tailStart:.020,tailEnd:.300,tailFilterType:'bandpass',tailHz:1000,tailTo:260,tailQ:.6,tailGain:.020,finalCutoff:3200}),
 icebolt:Object.freeze({attackEnd:.012,attackFilterType:'highpass',attackHz:3500,attackQ:.7,attackGain:.024,bodyStart:.003,bodyEnd:.100,bodyType:'sine',bodyFrom:960,bodyTo:380,bodyGain:.040,tailStart:.012,tailEnd:.190,tailFilterType:'bandpass',tailHz:4200,tailTo:1800,tailQ:1.1,tailGain:.010,finalCutoff:5800}),
 shield:Object.freeze({attackEnd:.012,attackFilterType:'bandpass',attackHz:5000,attackQ:.7,attackGain:.012,bodyStart:.002,bodyEnd:.180,bodyType:'sine',bodyFrom:880,bodyTo:660,bodyGain:.036,tailStart:.018,tailEnd:.230,tailFilterType:'bandpass',tailHz:3000,tailTo:1800,tailQ:1.2,tailGain:.006,finalCutoff:5000})
});
export function scheduleIncomingContact(audio,key,{volume=1}={}){
 const profile=Object.hasOwn(INCOMING_CONTACT_AUDIO,key)?INCOMING_CONTACT_AUDIO[key]:null;if(!profile||!audio||typeof audio.createGain!=='function'||!Number.isFinite(audio.currentTime)||audio.state==='closed')return null;
 const level=volumeValue(volume);if(level<=0){setCannonImpactVolume(audio,0);stopCannonImpacts(audio);return null;}
 const state=stateFor(audio),now=audio.currentTime;for(const voice of [...state.voices])if(voice.end<=now)voice.finish('finished',true);
 setCannonImpactVolume(audio,level);const incoming=[...state.voices].filter(voice=>voice.incoming===true).length;if(state.voices.size>=8||incoming>=2){state.stats.rejected++;return null;}
 const nodes=[],sources=[],ended=new Set(),end=Math.max(profile.attackEnd,profile.bodyEnd,profile.tailEnd)+.010;
 const voice={incoming:true,key,start:now,end:now+end,sources,nodes,finished:false,stop(){voice.finish('stopped',true);},finish(reason,stopSources=false){if(voice.finished)return;voice.finished=true;state.voices.delete(voice);if(stopSources)for(const source of sources)try{source.stop(audio.currentTime);}catch{}for(const node of nodes)try{node.disconnect();}catch{}state.stats[reason]++;}};
 const own=node=>{nodes.push(node);return node;},filter=(type,frequency,q)=>{const node=own(audio.createBiquadFilter());node.type=type;node.frequency.setValueAtTime(frequency,now);node.Q.setValueAtTime(q,now);return node;},gain=(start,peakTime,end,peak)=>{const node=own(audio.createGain());node.gain.setValueAtTime(.0001,now+start);node.gain.exponentialRampToValueAtTime(peak,now+peakTime);node.gain.exponentialRampToValueAtTime(.0001,now+end);return node;};
 try{
  const bus=sharedBus(audio,state,level),buffer=primaryNoiseBuffer(audio,state),finalFilter=filter('lowpass',profile.finalCutoff,Math.SQRT1_2);finalFilter.connect(bus);
  const attack=own(audio.createBufferSource());sources.push(attack);attack.buffer=buffer;const attackFilter=filter(profile.attackFilterType,profile.attackHz,profile.attackQ),attackGain=gain(0,.002,profile.attackEnd,profile.attackGain);attack.connect(attackFilter);attackFilter.connect(attackGain);attackGain.connect(finalFilter);
  const body=own(audio.createOscillator());sources.push(body);body.type=profile.bodyType;body.frequency.setValueAtTime(profile.bodyFrom,now+profile.bodyStart);body.frequency.exponentialRampToValueAtTime(profile.bodyTo,now+profile.bodyEnd);const bodyGain=gain(profile.bodyStart,profile.bodyStart+.008,profile.bodyEnd,profile.bodyGain);body.connect(bodyGain);bodyGain.connect(finalFilter);
  const tail=own(audio.createBufferSource());sources.push(tail);tail.buffer=buffer;const tailFilter=filter(profile.tailFilterType,profile.tailHz,profile.tailQ);tailFilter.frequency.exponentialRampToValueAtTime(profile.tailTo,now+profile.tailEnd);const tailGain=gain(profile.tailStart,profile.tailStart+.012,profile.tailEnd,profile.tailGain);tail.connect(tailFilter);tailFilter.connect(tailGain);tailGain.connect(finalFilter);
  for(const source of sources)source.onended=()=>{ended.add(source);if(ended.size===sources.length)voice.finish('finished');};state.voices.add(voice);attack.start(now);attack.stop(now+profile.attackEnd+.010);body.start(now+profile.bodyStart);body.stop(now+profile.bodyEnd+.010);tail.start(now+profile.tailStart);tail.stop(now+profile.tailEnd+.010);state.stats.scheduled++;state.stats.peak=Math.max(state.stats.peak,state.voices.size);return voice;
 }catch{voice.finish('failed',true);return null;}
}
