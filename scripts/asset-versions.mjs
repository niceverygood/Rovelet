import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyRuntimeAssets,createRuntimeNotices} from './runtime-assets.mjs';

const SHA=/^[a-f0-9]{64}$/i,IMAGE=/\.(?:png|jpe?g|webp|gif|svg|avif)$/i;
const invariant=(condition,message)=>{if(!condition)throw new Error('Asset versions: '+message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(root,target)=>{const relative=path.relative(root,target);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};

function checkedPath(boundary,relative='',kind){
 const target=path.resolve(boundary,relative);invariant(inside(boundary,target),'path escapes its asset directory');
 const segments=path.relative(boundary,target).split(path.sep).filter(Boolean);let current=boundary,stat=fs.lstatSync(current);
 invariant(!stat.isSymbolicLink()&&stat.isDirectory(),'asset directory must be a real directory');
 for(let i=0;i<segments.length;i++){current=path.join(current,segments[i]);stat=fs.lstatSync(current);invariant(!stat.isSymbolicLink(),'symlinks are not allowed in asset paths');if(i<segments.length-1)invariant(stat.isDirectory(),'asset path parent is not a directory');}
 invariant(inside(fs.realpathSync(boundary),fs.realpathSync(target)),'resolved asset path escapes its directory');
 if(kind==='directory')invariant(stat.isDirectory(),'expected an asset directory');
 if(kind==='file')invariant(stat.isFile(),'expected an asset file');
 return {target,stat};
}
function filesBelow(boundary,relative){
 const directory=checkedPath(boundary,relative,'directory').target,files=[];
 for(const name of fs.readdirSync(directory).sort()){
  const child=path.join(relative,name),{stat}=checkedPath(boundary,child);
  if(stat.isDirectory())files.push(...filesBelow(boundary,child));
  else{invariant(stat.isFile(),'unsupported asset entry');files.push(child);}
 }
 return files;
}

// The manifest override is for small isolated tests. Production callers omit it,
// retaining the complete existing source/runtime provenance and geometry audit.
function assetVersionSnapshot(root,{manifest}={}){
 const project=path.resolve(root),publicRoot=checkedPath(project,'public','directory').target,versions=new Map();
 const images=['references','weapon-icons'].flatMap(folder=>filesBelow(publicRoot,folder)).filter(file=>IMAGE.test(file));
 // Reject links before the strict runtime verifier reads any original or cache file.
 filesBelow(publicRoot,'models');filesBelow(project,'runtime-models');
 const runtime=manifest??verifyRuntimeAssets(project);
 invariant(runtime?.format===1&&Array.isArray(runtime.assets),'unsupported runtime manifest');
 for(const relative of [...images,'favicon.svg','favicon.ico']){
  const file=checkedPath(publicRoot,relative,'file').target,key=relative.split(path.sep).join('/');versions.set(key,hash(fs.readFileSync(file)));
 }
 const ids=new Set();
 for(const asset of runtime.assets){
  invariant(typeof asset.id==='string'&&/^[a-z][a-z0-9-]*$/.test(asset.id),'invalid model ID');invariant(!ids.has(asset.id),'duplicate model ID');ids.add(asset.id);
  invariant(typeof asset.runtimeSha256==='string'&&SHA.test(asset.runtimeSha256),'invalid runtime SHA256');
  const file=checkedPath(project,path.join('runtime-models',asset.id+'.glb'),'file').target,bytes=fs.readFileSync(file),digest=hash(bytes);
  invariant(digest===asset.runtimeSha256.toLowerCase(),asset.id+' runtime bytes do not match the declared SHA256');
  if(asset.runtimeBytes!==undefined)invariant(Number.isSafeInteger(asset.runtimeBytes)&&asset.runtimeBytes>=0&&bytes.length===asset.runtimeBytes,asset.id+' runtime size does not match the manifest');
  versions.set('models/'+asset.id+'.glb',digest);
 }
 return {versions:Object.fromEntries([...versions].sort(([a],[b])=>a<b?-1:a>b?1:0)),runtime};
}
export function createAssetVersions(root,options){return assetVersionSnapshot(root,options).versions;}

// Run after the runtime GLBs replace Vite's original public copies. Reading the
// emitted map also checks the precise snapshot that was compiled into the bundle.
export function verifyBuiltAssetVersions(root,outDir='dist',{licenseSha256}={}){
 const project=path.resolve(root),dist=path.resolve(project,outDir);
 invariant(dist===path.join(project,'dist'),'built assets must be the project dist directory');
 checkedPath(project,'dist','directory');
 const file=checkedPath(dist,'asset-versions.json','file').target,map=JSON.parse(fs.readFileSync(file,'utf8'));
 invariant(map!==null&&typeof map==='object'&&!Array.isArray(map),'invalid built asset map');
 for(const [key,digest]of Object.entries(map)){
  invariant(key.length>0&&!key.includes('\\')&&!key.includes('\0')&&!path.posix.isAbsolute(key)&&key.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'),'invalid built asset path');
  invariant(typeof digest==='string'&&SHA.test(digest),'invalid built asset SHA256');
 }
 const images=['references','weapon-icons'].flatMap(folder=>filesBelow(dist,folder)).filter(relative=>IMAGE.test(relative)),models=filesBelow(dist,'models').filter(relative=>/\.glb$/i.test(relative));
 const expected=[...images,...models,'favicon.svg','favicon.ico'].map(relative=>relative.split(path.sep).join('/')).sort();
 invariant(JSON.stringify(Object.keys(map).sort())===JSON.stringify(expected),'built asset inventory does not match the emitted versions');
 for(const [relative,digest]of Object.entries(map)){
  const target=checkedPath(dist,relative,'file').target;
  invariant(hash(fs.readFileSync(target))===digest.toLowerCase(),'built asset bytes changed after versioning: '+relative);
 }
 if(licenseSha256!==undefined){
  invariant(typeof licenseSha256==='string'&&SHA.test(licenseSha256),'invalid compiled license SHA256');
  const license=checkedPath(dist,'licenses.html','file').target;
  invariant(hash(fs.readFileSync(license))===licenseSha256.toLowerCase(),'built license bytes changed after versioning');
 }
 return map;
}

export function assetVersionPlugin(root,options){
 let versions,licenseVersion;
 const ready=()=>{invariant(versions,'build asset versions have not been prepared');return versions;};
 return {name:'hearth-asset-versions',apply:'build',
  api:{verifyBuilt(project,outDir){ready();invariant(typeof licenseVersion==='string'&&SHA.test(licenseVersion),'build license version has not been prepared');return verifyBuiltAssetVersions(project,outDir,{licenseSha256:licenseVersion});}},
  config(){
   const snapshot=assetVersionSnapshot(root,options);versions=snapshot.versions;
   const publicRoot=checkedPath(path.resolve(root),'public','directory').target;checkedPath(publicRoot,'asset-credits.json','file');checkedPath(publicRoot,'licenses.html','file');
   licenseVersion=createRuntimeNotices(root,snapshot.runtime).licenseSha256;
   return {define:{__HEARTH_ASSET_VERSIONS__:JSON.stringify(versions),__HEARTH_LICENSE_VERSION__:JSON.stringify(licenseVersion)}};
  },
  transformIndexHtml:{order:'pre',handler(html){
   const digest=ready()['favicon.svg'];
   return html.replace(/<link\b[^>]*>/gi,tag=>{
    if(!/\brel\s*=\s*(['"])(?:icon|shortcut icon)\1/i.test(tag))return tag;
    return tag.replace(/\bhref\s*=\s*(['"])([^'"]+)\1/i,(match,quote,href)=>{
     if(!['favicon.svg','./favicon.svg','/favicon.svg'].includes(href.split(/[?#]/,1)[0]))return match;
     const url=new URL(href,'https://assets.invalid/');url.searchParams.set('v',digest);return 'href='+quote+'./favicon.svg'+url.search+url.hash+quote;
    });
   });
  }},
  generateBundle(){this.emitFile({type:'asset',fileName:'asset-versions.json',source:JSON.stringify(ready(),null,2)+'\n'});}
 };
}
