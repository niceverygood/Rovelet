// WORK-only: no plugin, Game, storage, DOM-global or save-mirror imports.
export function createNativeLifecycle({mode='web',platform='ios',app,document:doc,inputTarget,blurTarget,
 now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=2000,backBurstMs=120,
 hooks={},onError=()=>{}}={}){
 if(!['web','native'].includes(mode))throw TypeError('mode');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(backBurstMs)||backBurstMs<0)throw TypeError('timeout');
 if(mode==='native')for(const name of ['frameReset','clearInput','clearTouch','pause','checkpoint','audioHidden'])
  if(typeof hooks[name]!=='function')throw TypeError('Required synchronous hook: '+name);
 let started=false,disposed=false,nativeActive=false,nativeKnown=false,monitorReady=false,hidden=null,eventVersion=0,queryVersion=0;
 let ready=null,disposeResult=null,backPending=false,lastBack=-Infinity;
 const handles=new Set(),tokens=new Set(),dom=[],errors=[];
 const stats={transitions:0,backgrounds:0,foregrounds:0,backRequests:0,backBlocked:0,inputBlocked:0,blurs:0};
 function error(label,cause){const entry={label,message:String(cause?.message??cause)};if(errors.length===32)errors.shift();errors.push(entry);try{Promise.resolve(onError(entry)).catch(()=>{});}catch{}}
 function safe(label,fn,...args){try{const result=fn?.(...args);if(result&&typeof result.then==='function')Promise.resolve(result).catch(cause=>error(label,cause));return result;}catch(cause){error(label,cause);return undefined;}}
 function clock(){try{const stamp=now();if(!Number.isFinite(stamp))throw TypeError('Nonfinite clock');return stamp;}catch(cause){error('clock',cause);return null;}}
 function wait(promise,label){return new Promise(resolve=>{
  let done=false;const finish=value=>{if(done)return;done=true;clearTimer(timer);resolve(value);};
  const timer=setTimer(()=>finish({ok:false,reason:'timeout'}),timeoutMs);
  Promise.resolve(promise).then(value=>finish({ok:true,value}),cause=>{error(label,cause);finish({ok:false,reason:'rejected'});});
 });}
 function readHidden(){try{return doc?.hidden!==false;}catch(cause){error('document.hidden',cause);return true;}}
 function snapshot(){return Object.freeze({mode,platform,started,disposed,nativeKnown,nativeActive,
  hidden:mode==='web'?false:disposed||hidden!==false,monitorReady,ready:mode==='web'||started&&!disposed&&nativeKnown&&monitorReady,backPending,
  stats:Object.freeze({...stats}),errors:Object.freeze(errors.map(e=>Object.freeze({...e})))});}
 function apply(){
  if(mode!=='native'||disposed||!started)return false;
  const next=!monitorReady||readHidden()||!nativeActive;if(next===hidden)return false;hidden=next;stats.transitions++;
  // Set the gate first, before any reentrant UI/audio work. Hooks must be synchronous.
  const stamp=clock();if(stamp!==null)safe('frameReset',hooks.frameReset,stamp);safe('inputBlocked',hooks.inputBlocked,next);
  if(next){stats.backgrounds++;safe('clearInput',hooks.clearInput);safe('clearTouch',hooks.clearTouch);
   safe('cancelGestures',hooks.cancelGestures);safe('pause',hooks.pause);safe('checkpoint',hooks.checkpoint);
  }else stats.foregrounds++;
  safe('audioHidden',hooks.audioHidden,next);return true;
 }
 function state(active){if(disposed||!started||typeof active!=='boolean')return false;
  eventVersion++;nativeKnown=true;nativeActive=active;return apply();}
 function addDOM(target,name,fn,capture=false){if(!target?.addEventListener)return;
  try{target.addEventListener(name,fn,capture);dom.push([target,name,fn,capture]);}catch(cause){error('listen:'+name,cause);}}
 function removeHandle(record){if(record.removed)return record.result;record.removed=true;handles.delete(record);
  try{return record.result=wait(record.handle.remove(),'remove:'+record.name);}catch(cause){error('remove:'+record.name,cause);return record.result=Promise.resolve({ok:false,reason:'threw'});}}
 function subscribe(name,fn){
  const token={active:true};tokens.add(token);let pending;
  try{if(typeof app?.addListener!=='function')throw TypeError('App.addListener unavailable');
   pending=Promise.resolve(app.addListener(name,value=>{if(token.active&&!disposed)safe('event:'+name,fn,value);}));
  }catch(cause){error('listen:'+name,cause);tokens.delete(token);return Promise.resolve({ok:false,reason:'threw'});}
  // A handle arriving after timeout/dispose is still owned and removed exactly once.
  const observed=pending.then(handle=>{
   if(typeof handle?.remove!=='function')throw TypeError('Listener handle.remove unavailable');
   const record={name,handle,removed:false,result:null};handles.add(record);
   if(!token.active||disposed)void removeHandle(record);return record;
  });
  return wait(observed,'listen:'+name).then(result=>{if(!result.ok){token.active=false;error('listen:'+name,result.reason);}return result;});
 }
 function refreshState(){
  if(mode!=='native'||disposed||!started)return Promise.resolve(snapshot());
  const query=++queryVersion,version=eventVersion;let pending;
  try{if(typeof app?.getState!=='function')throw TypeError('App.getState unavailable');pending=app.getState();}
  catch(cause){error('getState',cause);return Promise.resolve(snapshot());}
  return wait(pending,'getState').then(result=>{
   if(disposed||query!==queryVersion||version!==eventVersion)return snapshot();
   if(!result.ok){error('getState',result.reason);return snapshot();}
   if(typeof result.value?.isActive!=='boolean'){error('getState','Invalid isActive');return snapshot();}
   nativeKnown=true;nativeActive=result.value.isActive;apply();return snapshot();
  });
 }
 function requestBack(){
  if(mode!=='native'||platform!=='android'||!started||disposed||hidden!==false||backPending){stats.backBlocked++;return false;}
  let permitted;try{permitted=hooks.canBack?.()===true;}catch(cause){error('canBack',cause);permitted=false;}
  const stamp=clock();if(!permitted||typeof hooks.escape!=='function'||stamp===null||stamp-lastBack<backBurstMs){stats.backBlocked++;return false;}
  lastBack=stamp;backPending=true;stats.backRequests++;let result;
  try{result=hooks.escape();}catch(cause){error('escape',cause);backPending=false;return false;}
  // Keep an async route locked after timeout: a timed-out Promise cannot be cancelled.
  // Otherwise a late UI commit and a second Back could both execute.
  let settled=false;const timer=setTimer(()=>{if(!settled)error('escape','timeout; route remains locked');},timeoutMs);
  Promise.resolve(result).then(()=>{},cause=>error('escape',cause)).finally(()=>{settled=true;clearTimer(timer);backPending=false;});
  return true;
 }
 function blur(){if(mode!=='native'||disposed||!started)return false;stats.blurs++;
  safe('clearInput',hooks.clearInput);safe('clearTouch',hooks.clearTouch);safe('cancelGestures',hooks.cancelGestures);
  // Preserve the browser blur contract: only an active -> pause change checkpoints.
  if(safe('pause',hooks.pause)===true)safe('checkpoint',hooks.checkpoint);return true;
 }
 function blockInput(event){if(hidden===false||disposed)return;stats.inputBlocked++;
  if(event?.cancelable!==false)safe('preventDefault',event?.preventDefault?.bind(event));
  safe('stopImmediatePropagation',event?.stopImmediatePropagation?.bind(event));}
 function start(){
  if(started||disposed)return api;started=true;if(mode==='web'){ready=Promise.resolve(snapshot());return api;}
  // Unknown native state is closed until a validated getState/event arrives.
  apply();addDOM(doc,'visibilitychange',apply);addDOM(blurTarget,'blur',blur);
  for(const name of ['keydown','keyup','pointerdown','pointermove','pointerup','click'])addDOM(inputTarget,name,blockInput,true);
  const subscriptions=[subscribe('appStateChange',value=>{if(typeof value?.isActive==='boolean')state(value.isActive);else error('appStateChange','Invalid isActive');}),
   subscribe('pause',()=>state(false)),subscribe('resume',()=>state(true))];
  // Do not override Android's default Back unless a guarded Escape delegate exists.
  if(platform==='android'&&typeof hooks.escape==='function'&&typeof hooks.canBack==='function')subscriptions.push(subscribe('backButton',requestBack));
  ready=Promise.all([...subscriptions,refreshState()]).then(results=>{
   if(!disposed){monitorReady=results[0].ok||results[1].ok&&results[2].ok;apply();}return snapshot();
  });return api;
 }
 function dispose(){
  if(disposeResult)return disposeResult;disposed=true;queryVersion++;for(const token of tokens)token.active=false;tokens.clear();
  for(const [target,name,fn,capture]of dom.splice(0))safe('unlisten:'+name,target.removeEventListener?.bind(target),name,fn,capture);
  disposeResult=Promise.all([...handles].map(removeHandle)).then(()=>snapshot());return disposeResult;
 }
 const api=Object.freeze({start,whenReady:()=>ready??Promise.resolve(snapshot()),refreshState,requestBack,blur,dispose,
  isHidden:()=>mode==='native'&&(disposed||hidden!==false),allowsInput:()=>mode==='web'||started&&!disposed&&hidden===false,snapshot});return api;
}
