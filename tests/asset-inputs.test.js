import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LEGACY_MODEL_SHA256,validateModelInventory,auditAssetInput,packagedAssetProvenance,generationCosts} from '../scripts/asset-inputs.mjs';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-asset-input-'));
 fs.mkdirSync(path.join(root,'public'));fs.mkdirSync(path.join(root,'public/references'));fs.mkdirSync(path.join(root,'public/prompts'));
 fs.writeFileSync(path.join(root,'public/references/castle-small.png'),'reference pixels');
 const prompt=path.join(root,'public/prompts/projectile-ironshot.json');
 const write=value=>fs.writeFileSync(prompt,typeof value==='string'?value:JSON.stringify(value));
 write({type:'text-to-3d',asset:'projectile-ironshot',prompt:'A worn iron cannonball with engraved brass seams.'});
 t.after(()=>{for(const file of ['public/references/castle-small.png','public/prompts/projectile-ironshot.json'])if(fs.existsSync(path.join(root,file)))fs.unlinkSync(path.join(root,file));for(const dir of ['public/references','public/prompts','public'])fs.rmdirSync(path.join(root,dir));fs.rmdirSync(root);});
 return {root,write,prompt};
}
const image=()=>({asset:'castle-small',resource:'image-to-3d',reference_file:'public/references/castle-small.png'});
const text=()=>({asset:'projectile-ironshot',resource:'text-to-3d',reference_file:null,prompt_file:'public/prompts/projectile-ironshot.json'});
function legacy(){return Object.entries(LEGACY_MODEL_SHA256).map(([id,sha256])=>({id,file:'models/'+id+'.glb',sha256}));}
function sourceRows(credits){return credits.map(a=>({file:a.id+'.glb',sha256:a.sha256}));}

