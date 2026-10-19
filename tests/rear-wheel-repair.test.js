import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {parseGlb} from '../scripts/glb-runtime.mjs';
import {articulateWheels,updateWheels} from '../src/wheels.js';

// Independent immutable-source repair baseline, 2026-10-17T15:48:00.784Z,
// SHA c43838c998c43c0a06ca7d9e3e9def940ae4cdf114b28bf4d9698c404f51c627.
// Embed the reviewed IDs/hashes so regression tests do not depend on work/.
const ORIGINAL_REAR2=[832,833,836,837,983,984,985,986,987,1066,1415,1416,1417,1418,1985,2058,2441,2442,2443,2588,2589,3104,3528,3529,3619,3620,3622,4096,4097,4098,4099,4100,5523,5525,5859,6229,6409,6410,6800,6801,6802,7115,7116,7505,7507,7554,7555,7556,7557,7710,7711,7809,7810,7811,8414,8763,8764,8765,9009,9048,9535,9536,9572,9573,9574,9575,9576,9892,9893,10165,10166,10809,10810,10813,11173,11174,11341,11342,11557,11558,11834,12098,12216,12217,12537,12629,12774,12853,12854,12963,12996,13018,13080,13297,13505,13506,13526,13531,13532,14755,14756,14801,14802,15106,15108];
const STATIC_BRIDGES={
 'castle-small':[934,935,6968,8016,8018,9373],
 'castle-medium':[831,834,897,1068,1156,4585,5000,5718,6226,6227,6502,7852,7884,12484,12485,12639,12681,12683],
 'castle-large':[2633,4373,10005,11509,12071,12190,12191,12701,12988,13068,14301],
 'enemy-tower':[973,977,2241,4504,4507,6106,6107,6108,9783,9867,11391,11671,13005,13377,14133,14449,14711,14754],
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),cache=new Map(),near=(a,b,label)=>assert.ok(Math.abs(a-b)<2e-7,`${label}: ${a} != ${b}`);
function geometry(bytes){
 const {json:j,bin}=parseGlb(bytes),primitive=j.meshes[0].primitives[0],g=new THREE.BufferGeometry();
 for(const [key,name,size]of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]){
  const a=j.accessors[primitive.attributes[key]],view=j.bufferViews[a.bufferView],start=(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??size*4,data=new Float32Array(a.count*size);assert.equal(a.componentType,5126);
  for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)data[i*size+k]=bin.readFloatLE(start+i*stride+k*4);g.setAttribute(name,new THREE.BufferAttribute(data,size));
 }
 const a=j.accessors[primitive.indices],view=j.bufferViews[a.bufferView],start=(view.byteOffset??0)+(a.byteOffset??0),width=a.componentType===5125?4:2;assert.ok([5123,5125].includes(a.componentType));
 g.setIndex(Array.from({length:a.count},(_,i)=>width===4?bin.readUInt32LE(start+i*width):bin.readUInt16LE(start+i*width)));return g;
}
function triangleBytes(g,n){const bytes=Buffer.alloc(96);let offset=0;for(let c=0;c<3;c++){const index=g.index.getX(n*3+c);for(const name of ['position','normal','uv']){const a=g.getAttribute(name);for(let k=0;k<a.itemSize;k++){bytes.writeFloatLE(a.array[index*a.itemSize+k],offset);offset+=4;}}}return bytes;}
function indexedSha(g){const h=crypto.createHash('sha256');for(let n=0;n<g.index.count/3;n++)h.update(triangleBytes(g,n));return h.digest('hex');}
function inspect(id='castle-medium'){
 if(cache.has(id))return cache.get(id);
 const file=new URL('../public/models/'+id+'.glb',import.meta.url),bytes=fs.readFileSync(file),original=geometry(bytes),model=new THREE.Group(),material=new THREE.MeshStandardMaterial(),body=new THREE.Mesh(original,material),sourceHashes=new Map();model.add(body);
 for(let n=0;n<original.index.count/3;n++){const key=sha(triangleBytes(original,n)),ids=sourceHashes.get(key)??[];ids.push(n);sourceHashes.set(key,ids);}
 articulateWheels(id,model);const bodyIds=[],claimed=new Set();
 for(let n=0;n<body.geometry.index.count/3;n++){const key=sha(triangleBytes(body.geometry,n)),source=(sourceHashes.get(key)??[]).find(i=>!claimed.has(i));assert.notEqual(source,undefined,'Body triangle attributes must be unchanged original bytes.');bodyIds.push(source);claimed.add(source);}
 const wheels=[];model.traverse(o=>{if(o.userData.wheel)wheels.push({pivot:o,rotor:o.getObjectByName('wheel-roll')});});
 const f={file,fileSha:sha(bytes),original,model,material,body,bodyIds,bodySet:new Set(bodyIds),wheels};cache.set(id,f);return f;
}
test('all105 formerly misclassified rear faces retain original nonrotating body attributes',()=>{
 const f=inspect();assert.equal(ORIGINAL_REAR2.length,105);for(const id of ORIGINAL_REAR2)assert.ok(f.bodySet.has(id),`Original rear2 source triangle${id} must return to the body`);
 assert.equal(f.bodyIds.length,11505);const rotatingUVs=new Set();for(const w of f.wheels){const g=w.rotor.geometry,a=g.getAttribute('uv');for(let t=0;t<g.index.count/3;t++)rotatingUVs.add([0,1,2].map(c=>{const v=g.index.getX(t*3+c);return a.getX(v)+','+a.getY(v);}).join(';'));}for(const id of ORIGINAL_REAR2){const g=f.original,a=g.getAttribute('uv'),key=[0,1,2].map(c=>{const v=g.index.getX(id*3+c);return a.getX(v)+','+a.getY(v);}).join(';');assert.equal(rotatingUVs.has(key),false,'Former rear misclassification cannot rotate with B or its three derivatives.');}
 for(let i=1;i<f.bodyIds.length;i++)assert.ok(f.bodyIds[i]>f.bodyIds[i-1],'Body source triangle order must be preserved.');
});

test('all53 previously rejected bridge faces remain static across the four original Meshy assets',()=>{
 assert.equal(Object.values(STATIC_BRIDGES).flat().length,53);
 for(const [id,ids]of Object.entries(STATIC_BRIDGES)){const f=inspect(id);for(const n of ids)assert.ok(f.bodySet.has(n),`${id} bridge${n} must remain static`);assert.equal(sha(fs.readFileSync(f.file)),f.fileSha);}
});

