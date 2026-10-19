import CATALOG from './locales/catalog.json' with {type:'json'};
// WORK candidate. Entry is dynamically imported only in the native main branch.
import {SAVE_KEY,freshSave} from './data.js';
import {normalizeSave,saveGame} from './persistence.js';
import {SAVE_KEYS,readFive,installStorage,getStorage} from './storage-accessor.js';
import {createNativeSaveMirror} from './native-save-mirror.js';
import {webCryptoSha256} from './sha256-adapter.js';

const rejected=(state,extra={})=>({localAccepted:false,nativeAck:false,durable:false,state,...extra});
const profileUsable=entries=>{const values=new Map(entries);for(const key of [SAVE_KEY,SAVE_KEY+':backup'])try{if(normalizeSave(JSON.parse(values.get(key))))return true;}catch{}return false;};
const equalSnapshot=(storage,ticket)=>JSON.stringify(readFive(storage))===JSON.stringify(ticket.snapshot);

export function createNativePersistenceSession({storage,backend,sha256,scope,timeoutMs=5000,microtask,onStatus=()=>{}}={}){
 const mirror=createNativeSaveMirror({storage,backend,sha256,validateProfile:profileUsable,scope,timeoutMs,microtask});
 let uninstall=null,disposed=false,bootFlight=null,lastBoot=null;const barriers=new WeakSet(),markerKey=(scope??'wandering-hearth.native.v1')+':restore';
 function checkedLocal(){const entries=readFive(storage);if(storage.getItem(markerKey)!==null)throw Error('Restore marker remains or cannot be read');return entries;}
 function verifyLocalReady(){if(disposed||!uninstall||getStorage()!==mirror.port||lastBoot?.localReady!==true)return Object.freeze({ready:false,localReady:false,state:'not-installed'});try{if(!profileUsable(checkedLocal()))return Object.freeze({ready:false,localReady:false,state:'no-valid-local-profile'});return Object.freeze({ready:true,localReady:true,state:'ready'});}catch(error){return Object.freeze({ready:false,localReady:false,state:'local-validation-failed',error:String(error.message??error)});}}
 const notify=value=>{try{Promise.resolve(onStatus(value)).catch(()=>{});}catch{}return value;};
 function snapshot(){const raw=mirror.snapshot(),gate=verifyLocalReady();return Object.freeze({...raw,mirrorReady:raw.ready,mirrorLocalReady:raw.localReady,ready:gate.ready,localReady:gate.localReady,localGate:gate,disposed,installed:!!uninstall,boot:lastBoot});}
 function localGate(result,extra={}){lastBoot=Object.freeze({...result,...extra,durable:false});return notify(lastBoot);}
 async function bootWork(options){
  const result=await mirror.boot(options);if(disposed)return localGate({...result,localReady:false,ready:false,state:'disposed'});
  if(!result.localReady)return localGate(result);
  let entries;try{entries=checkedLocal();}catch(error){return localGate({...result,localReady:false,ready:false,state:'local-read-failed',error:String(error.message??error)});}
  let initializedFresh=false;
  if(!profileUsable(entries)){
   // Confirmed native emptiness alone is insufficient after an intervening local mutation.
   if(result.source!=='confirmed-empty'||!entries.every(([,value])=>value===null))return localGate({...result,localReady:false,ready:false,state:'no-valid-local-profile'});
   const accepted=saveGame(freshSave(),mirror.port);if(accepted!==true)return localGate({...result,localReady:false,ready:false,state:'fresh-local-rejected'});
   try{if(!profileUsable(readFive(storage)))throw Error('Fresh profile readback failed');}
   catch(error){return localGate({...result,localReady:false,ready:false,state:'fresh-local-readback-failed',error:String(error.message??error)});}
   initializedFresh=true;
  }
  // Game/loadSave can now recover pending A through this same synchronous port.
  try{if(!profileUsable(checkedLocal()))throw Error('Current local profile unavailable');}catch(error){return localGate({...result,localReady:false,ready:false,state:'local-final-validation-failed',error:String(error.message??error)});}
  if(!uninstall)uninstall=installStorage(mirror.port);
  return localGate(result,{initializedFresh,localReady:true,ready:true,backupPending:!result.nativeReady||mirror.snapshot().queued>0||mirror.snapshot().blocked});
 }
 function boot(options={}){if(disposed)return Promise.resolve(rejected('disposed',{localReady:false,ready:false}));if(bootFlight)return bootFlight;
  bootFlight=bootWork(options).finally(()=>{bootFlight=null;});return bootFlight;
 }
 function barrier(localAccepted,ticket,error){const value=Object.freeze({localAccepted:localAccepted===true,ticket:ticket??null,...(error?{error:String(error.message??error)}:{})});barriers.add(value);return value;}
 function captureCritical(localAccepted){if(localAccepted!==true||disposed)return barrier(false,null);try{return barrier(true,mirror.port.captureNow({critical:true}));}catch(error){return barrier(true,null,error);}}
 function validBarrier(value){return value&&barriers.has(value)&&value.localAccepted===true&&value.ticket&&!value.ticket.captureError;}
 async function flushBarrier(value,{retry=false,...options}={}){
  if(disposed)return rejected('disposed',{barrier:value});if(!validBarrier(value))return rejected(value?.localAccepted?'capture-failed':'local-rejected',{barrier:value});
  try{if(!equalSnapshot(storage,value.ticket))return rejected('stale-critical-target',{localAccepted:true,barrier:value});}
  catch(error){return rejected('capture-failed',{localAccepted:true,barrier:value,error:String(error.message??error)});}
  if(retry&&!mirror.snapshot().nativeReady)await mirror.retryBackup({timeout:options.timeout??timeoutMs});
  const result=await mirror.flushCritical(true,value.ticket,{...options,retry});
  if(disposed)return rejected('disposed',{localAccepted:true,barrier:value});
  try{if(result.nativeAck&&!equalSnapshot(storage,value.ticket))return rejected('stale-critical-target',{localAccepted:true,barrier:value});}
  catch(error){return rejected('capture-failed',{localAccepted:true,barrier:value,error:String(error.message??error)});}
  return {...result,barrier:value};
 }
 async function flushLatest(localAccepted,value,options={}){
  if(disposed)return rejected('disposed',{barrier:value});
  if(localAccepted!==true)return rejected('local-rejected',{barrier:value});
  if(value!==undefined)return flushBarrier(value,options);
  let ticket;try{ticket=await mirror.port.atTurnEnd({critical:true});}catch(error){return rejected('capture-failed',{localAccepted:true,error:String(error.message??error)});}
  return flushBarrier(barrier(true,ticket),options);
 }
 function retry(value,options={}){return flushBarrier(value,{...options,retry:true});}
 function dispose(){if(disposed)return;disposed=true;uninstall?.();uninstall=null;}
 return Object.freeze({mode:'native',port:mirror.port,boot,retryBackup:boot,captureCritical,flushLatest,retry,dispose,snapshot,
  verifyLocalReady,transaction:fn=>mirror.port.transaction(fn)});
}

