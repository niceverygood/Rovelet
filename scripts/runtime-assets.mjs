import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseGlb} from './glb-runtime.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const invariant=(condition,message)=>{if(!condition)throw Error('Runtime assets: '+message);};
function outputDirectory(root,outDir){const dist=path.resolve(root,outDir);invariant(dist.startsWith(path.resolve(root)+path.sep),'output must stay inside project');invariant(dist===path.resolve(root,'dist'),'output must be the project dist directory');if(fs.existsSync(dist))invariant(fs.realpathSync(dist)===path.join(fs.realpathSync(root),'dist'),'symlinked output is not allowed');return dist;}
// JSON encoding canonicalizes -0 bounds to 0; raw float geometry is checked separately.
function normalizedMetadata(json,imageViews){const copy=JSON.parse(JSON.stringify(json));copy.buffers[0].byteLength=0;copy.bufferViews.forEach((view,index)=>{view.byteOffset=0;if(imageViews.has(index))view.byteLength=0;});copy.images.forEach(image=>image.mimeType='image/png');return copy;}
function versionedCreditNotice(source){
 const links=[...source.matchAll(/(<a\b[^>]*\bhref\s*=\s*)(["'])(asset-credits\.json[^"']*)\2/gi)];
 invariant(links.length===1&&links[0][3]==='asset-credits.json','licenses.html must contain exactly one unversioned asset-credits.json anchor');
 const [link,prefix,quote]=links[0];
 return hash=>source.replace(link,()=>prefix+quote+'asset-credits.json?v='+hash+quote);
}
// Configuration and final copying share this exact byte generation. Metadata is
// intentionally separate from the 69 binary assets in asset-versions.json.
export function createRuntimeNotices(root,manifest){
 const creditNotice=versionedCreditNotice(fs.readFileSync(path.join(root,'public/licenses.html'),'utf8'));
 const credits=JSON.parse(fs.readFileSync(path.join(root,'public/asset-credits.json')));
 invariant(Array.isArray(credits.assets),'credit asset inventory missing');
 credits.assets=credits.assets.map(entry=>{const asset=manifest.assets.find(asset=>asset.id===entry.id);invariant(asset&&entry.sha256===asset.sourceSha256,'credit source hash mismatch');return {...entry,sourceSha256:entry.sha256,sha256:asset.runtimeSha256,changes:'Lossless build-time PNG encoding of existing runtime-sized textures; original geometry, normals and UV bytes preserved. '+entry.changes};});
 const creditBytes=Buffer.from(JSON.stringify(credits,null,2)),creditSha256=sha(creditBytes),notice=creditNotice(creditSha256),faviconSha256=sha(fs.readFileSync(path.join(root,'public/favicon.svg')));
 invariant((notice.match(/<\/title\s*>/gi)??[]).length===1,'licenses.html must contain exactly one title for its favicon');
 invariant(!/<link\b[^>]*\brel\s*=\s*(["'])(?:icon|shortcut icon)\1/i.test(notice),'public licenses.html favicon must be generated only once');
 const icon='<link rel="icon" type="image/svg+xml" href="./favicon.svg?v='+faviconSha256+'">',licenseBytes=Buffer.from(notice.replace(/<\/title\s*>/i,match=>match+icon));
 return {creditBytes,creditSha256,licenseBytes,licenseSha256:sha(licenseBytes)};
}
export function verifyRuntimeAssets(root){
 const directory=path.join(root,'runtime-models'),manifestPath=path.join(directory,'manifest.json');
 invariant(fs.existsSync(manifestPath),'cache missing; run pnpm assets:prepare before building');
 const manifest=JSON.parse(fs.readFileSync(manifestPath));
 invariant(manifest.format===1&&Array.isArray(manifest.assets),'unsupported manifest');
 invariant(manifest.policySha256===sha(fs.readFileSync(path.join(root,'src/texture-policy.js'))),'texture policy changed; regenerate cache');
 const sourceNames=fs.readdirSync(path.join(root,'public/models')).filter(name=>name.endsWith('.glb')).sort();
 invariant(JSON.stringify(manifest.assets.map(asset=>asset.id+'.glb').sort())===JSON.stringify(sourceNames),'model inventory mismatch');
 for(const asset of manifest.assets){
  invariant(/^[a-z][a-z0-9-]*$/.test(asset.id),'invalid model ID');
  const originalBytes=fs.readFileSync(path.join(root,'public/models',asset.id+'.glb')),runtimeBytes=fs.readFileSync(path.join(directory,asset.id+'.glb'));
  invariant(sha(originalBytes)===asset.sourceSha256&&originalBytes.length===asset.sourceBytes,asset.id+' source changed');
  invariant(sha(runtimeBytes)===asset.runtimeSha256&&runtimeBytes.length===asset.runtimeBytes,asset.id+' cache changed');
  const source=parseGlb(originalBytes),runtime=parseGlb(runtimeBytes),imageViews=new Set(source.json.images.map(image=>image.bufferView));
  invariant(isDeepStrictEqual(normalizedMetadata(source.json,imageViews),normalizedMetadata(runtime.json,imageViews)),asset.id+' metadata or image mapping changed');
  invariant(source.json.bufferViews.length===runtime.json.bufferViews.length,asset.id+' view count changed');
  const geometryHashes=[];
  source.json.bufferViews.forEach((view,index)=>{if(imageViews.has(index))return;const other=runtime.json.bufferViews[index],original=source.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),packed=runtime.bin.subarray(other.byteOffset??0,(other.byteOffset??0)+other.byteLength);invariant(original.equals(packed),asset.id+' geometry view '+index+' changed');geometryHashes.push(sha(original));});
  invariant(JSON.stringify(geometryHashes)===JSON.stringify(asset.geometrySha256),asset.id+' geometry manifest changed');
  invariant(asset.images.length===source.json.images.length,asset.id+' image inventory mismatch');
  invariant(JSON.stringify(asset.images.map(image=>image.index).sort((a,b)=>a-b))===JSON.stringify(source.json.images.map((_,index)=>index)),asset.id+' image indices incomplete');
  for(const image of asset.images)invariant(image.rgbaSha256===image.decodedRgbaSha256&&/^[a-f0-9]{64}$/.test(image.rgbaSha256)&&runtime.json.images[image.index]?.mimeType==='image/png',asset.id+' image equivalence missing');
 }
 return manifest;
}
export function applyRuntimeAssets(root,outDir='dist'){
 const dist=outputDirectory(root,outDir);
 const manifest=verifyRuntimeAssets(root);
 invariant(fs.existsSync(path.join(dist,'licenses.html')),'licenses.html missing from dist public copy');
 const notices=createRuntimeNotices(root,manifest);
 for(const asset of manifest.assets)fs.copyFileSync(path.join(root,'runtime-models',asset.id+'.glb'),path.join(dist,'models',asset.id+'.glb'));
 fs.writeFileSync(path.join(dist,'asset-credits.json'),notices.creditBytes);
 invariant(sha(fs.readFileSync(path.join(dist,'asset-credits.json')))===notices.creditSha256,'final credit bytes changed during copying');
 fs.writeFileSync(path.join(dist,'licenses.html'),notices.licenseBytes);
 fs.writeFileSync(path.join(dist,'runtime-assets.json'),JSON.stringify(manifest,null,2));
 return manifest;
}
export function runtimeAssetPlugin(root,{afterApply}={}){let outDir='dist';return {name:'hearth-runtime-assets',apply:'build',configResolved(config){outDir=config.build.outDir;outputDirectory(root,outDir);},closeBundle(){const manifest=applyRuntimeAssets(root,outDir);afterApply?.(root,outDir);const source=manifest.assets.reduce((sum,asset)=>sum+asset.sourceBytes,0),runtime=manifest.assets.reduce((sum,asset)=>sum+asset.runtimeBytes,0);console.log('Meshy runtime models: '+(source/1e6).toFixed(2)+' MB → '+(runtime/1e6).toFixed(2)+' MB; original source files preserved.');}};}
