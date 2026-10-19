import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';
import * as pools from '../src/effect-pool.js';
import {World} from '../src/world.js';
import {CombatFeedback} from '../src/combat-feedback.js';
import {RUNTIME_LIMITS} from '../src/runtime-limits.js';

const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
function texture(value){const result=new THREE.DataTexture(new Uint8Array([value,91,163,255]),1,1);result.offset.set(.2,.1);result.repeat.set(.8,.6);result.rotation=.17;return result;}
function fixture(){
 const textures=Array.from({length:6},(_,i)=>texture(20+i*35));textures[0].colorSpace=textures[1].colorSpace=THREE.SRGBColorSpace;
 const a=new THREE.MeshStandardMaterial({color:0x647278,map:textures[0],normalMap:textures[2],roughnessMap:textures[4],metalnessMap:textures[4],roughness:.28,metalness:.83});
 const b=new THREE.MeshStandardMaterial({color:0x647278,map:textures[1],normalMap:textures[3],roughnessMap:textures[5],metalnessMap:textures[5],roughness:.74,metalness:.19});a.normalScale.set(.6,.7);b.normalScale.set(.8,.9);a.userData.sharedAsset=b.userData.sharedAsset=true;
 const geometries=[new THREE.BoxGeometry(2,.7,1),new THREE.IcosahedronGeometry(.65,0)];for(const geometry of geometries)geometry.userData.sharedAsset=true;geometries[0].groups.forEach((group,i)=>group.materialIndex=i%2);
 const source=new THREE.Group(),nested=new THREE.Group(),first=new THREE.Mesh(geometries[0],[a,b]),second=new THREE.Mesh(geometries[1],a);source.name='authored-shard';first.name='pbr-array';second.name='pbr-shared';source.position.set(7,-2,5);source.rotation.set(.2,.4,.1);source.scale.set(1.2,.8,.9);nested.position.set(1,.5,-.4);nested.rotation.y=.3;first.position.set(-.6,.3,.1);first.rotation.z=.25;second.position.set(.9,-.2,.3);source.add(nested);nested.add(first,second);source.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});source.updateMatrixWorld(true);
 return {source,first,second,geometries,materials:[a,b],textures};
}
function snapshot(f){
 const nodes=[];f.source.traverse(node=>nodes.push({name:node.name,position:node.position.toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray(),visible:node.visible,castShadow:node.castShadow,receiveShadow:node.receiveShadow}));
 return {nodes,geometries:f.geometries.map(geometry=>({userData:structuredClone(geometry.userData),groups:structuredClone(geometry.groups),boundingBox:geometry.boundingBox,attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([key,attribute])=>[key,crypto.createHash('sha256').update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength)).digest('hex')]))})),materials:f.materials.map(material=>({color:material.color.getHex(),roughness:material.roughness,metalness:material.metalness,normalScale:material.normalScale.toArray(),opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,userData:structuredClone(material.userData)})),textures:f.textures.map(value=>({data:[...value.image.data],offset:value.offset.toArray(),repeat:value.repeat.toArray(),rotation:value.rotation,colorSpace:value.colorSpace}))};
}
function poolFor(provider){assert.equal(typeof pools.createFragmentPool,'function','The imported shard pool must be available.');return pools.createFragmentPool(provider);}
function meshOf(root){assert.equal(root.userData.importedFragment?.assetId,'impact-shard','A fragment must retain its supplied PBR asset provenance.');return root.getObjectByName('pbr-array');}
function worldFor(pool){const world=Object.create(World.prototype);Object.assign(world,{fragmentPool:pool,particlePool:pools.createParticlePool(),effects:new THREE.Group(),actors:new THREE.Group(),camera:new THREE.PerspectiveCamera(),smoke:[],flashes:[],heightAt:()=>0});world.feedback=new CombatFeedback(world);return world;}

test('fragment provider is lazy, resolves only the registered impact-shard, and caches its template',()=>{
 const f=fixture(),calls=[],pool=poolFor(id=>{calls.push(id);return f.source;});assert.deepEqual(calls,[]);
 const first=pool.acquire('impact-shard');meshOf(first);assert.deepEqual(calls,['impact-shard']);pool.release(first);assert.equal(pool.acquire('impact-shard'),first);assert.deepEqual(calls,['impact-shard']);pool.release(first);assert.equal(pool.snapshot().templates,1);
});

