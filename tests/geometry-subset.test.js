import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compactSubset} from '../src/geometry-subset.js';

function sourceGeometry(){
 const geometry=new THREE.BufferGeometry();
 geometry.name='original';geometry.userData={source:'Meshy',nested:{count:1}};
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,2,0,100,100,100],3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,1,0,1,0,0,0,0,-1],3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
 geometry.setIndex([0,1,2,1,3,2]);geometry.addGroup(0,6,0);return geometry;
}
function rawItem(attribute,index){
 const offset=attribute.isInterleavedBufferAttribute?index*attribute.data.stride+attribute.offset:index*attribute.itemSize;
 const bytes=new Uint8Array(attribute.array.buffer,attribute.array.byteOffset+offset*attribute.array.BYTES_PER_ELEMENT,attribute.itemSize*attribute.array.BYTES_PER_ELEMENT);
 return Buffer.from(bytes);
}
function assertTriangleAttributes(source,result,indices){
 assert.equal(result.index.count,indices.length);
 assert.deepEqual(Object.keys(result.attributes),Object.keys(source.attributes));
 for(let i=0;i<indices.length;i++)for(const name of Object.keys(source.attributes))assert.deepEqual(rawItem(result.getAttribute(name),result.index.getX(i)),rawItem(source.getAttribute(name),indices[i]),name+' vertex '+i);
}

test('compact subsets preserve ordered triangles and raw attributes while retaining only referenced vertices',()=>{
 const source=sourceGeometry(),position=source.getAttribute('position'),originalPosition=position.array.slice(),originalIndex=source.index.array.slice();
 const color=new THREE.Uint8BufferAttribute([0,127,255,10,20,30,50,60,70,80,90,100],3,true).setUsage(THREE.DynamicDrawUsage);color.name='paint';color.gpuType=THREE.IntType;source.setAttribute('color',color);
 source.index.setUsage(THREE.StreamDrawUsage);source.index.name='triangles';
 const selected=[2,0,1,1,0,2],result=compactSubset(source,selected);
 assertTriangleAttributes(source,result,selected);assert.deepEqual([...result.index.array],[0,1,2,2,1,0]);
 assert.equal(result.getAttribute('position').count,3);assert.equal(result.getAttribute('color').array.constructor,Uint8Array);assert.equal(result.getAttribute('color').normalized,true);assert.equal(result.getAttribute('color').name,'paint');assert.equal(result.getAttribute('color').usage,THREE.DynamicDrawUsage);assert.equal(result.getAttribute('color').gpuType,THREE.IntType);assert.equal(result.index.usage,THREE.StreamDrawUsage);assert.equal(result.index.name,'triangles');
 assert.deepEqual(result.boundingBox.min.toArray(),[0,0,0]);assert.deepEqual(result.boundingBox.max.toArray(),[1,2,0]);assert.deepEqual(result.boundingSphere.center.toArray(),[.5,1,0]);assert.ok(Math.abs(result.boundingSphere.radius-Math.sqrt(1.25))<1e-12);
 result.translate(5,-2,3);assert.deepEqual(result.boundingBox.min.toArray(),[5,-2,3]);assert.deepEqual(result.boundingBox.max.toArray(),[6,0,3]);assert.deepEqual(result.boundingSphere.center.toArray(),[5.5,-1,3]);
 assert.equal(result.name,source.name);assert.deepEqual(result.userData,source.userData);assert.notEqual(result.userData,source.userData);assert.notEqual(result.userData.nested,source.userData.nested);result.userData.nested.count=2;assert.equal(source.userData.nested.count,1);assert.deepEqual(result.groups,[]);assert.deepEqual(source.groups,[{start:0,count:6,materialIndex:0}]);assert.deepEqual(position.array,originalPosition);assert.deepEqual(source.index.array,originalIndex);assert.notEqual(result.getAttribute('position').array.buffer,position.array.buffer);
});

test('interleaved attributes preserve shared stride, raw normalized values, names and usage',()=>{
 const source=sourceGeometry(),data=new THREE.InterleavedBuffer(new Int16Array([0,0,32767,11,12,99, 32767,0,0,21,22,98, 0,32767,0,31,32,97, -32768,0,0,41,42,96]),6).setUsage(THREE.StreamDrawUsage);
 const normal=new THREE.InterleavedBufferAttribute(data,3,0,true),uv=new THREE.InterleavedBufferAttribute(data,2,3,true);normal.name='compressed normals';uv.name='packed uv';uv.gpuType=THREE.IntType;source.setAttribute('normal',normal);source.setAttribute('uv',uv);
 const selected=[2,0,1],result=compactSubset(source,selected),n=result.getAttribute('normal'),u=result.getAttribute('uv');assertTriangleAttributes(source,result,selected);
 assert.equal(n.data,u.data);assert.notEqual(n.data,data);assert.equal(n.data.stride,6);assert.equal(n.data.count,3);assert.equal(n.data.usage,THREE.StreamDrawUsage);assert.equal(n.array.constructor,Int16Array);assert.equal(n.normalized,true);assert.equal(u.offset,3);assert.equal(u.name,'packed uv');assert.equal(u.gpuType,THREE.IntType);assert.equal(n.name,'compressed normals');
 assert.deepEqual([...n.data.array],[0,32767,0,31,32,97, 0,0,32767,11,12,99, 32767,0,0,21,22,98]);
});

