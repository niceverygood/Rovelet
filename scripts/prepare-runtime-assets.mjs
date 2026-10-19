// Offline texture preparation. Original Meshy GLBs remain the source of truth.
// Run explicitly with a local Chromium installation; normal builds only read this cache.
import {createServer} from 'node:http';
import {readFile, realpath, mkdir, writeFile, rename, rm, stat} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve, relative, isAbsolute, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseGlb, repackImages} from './glb-runtime.mjs';
import {readAssetInventory} from './asset-inputs.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(candidate,parent)=>{const rel=relative(parent,candidate);return rel===''||(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep));};
const fail=message=>{throw new Error(message);};

function outputArgument(args){
 let out=resolve(root,'runtime-models');
 for(let i=0;i<args.length;i++){
  if(args[i]==='--out'&&args[i+1])out=resolve(process.cwd(),args[++i]);
  else if(args[i].startsWith('--out='))out=resolve(process.cwd(),args[i].slice(6));
  else fail('Usage: node scripts/prepare-runtime-assets.mjs [--out directory]');
 }
 return out;
}

async function canonicalFuturePath(path){
 // Resolve existing ancestors before mkdir so a symlink cannot redirect output into public/.
 const suffix=[];let current=path;
 for(;;){
  try{return resolve(await realpath(current),...suffix.reverse());}
  catch(error){if(error.code!=='ENOENT')throw error;const parent=dirname(current);if(parent===current)throw error;suffix.push(relative(parent,current));current=parent;}
 }
}

async function checkOutput(path){
 const canonical=await canonicalFuturePath(path),canonicalRoot=await realpath(root);
 if(canonical===canonicalRoot)fail('Output cannot be the project root.');
 for(const folder of ['public','src','scripts','tests','node_modules','data']){
  if(inside(canonical,resolve(canonicalRoot,folder)))fail('Output cannot be inside a source or public directory.');
 }
 return canonical;
}

async function atomicWrite(path,bytes){
 const temporary=path+'.'+randomUUID()+'.tmp';
 try{await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,path);}
 finally{await rm(temporary,{force:true});}
}

function geometryHashes(parsed){
 const imageViews=new Set(parsed.json.images.map(image=>image.bufferView));
 return parsed.json.bufferViews.flatMap((view,index)=>imageViews.has(index)?[]:[sha256(parsed.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength))]);
}

async function inventory(){
 // Original twelve hashes stay frozen; only explicitly audited text inputs may extend them.
 return readAssetInventory(root).assets.map(({id,path,sha256})=>({id,path,sha256}));
}