test('the twelve immutable model hashes remain required when a new text model is registered',()=>{
 const credits=legacy();assert.equal(credits.length,12);assert.equal(LEGACY_MODEL_SHA256['castle-small'],'656b9d727f12344cd9c999ecf4f8757eaf83265b53eea2f923440797aabf96f9');
 assert.equal(validateModelInventory(credits,sourceRows(credits)).length,12);
 const expanded=[...credits,{id:'projectile-ironshot',file:'models/projectile-ironshot.glb',sha256:'a'.repeat(64)}];
 assert.equal(validateModelInventory(expanded,sourceRows(expanded)).length,13);
 const changed=structuredClone(credits);changed[0].sha256='b'.repeat(64);
 assert.throws(()=>validateModelInventory(changed,sourceRows(changed)),/original.*changed/i);
 assert.throws(()=>validateModelInventory(credits.slice(1),sourceRows(credits.slice(1))),/original.*missing/i);
});
test('inventory still rejects duplicate IDs, unaudited files, unsafe names and byte hash mismatches',()=>{
 const credits=legacy(),sources=sourceRows(credits);
 assert.throws(()=>validateModelInventory([...credits,credits[0]],sources),/duplicate/i);
 assert.throws(()=>validateModelInventory(credits,[...sources,{file:'uncredited.glb',sha256:'a'.repeat(64)}]),/inventory/i);
 const wrong=structuredClone(sources);wrong[0].sha256='f'.repeat(64);assert.throws(()=>validateModelInventory(credits,wrong),/source.*hash/i);
 for(const id of ['../outside','bad.glb','C:outside','bad\\name'])assert.throws(()=>validateModelInventory([...credits,{id,file:'models/'+id+'.glb',sha256:'a'.repeat(64)}],sources),/invalid/i);
});
test('image generation requires its existing reference and never silently becomes a text input',t=>{
 const f=fixture(t),result=auditAssetInput(f.root,image());assert.equal(result.inputType,'image-to-3d');assert.equal(result.referenceRequired,true);assert.equal(result.hasReference,true);assert.equal(result.referenceExists,true);assert.equal(result.promptRequired,false);
 assert.throws(()=>auditAssetInput(f.root,{...image(),reference_file:null}),/reference/i);
 assert.throws(()=>auditAssetInput(f.root,{...image(),reference_file:'public/references/missing.png'}),/reference/i);
 assert.throws(()=>auditAssetInput(f.root,{...image(),reference_file:'../private.png'}),/public|reference/i);
});
test('text generation has a null reference and an existing typed JSON prompt',t=>{
 const f=fixture(t),result=auditAssetInput(f.root,text());assert.equal(result.inputType,'text-to-3d');assert.equal(result.referenceRequired,false);assert.equal(result.hasReference,false);assert.equal(result.referenceExists,false);assert.equal(result.promptRequired,true);assert.equal(result.promptExists,true);assert.equal(result.promptValid,true);assert.deepEqual(result.promptKeys,['asset','prompt','type']);
 assert.throws(()=>auditAssetInput(f.root,{...text(),reference_file:'public/references/castle-small.png'}),/null/i);
 assert.throws(()=>auditAssetInput(f.root,{...text(),prompt_file:undefined}),/prompt/i);
 assert.throws(()=>auditAssetInput(f.root,{...text(),prompt_file:'public/prompts/other.json'}),/prompt/i);
});
test('malformed, mistyped, blank or mismatched prompts and unknown resources are refused',t=>{
 const f=fixture(t);for(const invalid of ['not json',[],{type:'image-to-3d',prompt:'a ball'},{type:'text-to-3d',prompt:'  '},{type:'text-to-3d',prompt:42},{type:'text-to-3d',asset:'other',prompt:'a ball'}]){f.write(invalid);assert.throws(()=>auditAssetInput(f.root,text()),/prompt/i);}
 assert.throws(()=>auditAssetInput(f.root,{...text(),resource:'unknown'}),/resource/i);
});
test('portable provenance preserves typed inputs and actual public task lineage without private paths',()=>{
 const p={generator:'Meshy',assets:[{...image(),task_id:'old-task',consumed_credits:15,model_file:'public/models/castle-small.glb',project_folder:'.pipeline/private'},{...text(),task_id:'refine-task',status:'SUCCEEDED',consumed_credits:20,model_file:'public/models/projectile-ironshot.glb',model:'meshy-7.1',requested_triangles:600,actual_triangles:622,texture_resolution:'2k',task_lineage:[{stage:'preview',task_id:'preview-task',resource:'text-to-3d',operation_id:'preview-op',status:'SUCCEEDED',consumed_credits:10,project_folder:'private'},{stage:'refine',task_id:'refine-task',parent_task_id:'preview-task',resource:'text-to-3d',operation_id:'refine-op',status:'SUCCEEDED',consumed_credits:10}],stage_costs:{preview:10,refine:10},preview_task_id:'preview-task',refine_task_id:'refine-task',project_folder:'.pipeline/private'}]};
 const before=structuredClone(p),packed=packagedAssetProvenance(p);assert.deepEqual(p,before);assert.equal(packed.assets[0].reference_file,'dist/references/castle-small.png');const a=packed.assets[1];assert.equal(a.reference_file,null);assert.equal(a.prompt_file,'dist/prompts/projectile-ironshot.json');assert.equal(a.model_file,'dist/models/projectile-ironshot.glb');assert.equal(a.preview_task_id,'preview-task');assert.equal(a.refine_task_id,'refine-task');assert.deepEqual(a.stage_costs,{preview:10,refine:10});assert.deepEqual(a.task_lineage,p.assets[1].task_lineage.map(({project_folder,...stage})=>stage));assert.equal(JSON.stringify(packed).includes('.pipeline'),false);assert.equal(JSON.stringify(packed).includes('project_folder'),false);
 assert.equal(a.status,'SUCCEEDED');assert.equal(a.model,'meshy-7.1');assert.equal(a.requested_triangles,600);assert.equal(a.actual_triangles,622);assert.equal(a.texture_resolution,'2k');assert.equal(generationCosts(p).generationCredits,35);assert.equal(generationCosts(p).assets[1].consumedCredits,20);assert.deepEqual(generationCosts(p).assets[1].stageCosts,{preview:10,refine:10});
});
test('generation cost evidence refuses negative, nonfinite and malformed stage values',()=>{
 for(const cost of [-1,Infinity,NaN,'20'])assert.throws(()=>generationCosts({assets:[{asset:'projectile-ironshot',consumed_credits:cost}]}),/credit value/i);
 assert.throws(()=>generationCosts({assets:[{asset:'projectile-ironshot',consumed_credits:20,stage_costs:{preview:-1}}]}),/stage cost/i);
 assert.throws(()=>packagedAssetProvenance({assets:[{...text(),consumed_credits:20,model_file:'public/models/projectile-ironshot.glb',task_lineage:[{stage:'refine',task_id:''}]}]}),/lineage/i);
});
