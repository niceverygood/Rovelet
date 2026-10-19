import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createAssetVersions,assetVersionPlugin,verifyBuiltAssetVersions} from '../scripts/asset-versions.mjs';
import {createRuntimeNotices} from '../scripts/runtime-assets.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-asset-versions-')),files=[],directories=[];
 const directory=relative=>{const file=path.join(root,relative);fs.mkdirSync(file);directories.push(file);};
 for(const relative of ['public','public/references','public/weapon-icons','public/models','runtime-models'])directory(relative);
 const write=(relative,bytes)=>{const file=path.join(root,relative);fs.writeFileSync(file,bytes);if(!files.includes(file))files.push(file);return file;};
 write('public/references/castle.png','reference pixels');write('public/weapon-icons/icebolt.png','weapon pixels');write('public/favicon.svg','<svg/>');write('public/favicon.ico',Buffer.from([0,0,1,0,1,0]));write('public/licenses.html','<!doctype html><html><head><title>Credits</title></head><body>License <a href="asset-credits.json">Models</a></body></html>');write('public/models/castle.glb','original full-size GLB');const runtime=Buffer.from('runtime-sized GLB');write('runtime-models/castle.glb',runtime);
 const manifest={format:1,assets:[{id:'castle',sourceSha256:sha('original full-size GLB'),runtimeSha256:sha(runtime),runtimeBytes:runtime.length}]};
 write('public/asset-credits.json',JSON.stringify({assets:[{id:'castle',sha256:manifest.assets[0].sourceSha256,changes:'Original source geometry.'}]}));
 return {root,manifest,write,directory,files,directories,cleanup(){for(const file of files.reverse())try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}for(const file of directories.reverse())fs.rmdirSync(file);fs.rmdirSync(root);}};
}
function builtFixture(){
 const f=fixture(),map=createAssetVersions(f.root,{manifest:f.manifest});
 for(const relative of ['dist','dist/references','dist/weapon-icons','dist/models'])f.directory(relative);
 for(const relative of Object.keys(map)){const source=relative.startsWith('models/')?'runtime-models/'+path.basename(relative):'public/'+relative;f.write('dist/'+relative,fs.readFileSync(path.join(f.root,source)));}
 const notices=createRuntimeNotices(f.root,f.manifest);f.write('dist/asset-credits.json',notices.creditBytes);f.write('dist/licenses.html',notices.licenseBytes);f.write('dist/asset-versions.json',JSON.stringify(map));return {...f,map,notices};
}
test('asset map hashes final runtime model bytes and actual public images while excluding generated metadata',()=>{
 const f=fixture();try{const map=createAssetVersions(f.root,{manifest:f.manifest});assert.deepEqual(Object.keys(map),['favicon.ico','favicon.svg','models/castle.glb','references/castle.png','weapon-icons/icebolt.png']);assert.equal(map['favicon.ico'],sha(Buffer.from([0,0,1,0,1,0])));assert.equal(map['models/castle.glb'],sha('runtime-sized GLB'));assert.notEqual(map['models/castle.glb'],f.manifest.assets[0].sourceSha256);assert.equal(map['references/castle.png'],sha('reference pixels'));assert.ok(Object.values(map).every(value=>/^[a-f0-9]{64}$/.test(value)));assert.equal(map['asset-credits.json'],undefined);assert.equal(map['licenses.html'],undefined);}finally{f.cleanup();}
});
test('changing a same-name image changes its digest without changing unrelated asset versions',()=>{
 const f=fixture();try{const before=createAssetVersions(f.root,{manifest:f.manifest});f.write('public/references/castle.png','different pixels');const after=createAssetVersions(f.root,{manifest:f.manifest});assert.notEqual(after['references/castle.png'],before['references/castle.png']);assert.equal(after['models/castle.glb'],before['models/castle.glb']);assert.equal(after['weapon-icons/icebolt.png'],before['weapon-icons/icebolt.png']);}finally{f.cleanup();}
});
test('known test manifests cannot bypass runtime byte hashes, size checks or model path validation',()=>{
 const f=fixture();try{f.write('runtime-models/castle.glb','tampered runtime');assert.throws(()=>createAssetVersions(f.root,{manifest:f.manifest}),/runtime bytes/);f.write('runtime-models/castle.glb','runtime-sized GLB');for(const id of ['../castle','/castle','castle.glb','castle\\outside','C:outside']){const manifest=structuredClone(f.manifest);manifest.assets[0].id=id;assert.throws(()=>createAssetVersions(f.root,{manifest}),/invalid model ID/);}const duplicate=structuredClone(f.manifest);duplicate.assets.push({...duplicate.assets[0]});assert.throws(()=>createAssetVersions(f.root,{manifest:duplicate}),/duplicate model ID/);const size=structuredClone(f.manifest);size.assets[0].runtimeBytes++;assert.throws(()=>createAssetVersions(f.root,{manifest:size}),/runtime size/);const bad=structuredClone(f.manifest);bad.assets[0].runtimeSha256='invalid';assert.throws(()=>createAssetVersions(f.root,{manifest:bad}),/runtime SHA256/);}finally{f.cleanup();}
});
test('default production collection retains the strict runtime manifest audit',()=>{
 const f=fixture();try{assert.throws(()=>createAssetVersions(f.root),/cache missing/);}finally{f.cleanup();}
});
test('nested image paths remain inside public and asset directory symlinks are rejected',()=>{
 const f=fixture(),outside=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-asset-outside-'));try{f.directory('public/references/nested');f.write('public/references/nested/leaf.png','leaf');assert.equal(createAssetVersions(f.root,{manifest:f.manifest})['references/nested/leaf.png'],sha('leaf'));const link=path.join(f.root,'public/weapon-icons/outside');fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');f.files.push(link);assert.throws(()=>createAssetVersions(f.root,{manifest:f.manifest}),/symlinks/);}finally{f.cleanup();fs.rmdirSync(outside);}
});
test('build plugin defines versions before bundling, keeps favicon relative and emits audit metadata',()=>{
 const f=fixture();try{const plugin=assetVersionPlugin(f.root,{manifest:f.manifest});assert.equal(plugin.apply,'build');const config=plugin.config(),map=JSON.parse(config.define.__HEARTH_ASSET_VERSIONS__),license=JSON.parse(config.define.__HEARTH_LICENSE_VERSION__),notices=createRuntimeNotices(f.root,f.manifest);assert.equal(map['models/castle.glb'],f.manifest.assets[0].runtimeSha256);assert.equal(license,sha(notices.licenseBytes));assert.notEqual(license,sha(fs.readFileSync(path.join(f.root,'public/licenses.html'))));assert.equal(map['licenses.html'],undefined);assert.equal(map['asset-credits.json'],undefined);const html=plugin.transformIndexHtml.handler('<head><link type="image/svg+xml" href="./favicon.svg?theme=warm#icon" rel="icon"><link rel="stylesheet" href="./style.css"></head>');assert.ok(html.includes('href="./favicon.svg?theme=warm&v='+map['favicon.svg']+'#icon"'));assert.ok(html.includes('href="./style.css"'));const emitted=[];plugin.generateBundle.call({emitFile:file=>emitted.push(file)});assert.equal(emitted.length,1);assert.equal(emitted[0].fileName,'asset-versions.json');assert.deepEqual(JSON.parse(emitted[0].source),map);}finally{f.cleanup();}
});

