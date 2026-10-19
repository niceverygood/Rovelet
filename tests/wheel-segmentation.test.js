import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {parseGlb} from '../scripts/glb-runtime.mjs';
import {articulateWheels} from '../src/wheels.js';

// These limits are the reviewed safety envelope for existing calibrated pivots,
// not a second copy of the centroid classifier. Inspect actual output vertices,
// edges and source-triangle ownership. Original Meshy files are read only.
const SPECS={
 'castle-small':{radius:.12,depth:.075,wheels:4},
 'castle-medium':{radius:.127,depth:.084,wheels:4},
 'castle-large':{radius:.092,depth:.057,wheels:6},
 'enemy-tower':{radius:.123,depth:.055,wheels:4},
};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),tolerance=2e-7,cache=new Map();
const close=(a,b)=>Math.abs(a-b)<=tolerance;
function geometry(parsed){
 const {json,bin}=parsed,primitive=json.meshes[0].primitives[0],g=new THREE.BufferGeometry();
 assert.equal(json.meshes.length,1);assert.equal(json.meshes[0].primitives.length,1);
 assert.ok(primitive.mode===undefined||primitive.mode===4);
 for(const[key,name,size]of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]){
  const a=json.accessors[primitive.attributes[key]],view=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);
  const start=(view.byteOffset??0)+(a.byteOffset??0),stride=view.byteStride??size*4,values=new Float32Array(a.count*size);
  for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)values[i*size+k]=bin.readFloatLE(start+i*stride+k*4);
  g.setAttribute(name,new THREE.BufferAttribute(values,size));
 }
 const a=json.accessors[primitive.indices],view=json.bufferViews[a.bufferView],start=(view.byteOffset??0)+(a.byteOffset??0),width=a.componentType===5125?4:2;
 assert.ok([5123,5125].includes(a.componentType));g.setIndex(Array.from({length:a.count},(_,i)=>width===4?bin.readUInt32LE(start+i*width):bin.readUInt16LE(start+i*width)));return g;
}
function geometrySha(g){const h=crypto.createHash('sha256');for(const name of ['position','normal','uv']){const a=g.getAttribute(name).array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}const a=g.index.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex');}
function triangle(g,n){
 return [0,1,2].map(corner=>{const index=g.index.getX(n*3+corner),p=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv');return {position:[p.getX(index),p.getY(index),p.getZ(index)],normal:[normal.getX(index),normal.getY(index),normal.getZ(index)],uv:[uv.getX(index),uv.getY(index)]};});
}
const uvKey=vertices=>vertices.map(v=>v.uv.join(',')).join(';');
function sourceVertex(v,part,id){
 const position=new THREE.Vector3().fromArray(v.position),normal=new THREE.Vector3().fromArray(v.normal);
 // Restore the original B source stream, not the old incorrect rear pivot.
 // Raw hidden A/D/C archive geometry needs no position/normal transformation.
 if(part.wheel&&id==='castle-medium'){const inverse=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-.07498432991240138,.027994149833963183,.996791692302189).normalize(),new THREE.Vector3(0,0,1)).invert();position.applyQuaternion(inverse).add(new THREE.Vector3(-.129,-.3475,.291));normal.applyQuaternion(inverse);}else if(part.wheel)position.add(part.pivot.position);
 return {position:position.toArray(),normal:normal.toArray(),uv:v.uv};
}
function equalTriangle(a,b){return a.every((v,i)=>v.uv.every((n,k)=>Object.is(n,b[i].uv[k]))&&v.position.every((n,k)=>close(n,b[i].position[k]))&&v.normal.every((n,k)=>close(n,b[i].normal[k])));}
function inspect(id){
 if(cache.has(id))return cache.get(id);
 const file=new URL('../public/models/'+id+'.glb',import.meta.url),bytes=fs.readFileSync(file),original=geometry(parseGlb(bytes)),originalSha=geometrySha(original),sourceTriangles=Array.from({length:original.index.count/3},(_,n)=>triangle(original,n)),byUV=new Map();
 for(let n=0;n<sourceTriangles.length;n++){const key=uvKey(sourceTriangles[n]),list=byUV.get(key)??[];list.push(n);byUV.set(key,list);}
 const model=new THREE.Group(),material=new THREE.MeshStandardMaterial(),body=new THREE.Mesh(original,material);model.add(body);articulateWheels(id,model);
 const parts=[{name:'body',mesh:body,wheel:false,ids:[]}];
 for(let i=0;i<SPECS[id].wheels;i++){const pivot=model.getObjectByName('wheel-steer-'+i);assert.ok(pivot);const mesh=pivot.getObjectByName('wheel-roll');assert.ok(mesh);const derived=mesh.userData.derivedWheel===true;if(derived){assert.equal(id,'castle-medium');assert.ok(i>0,'Only declared B-derived instances1/2/3 are excluded.');assert.equal(mesh.userData.derivedSourceWheel,0);}parts.push({name:pivot.name,index:i,pivot,mesh,wheel:true,derived,ids:[]});}
 if(id==='castle-medium'){const archives=[];model.traverse(mesh=>{if(mesh.userData.wheelSourceArchive)archives.push(mesh);});assert.equal(archives.length,3);for(const mesh of archives){assert.equal(mesh.visible,false);assert.equal(mesh.geometry.userData.sharedAsset,true);parts.push({name:mesh.name,mesh,wheel:false,archive:true,ids:[]});}}
 const claimed=new Set();
 for(const part of parts){
  assert.equal(part.mesh.material,material,'Existing source material must remain shared across body/rotors.');
  if(part.derived){assert.equal(part.mesh.geometry,parts.find(p=>p.index===0).mesh.geometry,'Every excluded derivative must share B instance0 geometry.');continue;}
  const g=part.mesh.geometry;
  for(let n=0;n<g.index.count/3;n++){
   const restored=triangle(g,n).map(v=>sourceVertex(v,part,id)),candidate=(byUV.get(uvKey(restored))??[]).find(sourceId=>!claimed.has(sourceId)&&equalTriangle(restored,sourceTriangles[sourceId]));
   assert.notEqual(candidate,undefined,`${id}/${part.name} output triangle${n} lost/duplicated/reordered vertex attributes`);
   claimed.add(candidate);part.ids.push(candidate);
  }
 }
 const result={id,file,fileSha:sha(bytes),original,originalSha,sourceTriangles,parts,claimed,model,material};cache.set(id,result);return result;
}

for(const [id,spec]of Object.entries(SPECS))test(id+' actual rotating vertices and edges stay inside the approved wheel envelope',()=>{
 const f=inspect(id);
 for(const part of f.parts.filter(p=>p.wheel)){
  const axis=part.pivot.userData.axis,depth=spec.depth,axialLimit=Math.max(2*depth,spec.radius),p=part.mesh.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),radial=Math.hypot(axis==='z'?x:z,y),axial=Math.abs(axis==='z'?z:x);
   assert.ok(radial<=1.5*spec.radius+tolerance,`${id}/${part.name} vertex${i} radial=${radial} exceeds ${1.5*spec.radius}`);
   assert.ok(axial<=axialLimit+tolerance,`${id}/${part.name} vertex${i} axial=${axial} exceeds ${axialLimit}`);
  }
  for(let n=0;n<part.mesh.geometry.index.count/3;n++){
   const vertices=triangle(part.mesh.geometry,n).map(v=>new THREE.Vector3().fromArray(v.position));
   for(const [a,b]of [[0,1],[1,2],[2,0]])assert.ok(vertices[a].distanceTo(vertices[b])<=2.2*spec.radius+tolerance,`${id}/${part.name} source triangle${part.ids[n]} edge exceeds ${2.2*spec.radius}`);
  }
  // Actual eight-phase rotor transforms must not reveal a hidden long radial
  // spike after rotation. Tread children are purpose-built extras, excluded here.
  for(let phase=0;phase<8;phase++){
   part.mesh.rotation[axis]=phase*Math.PI/4;part.mesh.updateMatrix();
   for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(part.mesh.matrix),radial=Math.hypot(axis==='z'?v.x:v.z,v.y);
    assert.ok(radial<=1.5*spec.radius+tolerance,`${id}/${part.name} phase${phase} radial spike`);
   }
  }
  part.mesh.rotation[axis]=0;part.mesh.updateMatrix();
 }
});

