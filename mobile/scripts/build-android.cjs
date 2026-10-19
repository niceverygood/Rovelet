'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),G=require('./guards.cjs'),{run}=require('./child.cjs');
const mobile=path.resolve(__dirname,'..');
async function main(){
 const [input,digest,execute]=process.argv.slice(2);assert.ok(!execute||execute==='--execute');const {plan}=G.readPlan(mobile,input,digest);
 if(execute!=='--execute'){console.log(JSON.stringify({ready:plan.ready===true,executed:false,filesWritten:0,fullPreflightVerified:false,signing:false}));return;}
 assert.equal(process.platform,'win32','This prepared local Android recipe targets the pinned Windows toolchain; macOS requires its own tool pins.');
 const {project,payload}=G.preflight(mobile,plan),tools=G.toolsCheck(plan,process.execPath);assert.ok(tools.java);
 const releasePath=G.verify(tools.workspace,plan.tools.javaRelease);assert.ok(releasePath.startsWith(path.dirname(path.dirname(tools.java))+path.sep));assert.match(fs.readFileSync(releasePath,'utf8'),/JAVA_VERSION="21(?:\.|\")/);
 const dep=()=>G.dependencyCheck(mobile,plan.dependencyFiles);dep();
 assert.equal(plan.platform,'android');assert.ok(['unsigned-debug','unsigned-release'].includes(plan.operation));
 const syncFile=G.verify(mobile,plan.syncReceipt),sync=JSON.parse(fs.readFileSync(syncFile));assert.equal(sync.passed,true);assert.ok(sync.commands.some(r=>r.platform==='android'&&r.code===0));assert.deepEqual(sync.payload,payload);
 const publicDir=path.join(mobile,'android/app/src/main/assets/public');plan.product.distFiles.forEach(r=>G.verify(publicDir,{...r,path:r.path.slice(5)}));
 const state=G.createState(mobile,'android-build'),env=G.environment(state,tools),args=G.gradleArgs(mobile,state,plan.operation);
 const receipt={schema:'hearth-native-unsigned-build-receipt-v1',operation:plan.operation,inputSha256:digest,payload,passed:false,unsignedRequested:true,signaturesAudited:false,signingAttempted:false,gameRuntimeValidated:false,storeReady:false,artifacts:[],dependencyVerification:'First-resolution metadata only; independent supply-chain trust not asserted.'};
 try{
  receipt.child=await run(tools.java,args,path.join(mobile,'android'),env,state,'gradle',900000);assert.equal(receipt.child.code,0,'Gradle failed; raw logs retained');assert.equal(receipt.child.timedOut,false);
  const paths=plan.operation==='unsigned-debug'?['android/app/build/outputs/apk/debug/app-debug-unsigned.apk']:['android/app/build/outputs/apk/release/app-release-unsigned.apk','android/app/build/outputs/bundle/release/app-release.aab'];
  receipt.artifacts=paths.map(p=>G.pin(mobile,p));assert.ok(receipt.artifacts.every(r=>r.bytes>1000));
  receipt.dependencyVerificationMetadata=G.pin(mobile,'android/gradle/verification-metadata.xml');
  G.payloadCheck(project,plan);dep();G.toolsCheck(plan,process.execPath);G.verify(tools.workspace,plan.tools.javaRelease);G.configCheck(mobile);G.packageCheck(mobile);G.signingCheck(mobile);G.noKeys(mobile);
  for(const rel of ['profile','android-user']){assert.equal(G.tree(path.join(state,rel)).some(p=>/\.(?:jks|keystore|p12|pfx)$/i.test(p)),false,'Unexpected generated signing key filename');}
  receipt.passed=true;receipt.outputAuditRequired=['apksigner expected unsigned','zipalign','aapt2 package/version/SDK','APK/AAB ZIP safety and final game payload','No-device/install/signing claim'];
 }catch(e){receipt.failure=e.message;process.exitCode=1;}
 finally{fs.writeFileSync(path.join(state,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({receipt:path.relative(mobile,path.join(state,'receipt.json')).split(path.sep).join('/'),passed:receipt.passed,artifactCount:receipt.artifacts.length,unsignedRequested:true,signaturesAudited:false,storeReady:false}));}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
