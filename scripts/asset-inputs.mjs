import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Frozen from the original twelve Meshy files, independently audited before new assets.
export const LEGACY_MODEL_SHA256=Object.freeze({
 'ballista':'ad34e88c4e682ba33de5bdb2cc3eba618a2dd16a263d862ed7676e23af545c5d',
 'beehive':'4c7d230322776e546117840299f202997e4f3b17a7dad64b5f92472aa39d6c95',
 'cannon':'2831eaba10d6fa3cc9ddbef126f05a6853a7303dbbbd5465487b3f39781c08bd',
 'castle-large':'5055348daf3d8da7972e270b96ab98fac9cf7cbcd2aa75987cc6fd1af3a37dbe',
 'castle-medium':'e852db96e1ae7f529ddaac233480acf3300bae182d48068afdd15ff98b72f338',
 'castle-small':'656b9d727f12344cd9c999ecf4f8757eaf83265b53eea2f923440797aabf96f9',
 'enemy-tower':'c38591ea6feeb2f2713b2c9f2290dccecaf2d5f05e76f3855e2d3bb296951bad',
 'greenhouse':'aa6673466f7cb63333205ed30ff9bd88f4a9cfb6271fe7c2af2924ecd6cc6a5e',
 'house':'c1f586057962bedfa9a2d3bfdc6f7c23431e78b06514ac0b36335c493a028867',
 'ruins':'2e7ed96758c031e2ebe80abd6ad57f75c84cf396d7a1baee55eb44894a17dfb8',
 'smithy':'6eb650efdc108beadf009c36ed7dc18b45d72aa9c9b7f502829ce62036c003a3',
 'tree':'4a70a0dbcdb69eacfa95500b9819501a137b30de1ddb6b3247c88196b48dd0c7'
});
const ID=/^[a-z][a-z0-9-]*$/,SHA=/^[a-f0-9]{64}$/;
const invariant=(condition,message)=>{if(!condition)throw new Error('Asset inputs: '+message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export function validateModelInventory(credits,sources){
 invariant(Array.isArray(credits)&&Array.isArray(sources),'model inventory must be arrays');
 const ids=new Set(),files=new Map();
 for(const source of sources){invariant(object(source)&&typeof source.file==='string'&&!files.has(source.file)&&SHA.test(source.sha256),'invalid or duplicate source inventory');files.set(source.file,source.sha256);}
 for(const asset of credits){
  invariant(object(asset)&&ID.test(asset.id)&&asset.file===`models/${asset.id}.glb`&&SHA.test(asset.sha256),'invalid audited model inventory');
  invariant(!ids.has(asset.id),'duplicate audited model ID');ids.add(asset.id);
 }
 for(const [id,digest]of Object.entries(LEGACY_MODEL_SHA256)){
  const asset=credits.find(a=>a.id===id);invariant(asset,'original model missing: '+id);invariant(asset.sha256===digest,'original model changed: '+id);
 }
 invariant(JSON.stringify([...files.keys()].sort())===JSON.stringify(credits.map(a=>a.id+'.glb').sort()),'model inventory and audited credits differ');
 for(const asset of credits)invariant(files.get(asset.id+'.glb')===asset.sha256,'source hash mismatch: '+asset.id);
 return [...credits].sort((a,b)=>a.id.localeCompare(b.id));
}
function publicPath(relative,label){
 invariant(typeof relative==='string'&&relative.startsWith('public/')&&!relative.includes('\\')&&!relative.includes('\0')&&relative.split('/').every(p=>p!==''&&p!=='.'&&p!=='..'),label+' must be a safe public file');return relative;
}
function existingPublicFile(root,relative,label){
 publicPath(relative,label);const file=path.resolve(root,relative),boundary=path.resolve(root,'public');
 invariant(fs.existsSync(file)&&fs.statSync(file).isFile(),label+' does not exist');
 const resolved=path.relative(fs.realpathSync(boundary),fs.realpathSync(file));invariant(resolved!==''&&resolved!=='..'&&!resolved.startsWith('..'+path.sep)&&!path.isAbsolute(resolved),label+' resolves outside public');return file;
}
export function auditAssetInput(root,asset){
 invariant(object(asset)&&ID.test(asset.asset),'invalid provenance asset ID');
 if(asset.resource==='image-to-3d'){
  existingPublicFile(root,asset.reference_file,'image reference');
  return {inputType:asset.resource,referenceRequired:true,hasReference:true,referenceExists:true,referenceFile:asset.reference_file,promptRequired:false,promptFile:null,promptExists:false,promptValid:false,promptKeys:[]};
 }
 invariant(asset.resource==='text-to-3d','unsupported generation resource: '+asset.resource);
 invariant(asset.reference_file===null,'text reference_file must be explicitly null');
 invariant(asset.prompt_file===`public/prompts/${asset.asset}.json`,'text prompt_file must identify its public model prompt JSON');
 const file=existingPublicFile(root,asset.prompt_file,'text prompt');let prompt;
 try{prompt=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new Error('Asset inputs: text prompt must contain valid JSON');}
 invariant(object(prompt)&&prompt.type==='text-to-3d'&&typeof prompt.prompt==='string'&&prompt.prompt.trim().length>0,'text prompt must have type text-to-3d and a nonempty prompt string');
 for(const key of ['asset','id'])if(prompt[key]!==undefined)invariant(prompt[key]===asset.asset,'text prompt model ID mismatch');
 return {inputType:asset.resource,referenceRequired:false,hasReference:false,referenceExists:false,referenceFile:null,promptRequired:true,promptFile:asset.prompt_file,promptExists:true,promptValid:true,promptKeys:Object.keys(prompt).sort()};
}
export function readAssetInventory(root){
 const credits=JSON.parse(fs.readFileSync(path.join(root,'public/asset-credits.json'),'utf8')),provenance=JSON.parse(fs.readFileSync(path.join(root,'asset-provenance.json'),'utf8'));
 invariant(Array.isArray(credits.assets)&&Array.isArray(provenance.assets),'audited credit and provenance inventories missing');
 const sourceFiles=fs.readdirSync(path.join(root,'public/models')).filter(file=>file.endsWith('.glb')).map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,'public/models',file)))}));
 const ordered=validateModelInventory(credits.assets,sourceFiles),byId=new Map();
 for(const entry of provenance.assets){invariant(object(entry)&&ID.test(entry.asset)&&!byId.has(entry.asset),'invalid or duplicate provenance asset ID');byId.set(entry.asset,entry);}
 invariant(JSON.stringify([...byId.keys()].sort())===JSON.stringify(ordered.map(a=>a.id).sort()),'provenance and audited model inventory differ');
 const assets=ordered.map(asset=>{const entry=byId.get(asset.id);invariant(entry.model_file==='public/'+asset.file,'provenance model path mismatch: '+asset.id);if(Object.hasOwn(LEGACY_MODEL_SHA256,asset.id))invariant(entry.resource==='image-to-3d','original model image provenance changed: '+asset.id);else invariant(entry.resource==='text-to-3d','additional model must have explicit text-to-3d provenance');return {id:asset.id,path:path.resolve(root,'public',asset.file),sha256:asset.sha256,provenance:entry,input:auditAssetInput(root,entry)};});
 return {credits,provenance,assets};
}
function creditValue(value,label){invariant(typeof value==='number'&&Number.isFinite(value)&&value>=0,label+' must be a finite nonnegative credit value');return value;}
function publicCosts(asset){
 const result={};
 if(asset.task_lineage!==undefined){invariant(Array.isArray(asset.task_lineage),'task_lineage must be an array');result.task_lineage=asset.task_lineage.map(stage=>{invariant(object(stage)&&typeof stage.stage==='string'&&stage.stage.length>0&&typeof stage.task_id==='string'&&stage.task_id.length>0,'invalid public task lineage');const row={stage:stage.stage,task_id:stage.task_id};for(const key of ['parent_task_id','resource','status','operation_id'])if(stage[key]!==undefined){invariant(typeof stage[key]==='string'&&stage[key].length>0,'invalid task '+key);row[key]=stage[key];}if(stage.consumed_credits!==undefined)row.consumed_credits=creditValue(stage.consumed_credits,'stage cost');return row;});}
 if(asset.stage_costs!==undefined){invariant(object(asset.stage_costs),'stage_costs must be an object');result.stage_costs=Object.fromEntries(Object.entries(asset.stage_costs).map(([stage,cost])=>[stage,creditValue(cost,'stage cost')]));}
 for(const key of ['preview_task_id','refine_task_id','source_task_id'])if(asset[key]!==undefined){invariant(typeof asset[key]==='string',key+' must be a task ID');result[key]=asset[key];}
 for(const key of ['status','model','texture_resolution'])if(asset[key]!==undefined){invariant(typeof asset[key]==='string'&&asset[key].length>0,key+' must be a nonempty public generation value');result[key]=asset[key];}
 for(const key of ['requested_triangles','actual_triangles'])if(asset[key]!==undefined){invariant(Number.isSafeInteger(asset[key])&&asset[key]>0,key+' must be a positive triangle count');result[key]=asset[key];}
 return result;
}
export function generationCosts(provenance){
 invariant(Array.isArray(provenance.assets),'generation inventory missing');const assets=provenance.assets.map(a=>({id:a.asset,consumedCredits:creditValue(a.consumed_credits,'generation cost'),...publicCosts(a)}));
 return {generationCredits:assets.reduce((sum,a)=>sum+a.consumedCredits,0),assets:assets.map(({stage_costs,task_lineage,...row})=>({...row,...(stage_costs===undefined?{}:{stageCosts:stage_costs}),...(task_lineage===undefined?{}:{taskLineage:task_lineage})}))};
}
export function packagedAssetProvenance(provenance){
 invariant(Array.isArray(provenance.assets),'generation inventory missing');
 return {generator:provenance.generator,assets:provenance.assets.map(a=>{
  invariant(a.resource==='image-to-3d'||a.resource==='text-to-3d','unsupported generation resource');
  const row={asset:a.asset,task_id:a.task_id,resource:a.resource,consumed_credits:creditValue(a.consumed_credits,'generation cost'),model_file:publicPath(a.model_file,'model').replace(/^public\//,'dist/'),reference_file:null,...publicCosts(a)};
  if(a.resource==='image-to-3d')row.reference_file=publicPath(a.reference_file,'image reference').replace(/^public\//,'dist/');
  else{invariant(a.reference_file===null,'text reference_file must be explicitly null');invariant(a.prompt_file===`public/prompts/${a.asset}.json`,'text prompt_file must identify its public model prompt JSON');row.prompt_file=publicPath(a.prompt_file,'text prompt').replace(/^public\//,'dist/');}
  return row;
 })};
}
