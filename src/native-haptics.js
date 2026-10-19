// Backend invocation is injected. Root maps this to Haptics 8.0.2 after plugin review.
export function createNativeHaptics({mode='web',getSettings=()=>({}),isHidden=()=>true,
 now=()=>performance.now(),gate={},invoke,legacy,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=2000,onError=()=>{}}={}){
 if(!['web','native'].includes(mode)||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('haptics options');
 let disposed=false,inflight=null,next=0;const stats={requested:0,acknowledged:0,rejected:0,timedOut:0,blocked:0};
 const report=cause=>{try{Promise.resolve(onError(String(cause?.message??cause))).catch(()=>{});}catch{}};
 function vibrate(kind='hit'){
  if(mode==='web')return legacy?.(kind)??false;
  if(disposed)return false;let stamp,settings,hidden;
  try{settings=getSettings();hidden=isHidden();stamp=now();}catch(cause){report(cause);return false;}
  if(!settings?.vibration||hidden||!Number.isFinite(stamp)||stamp-(gate.lastVibration??-1000)<120||inflight||typeof invoke!=='function'){stats.blocked++;return false;}
  // Same existing 120ms reservation, including failed requests. No navigator fallback.
  gate.lastVibration=stamp;const token=++next;stats.requested++;let promise;
  const request=Object.freeze({kind,pattern:Object.freeze(kind==='hit'?[30,20,15]:[12])});
  try{promise=invoke(request);}catch(cause){stats.rejected++;report(cause);return false;}
  const current={token,timer:null,timedOut:false};inflight=current;
  current.timer=setTimer(()=>{if(inflight!==current)return;current.timedOut=true;stats.timedOut++;report('Haptics timeout; pending request remains locked');},timeoutMs);
  Promise.resolve(promise).then(()=>{if(disposed||inflight!==current||current.timedOut)return;stats.acknowledged++;},cause=>{if(disposed||inflight!==current||current.timedOut)return;stats.rejected++;report(cause);}).finally(()=>{
   clearTimer(current.timer);if(inflight===current)inflight=null;
  });return true;
 }
 function dispose(){if(disposed)return;disposed=true;if(inflight)clearTimer(inflight.timer);inflight=null;}
 return Object.freeze({vibrate,dispose,snapshot:()=>Object.freeze({mode,disposed,pending:!!inflight,lastVibration:gate.lastVibration??null,
  physicalConfirmed:false,stats:Object.freeze({...stats})})});
}
