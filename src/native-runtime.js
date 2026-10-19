// Loaded by main only in the native branch. No Game/World/UI construction here.
import {prepareNativePersistence,NATIVE_SAVE_COPY} from './native-persistence.js';
import {createNativeLifecycle} from './native-lifecycle.js';
import {createNativeHaptics} from './native-haptics.js';
import {SAVE_KEY} from './data.js';
import {normalizeSave} from './persistence.js';
import CATALOG from './locales/catalog.json' with {type:'json'};

const runtimeCopy=locale=>Object.freeze({...NATIVE_SAVE_COPY[locale],...Object.fromEntries(['saving','savePending','cancel','saved','lifecycle','localFailure'].map(key=>[key,CATALOG['native.runtime.'+key][locale]]))});
export const NATIVE_RUNTIME_COPY=Object.freeze({ko:runtimeCopy('ko'),en:runtimeCopy('en')});
const failed=state=>({nativeAck:false,durable:false,state});
const messages=game=>NATIVE_RUNTIME_COPY[game.save.settings.language]??NATIVE_RUNTIME_COPY.ko;
function safely(fn,...args){try{const value=fn?.(...args);if(value&&typeof value.then==='function')Promise.resolve(value).catch(()=>{});return value;}catch{return undefined;}}

export function createNativeSaveTitle({game,ui,session}={}){
 let current=null,sequence=0,disposed=false,state='idle',backgroundFlight=null;
 function changed(){game.nativeMessages=messages(game);game.nativeCriticalHeld=!!current;game.nativeCriticalPending=!!current?.busy;safely(ui.renderScreen?.bind(ui));}
 function same(op){try{return game.mode==='run'&&game.screen==='pause'&&game.run===op.run&&game.run.id===op.id&&!game.run.outcome&&
  JSON.stringify(game.run)===op.runJson&&game.checkpoint?.run?.id===op.id&&game.storage.getItem('wandering-hearth:run')===op.cpRaw;}catch{return false;}}
 function cancel(){if(!current)return false;current=null;sequence++;state='cancelled';changed();return true;}
 function finishFailure(op,reason){if(current!==op||disposed)return failed('cancelled');op.busy=false;state=reason;changed();return failed(reason);}
 function request(){
  if(disposed||game.nativeInputBlocked)return Promise.resolve(failed('blocked'));
  if(current?.busy)return current.flight;
  if(current?.captureFailed)return Promise.resolve(finishFailure(current,'capture-failed'));
  if(current&&!same(current)){cancel();return Promise.resolve(failed('stale-ui'));}
  if(!current){
   if(game.mode!=='run'||game.screen!=='pause'||!game.run||game.run.outcome)return Promise.resolve(failed('invalid-screen'));
   const localAccepted=game.checkpointRun();if(localAccepted!==true){state='local-rejected';safely(ui.toast?.bind(ui),messages(game).localFailure);return Promise.resolve(failed(state));}
   let cpRaw,barrier;try{cpRaw=game.storage.getItem('wandering-hearth:run');if(typeof cpRaw!=='string'||JSON.parse(cpRaw)?.run?.id!==game.run.id)throw Error('CP identity');barrier=session.captureCritical(localAccepted);}catch{current={token:++sequence,captureFailed:true,attempts:0,busy:false,barrier:null};return Promise.resolve(finishFailure(current,'capture-failed'));}
   current={token:++sequence,run:game.run,id:game.run.id,runJson:JSON.stringify(game.run),cpRaw,barrier,attempts:0,busy:false,flight:null};
  }
  const op=current;op.busy=true;state='saving';changed();const retry=op.attempts++>0;
  op.flight=Promise.resolve().then(()=>retry?session.retry(op.barrier):session.flushLatest(true,op.barrier)).then(result=>{
   if(disposed||current!==op||op.token!==sequence)return failed('cancelled');
   if(!same(op)){cancel();return failed('stale-ui');}
   if(result.nativeAck!==true)return finishFailure(op,result.state??'native-pending');
   if(game.nativeInputBlocked||ui.inputReady!==true)return finishFailure(op,'background');
   current=null;game.nativeCriticalHeld=false;game.nativeCriticalPending=false;state='saved';
   game.mode='title';game.makeHome();game.show('title');safely(ui.toast?.bind(ui),messages(game).saved);return {...result,durable:false};
  }).catch(()=>finishFailure(op,'native-error'));
  return op.flight;
 }
 function flushBackground(){
  if(disposed||!current)return Promise.resolve(failed('no-held-save'));
  if(current.captureFailed)return Promise.resolve(failed('capture-failed'));
  if(current.busy)return current.flight;
  if(backgroundFlight)return backgroundFlight;const op=current;
  // Retry the captured backup only; this path never checkpoints or leaves pause.
  backgroundFlight=Promise.resolve().then(()=>session.retry(op.barrier)).then(result=>({...result,durable:false})).catch(()=>failed('native-error')).finally(()=>{backgroundFlight=null;});return backgroundFlight;
 }
 function dispose(){if(disposed)return;disposed=true;cancel();}
 return Object.freeze({request,cancel,flushBackground,dispose,snapshot:()=>({state,held:!!current,busy:!!current?.busy,attempts:current?.attempts??0,barrier:current?.barrier??null})});
}