const ABC='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
export function nativeBridgePresent(capacitor){return typeof capacitor?.isNativePlatform==='function'&&capacitor.isNativePlatform()===true;}

// A web call returns null synchronously, without reading storage or import loaders.
export function prepareNativePersistence(options={}){
 const capacitor=options.Capacitor??globalThis.Capacitor;if(!nativeBridgePresent(capacitor))return null;
 const storage=options.storage??globalThis.localStorage;
 const loadPreferences=options.loadPreferences??(()=>import('@capacitor/preferences'));
 const loadNoble=options.loadNoble??(async()=>{const [{sha256},{bytesToHex}]=await Promise.all([import('@noble/hashes/sha2.js'),import('@noble/hashes/utils.js')]);return text=>bytesToHex(sha256(new TextEncoder().encode(text)));});
 const cryptoProvider=options.cryptoProvider??globalThis.crypto;let preferenceFlight=null,hashFlight=null;
 function preferences(){if(!preferenceFlight)preferenceFlight=Promise.resolve().then(loadPreferences).then(value=>{
  const plugin=value.Preferences??value;if(typeof plugin?.get!=='function'||typeof plugin?.set!=='function')throw Error('Preferences unavailable');return {plugin};
 }).catch(error=>{preferenceFlight=null;throw error;});return preferenceFlight;}
 function digest(){if(!hashFlight)hashFlight=Promise.resolve().then(async()=>{
  try{const candidate=webCryptoSha256(cryptoProvider);if(await candidate('abc')===ABC)return candidate;}catch{}
  const candidate=await loadNoble();if(typeof candidate!=='function'||await candidate('abc')!==ABC)throw Error('SHA-256 fallback unavailable');return candidate;
 }).catch(error=>{hashFlight=null;throw error;});return hashFlight;}
 const session=createNativePersistenceSession({...options,storage,
  backend:{async get(args){return (await preferences()).plugin.get(args);},async set(args){return (await preferences()).plugin.set(args);}},
  sha256:async text=>(await digest())(text)});
 return session.boot(options.bootOptions).then(result=>({session,result}));
}

const saveCopy=locale=>Object.freeze(Object.fromEntries(['blocked','degraded','retry'].map(key=>[key,CATALOG['native.save.'+key][locale]])));
export const NATIVE_SAVE_COPY=Object.freeze({ko:saveCopy('ko'),en:saveCopy('en')});
