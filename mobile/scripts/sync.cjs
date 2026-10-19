'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),G=require('./guards.cjs'),{run}=require('./child.cjs');
const mobile=path.resolve(__dirname,'..');
async function main(){
 const [input,digest,execute]=process.argv.slice(2);assert.ok(!execute||execute==='--execute');const {plan}=G.readPlan(mobile,input,digest);
 if(execute!=='--execute'){console.log(JSON.stringify({ready:plan.ready===true,executed:false,filesWritten:0,fullPreflightVerified:false,note:'Input digest/schema only; full preflight precedes the --execute child.'}));return;}
 const {project,payload}=G.preflight(mobile,plan),tools=G.toolsCheck(plan,process.execPath);
 assert.ok(['android','ios','both'].includes(plan.platform));const dependencies=()=>G.dependencyCheck(mobile,plan.dependencyFiles);dependencies();
 const cli=path.join(mobile,'node_modules/@capacitor/cli/bin/capacitor');assert.equal(JSON.parse(fs.readFileSync(path.join(mobile,'node_modules/@capacitor/cli/package.json'))).version,'8.5.3');
 const state=G.createState(mobile,'sync'),env=G.environment(state,tools),receipt={schema:'hearth-native-sync-receipt-v1',inputSha256:digest,payload,commands:[],passed:false,signing:false,install:false,nativeAppExecuted:false};
 const phases=plan.platform==='both'?['android','ios']:[plan.platform];
 try{
  for(const platform of phases){
   const result=await run(tools.node,[cli,'sync',platform],mobile,env,state,'sync-'+platform,300000);receipt.commands.push({platform,...result});assert.equal(result.code,0,'cap sync failed; raw logs retained');assert.equal(result.timedOut,false);
   const publicRel=platform==='android'?'android/app/src/main/assets/public':'ios/App/App/public';
   const publicDir=G.plainPath(path.join(mobile,publicRel));for(const row of plan.product.distFiles)G.verify(publicDir,{...row,path:row.path.slice('dist/'.length)});
   const extra=G.tree(publicDir).filter(p=>!plan.product.distFiles.some(r=>r.path==='dist/'+p));assert.ok(extra.every(p=>p==='cordova.js'||p==='cordova_plugins.js'),'Unexpected additional copied public file');
   const generated=JSON.parse(fs.readFileSync(path.join(mobile,platform==='android'?'android/app/src/main/assets/capacitor.config.json':'ios/App/App/capacitor.config.json'))),config=G.configCheck(mobile);
   assert.equal(generated.appId,config.appId);assert.equal(generated.appName,config.appName);assert.deepEqual(generated.server,config.server);
   if(platform==='android'){const plugins=JSON.parse(fs.readFileSync(path.join(mobile,'android/app/src/main/assets/capacitor.plugins.json')));assert.deepEqual(plugins.map(p=>p.pkg).sort(),['@capacitor/app','@capacitor/haptics','@capacitor/preferences']);}
   else assert.deepEqual(generated.packageClassList.sort(),['AppPlugin','HapticsPlugin','PreferencesPlugin']);
   receipt.commands.at(-1).copiedDistFiles=plan.product.distFiles.length;
  }
  receipt.payloadAfter=G.payloadCheck(project,plan);dependencies();G.toolsCheck(plan,process.execPath);G.configCheck(mobile);G.packageCheck(mobile);G.signingCheck(mobile);G.noKeys(mobile);
  receipt.mobileAfter=G.inventory(mobile,G.mobileSourceFiles(mobile));receipt.passed=true;
 }catch(e){receipt.failure=e.message;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(state,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({receipt:path.relative(mobile,path.join(state,'receipt.json')).split(path.sep).join('/'),passed:receipt.passed,signing:false,install:false,storeReady:false}));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