test('Float16 and arbitrary attribute components retain raw bit patterns and decoding',()=>{
 const source=sourceGeometry(),uv=new THREE.Float16BufferAttribute(new Uint16Array([0,0,0x3c00,0,0,0x3c00,0x3c00,0x3c00]),2);source.setAttribute('uv',uv);
 const bits=new Uint32Array([0x7fc01234,0x80000000,0x3f800000,0x7fc05678]);source.setAttribute('custom',new THREE.BufferAttribute(new Float32Array(bits.buffer),1));
 const selected=[2,1,0],result=compactSubset(source,selected);assertTriangleAttributes(source,result,selected);assert.equal(result.getAttribute('uv').isFloat16BufferAttribute,true);assert.equal(result.getAttribute('uv').constructor,THREE.Float16BufferAttribute);assert.equal(result.getAttribute('uv').getX(1),1);assert.equal(result.getAttribute('uv').getY(0),1);
 assert.deepEqual([...new Uint32Array(result.getAttribute('custom').array.buffer)],[0x3f800000,0x80000000,0x7fc01234]);
});

test('empty and nonindexed subsets remain valid and independent of the original arrays',()=>{
 const source=sourceGeometry();source.setIndex(null);const result=compactSubset(source,new Uint32Array([2,0,1]));assertTriangleAttributes(source,result,[2,0,1]);assert.equal(source.index,null);assert.equal(result.getAttribute('position').count,3);
 const empty=compactSubset(source,[]);assert.equal(empty.index.count,0);assert.equal(empty.getAttribute('position').count,0);assert.equal(empty.boundingBox.isEmpty(),true);assert.equal(empty.boundingSphere.radius,0);
});

test('large subsets use a safe 32-bit index without merging distinct vertex IDs',()=>{
 const source=new THREE.BufferGeometry(),count=65538;source.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));const selected=Uint32Array.from({length:count},(_,index)=>index),result=compactSubset(source,selected);assert.equal(result.index.array.constructor,Uint32Array);assert.equal(result.getAttribute('position').count,count);assert.equal(result.index.getX(count-1),count-1);
});

test('morph, instanced and counted-draw geometries preserve their existing clone semantics',()=>{
 const selected=[2,0,1];
 {
  const source=sourceGeometry();source.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,1,1,0,1,0,2,1,100,100,101],3)];source.morphTargetsRelative=true;const result=compactSubset(source,selected);assert.equal(result.getAttribute('position').count,4);assert.deepEqual(result.index.array,new Uint16Array(selected));assert.deepEqual(result.morphAttributes.position[0].array,source.morphAttributes.position[0].array);assert.notEqual(result.morphAttributes.position[0].array,source.morphAttributes.position[0].array);assert.equal(result.morphTargetsRelative,true);assert.deepEqual(result.groups,[]);
 }
 {
  const source=new THREE.InstancedBufferGeometry().copy(sourceGeometry());source.instanceCount=7;source.setAttribute('offset',new THREE.InstancedBufferAttribute(new Float32Array([1,2,3,4,5,6]),3));const result=compactSubset(source,selected);assert.equal(result.isInstancedBufferGeometry,true);assert.equal(result.instanceCount,7);assert.equal(result.getAttribute('position').count,4);assert.equal(result.getAttribute('offset').isInstancedBufferAttribute,true);assert.deepEqual(result.getAttribute('offset').array,source.getAttribute('offset').array);
 }
 {
  const source=sourceGeometry();source.setDrawRange(3,3);const result=compactSubset(source,[0,1,2,1,3,2]);assert.equal(result.getAttribute('position').count,4);assert.deepEqual(result.drawRange,{start:3,count:3});assert.deepEqual(result.index.array,source.index.array);assert.deepEqual(result.groups,[]);
 }
 {
  class CustomAttribute extends THREE.BufferAttribute{}const source=sourceGeometry();source.setAttribute('custom',new CustomAttribute(new Float32Array([1,2,3,4]),1));const result=compactSubset(source,selected);assert.equal(result.getAttribute('custom').constructor,CustomAttribute);assert.equal(result.getAttribute('position').count,4);assert.deepEqual(result.getAttribute('custom').array,source.getAttribute('custom').array);
 }
});

test('invalid indices, attribute counts, nonfinite positions and interleaved ranges are rejected',()=>{
 const source=sourceGeometry();
 for(const value of [[0,1],[0,1,4],[0,-1,2],[0,.5,2],[0,NaN,2],[0,Infinity,2],new BigUint64Array([0n,1n,2n])])assert.throws(()=>compactSubset(source,value),/Geometry subset/);
 assert.throws(()=>compactSubset(null,[]),/BufferGeometry/);assert.throws(()=>compactSubset(source,{}),/indices/);
 const count=sourceGeometry();count.setAttribute('uv',new THREE.Float32BufferAttribute([0,0],2));assert.throws(()=>compactSubset(count,[0,1,2]),/vertex count/);
 const nan=sourceGeometry();nan.getAttribute('position').array[0]=NaN;assert.throws(()=>compactSubset(nan,[0,1,2]),/not finite/);
 const bad=sourceGeometry(),data=new THREE.InterleavedBuffer(new Float32Array(16),4);bad.setAttribute('uv',new THREE.InterleavedBufferAttribute(data,2,3));assert.throws(()=>compactSubset(bad,[0,1,2]),/exceeds its stride/);
});