test('fragment logical root stays at the hit point while nested PBR geometry is centered to .16m without source mutation',()=>{
 const f=fixture(),before=snapshot(f),pool=poolFor(()=>f.source),root=pool.acquire('impact-shard'),first=meshOf(root),second=root.getObjectByName('pbr-shared');
 assert.equal(first.parent,second.parent);assert.equal(first.geometry,f.first.geometry);assert.equal(second.geometry,f.second.geometry);assert.deepEqual(first.geometry.groups,f.first.geometry.groups);assert.equal(first.material.length,2);assert.equal(second.material,first.material[0]);
 for(let i=0;i<2;i++){const own=first.material[i],source=f.materials[i];assert.notEqual(own,source);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(own[key],source[key]);assert.equal(own.roughness,source.roughness);assert.equal(own.metalness,source.metalness);assert.equal(own.color.getHex(),source.color.getHex());assert.deepEqual(own.normalScale.toArray(),source.normalScale.toArray());}
 assert.deepEqual(root.position.toArray(),[0,0,0]);assert.deepEqual(root.quaternion.toArray(),[0,0,0,1]);assert.deepEqual(root.scale.toArray(),[1,1,1]);const box=new THREE.Box3().setFromObject(root,true);near(box.getCenter(new THREE.Vector3()).length(),0,'visual center');const size=box.getSize(new THREE.Vector3());near(Math.max(size.x,size.y,size.z),.16,'visual max extent');root.traverse(node=>{if(node.isMesh){assert.equal(node.castShadow,false);assert.equal(node.receiveShadow,false);}});pool.release(root);assert.deepEqual(snapshot(f),before);
});

test('24 active Meshy shards reject the25th without allocation or provider work, then reuse a released slot',()=>{
 const f=fixture();let calls=0;const pool=poolFor(()=>{calls++;return f.source;});assert.equal(RUNTIME_LIMITS.meshyShards,24);const objects=Array.from({length:24},()=>pool.acquire('impact-shard'));assert.ok(objects.every(Boolean));assert.equal(new Set(objects).size,24);const full=pool.snapshot();assert.equal(pool.acquire('impact-shard'),null);assert.deepEqual(pool.snapshot(),full);assert.equal(calls,1);assert.equal(full.allocated,24);assert.equal(full.peak,24);
 pool.release(objects[5]);assert.equal(pool.acquire('impact-shard'),objects[5]);assert.equal(pool.stats.allocated,24);for(const object of objects)pool.release(object);assert.equal(pool.stats.active,0);assert.equal(pool.freeCount,24);
});

test('World.fragment and World.remove use the same bounded lifecycle and cap failure adds no null scene child',()=>{
 const f=fixture(),pool=poolFor(()=>f.source),world=worldFor(pool),objects=Array.from({length:24},()=>world.fragment());assert.equal(world.effects.children.length,24);assert.equal(world.fragment(),null);assert.equal(world.effects.children.length,24);world.remove(objects[0]);assert.equal(pool.stats.active,23);assert.equal(objects[0].parent,null);assert.equal(world.fragment(),objects[0]);for(const object of objects)world.remove(object);assert.equal(world.effects.children.length,0);assert.equal(pool.stats.active,0);
});

test('actual CombatFeedback applies gravity, bounce, spin and PBR fade, releases expired shards, and resets100 reuses',()=>{
 const f=fixture(),before=snapshot(f),pool=poolFor(()=>f.source),world=worldFor(pool),root=world.fragment(),first=meshOf(root),other=world.fragment();assert.notEqual(first.material[0],meshOf(other).material[0]);assert.equal(first.geometry,meshOf(other).geometry);root.position.set(2,.07,-1);world.feedback.add(root,new THREE.Vector3(2,-1,1),.5,'chip',8);world.feedback.update(.1,world.camera);
 near(root.position.y,.06,'terrain bounce floor');assert.ok(world.feedback.particles[0].velocity.y>0);assert.ok(root.rotation.x>0&&root.rotation.z>0);near(first.material[0].opacity,.8,'PBR fade');assert.equal(meshOf(other).material[0].opacity,1);world.feedback.update(.5,world.camera);assert.equal(pool.stats.active,1);assert.equal(root.parent,null);world.remove(other);
 for(let i=0;i<100;i++){const reused=world.fragment();assert.ok(reused);assert.deepEqual(reused.position.toArray(),[0,0,0]);assert.deepEqual(reused.quaternion.toArray(),[0,0,0,1]);const material=meshOf(reused).material[0];assert.equal(material.opacity,1);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);world.feedback.add(reused,new THREE.Vector3(1,2,3),.1,'chip',8);world.feedback.update(.11,world.camera);}
 assert.equal(pool.stats.active,0);assert.equal(pool.stats.allocated,2);assert.equal(pool.stats.reused,100);assert.equal(world.feedback.particles.length,0);assert.deepEqual(snapshot(f),before);
});