// No image/HTML interpolation. Root can inject a test or platform-specific retry UI.
export function waitForNativeRetry({document:doc,copy,kind}={}){
 return new Promise(resolve=>{const host=doc.querySelector('#loading');if(!host)throw Error('Native loading gate unavailable');
  let panel=doc.querySelector('[data-native-boot-gate]');if(!panel){panel=doc.createElement('section');panel.dataset.nativeBootGate='';panel.setAttribute('role','status');host.append(panel);}panel.replaceChildren();
  const text=doc.createElement('p'),button=doc.createElement('button');text.textContent=kind==='lifecycle'?copy.lifecycle:copy.blocked;button.textContent=copy.retry;button.type='button';button.className='button';
  button.addEventListener('click',()=>{button.disabled=true;panel.remove();resolve();},{once:true});panel.append(text,button);
 });
}

export function prepareNativeRuntime(options={}){
 const capacitor=options.Capacitor??globalThis.Capacitor;if(typeof capacitor?.isNativePlatform!=='function'||capacitor.isNativePlatform()!==true)return null;
 return prepareWork(options,capacitor);
}
async function prepareWork(options,capacitor){
 const doc=options.document??globalThis.document,language=options.language==='en'?'en':'ko',wait=options.waitForRetry??waitForNativeRetry;let copy=NATIVE_RUNTIME_COPY[language];
 const prepared=await prepareNativePersistence({...options,Capacitor:capacitor});const session=prepared.session;let result=prepared.result;
 while(!result.localReady){await wait({document:doc,copy,kind:'save',result});result=await session.boot(options.bootOptions);}
 for(const key of [SAVE_KEY,SAVE_KEY+':backup'])try{const profile=normalizeSave(JSON.parse(session.port.getItem(key)));if(profile){copy=NATIVE_RUNTIME_COPY[profile.settings.language]??copy;break;}}catch{}
 const platform=capacitor.getPlatform();if(!['android','ios'].includes(platform))throw Error('Unsupported native platform');
 const loadApp=options.loadApp??(()=>import('@capacitor/app'));let app;
 while(!app){try{const module=await loadApp();app=module.App??module;if(typeof app.addListener!=='function'||typeof app.getState!=='function')throw Error('App unavailable');}
  catch(error){app=null;await wait({document:doc,copy,kind:'lifecycle',error});}}
 let haptics=null;try{const module=await (options.loadHaptics??(()=>import('@capacitor/haptics')))();
  if(typeof module.Haptics?.impact==='function'&&module.ImpactStyle?.Medium==='MEDIUM'&&module.ImpactStyle?.Light==='LIGHT')haptics=module;
 }catch{}
 async function retryLocalReady(){await wait({document:doc,copy,kind:'save',result:session.verifyLocalReady()});return session.boot(options.bootOptions);}
 return Object.freeze({session,platform,result,hapticsAvailable:!!haptics,retryLocalReady,bind:args=>bindNativeRuntime({...options,...args,session,app,haptics,platform,waitForRetry:wait})});
}

