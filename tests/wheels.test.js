import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import * as THREE from 'three';import {articulateWheels,updateWheels,wheelTravel} from '../src/wheels.js';import {articulateCannon} from '../src/artillery.js';
function loadGeometry(id){const b=fs.readFileSync(new URL('../public/models/'+id+'.glb',import.meta.url));const length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length).toString()),base=28+length,p=j.meshes[0].primitives[0];const g=new THREE.BufferGeometry();for(const [key,name,size]of[['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]){if(p.attributes[key]===undefined)continue;const a=j.accessors[p.attributes[key]],view=j.bufferViews[a.bufferView],o=base+(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??size*4,values=new Float32Array(a.count*size);for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)values[i*size+k]=b.readFloatLE(o+i*stride+k*4);g.setAttribute(name,new THREE.BufferAttribute(values,size));}const a=j.accessors[p.indices],view=j.bufferViews[a.bufferView],o=base+(view.byteOffset??0)+(a.byteOffset??0),indices=[];for(let i=0;i<a.count;i++)indices.push(a.componentType===5125?b.readUInt32LE(o+i*4):b.readUInt16LE(o+i*2));g.setIndex(indices);return g;}

// Independently derived from the reviewed bounded source triangle partition.
// Rejected chassis bridges stay on the body; original attribute guards remain.
// The medium rear2 repair has an additional strict donor hash; its duplicated
// triangles are explicitly excluded only from the original-once UV/count audit.
// Hash indexed triangle streams, not backing arrays: vertex renumbering is safe,
// but triangle selection/order, UVs, normals and translated positions must match.
const TRIANGLE_BASELINE={
 "castle-large": {
  "body": "79d5c8b8a283e069c783e25849f4b4e85927fda96378cca7ea1bb915a169efaf",
  "wheel-steer-0": "485137970ff43beba3c02f8ba24d3f06c318f604a4defb4cf96f7f6e6c093033",
  "wheel-steer-1": "76325de1672b71eed6849928a9d310aed077e8f44dbfd7676b234d6d53631a7c",
  "wheel-steer-2": "2432944de1d570b6e3843911c7334b8467de5642420c94b6cac9e0f068d75025",
  "wheel-steer-3": "9d18bea6c60713e4d531a33b0c169d751b29fa6b005eacbe2dcc12d2bd920ca4",
  "wheel-steer-4": "ac776a6ef2f46d2793e51e3d5446bf2915f0d0346cfa7d5eb076446d76f2f5a4",
  "wheel-steer-5": "c5827275198bfa803a66034cfc0e4d8153310a8da43a763d8bcbdd7c023c2af7"
 },
 "castle-small": {
  "body": "0f974331a35e3fa63a15a75ac7fb529417927ad9fd7bd87004b44d2eea5c3e12",
  "wheel-steer-0": "c5511a3a651957fde48a6078b186cad17799ca930d28e5992372b1c96bb8ec59",
  "wheel-steer-1": "3d7db4bd97d620ef053640a3f0f95071807e0e7f97f4cbbeda69eb63c6db8618",
  "wheel-steer-2": "e04338f1d3d94422c27b7c15b9a8bf637ce16e041cbea44a289fdae7e6566dca",
  "wheel-steer-3": "8efad02f208fb0b0e07cd177d985981efa4bb9a9a619883e26bef94d6b2115a4"
 },
 "enemy-tower": {
  "body": "f575aa583bee894b8f937d91613055918276ad955511ad412070333b6bfba32c",
  "wheel-steer-0": "f2af57a707032216b1a3aa26b34b752cc71f4d5eba16ad39d424d78cff602bfb",
  "wheel-steer-1": "f8698452999036969e9e596b08638573d48dfad157767ced83e53c51e0acb969",
  "wheel-steer-2": "1d2808ff2ba47613b666be2e8f2911aff68eb3730d5e6c5ceb6be9ca3791d2fa",
  "wheel-steer-3": "58d562df6b632b15b7db0d2db420f69c005e0b79617f5bef8e75fc02855257b8"
 }
};
function triangleHash(geometry){const stream=Buffer.alloc(geometry.index.count*32);let offset=0;for(let i=0;i<geometry.index.count;i++){const index=geometry.index.getX(i);for(const name of ['position','normal','uv']){const attribute=geometry.getAttribute(name);for(let k=0;k<attribute.itemSize;k++){stream.writeFloatLE(attribute.array[index*attribute.itemSize+k],offset);offset+=4;}}}return crypto.createHash('sha256').update(stream).digest('hex');}
function addUVTriangles(geometry,counts=new Map()){const uv=geometry.getAttribute('uv');for(let i=0;i<geometry.index.count;i+=3){const key=[0,1,2].map(k=>{const vertex=geometry.index.getX(i+k);return uv.getX(vertex)+','+uv.getY(vertex);}).join(';');counts.set(key,(counts.get(key)??0)+1);}return counts;}
function sourceParts(model){const parts=[];model.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.rollingDetail)parts.push(mesh);});return parts;}
for(const [id,count]of [['castle-small',4],['castle-large',6],['enemy-tower',4]])test(id+' wheels compact vertices while preserving every calibrated triangle attribute',()=>{
 const geometry=loadGeometry(id),total=geometry.index.count,originalUVs=addUVTriangles(geometry),model=new THREE.Group(),material=new THREE.MeshStandardMaterial();model.add(new THREE.Mesh(geometry,material));articulateWheels(id,model);
 const hashes={},actualUVs=new Map();let wheels=0,treads=0,derived=0;
 for(const mesh of sourceParts(model)){const part=mesh.name==='wheel-roll'?mesh.parent.name:'body',g=mesh.geometry;hashes[part]=triangleHash(g);if(mesh.userData.derivedWheel){derived++;assert.equal(id,'castle-medium');assert.equal(part,'wheel-steer-2');assert.equal(mesh.userData.derivedSourceWheel,1);assert.equal(mesh.geometry,model.getObjectByName('wheel-steer-1').getObjectByName('wheel-roll').geometry);assert.deepEqual(mesh.scale.toArray(),[1,1,-1]);}else addUVTriangles(g,actualUVs);assert.equal(mesh.material,material);assert.equal(g.getAttribute('position').count,new Set(g.index.array).size);assert.equal(g.getAttribute('uv').count,g.getAttribute('position').count);assert.equal(g.getAttribute('normal').count,g.getAttribute('position').count);}
 assert.deepEqual(hashes,TRIANGLE_BASELINE[id]);assert.deepEqual(actualUVs,originalUVs);assert.equal(derived,id==='castle-medium'?1:0,'Only one explicit source-derived rear repair is excluded from original ownership.');
 model.traverse(object=>{if(object.userData.wheel)wheels++;if(object.userData.rollingDetail){treads++;assert.equal(object.geometry.index.count,id==='castle-medium'?208*3:13*36);}});assert.equal(wheels,count);assert.equal(treads,count);
 // Barrel splitting after wheel compaction must still partition the same source.
 articulateCannon(id,model);const combinedUVs=new Map();let indices=0;for(const mesh of sourceParts(model)){if(mesh.userData.derivedWheel)continue;indices+=mesh.geometry.index.count;addUVTriangles(mesh.geometry,combinedUVs);assert.equal(mesh.material,material);}assert.equal(indices,total);assert.deepEqual(combinedUVs,originalUVs);
});
test('rolling distance reverses, stops, and differentiates inside/outside wheels',()=>{assert.equal(wheelTravel(0,1,0,0,0,0),1);assert.equal(wheelTravel(0,-1,0,0,0,0),-1);assert.equal(wheelTravel(0,0,0,1,1,0),0);assert.ok(wheelTravel(0,1,.2,-1,0,0)>wheelTravel(0,1,.2,1,0,0));});
test('one wheel circumference turns once; recoil does not spin wheels',()=>{const root=new THREE.Group(),model=new THREE.Group();root.add(model);model.rotation.y=Math.PI/2;model.add(new THREE.Mesh(loadGeometry('castle-small'),new THREE.MeshStandardMaterial()));articulateWheels('castle-small',model);const state=updateWheels(root),wheel=state.wheels[0];root.position.z+=wheel.radius;updateWheels(root);assert.ok(Math.abs(wheel.angle-1)<1e-6);root.position.z-=wheel.radius;updateWheels(root);assert.ok(Math.abs(wheel.angle)<1e-6);model.position.y=.1;model.rotation.x=.04;updateWheels(root);assert.ok(Math.abs(wheel.angle)<1e-6);});

