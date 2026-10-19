import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addRollingTread} from '../src/wheels.js';

function inspect(axis='z'){
 const rotor=new THREE.Group(),radius=.131;
 const mesh=addRollingTread(rotor,radius,axis,.085,true),g=mesh.geometry,p=g.attributes.position;
 // Weld only for this topology audit: UV/normal seam vertices stay separate in rendering.
 const ids=new Map(),vertices=[],graph=[];
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e7)).join(',');if(!ids.has(key)){ids.set(key,ids.size);graph.push(new Set());}vertices.push(ids.get(key));}
 for(let i=0;i<g.index.count;i+=3){const a=[0,1,2].map(k=>vertices[g.index.getX(i+k)]);for(let k=0;k<3;k++){graph[a[k]].add(a[(k+1)%3]);graph[a[(k+1)%3]].add(a[k]);}}
 let components=0;const seen=new Set();for(let i=0;i<graph.length;i++)if(!seen.has(i)){components++;const queue=[i];seen.add(i);while(queue.length)for(const n of graph[queue.pop()])if(!seen.has(n)){seen.add(n);queue.push(n);}}
 return {rotor,mesh,g,p,radius,components};
}
for(const axis of ['x','z'])test('medium tread is one thin connected wheel ring on '+axis,()=>{
 const {mesh,g,p,radius,components}=inspect(axis);assert.equal(components,1,'No detached wooden cleats');assert.equal(g.index.count/3,208);
 for(let i=0;i<p.count;i++){const radial=axis==='z'?Math.hypot(p.getX(i),p.getY(i)):Math.hypot(p.getZ(i),p.getY(i)),axial=axis==='z'?p.getZ(i):p.getX(i);assert.ok(Number.isFinite(radial));assert.ok(radial<=radius*1.011);assert.ok(radial>=radius*.959);assert.ok(Math.abs(axial)<=radius*.026);}
 assert.equal(mesh.userData.rollingDetail,true);assert.equal(mesh.parent.children.length,1);assert.equal(mesh.material.roughness,.95);
});
test('continuous tread retains a readable rotating color marker without changing buffers',()=>{
 const {mesh,g}=inspect(),positions=new Float32Array(g.attributes.position.array),colors=new Float32Array(g.attributes.color.array);
 const palette=new Set();for(let i=0;i<colors.length;i+=3)palette.add(colors.slice(i,i+3).join(','));assert.ok(palette.size>=2&&palette.size<=4);
 for(const phase of [0,Math.PI/4,Math.PI/2,Math.PI]){mesh.parent.rotation.z=phase;mesh.parent.updateMatrixWorld(true);assert.deepEqual(g.attributes.position.array,positions);assert.deepEqual(g.attributes.color.array,colors);}
});
test('other wheel treads retain their existing geometry budget',()=>{const rotor=new THREE.Group(),mesh=addRollingTread(rotor,.12,'z',.075);assert.equal(mesh.geometry.index.count/3,156);});
