import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {createProjectilePool} from '../src/effect-pool.js';
import {animateProjectile} from '../src/projectiles.js';
import {WEAPONS} from '../src/data.js';

const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
function texture(value){const t=new THREE.DataTexture(new Uint8Array([value,80,120,255]),1,1);t.offset.set(.1,.2);t.repeat.set(.7,.8);t.rotation=.12;return t;}
function fixture(){
 const baseA=texture(20),baseB=texture(200),normalA=texture(100),normalB=texture(130),ormA=texture(60),ormB=texture(190);
 baseA.colorSpace=baseB.colorSpace=THREE.SRGBColorSpace;
 const a=new THREE.MeshStandardMaterial({color:0x647278,map:baseA,normalMap:normalA,roughnessMap:ormA,metalnessMap:ormA,roughness:.23,metalness:.87});
 const b=new THREE.MeshStandardMaterial({color:0x647278,map:baseB,normalMap:normalB,roughnessMap:ormB,metalnessMap:ormB,roughness:.71,metalness:.16});a.normalScale.set(.6,.7);b.normalScale.set(.8,.9);
 a.userData.sharedAsset=b.userData.sharedAsset=true;
 const firstGeometry=new THREE.BoxGeometry(2,.8,1),secondGeometry=new THREE.IcosahedronGeometry(.7,0);for(const g of [firstGeometry,secondGeometry])g.userData.sharedAsset=true;
 firstGeometry.groups.forEach((group,i)=>group.materialIndex=i%2);
 const source=new THREE.Group(),nested=new THREE.Group(),first=new THREE.Mesh(firstGeometry,[a,b]),second=new THREE.Mesh(secondGeometry,a);
 first.name='pbr-array';second.name='pbr-shared';source.name='authored-ironshot';source.position.set(7,-2,5);source.rotation.set(.2,.4,.1);source.scale.set(1.2,.8,.9);nested.position.set(1,.5,-.4);nested.rotation.y=.3;first.position.set(-.6,.3,.1);first.rotation.z=.25;second.position.set(.9,-.2,.3);source.add(nested);nested.add(first,second);source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});source.updateMatrixWorld(true);
 return {source,first,second,materials:[a,b],geometries:[firstGeometry,secondGeometry],textures:[baseA,baseB,normalA,normalB,ormA,ormB]};
}
function snapshot(f){
 const nodes=[];f.source.traverse(o=>nodes.push({name:o.name,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow}));
 return {nodes,geometries:f.geometries.map(g=>({userData:structuredClone(g.userData),groups:structuredClone(g.groups),attributes:Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,crypto.createHash('sha256').update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex')]))})),materials:f.materials.map(m=>({color:m.color.getHex(),roughness:m.roughness,metalness:m.metalness,normalScale:m.normalScale.toArray(),opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,userData:structuredClone(m.userData)})),textures:f.textures.map(t=>({data:[...t.image.data],offset:t.offset.toArray(),repeat:t.repeat.toArray(),rotation:t.rotation,colorSpace:t.colorSpace}))};
}
function imported(root){assert.equal(root.userData.importedProjectile?.assetId,'projectile-ironshot','Actual cannon must use the supplied PBR model.');return root.getObjectByName('pbr-array');}
function shape(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;}});const box=new THREE.Box3().setFromObject(root);return {meshes,triangles,min:box.min.toArray(),max:box.max.toArray()};}

test('optional provider is lazy and only resolves the cannon template once per key',()=>{
 const f=fixture(),calls=[],pool=createProjectilePool(id=>{calls.push(id);return f.source;});assert.deepEqual(calls,[]);
 const rocket=pool.acquire('rocket:123:0.13');assert.deepEqual(calls,[]);pool.release(rocket);
 const a=pool.acquire('cannon:123:0.13');imported(a);assert.deepEqual(calls,['projectile-ironshot']);pool.release(a);pool.release(pool.acquire('cannon:123:0.13'));assert.deepEqual(calls,['projectile-ironshot']);
});

test('actual imported hierarchy preserves PBR groups/maps while only the visual bounds are centered and sized',()=>{
 const f=fixture(),before=snapshot(f),pool=createProjectilePool(()=>f.source);
 for(const r of [.065,.13,.26]){
  const root=pool.acquire('cannon:123:'+r),first=imported(root),second=root.getObjectByName('pbr-shared');assert.ok(first&&second);assert.equal(first.parent,second.parent);assert.equal(first.geometry,f.first.geometry);assert.equal(second.geometry,f.second.geometry);assert.deepEqual(first.geometry.groups,f.first.geometry.groups);assert.equal(first.material.length,2);
  for(let i=0;i<2;i++){const m=first.material[i],source=f.materials[i];assert.notEqual(m,source);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(m[key],source[key]);assert.equal(m.roughness,source.roughness);assert.equal(m.metalness,source.metalness);assert.deepEqual(m.normalScale.toArray(),source.normalScale.toArray());}
  assert.equal(second.material,first.material[0],'Material sharing inside one GLB instance is preserved.');assert.notEqual(first.material[0].map,first.material[1].map);
  assert.deepEqual(root.position.toArray(),[0,0,0]);assert.deepEqual(root.quaternion.toArray(),[0,0,0,1]);assert.deepEqual(root.scale.toArray(),[1,1,1]);
  // Precise mode measures transformed vertices, not rotated local AABB corners.
  const box=new THREE.Box3().setFromObject(root,true),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());near(center.length(),0,'visual center');near(Math.max(size.x,size.y,size.z),.30*r/.13,'visual max extent');root.traverse(o=>{if(o.isMesh){assert.equal(o.castShadow,false);assert.equal(o.receiveShadow,false);}});pool.release(root);
 }
 assert.deepEqual(snapshot(f),before,'Source transforms/materials/UV buffers/PBR textures remain immutable.');
});