test('final build verification matches actual dist bytes and does not alter original or runtime assets',()=>{
 const f=builtFixture();try{
  const original=fs.readFileSync(path.join(f.root,'public/models/castle.glb')),runtime=fs.readFileSync(path.join(f.root,'runtime-models/castle.glb')),notice=fs.readFileSync(path.join(f.root,'public/licenses.html'));
  assert.deepEqual(verifyBuiltAssetVersions(f.root),f.map);assert.deepEqual(fs.readFileSync(path.join(f.root,'public/models/castle.glb')),original);assert.deepEqual(fs.readFileSync(path.join(f.root,'runtime-models/castle.glb')),runtime);assert.deepEqual(fs.readFileSync(path.join(f.root,'public/licenses.html')),notice);
 }finally{f.cleanup();}
});

test('final verification rejects same-name image or runtime model changes after the compiled snapshot',()=>{
 const f=builtFixture();try{
  f.write('dist/references/castle.png','changed pixels!');assert.throws(()=>verifyBuiltAssetVersions(f.root),/built asset bytes changed after versioning: references\/castle\.png/);f.write('dist/references/castle.png','reference pixels');
  f.write('dist/models/castle.glb','new runtime-sized GLB');assert.throws(()=>verifyBuiltAssetVersions(f.root),/built asset bytes changed after versioning: models\/castle\.glb/);
 }finally{f.cleanup();}
});