async function startServer(assets){
 const modelRoutes=new Map(assets.map(asset=>['/models/'+asset.id+'.glb',asset.path]));
 const threeRoot=await realpath(resolve(root,'node_modules/three'));
 const policyPath=resolve(root,'src/texture-policy.js');
 const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Offline asset preparation</title><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>';
 const server=createServer(async(request,response)=>{
  try{
   if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return;}
   const url=new URL(request.url,'http://127.0.0.1');
   let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{response.writeHead(400);response.end();return;}
   if(pathname==='/'&&!url.search){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:html);return;}
   let path=modelRoutes.get(pathname);
   if(pathname==='/src/texture-policy.js')path=policyPath;
   if(pathname.startsWith('/node_modules/three/')){
    const candidate=resolve(threeRoot,pathname.slice('/node_modules/three/'.length));
    if(!inside(candidate,threeRoot)){response.writeHead(403);response.end();return;}
    path=await realpath(candidate);
    if(!inside(path,threeRoot)){response.writeHead(403);response.end();return;}
   }
   if(!path){response.writeHead(404);response.end();return;}
   if(!(await stat(path)).isFile()){response.writeHead(404);response.end();return;}
   const bytes=await readFile(path),type=extname(path)==='.js'?'text/javascript; charset=utf-8':'model/gltf-binary';
   response.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   response.end(request.method==='HEAD'?undefined:bytes);
  }catch(error){response.writeHead(error.code==='ENOENT'?404:500);response.end();}
 });
 await new Promise((accept,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',accept);});
 return {server,origin:'http://127.0.0.1:'+server.address().port};
}

async function timed(promise,milliseconds,label){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out.')),milliseconds);})]);}
 finally{clearTimeout(timer);}
}

async function encodeModel(page,id){
 return timed(page.evaluate(async id=>{
  const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const {textureLimit}=await import('/src/texture-policy.js');
  const gltf=await new GLTFLoader().loadAsync('/models/'+id+'.glb');
  const processed=new Set(),byImage=new Map(),textures=new Set(),geometries=new Set(),materials=new Set();
  const keys=['map','normalMap','roughnessMap','metalnessMap'];
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const canvasFor=(image,width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw new Error('2D canvas unavailable.');context.drawImage(image,0,0,width,height);return canvas;};
  const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  try{
   gltf.scene.traverse(object=>{
    if(!object.isMesh)return;
    geometries.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
     materials.add(material);
     for(const key of keys){
      const texture=material[key];if(!texture)continue;
      textures.add(texture);
      const textureIndex=gltf.parser.associations.get(texture)?.textures;
      const imageIndex=gltf.parser.json.textures?.[textureIndex]?.source;
      if(!Number.isInteger(imageIndex)||!gltf.parser.json.images[imageIndex])throw new Error(id+': missing source-image association for '+key);
      const source=texture.image,limit=textureLimit(id,key);
      if(!source||!Number.isSafeInteger(source.width)||!Number.isSafeInteger(source.height)||!Number.isSafeInteger(limit)||limit<1)throw new Error(id+': invalid source image or texture policy.');
      // This square reduction and default drawImage filtering exactly match World.load.
      const width=source.width>limit?limit:source.width,height=source.width>limit?limit:source.height;
      const previous=byImage.get(imageIndex);
      if(previous&&(previous.width!==width||previous.height!==height))throw new Error(id+': one source image is shared by incompatible texture sizes.');
      if(previous)previous.roles.add(key);
      if(processed.has(texture))continue;
      processed.add(texture);
      if(previous)continue;
      byImage.set(imageIndex,{index:imageIndex,role:key,roles:new Set([key]),width,height,sourceWidth:source.width,sourceHeight:source.height,source});
     }
    }
   });
   if(byImage.size!==gltf.parser.json.images.length)throw new Error(id+': an embedded image has no supported material role.');
   const output=[];
   for(const entry of [...byImage.values()].sort((a,b)=>a.index-b.index)){
    const canvas=canvasFor(entry.source,entry.width,entry.height),rgbaSha256=await hash(pixels(canvas));
    const blob=await new Promise((accept,reject)=>canvas.toBlob(blob=>blob?accept(blob):reject(new Error(id+': PNG encoding failed.')),'image/png'));
    if(blob.type!=='image/png')throw new Error(id+': browser did not encode lossless PNG.');
    const decoded=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
    let decodedRgbaSha256;
    try{
     if(decoded.width!==entry.width||decoded.height!==entry.height)throw new Error(id+': PNG dimensions changed during decode.');
     const decodedCanvas=canvasFor(decoded,decoded.width,decoded.height);
     decodedRgbaSha256=await hash(pixels(decodedCanvas));decodedCanvas.width=decodedCanvas.height=1;
    }finally{decoded.close();}
    if(decodedRgbaSha256!==rgbaSha256)throw new Error(id+': PNG round-trip changed texture RGBA bytes.');
    const encoded=new Uint8Array(await blob.arrayBuffer());let binary='';
    for(let offset=0;offset<encoded.length;offset+=0x8000)binary+=String.fromCharCode(...encoded.subarray(offset,offset+0x8000));
    output.push({index:entry.index,role:entry.role,roles:[...entry.roles],width:entry.width,height:entry.height,sourceWidth:entry.sourceWidth,sourceHeight:entry.sourceHeight,rgbaSha256,decodedRgbaSha256,bytes:encoded.length,base64:btoa(binary)});
    canvas.width=canvas.height=1;
   }
   return output;
  }finally{
   const images=new Set();for(const texture of textures){images.add(texture.image);texture.dispose();}
   for(const image of images)image?.close?.();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
   gltf.parser.cache.removeAll();
  }
 },id),120000,id+' texture preparation');
}