test('known medium long bridge triangles remain in the static body rather than rotating wheels',()=>{
 const f=inspect('castle-medium'),body=new Set(f.parts[0].ids),rotating=new Set(f.parts.filter(p=>p.wheel).flatMap(p=>p.ids));
 for(const id of [5718,6502]){assert.ok(body.has(id),`actual source triangle${id} must remain in the body`);assert.equal(rotating.has(id),false);}
});

test('large source vertex15516 bridge faces cannot remain in the rotating half-phase envelope',()=>{
 const f=inspect('castle-large'),body=new Set(f.parts[0].ids),rotating=new Set(f.parts.filter(p=>p.wheel).flatMap(p=>p.ids));
 for(const id of [11509,13068]){assert.ok(body.has(id),`large source triangle${id} must remain in the body`);assert.equal(rotating.has(id),false);}
 assert.ok([11509,13068].some(id=>[0,1,2].some(corner=>f.original.index.getX(id*3+corner)===15516)),'Regression must reference the observed original long-bridge vertex.');
});

for(const id of Object.keys(SPECS))test(id+' preserves each original triangle once, source order, UV/normal/position and raw source SHA',()=>{
 const f=inspect(id),all=f.parts.flatMap(p=>p.ids);
 assert.equal(all.length,f.sourceTriangles.length);assert.equal(f.claimed.size,f.sourceTriangles.length);assert.deepEqual([...all].sort((a,b)=>a-b),Array.from({length:f.sourceTriangles.length},(_,i)=>i));
 for(const part of f.parts)for(let i=1;i<part.ids.length;i++)assert.ok(part.ids[i]>part.ids[i-1],`${id}/${part.name} must preserve original triangle order`);
 // Exact source identity stream SHA complements the per-corner actual-output
 // comparisons above. Only subtract/rotate Float32 roundoff uses tolerance;
 // UVs, original arrays and the on-disk GLB must remain bit-identical.
 const expected=new Uint32Array(f.sourceTriangles.length);for(let i=0;i<expected.length;i++)expected[i]=i;
 const actual=new Uint32Array([...all].sort((a,b)=>a-b));assert.equal(sha(Buffer.from(actual.buffer)),sha(Buffer.from(expected.buffer)));
 assert.equal(geometrySha(f.original),f.originalSha,'Partition must not mutate source arrays.');assert.equal(sha(fs.readFileSync(f.file)),f.fileSha,'Original Meshy GLB bytes must not change.');
 let sourceMeshes=0,treads=0;f.model.traverse(mesh=>{if(mesh.isMesh){if(mesh.userData.rollingDetail)treads++;else sourceMeshes++;}});
 assert.equal(sourceMeshes,id==='castle-medium'?8:1+SPECS[id].wheels);assert.equal(treads,SPECS[id].wheels);
});