test('final verification requires the complete dist inventory and safe canonical paths',()=>{
 const f=builtFixture();try{
  for(const output of ['../outside','public','runtime-models',f.root])assert.throws(()=>verifyBuiltAssetVersions(f.root,output),/project dist directory/);
  for(const key of ['../public/favicon.svg','/favicon.svg','models/../favicon.svg','models\\castle.glb','references//castle.png']){f.write('dist/asset-versions.json',JSON.stringify({...f.map,[key]:sha('unexpected')}));assert.throws(()=>verifyBuiltAssetVersions(f.root),/invalid built asset path/);}
  const missing={...f.map};delete missing['models/castle.glb'];f.write('dist/asset-versions.json',JSON.stringify(missing));assert.throws(()=>verifyBuiltAssetVersions(f.root),/built asset inventory/);
  f.write('dist/asset-versions.json',JSON.stringify({...f.map,'favicon.svg':'bad SHA'}));assert.throws(()=>verifyBuiltAssetVersions(f.root),/invalid built asset SHA256/);
  f.write('dist/asset-versions.json',JSON.stringify(f.map));f.write('dist/references/new.png','new pixels');assert.throws(()=>verifyBuiltAssetVersions(f.root),/built asset inventory/);
 }finally{f.cleanup();}
});

test('final verification refuses symlinked dist asset directories',()=>{
 const f=builtFixture(),outside=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-built-outside-'));try{
  const link=path.join(f.root,'dist/references/external');fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');f.files.push(link);assert.throws(()=>verifyBuiltAssetVersions(f.root),/symlinks/);
 }finally{f.cleanup();fs.rmdirSync(outside);}
});

test('compiled license snapshot matches final generated HTML and rejects notice or credit changes during build',()=>{
 const f=builtFixture();try{
  const plugin=assetVersionPlugin(f.root,{manifest:f.manifest}),config=plugin.config(),licenseSha256=JSON.parse(config.define.__HEARTH_LICENSE_VERSION__),originalNotice=fs.readFileSync(path.join(f.root,'public/licenses.html'));
  assert.equal(licenseSha256,f.notices.licenseSha256);assert.deepEqual(plugin.api.verifyBuilt(f.root,'dist'),f.map);assert.deepEqual(verifyBuiltAssetVersions(f.root,'dist',{licenseSha256}),f.map);
  f.write('public/licenses.html',originalNotice.toString()+'<p>Updated attribution</p>');const changedNotice=createRuntimeNotices(f.root,f.manifest);f.write('dist/licenses.html',changedNotice.licenseBytes);assert.throws(()=>plugin.api.verifyBuilt(f.root,'dist'),/built license bytes changed after versioning/);
  f.write('public/licenses.html',originalNotice);const credits=JSON.parse(fs.readFileSync(path.join(f.root,'public/asset-credits.json')));credits.assets[0].changes+=' Updated credit text.';f.write('public/asset-credits.json',JSON.stringify(credits));const changedCredit=createRuntimeNotices(f.root,f.manifest);assert.notEqual(changedCredit.creditSha256,f.notices.creditSha256);f.write('dist/licenses.html',changedCredit.licenseBytes);assert.throws(()=>plugin.api.verifyBuilt(f.root,'dist'),/built license bytes changed after versioning/);
  assert.throws(()=>verifyBuiltAssetVersions(f.root,'dist',{licenseSha256:'not a SHA'}),/invalid compiled license SHA256/);
 }finally{f.cleanup();}
});
