import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl,assetMarkup} from '../src/assets.js';

const SHA='a'.repeat(64),versions={'models/castle-small.glb':SHA,'references/castle-small.png':SHA,'weapon-icons/icebolt.png':SHA,'favicon.svg':SHA};
test('asset URL versions preserve root and nested deployment bases',()=>{
 assert.equal(assetUrl('/models/castle-small.glb','./','https://example.test/',versions),'https://example.test/models/castle-small.glb?v='+SHA);
 assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/hearth/',versions),'https://example.test/hearth/models/castle-small.glb?v='+SHA);
 assert.equal(assetUrl('./models/castle-small.glb','/hearth/','https://example.test/another/page',versions),'https://example.test/hearth/models/castle-small.glb?v='+SHA);
});
test('versioning replaces only its own query parameter while retaining other parameters and fragments',()=>{
 const url=new URL(assetUrl('/models/castle-small.glb?quality=high&v=old&choice=one&choice=two#mesh','./','https://example.test/hearth/',versions));
 assert.equal(url.pathname,'/hearth/models/castle-small.glb');assert.equal(url.searchParams.get('quality'),'high');assert.deepEqual(url.searchParams.getAll('choice'),['one','two']);assert.deepEqual(url.searchParams.getAll('v'),[SHA]);assert.equal(url.hash,'#mesh');
 const named={'references/a b.png':SHA};assert.equal(new URL(assetUrl('references/a%20b.png?x=1#part','./','https://example.test/',named)).searchParams.get('v'),SHA);
});
test('only own properties containing complete SHA256 values can set a version',()=>{
 const inherited=Object.create(versions);assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/',inherited),'https://example.test/models/castle-small.glb');
 for(const value of [null,{},123,'abc','g'.repeat(64),'a'.repeat(63),'a'.repeat(65)])assert.equal(assetUrl('models/castle-small.glb?x=1#part','./','https://example.test/',{'models/castle-small.glb':value}),'https://example.test/models/castle-small.glb?x=1#part');
 assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/',{'models/castle-small.glb':SHA.toUpperCase()}),'https://example.test/models/castle-small.glb?v='+SHA);
 assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/',null),'https://example.test/models/castle-small.glb');
});
test('DEV and direct Node imports retain existing unversioned paths without a build macro',()=>{
 assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/hearth/'),'https://example.test/hearth/models/castle-small.glb');
 assert.equal(assetUrl('licenses.html','./','https://example.test/hearth/',versions),'https://example.test/hearth/licenses.html');
});
test('asset markup versions both quote styles without changing unrelated links or relative bases',()=>{
 const markup='<img src="/references/castle-small.png?mode=warm#preview"><img src=\'/weapon-icons/icebolt.png\'><a href="/models/castle-small.glb">model</a><a href="https://outside.test/">outside</a>';
 const html=assetMarkup(markup,'./','https://example.test/hearth/',versions);assert.ok(html.includes('src="https://example.test/hearth/references/castle-small.png?mode=warm&v='+SHA+'#preview"'));assert.ok(html.includes("src='https://example.test/hearth/weapon-icons/icebolt.png?v="+SHA+"'"));assert.ok(html.includes('href="https://example.test/hearth/models/castle-small.glb?v='+SHA+'"'));assert.ok(html.includes('href="https://outside.test/"'));
});

test('license metadata has a separate final-HTML SHA query while the existing binary map API stays unchanged',()=>{
 const licenseSHA='b'.repeat(64);
 assert.equal(assetUrl('licenses.html','./','https://example.test/',versions,licenseSHA),'https://example.test/licenses.html?v='+licenseSHA);
 const nested=new URL(assetUrl('./licenses.html?language=en&v=old#credits','./','https://example.test/hearth/',versions,licenseSHA.toUpperCase()));assert.equal(nested.pathname,'/hearth/licenses.html');assert.equal(nested.searchParams.get('language'),'en');assert.deepEqual(nested.searchParams.getAll('v'),[licenseSHA]);assert.equal(nested.hash,'#credits');
 assert.equal(assetUrl('models/castle-small.glb','./','https://example.test/hearth/',versions,licenseSHA),'https://example.test/hearth/models/castle-small.glb?v='+SHA);
 assert.equal(assetUrl('asset-credits.json','./','https://example.test/hearth/',versions,licenseSHA),'https://example.test/hearth/asset-credits.json');assert.equal(Object.hasOwn(versions,'licenses.html'),false);
 for(const invalid of ['',null,{},123,'bad','g'.repeat(64)])assert.equal(assetUrl('licenses.html','./','https://example.test/hearth/',versions,invalid),'https://example.test/hearth/licenses.html');
});