test('clearActors releases both feedback-owned and unattached-feedback fragments while preserving shared source assets',()=>{
 const f=fixture(),before=snapshot(f),pool=poolFor(()=>f.source),world=worldFor(pool);let disposed=0;for(const resource of [...f.geometries,...f.materials,...f.textures])resource.addEventListener('dispose',()=>disposed++);
 world.feedback.add(world.fragment(),new THREE.Vector3(),10);world.fragment();world.actors.add(new THREE.Group());world.clearActors();assert.equal(pool.stats.active,0);assert.equal(pool.freeCount,2);assert.equal(world.feedback.particles.length,0);assert.equal(world.effects.children.length,0);assert.equal(world.actors.children.length,0);assert.equal(disposed,0);assert.deepEqual(snapshot(f),before);
});

test('cap failure leaves the existing chip fallback usable and global feedback cap returns an acquired Meshy shard',()=>{
 const f=fixture(),pool=poolFor(()=>f.source),world=worldFor(pool),active=Array.from({length:24},()=>world.fragment());assert.equal(world.fragment(),null);const fallback=world.particle('chip',0x987654);world.feedback.add(fallback,new THREE.Vector3(),.1);assert.equal(fallback.userData.importedFragment,undefined);assert.equal(fallback.material.color.getHex(),0x987654);world.feedback.update(.11,world.camera);assert.equal(world.particlePool.stats.active,0);
 for(const object of active)world.remove(object);for(let i=0;i<RUNTIME_LIMITS.particles;i++)world.feedback.add(world.particle('chip'),new THREE.Vector3(),10);const rejected=world.fragment();assert.equal(pool.stats.active,1);world.feedback.add(rejected,new THREE.Vector3(),10);assert.equal(world.feedback.particles.length,RUNTIME_LIMITS.particles);assert.equal(pool.stats.active,0);assert.equal(rejected.parent,null);world.clearActors();assert.equal(world.particlePool.stats.active,0);
});

test('discarded shard instances dispose only their own materials, not shared source PBR textures or geometry',()=>{
 const f=fixture(),before=snapshot(f),pool=poolFor(()=>f.source),root=pool.acquire('impact-shard');meshOf(root);let sourceDisposals=0,instanceDisposals=0;for(const resource of [...f.geometries,...f.materials,...f.textures])resource.addEventListener('dispose',()=>sourceDisposals++);for(const {material}of root.poolMaterials)material.addEventListener('dispose',()=>instanceDisposals++);pool.maxFree=0;pool.release(root);assert.equal(pool.stats.discarded,1);assert.equal(instanceDisposals,2);assert.equal(sourceDisposals,0);pool.release(root);assert.equal(instanceDisposals,2);assert.deepEqual(snapshot(f),before);
});

test('missing or malformed shard source fails fast and cannot silently become a procedural fragment',()=>{
 assert.throws(()=>poolFor(()=>null).acquire('impact-shard'),/shard|asset|model/i);assert.throws(()=>poolFor(()=>new THREE.Group()).acquire('impact-shard'),/bounds|geometry|mesh/i);const f=fixture();f.first.geometry.getAttribute('position').setX(0,NaN);assert.throws(()=>poolFor(()=>f.source).acquire('impact-shard'),/finite|bounds/i);assert.throws(()=>poolFor(()=>fixture().source).acquire('unregistered-fragment'),/shard|key|fragment/i);
});

test('optional active limits preserve the original unlimited generic pool and reject a zero-cap request before factory allocation',()=>{
 let calls=0;const factory=()=>{calls++;return new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());},unlimited=new pools.ObjectPool(factory,{maxFree:0}),objects=Array.from({length:32},()=>unlimited.acquire('cube'));assert.ok(objects.every(Boolean));assert.equal(unlimited.stats.active,32);for(const object of objects)unlimited.release(object);const zero=new pools.ObjectPool(factory,{maxActive:0}),before=calls;assert.equal(zero.acquire('cube'),null);assert.equal(calls,before);assert.deepEqual(zero.snapshot(),{allocated:0,reused:0,active:0,peak:0,discarded:0,free:0,templates:0});
});
