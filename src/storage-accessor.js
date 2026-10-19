// Proposed DAG leaf. No Game, persistence, plugin, crypto or native imports.
export const SAVE_KEYS=Object.freeze(['wandering-hearth:v1','wandering-hearth:v1:backup','wandering-hearth:v1:pending','wandering-hearth:run','wandering-hearth:run:backup']);
const installations=[];
export function getStorage(){return installations.at(-1)?.storage??globalThis.localStorage;}
export function installStorage(storage){const owned={storage};installations.push(owned);return ()=>{const index=installations.indexOf(owned);if(index>=0)installations.splice(index,1);};}
export function readFive(storage){return Object.freeze(SAVE_KEYS.map(key=>{const value=storage.getItem(key);if(value!==null&&typeof value!=='string')throw new TypeError('Storage must return a string or null');return Object.freeze([key,value]);}));}
export function createStoragePort(storage,{onSnapshot,onCaptureError=()=>{},microtask=queueMicrotask}={}){
 let dirty=false,scheduled=false,depth=0,last=null;
 const report=error=>{try{onCaptureError(error);}catch{}};
 const capture=(critical=false)=>{if(!onSnapshot)return null;try{const snapshot=readFive(storage);last=onSnapshot(snapshot,{critical});dirty=false;return last;}catch(error){report(error);return {captureError:true,error};}};
 const schedule=()=>{if(scheduled||!onSnapshot)return;scheduled=true;try{microtask(()=>{scheduled=false;if(depth)return;if(dirty)capture(false);});}catch(error){scheduled=false;report(error);}};
 const changed=key=>{let watched=false;try{watched=SAVE_KEYS.includes(String(key));}catch{return;}if(!watched)return;dirty=true;schedule();};
 const port={
  getItem(key){return storage.getItem(key);},
  setItem(key,value){try{return storage.setItem(key,value);}finally{changed(key);}},
  removeItem(key){try{return storage.removeItem(key);}finally{changed(key);}},
  transaction(fn){depth++;try{return fn(port);}finally{depth--;if(!depth&&dirty)schedule();}},
  captureNow({critical=false}={}){if(depth)throw new Error('Capture must follow the synchronous transaction');return capture(critical);},
  atTurnEnd({critical=false}={}){return new Promise(resolve=>microtask(()=>resolve(capture(critical))));},
  get lastTicket(){return last;},
 };
 return port;
}
