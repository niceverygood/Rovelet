'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const {sha}=require('./guards.cjs');
async function run(exe,args,cwd,env,state,label,timeoutMs){
 if(!path.isAbsolute(exe)||!path.isAbsolute(cwd)||!Number.isSafeInteger(timeoutMs)||timeoutMs>900000||timeoutMs<1000)throw Error('Invalid bounded child request');
 const stdoutPath=path.join(state,label+'.stdout.txt'),stderrPath=path.join(state,label+'.stderr.txt');
 const out=fs.createWriteStream(stdoutPath,{flags:'wx'}),err=fs.createWriteStream(stderrPath,{flags:'wx'});
 const child=spawn(exe,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
 child.stdout?.pipe(out);child.stderr?.pipe(err);let timedOut=false,termination=null;
 const timer=setTimeout(()=>{timedOut=true;if(process.platform==='win32'&&child.pid){const stop=spawnSync(path.join(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,timeout:10000,encoding:'utf8'});termination={pid:child.pid,status:stop.status,stdout:stop.stdout,stderr:stop.stderr};}else child.kill('SIGTERM');},timeoutMs);
 let result;try{result=await new Promise(resolve=>{child.once('error',e=>resolve({code:null,launchError:e.message}));child.once('close',(code,signal)=>resolve({code,signal}));});}finally{clearTimeout(timer);await Promise.all([new Promise(r=>out.end(r)),new Promise(r=>err.end(r))]);}
 const p=f=>{const b=fs.readFileSync(f);return{file:path.basename(f),bytes:b.length,sha256:sha(b)};};
 return{...result,timedOut,termination,stdout:p(stdoutPath),stderr:p(stderrPath),stdinClosed:true,shell:false,hiddenWindows:true,timeoutMs};
}
module.exports={run};