export async function bindNativeRuntime({game,ui,world,frameSchedule,session,app,haptics,platform,document:doc=globalThis.document,
 inputTarget=globalThis.window,blurTarget=globalThis.window,now=()=>performance.now(),waitForRetry=waitForNativeRetry,lifecycleOptions={}}={}){
 const saveTitle=createNativeSaveTitle({game,ui,session});game.nativeSaveTitle=saveTitle;game.nativeMessages=messages(game);let lifecycle=null,disposed=false;
 const hapticOwner=createNativeHaptics({mode:'native',getSettings:()=>game.save.settings,isHidden:()=>game.nativeInputBlocked||game.audioManager.hidden,now,gate:game.audioManager,
  invoke:haptics?({kind})=>haptics.Haptics.impact({style:kind==='hit'?haptics.ImpactStyle.Medium:haptics.ImpactStyle.Light}):undefined});game.nativeHaptics=hapticOwner;
 function background(){
  if(disposed)return Promise.resolve(failed('disposed'));
  if(game.nativeCriticalHeld)return saveTitle.flushBackground();
  if(game.mode!=='run'||!game.run||game.run.outcome)return Promise.resolve(failed('not-running'));
  const accepted=game.checkpointRun(),barrier=session.captureCritical(accepted);return session.flushLatest(accepted,barrier).catch(()=>failed('native-error'));
 }
 function create(){const owner=createNativeLifecycle({mode:'native',platform,app,document:doc,inputTarget,blurTarget,now,...lifecycleOptions,hooks:{
  frameReset:stamp=>frameSchedule.reset(stamp),
  inputBlocked:hidden=>{game.nativeInputBlocked=hidden;ui.touchControls?.setActive(game.mode==='run'&&!game.screen&&!hidden&&!game.nativeCriticalPending&&!game.nativeCriticalHeld);ui.syncInteraction();},
  clearInput:()=>game.keys.clear(),clearTouch:()=>ui.touchControls?.clear(),cancelGestures:()=>world.villageCamera?.cancel(),
  pause:()=>{if(game.mode==='run'&&!game.screen){game.show('pause');return true;}return false;},
  checkpoint:()=>background(),
  audioHidden:hidden=>{if(!hidden)game.construction.wake();game.audioManager.setHidden(hidden);},
  canBack:()=>ui.inputReady===true&&!game.nativeInputBlocked&&!game.nativeCriticalPending&&!game.nativeCriticalHeld,
  escape:()=>platform==='android'&&game.mode==='title'&&game.screen==='title'&&!game.placement&&typeof app.minimizeApp==='function'?app.minimizeApp():game.handleEscape()
 }});game.nativeLifecycle=owner;return owner;}
 for(;;){lifecycle=create();lifecycle.start();const ready=await lifecycle.whenReady();if(ready.ready)break;
  await lifecycle.dispose();await waitForRetry({document:doc,copy:messages(game),kind:'lifecycle',result:ready});}
 if(session.snapshot().degradedBackup)safely(ui.toast?.bind(ui),messages(game).degraded,6);
 async function dispose(){if(disposed)return;disposed=true;game.nativeInputBlocked=true;game.keys.clear();ui.touchControls?.clear();world.villageCamera?.cancel();game.audioManager.setHidden(true);saveTitle.dispose();hapticOwner.dispose();ui.syncInteraction();await lifecycle.dispose();}
 return Object.freeze({lifecycle,saveTitle,haptics:hapticOwner,background,dispose,session});
}