test('two imported instances have independent materials and actual pool reset survives100 reuses',()=>{
 const f=fixture(),before=snapshot(f),pool=createProjectilePool(()=>f.source),a=pool.acquire('cannon:456:0.13'),b=pool.acquire('cannon:456:0.13'),first=imported(a),other=imported(b);
 assert.equal(first.geometry,other.geometry);assert.equal(first.material[0].map,other.material[0].map);assert.notEqual(first.material[0],other.material[0]);
 const baseline={opacity:first.material[0].opacity,transparent:first.material[0].transparent,depthWrite:first.material[0].depthWrite,depthTest:first.material[0].depthTest,blending:first.material[0].blending};
 Object.assign(first.material[0],{opacity:.2,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});a.position.set(4,5,6);first.position.x+=2;animateProjectile(a,.4,new THREE.Vector3(1,2,3));assert.equal(other.material[0].opacity,1);
 pool.release(a);const reused=pool.acquire('cannon:456:0.13');assert.equal(reused,a);assert.equal(reused.userData.projectile.age,0);assert.deepEqual(reused.position.toArray(),[0,0,0]);assert.deepEqual(reused.quaternion.toArray(),[0,0,0,1]);for(const [key,value]of Object.entries(baseline))assert.equal(first.material[0][key],value);assert.deepEqual(first.position.toArray(),f.first.position.toArray());
 pool.release(reused);pool.release(b);for(let i=0;i<100;i++)pool.release(pool.acquire('cannon:456:0.13'));assert.equal(pool.stats.active,0);assert.equal(pool.stats.allocated,2);assert.equal(pool.stats.reused,101);assert.deepEqual(snapshot(f),before);
});

test('discarding excess imported instances disposes only their own materials, never source geometry/textures',()=>{
 const f=fixture(),pool=createProjectilePool(()=>f.source),objects=Array.from({length:22},()=>pool.acquire('cannon:789:0.13'));imported(objects[0]);let sourceDisposals=0,instanceDisposals=0;
 for(const value of [...f.geometries,...f.textures,...f.materials])value.addEventListener('dispose',()=>sourceDisposals++);
 for(const object of objects)for(const {material}of object.poolMaterials)material.addEventListener('dispose',()=>instanceDisposals++);
 for(const object of objects)pool.release(object);assert.equal(pool.stats.active,0);assert.equal(pool.freeCount,20);assert.equal(pool.stats.discarded,2);assert.equal(instanceDisposals,4);assert.equal(sourceDisposals,0);pool.release(objects.at(-1));assert.equal(pool.stats.active,0);assert.equal(instanceDisposals,4);
});

test('a supplied but missing or invalid ironshot fails fast without a procedural success fallback',()=>{
 assert.throws(()=>createProjectilePool(()=>null).acquire('cannon:123:0.13'),/ironshot|asset|model/i);
 assert.throws(()=>createProjectilePool(()=>new THREE.Group()).acquire('cannon:123:0.13'),/bounds|geometry|mesh/i);
 assert.throws(()=>createProjectilePool(()=>fixture().source).acquire('cannon:123:NaN'),/radius|size|finite/i);
});

test('actual imported projectile animation preserves logical position and resets its age/heading on reuse',()=>{
 const f=fixture(),before=snapshot(f),pool=createProjectilePool(()=>f.source),root=pool.acquire('cannon:123:0.13');imported(root);assert.deepEqual(root.userData.projectile,{key:'cannon',shape:WEAPONS.cannon.shape,age:0});
 root.position.set(8,3,-4);const velocity=new THREE.Vector3(2,1,-3),forward=velocity.clone().normalize();animateProjectile(root,.25,velocity);assert.deepEqual(root.position.toArray(),[8,3,-4]);near(root.userData.projectile.age,.25,'age');near(new THREE.Vector3(0,1,0).applyQuaternion(root.quaternion).distanceTo(forward),0,'velocity alignment');pool.release(root);
 const reused=pool.acquire('cannon:123:0.13');assert.equal(reused.userData.projectile.age,0);assert.deepEqual(reused.position.toArray(),[0,0,0]);assert.deepEqual(reused.quaternion.toArray(),[0,0,0,1]);pool.release(reused);assert.deepEqual(snapshot(f),before);
});

test('provider-free30projectiles and optional-provider noncannon paths retain their procedural geometry',()=>{
 const plain=createProjectilePool(),optional=createProjectilePool(()=>{throw Error('Only cannon may request an imported asset.');});
 for(const key of Object.keys(WEAPONS)){const original=plain.acquire(key+':123:0.13');assert.ok(shape(original).meshes>0);if(key!=='cannon'){const other=optional.acquire(key+':123:0.13');assert.deepEqual(shape(other),shape(original),key);assert.equal(other.userData.importedProjectile,undefined);optional.release(other);}plain.release(original);}
 assert.equal(plain.stats.active,0);assert.equal(optional.stats.active,0);
});
