import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
// Portable: actual checkout fixtures, no WORK imports or environment routes.
const root=new URL('../',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=name=>fs.readFileSync(new URL(name,root)),heading='\n\n## Current medium-castle wheel runtime modification\n',tail='</pre></body></html>',SECTION_SHA='6126ef6a10f49f42bf8ae1924715bde25e05785fb92c375646d68b26fd83712a',SECTION_BYTES=1368;
const decode=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
function section(){const text=read('LICENSES.md').toString('utf8'),at=text.indexOf(heading);assert.ok(at>=0,'Current wheel appendix must exist');assert.equal(text.split(heading).length-1,1);const s=text.slice(at);assert.equal(Buffer.byteLength(s),SECTION_BYTES);assert.equal(sha(s),SECTION_SHA);return s;}
const blocker='commercial clearance of those images and derivative 3D assets remains a release blocker';

test('current English wheel appendix is one complete frozen section in both source notices',()=>{
 const s=section(),html=read('public/licenses.html').toString(),escaped=s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');assert.equal((html.match(/<pre\b/g)||[]).length,1);assert.equal((html.match(/<\/pre>/g)||[]).length,1);assert.equal(html.split(escaped+tail).length-1,1);assert.ok(decode(html).includes(s));assert.equal(/[가-힣]/.test(s),false);assert.equal((html.match(/href="asset-credits\.json"/g)||[]).length,1);
});

test('removing exactly the new appendix restores full prior Markdown and HTML SHA',()=>{
 const s=section(),md=read('LICENSES.md'),html=read('public/licenses.html').toString(),escaped=s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');assert.equal(sha(md.subarray(0,136174)),'48b951f03b17d570f2e191b174dd7e9d94ac2deefc05b0b096bb9633645e3e1f');assert.equal(sha(Buffer.from(html.replace(escaped+tail,tail))),'4b34cc16f15f8147119094df6edce40286d4ba8e9c221d4e08410cd3875976cd');
});

test('historical105/804, existing MIT full texts, Apache full appendix and rights blocker remain exact',()=>{
 const md=read('LICENSES.md').toString(),h='\n\n## Android release binary dependency inventory (observed snapshot)\n',at=md.indexOf(h),end=md.indexOf(heading);const appendix=md.slice(at,end<0?undefined:end);assert.equal(sha(appendix),'68ff9509bdd940b266f80ca65cc3f2ff955ebc0371b915f43e1d8d2f200112d6');assert.ok(md.includes('The 105 original rear-wheel faces remain on the body; the 804 added donor faces are counted separately.'));assert.ok(md.includes(blocker));for(const name of ['capacitor-core','capacitor-app','noble-hashes'])assert.ok(md.includes(read('mobile/licenses/'+name+'-LICENSE.txt').toString()));
});

test('actual14 assets retain12image and2text provenance and task identities without a new rights claim',()=>{
 const s=section(),provenance=JSON.parse(read('asset-provenance.json')),credits=JSON.parse(read('public/asset-credits.json'));assert.equal(provenance.assets.length,14);assert.equal(credits.assets.length,14);assert.equal(provenance.assets.filter(a=>a.resource==='image-to-3d').length,12);const text=provenance.assets.filter(a=>a.resource==='text-to-3d');assert.equal(text.length,2);assert.deepEqual(text.map(a=>a.asset).sort(),['impact-shard','projectile-ironshot']);for(const a of provenance.assets)assert.equal(credits.assets.find(c=>c.id===a.asset)?.taskId,a.task_id);assert.ok(s.includes('twelve image-derived assets and two separately identified text-derived assets'));assert.ok(s.includes('not a rights clearance'));
});

test('actual incumbent strict appendix gate rejects truncation, duplicate or altered new text',()=>{
 const source=read('tests/native-license-notices.test.js').toString(),start=source.indexOf('const beforeMediumWheelRuntime='),end=source.indexOf('// A later audited appendix',start);assert.ok(start>=0&&end>start,'Actual incumbent has narrow current-wheel gate');const fn=vm.runInNewContext(source.slice(start,end)+';beforeMediumWheelRuntime',{assert,sha,decode,Buffer});const s=section(),html=read('public/licenses.html').toString();assert.equal(sha(fn(html)),'4b34cc16f15f8147119094df6edce40286d4ba8e9c221d4e08410cd3875976cd');for(const bad of [html.replace('current medium-castle implementation','current wrong implementation'),html.replace(tail,s+tail),html.slice(0,-1)])assert.throws(()=>fn(bad));
});

test('new facts match source-ownedB912, three derived mounts, hidden original regions and torus-only medium tread',()=>{
 const s=section(),wheels=read('src/wheels.js'),cal=JSON.parse(read('src/medium-wheel-calibration.json'));assert.equal(sha(wheels),'869778a48249a24c55c968fa0471f0f25ccd352b95a2e6b4c872e45a3b3cd17b');assert.equal(sha(read('src/medium-wheel-calibration.json')),'3419cc85f315e767485d212dbcac68e5493f73439c78b33cffe5efeaf66b94d5');const counts=cal.parts.map(p=>p.sourceIds.length);assert.deepEqual(counts,[919,912,858,991]);assert.equal(15185-counts.reduce((a,b)=>a+b),11505);assert.equal(counts.filter((_,i)=>i!==1).reduce((a,b)=>a+b),2768);assert.equal(counts[1]*3,2736);for(const value of ['archive.visible=false','derivedWheel:true','const rotor=new THREE.Mesh(donorGeometry,source.material)','donorNormal.setXYZ','TorusGeometry(radius*.985,radius*.025,4,26)','if(id===\'castle-medium\')return articulateMediumParallel(model)'])assert.ok(wheels.toString().includes(value));assert.equal(4*26*2,208);for(const value of ['15,185','11,505','912-triangle B','919/858/991','three explicitly derived','positions and normals are reoriented','original UVs, PBR material and textures','thin procedural torus','Original source GLB files'])assert.ok(s.includes(value),value);
});