async function main(){
 const out=await checkOutput(outputArgument(process.argv.slice(2)));
 const assets=await inventory(),policyPath=resolve(root,'src/texture-policy.js');
 const policySha256=sha256(await readFile(policyPath));
 await mkdir(out,{recursive:true});await checkOutput(await realpath(out));
 // A failed regeneration must not leave a completion manifest for mixed old/new cache files.
 await rm(resolve(out,'manifest.json'),{force:true});
 let server,browser;
 try{
  const host=await startServer(assets);server=host.server;
  const require=createRequire(import.meta.url),playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
  if(!playwright.chromium)fail('The configured Playwright module has no Chromium launcher.');
  browser=await playwright.chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext(),page=await context.newPage(),pageErrors=[];
  page.setDefaultTimeout(120000);
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')pageErrors.push(message.text());});
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===host.origin?route.continue():route.abort();});
  await page.goto(host.origin+'/',{waitUntil:'domcontentloaded',timeout:120000});
  const manifest={format:1,policySha256,generatedAt:new Date().toISOString(),browser:browser.version(),assets:[]};
  for(const asset of assets){
   const source=await readFile(asset.path),sourceSha256=sha256(source);
   if(sourceSha256!==asset.sha256)fail(asset.id+': source bytes differ from the audited Meshy original.');
   const parsedSource=parseGlb(source),images=await encodeModel(page,asset.id);
   if(pageErrors.length)fail(asset.id+': browser reported an asset-loading error: '+pageErrors[0]);
   const replacements=new Map(images.map(image=>[image.index,{bytes:Buffer.from(image.base64,'base64'),mimeType:'image/png'}]));
   for(const image of images)if(replacements.get(image.index).bytes.length!==image.bytes)fail(asset.id+': encoded PNG transfer was truncated.');
   const runtime=repackImages(source,replacements),parsedRuntime=parseGlb(runtime);
   const geometrySha256=geometryHashes(parsedSource),runtimeGeometrySha256=geometryHashes(parsedRuntime);
   if(JSON.stringify(geometrySha256)!==JSON.stringify(runtimeGeometrySha256))fail(asset.id+': non-image binary geometry changed.');
   if(parsedSource.json.bufferViews.length!==parsedRuntime.json.bufferViews.length)fail(asset.id+': bufferView inventory changed.');
   for(const image of images)delete image.base64;
   await atomicWrite(resolve(out,asset.id+'.glb'),runtime);
   manifest.assets.push({id:asset.id,sourceSha256,runtimeSha256:sha256(runtime),sourceBytes:source.length,runtimeBytes:runtime.length,geometrySha256,images});
   console.log(asset.id+': '+source.length+' -> '+runtime.length+' bytes');
  }
  if(sha256(await readFile(policyPath))!==policySha256)fail('Texture policy changed during preparation; regenerate the cache.');
  await atomicWrite(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const sourceBytes=manifest.assets.reduce((sum,asset)=>sum+asset.sourceBytes,0),runtimeBytes=manifest.assets.reduce((sum,asset)=>sum+asset.runtimeBytes,0);
  console.log(manifest.assets.length+' models: '+sourceBytes+' -> '+runtimeBytes+' bytes');
 }finally{
  try{await browser?.close();}finally{if(server)await new Promise(accept=>server.close(accept));}
 }
}

main().catch(error=>{console.error('Runtime asset preparation failed: '+error.message);process.exitCode=1;});
