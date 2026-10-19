import * as THREE from 'three';

const ATTRIBUTE_TYPES=new Set([THREE.BufferAttribute,THREE.Int8BufferAttribute,THREE.Uint8BufferAttribute,THREE.Uint8ClampedBufferAttribute,THREE.Int16BufferAttribute,THREE.Uint16BufferAttribute,THREE.Int32BufferAttribute,THREE.Uint32BufferAttribute,THREE.Float16BufferAttribute,THREE.Float32BufferAttribute]);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const invalid=message=>{throw new TypeError('Geometry subset: '+message);};
const typed=array=>ArrayBuffer.isView(array)&&!(array instanceof DataView)&&!(array instanceof BigInt64Array)&&!(array instanceof BigUint64Array);

function legacySubset(source,indices){
 const geometry=source.clone();geometry.setIndex(indices);geometry.clearGroups();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function copyAttributeMetadata(result,source){
 result.name=source.name;
 if(source.usage!==undefined)result.usage=source.usage;
 if(source.gpuType!==undefined)result.gpuType=source.gpuType;
 return result;
}
function copyRows(array,stride,vertices){
 const result=new array.constructor(vertices.length*stride);
 // Same-type set preserves raw bits (including normalized integer values and Float16 data).
 for(let i=0;i<vertices.length;i++)result.set(array.subarray(vertices[i]*stride,(vertices[i]+1)*stride),i*stride);
 return result;
}

/** Split triangles without duplicating every unreferenced vertex in each mechanical part. */
export function compactSubset(source,indices){
 if(!source?.isBufferGeometry||typeof source.getAttribute!=='function')invalid('a BufferGeometry is required');
 if(!Array.isArray(indices)&&!typed(indices))invalid('indices must be an array or numeric typed array');
 if(indices.length%3)invalid('indices must contain complete triangles');
 const position=source.getAttribute('position');
 if(!position||position.itemSize!==3||!integer(position.count))invalid('a valid three-component position attribute is required');
 const selected=Array.from(indices);
 for(const index of selected)if(!integer(index)||index>=position.count)invalid('index is outside the position range');
 const attributes=Object.values(source.attributes);
 // These cases have additional indexing/lifetime semantics. Keep the previous clone path
 // rather than dropping morphs, per-instance attributes, subclasses or a counted draw range.
 const unsupported=source.constructor!==THREE.BufferGeometry||source.isInstancedBufferGeometry||source.drawRange.start!==0||source.drawRange.count!==Infinity||Object.values(source.morphAttributes).some(list=>list.length)||attributes.some(attribute=>{
  if(attribute.isInstancedBufferAttribute||attribute.isGLBufferAttribute||attribute.data?.isInstancedInterleavedBuffer)return true;
  return attribute.isInterleavedBufferAttribute?(attribute.constructor!==THREE.InterleavedBufferAttribute||attribute.data.constructor!==THREE.InterleavedBuffer):!ATTRIBUTE_TYPES.has(attribute.constructor);
 });
 if(unsupported)return legacySubset(source,selected);
 let metadata;
 try{metadata=structuredClone(source.userData);}catch{return legacySubset(source,selected);}
 for(const attribute of attributes){
  if(!integer(attribute.itemSize)||attribute.itemSize<1||attribute.count!==position.count||!typed(attribute.array))invalid('attribute format or vertex count does not match position');
  const stride=attribute.isInterleavedBufferAttribute?attribute.data.stride:attribute.itemSize;
  if(!integer(stride)||stride<attribute.itemSize||attribute.array.length!==position.count*stride)invalid('attribute storage range is invalid');
  if(attribute.isInterleavedBufferAttribute&&(!integer(attribute.offset)||attribute.offset+attribute.itemSize>stride))invalid('interleaved attribute exceeds its stride');
 }
 const remap=new Map(),vertices=[],compacted=[];
 for(const index of selected){let next=remap.get(index);if(next===undefined){next=vertices.length;remap.set(index,next);vertices.push(index);}compacted.push(next);}
 for(const index of vertices)if(![position.getX(index),position.getY(index),position.getZ(index)].every(Number.isFinite))invalid('referenced position is not finite');
 const geometry=new THREE.BufferGeometry(),interleaved=new Map();geometry.name=source.name;geometry.userData=metadata;geometry.morphTargetsRelative=source.morphTargetsRelative;geometry._transformed=source._transformed;
 for(const [name,attribute]of Object.entries(source.attributes)){
  let result;
  if(attribute.isInterleavedBufferAttribute){
   let data=interleaved.get(attribute.data);
   if(!data){data=new THREE.InterleavedBuffer(copyRows(attribute.data.array,attribute.data.stride,vertices),attribute.data.stride).setUsage(attribute.data.usage);interleaved.set(attribute.data,data);}
   result=new THREE.InterleavedBufferAttribute(data,attribute.itemSize,attribute.offset,attribute.normalized);
  }else{
   const array=copyRows(attribute.array,attribute.itemSize,vertices);
   // Use the original class, including Float16 decoding, without first cloning a full array.
   result=new attribute.constructor(new attribute.array.constructor(0),attribute.itemSize,attribute.normalized);result.array=array;result.count=vertices.length;
  }
  geometry.setAttribute(name,copyAttributeMetadata(result,attribute));
 }
 geometry.setIndex(compacted);
 if(source.index)copyAttributeMetadata(geometry.index,source.index);
 geometry.clearGroups();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
