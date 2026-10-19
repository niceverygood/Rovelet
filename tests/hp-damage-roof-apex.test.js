import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import crypto from'node:crypto';import *as THREE from'three';
import{HullDamageVisuals,hullDamageBody,createHullDamagePixels}from'../src/hp-damage-visual.js';import{World}from'../src/world.js';import{CombatFeedback}from'../src/combat-feedback.js';import{articulateWheels}from'../src/wheels.js';import{articulateCannon}from'../src/artillery.js';
const ORACLE=[
  {
    "stage": 1,
    "id": "castle-small",
    "sourceSha256": "656b9d727f12344cd9c999ecf4f8757eaf83265b53eea2f923440797aabf96f9",
    "geometry": {
      "positionsSha256": "2e225fbb034d9c4cbf83a7d77bddeaa51620e50a44f3e4e6b4aaf978f92e7cfb",
      "indicesSha256": "a989329d2990cbddb87c32d540828af1cf37e16660e0bd0550760bc2b8cd907b",
      "positionCount": 8744,
      "indexCount": 29364,
      "bodyLocalMatrix": [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      ]
    },
    "apexTriangle": 1633,
    "sourceVertexIDs": [
      2387,
      2388,
      2389
    ],
    "chosen": [
      {
        "point": [
          -0.07788100093603134,
          0.41332998871803284,
          -0.0007319999858736992
        ],
        "normal": [
          0.15199123461061503,
          0.9858899305574533,
          -0.07014064033754573
        ],
        "uv": [
          0.9518139958381653,
          0.9375330209732056
        ],
        "rgba": [
          218,
          43,
          40,
          255
        ],
        "sourceVertexID": 2387
      },
      {
        "point": [
          -0.0686039999127388,
          0.4118649959564209,
          -0.0012209999840706587
        ],
        "normal": [
          0.15199123461061503,
          0.9858899305574533,
          -0.07014064033754573
        ],
        "uv": [
          0.9543290138244629,
          0.9376680254936218
        ],
        "rgba": [
          218,
          45,
          41,
          255
        ],
        "sourceVertexID": 2388
      },
      {
        "point": [
          -0.07153300195932388,
          0.4118649959564209,
          -0.007567999884486198
        ],
        "normal": [
          0.15199123461061503,
          0.9858899305574533,
          -0.07014064033754573
        ],
        "uv": [
          0.9542710185050964,
          0.9349949955940247
        ],
        "rgba": [
          220,
          47,
          43,
          255
        ],
        "sourceVertexID": 2389
      }
    ],
    "faceNormal": [
      0.15199123461061503,
      0.9858899305574533,
      -0.07014064033754573
    ],
    "downwardProbeFractions": [
      0.3116733576441469,
      0.49360897775414453
    ],
    "emitterUsesCentroid": false,
    "epsilonWorld": 0.01
  },
  {
    "stage": 2,
    "id": "castle-medium",
    "sourceSha256": "e852db96e1ae7f529ddaac233480acf3300bae182d48068afdd15ff98b72f338",
    "geometry": {
      "positionsSha256": "7d84e818b4849e15fe65d20c7e1a3dbc626f9a6819d611e7e4eb4d0fcf71e2ff",
      "indicesSha256": "ce5fa0b4860044b22e0efa7ee71b7eed1dd101b26739806742e1008faca2ab6f",
      "positionCount": 14358,
      "indexCount": 33192,
      "bodyLocalMatrix": [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      ]
    },
    "apexTriangle": 1555,
    "sourceVertexIDs": [
      2817,
      2818,
      1754
    ],
    "chosen": [
      {
        "point": [
          -0.15356400609016418,
          0.3566890060901642,
          -0.04370100051164627
        ],
        "normal": [
          0.19196565000083138,
          0.9599782469714497,
          -0.20393860488240131
        ],
        "uv": [
          0.5957750082015991,
          0.09534001350402832
        ],
        "rgba": [
          236,
          50,
          51,
          255
        ],
        "sourceVertexID": 2817
      },
      {
        "point": [
          -0.14135700464248657,
          0.3542479872703552,
          -0.04370100051164627
        ],
        "normal": [
          0.19196565000083138,
          0.9599782469714497,
          -0.20393860488240131
        ],
        "uv": [
          0.5941609740257263,
          0.09805399179458618
        ],
        "rgba": [
          213,
          40,
          46,
          255
        ],
        "sourceVertexID": 2818
      },
      {
        "point": [
          -0.1472170054912567,
          0.3537600040435791,
          -0.051513999700546265
        ],
        "normal": [
          0.19196565000083138,
          0.9599782469714497,
          -0.20393860488240131
        ],
        "uv": [
          0.5966820120811462,
          0.09779399633407593
        ],
        "rgba": [
          236,
          48,
          47,
          255
        ],
        "sourceVertexID": 1754
      }
    ],
    "faceNormal": [
      0.19196565000083138,
      0.9599782469714497,
      -0.20393860488240131
    ],
    "downwardProbeFractions": [
      0.22658975927506642,
      0.4341453527069569
    ],
    "emitterUsesCentroid": false,
    "epsilonWorld": 0.01
  },
  {
    "stage": 3,
    "id": "castle-large",
    "sourceSha256": "5055348daf3d8da7972e270b96ab98fac9cf7cbcd2aa75987cc6fd1af3a37dbe",
    "geometry": {
      "positionsSha256": "54a2d943d08ccb6048f9df20b6c7e238309b8d38185386ffff029c33e764f122",
      "indicesSha256": "99f0c64486e10e4656cc5c369817e1eba7f8a7c987c6cc2f862a0c9c9e83f929",
      "positionCount": 13885,
      "indexCount": 32481,
      "bodyLocalMatrix": [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      ]
    },
    "apexTriangle": 5554,
    "sourceVertexIDs": [
      2504,
      2512,
      8662
    ],
    "chosen": [
      {
        "point": [
          0.14184600114822388,
          0.2531740069389343,
          0.053467001765966415
        ],
        "normal": [
          0.13251702353501102,
          0.9473592068060899,
          0.2914614412802443
        ],
        "uv": [
          0.9278770089149475,
          0.4560059905052185
        ],
        "rgba": [
          240,
          54,
          57,
          255
        ],
        "sourceVertexID": 2504
      },
      {
        "point": [
          0.1472170054912567,
          0.2531740069389343,
          0.05102499946951866
        ],
        "normal": [
          0.13251702353501102,
          0.9473592068060899,
          0.2914614412802443
        ],
        "uv": [
          0.9265710115432739,
          0.4574199914932251
        ],
        "rgba": [
          238,
          58,
          59,
          255
        ],
        "sourceVertexID": 2512
      },
      {
        "point": [
          0.14184600114822388,
          0.2551270127296448,
          0.04711899906396866
        ],
        "normal": [
          0.13251702353501102,
          0.9473592068060899,
          0.2914614412802443
        ],
        "uv": [
          0.9286770224571228,
          0.4579160213470459
        ],
        "rgba": [
          253,
          81,
          69,
          255
        ],
        "sourceVertexID": 8662
      }
    ],
    "faceNormal": [
      0.13251702353501102,
      0.9473592068060899,
      0.2914614412802443
    ],
    "downwardProbeFractions": [
      0.5904935874593487,
      0.6151195267601525
    ],
    "emitterUsesCentroid": false,
    "epsilonWorld": 0.01
  }
];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function geometryBytes(g){return{attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,hash(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength))])),index:g.index?hash(Buffer.from(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength)):null,bbox:g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null,sphere:g.boundingSphere?{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}:null};}
function models(){const result={};for(const o of ORACLE){const b=fs.readFileSync(new URL('../public/models/'+o.id+'.glb',import.meta.url));assert.equal(hash(b),o.sourceSha256);const length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),base=28+length,p=j.meshes[0].primitives[0],g=new THREE.BufferGeometry();assert.deepEqual(j.nodes,[{matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],mesh:0}]);for(const[key,name,size]of[['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]]){const a=j.accessors[p.attributes[key]],v=j.bufferViews[a.bufferView],start=base+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??size*4,values=new Float32Array(a.count*size);for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)values[i*size+k]=b.readFloatLE(start+i*stride+k*4);g.setAttribute(name,new THREE.BufferAttribute(values,size));}const ia=j.accessors[p.indices],iv=j.bufferViews[ia.bufferView],io=base+(iv.byteOffset??0)+(ia.byteOffset??0),indices=[];for(let i=0;i<ia.count;i++)indices.push(ia.componentType===5125?b.readUInt32LE(io+i*4):b.readUInt16LE(io+i*2));g.setIndex(indices);const source=new THREE.Group(),mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.1}));source.add(mesh);source.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());source.position.set(-center.x,-box.min.y,-center.z);articulateWheels(o.id,source);articulateCannon(o.id,source);const normalized=new THREE.Group();normalized.add(source);normalized.scale.setScalar(1/size.y);normalized.traverse(n=>{if(n.geometry)n.geometry.userData.sharedAsset=true;if(n.material)n.material.userData.sharedAsset=true;});result[o.id]=normalized;}return result;}
function world(){const w={models:models(),actors:new THREE.Group(),effects:new THREE.Group(),camera:new THREE.OrthographicCamera(-14.4,14.4,10,-10,.1,200),asset:World.prototype.asset,cacheActorHull:World.prototype.cacheActorHull,castle:World.prototype.castle,remove:World.prototype.remove,disposeRuntime:World.prototype.disposeRuntime};w.camera.position.set(22,30,28);w.camera.lookAt(0,0,0);w.camera.updateWorldMatrix(true,false);w.feedback=new CombatFeedback(w);w.damageVisuals=new HullDamageVisuals(w);w.damageVisuals.prepare(w.models);assert.deepEqual(w.damageVisuals.failures,[]);return w;}
function actor(w,stage=1){return{mode:'run',screen:'',run:{stage,hp:20,maxHp:220,outcome:null,time:5,coins:3,kills:0},player:{root:w.castle(stage)}};}
function born(w,g){w.damageVisuals.clearSmoke();w.damageVisuals.update(g,1.25,w.camera);const p=[...w.damageVisuals.smokes][0];assert.ok(p,'Declared finite supported actual geometry must emit');return p;}
function roofDistance(w,g,p){const body=hullDamageBody(g.player.root.userData.model),o=ORACLE[g.run.stage-1],points=o.chosen.map(c=>new THREE.Vector3().fromArray(c.point).applyMatrix4(body.matrixWorld)),highest=points.reduce((best,v)=>v.y>best.y?v:best),normal=new THREE.Vector3().fromArray(o.faceNormal).applyMatrix3(new THREE.Matrix3().getNormalMatrix(body.matrixWorld)).normalize(),expected=highest.clone().addScaledVector(normal,.01);return p.mesh.position.distanceTo(expected);}
function centerBlocked(body,worldPoint,camera){body.updateWorldMatrix(true,false);const inv=body.matrixWorld.clone().invert(),dir=new THREE.Vector3();camera.getWorldDirection(dir).negate().transformDirection(inv);const start=worldPoint.clone().applyMatrix4(inv).addScaledVector(dir,1e-5),p=body.geometry.attributes.position,ix=body.geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let t=0;t<ix.count;t+=3){a.fromBufferAttribute(p,ix.getX(t));b.fromBufferAttribute(p,ix.getX(t+1));c.fromBufferAttribute(p,ix.getX(t+2));const e1=b.clone().sub(a),e2=c.clone().sub(a),h=dir.clone().cross(e2),det=e1.dot(h);if(Math.abs(det)<1e-12)continue;const s=start.clone().sub(a),u=s.dot(h)/det;if(u<0||u>1)continue;const q=s.clone().cross(e1),v=dir.dot(q)/det;if(v<0||u+v>1)continue;const distance=e2.dot(q)/det;if(distance>1e-5)return true;}return false;}
test('actual3 born smoke originates on independently sampled red upper-roof triangles',()=>{const w=world();try{for(const stage of[1,2,3]){const g=actor(w,stage),p=born(w,g);assert.ok(roofDistance(w,g,p)<2e-6,'Smoke must use actual upper-roof receipt instead of inherited .66 center wall');const o=ORACLE[stage-1];assert.ok(o.chosen.every(h=>h.rgba[0]>150&&h.rgba[1]<h.rgba[0]*.45&&h.rgba[2]<h.rgba[0]*.5&&h.normal[1]>.35));}}finally{w.damageVisuals.dispose();}});
test('72 yaw cases use highest actual roof vertex and perform zero triangle scans on warm emission',()=>{const w=world(),ray=THREE.Ray.prototype.intersectTriangle;let scans=0;try{THREE.Ray.prototype.intersectTriangle=function(...args){scans++;return ray.apply(this,args);};for(const stage of[1,2,3]){const g=actor(w,stage);for(let degrees=0;degrees<360;degrees+=5){g.player.root.rotation.y=degrees*Math.PI/180;const p=born(w,g);assert.ok(roofDistance(w,g,p)<2e-6);assert.equal(p.mesh.material.depthTest,true);assert.equal(p.mesh.material.depthWrite,false);assert.equal(p.mesh.renderOrder,0);}}assert.equal(scans,0,'No per-emission source triangle scan');}finally{THREE.Ray.prototype.intersectTriangle=ray;w.damageVisuals.dispose();}});
test('birth follows real World height/staticPI2 plus YXZ yaw/contact and visual rig transforms',()=>{const w=world();try{for(const stage of[1,2,3]){const g=actor(w,stage),r=g.player.root;r.position.set(23,1.4,14);r.rotation.set(.055,1.17,-.04,'YXZ');r.visualRig.position.set(.08,.025,-.06);r.visualRig.quaternion.setFromEuler(new THREE.Euler(.08,0,-.06));r.visualRig.scale.set(1.015,.95,1.015);g.player.root.userData.model.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.06,0,.04)));w.camera.position.copy(r.position).add(new THREE.Vector3(22,30,28));w.camera.lookAt(r.position);w.camera.updateWorldMatrix(true,false);const p=born(w,g);assert.ok(roofDistance(w,g,p)<2e-6);assert.ok(p.mesh.position.y>r.position.y);assert.equal(r.rotation.order,'YXZ');assert.deepEqual(g.run,{stage,hp:20,maxHp:220,outcome:null,time:5,coins:3,kills:0});}}finally{w.damageVisuals.dispose();}});
test('existing six wall anchors, two/four/six draw counts and all atlas RGBA remain exact',()=>{const w=world();try{const atlas=hash(createHullDamagePixels());assert.equal(atlas,'949f43dc94bd1503e1c5324d2d20f91bd0c2272989468c9cefa6d26e17040f70');for(const stage of[1,2,3]){const e=w.damageVisuals.templates.get(stage);assert.equal(e.anchors.length,6);assert.deepEqual(e.anchors,[[[-0.1880859389901161,-0.1880857914686203,0.22161604224995002],[-0.1880859389901161,-0.1880857914686203,-0.21899400651454914],[-0.19393597575015953,0.0014650076627731323,0.08690185025334363],[0.2240129445519322,0.0014650076627731323,0.17380370050668714],[-0.20538153023292238,0.048852707445621535,0],[0.22106391259001645,0.048852707445621535,0.17380370050668714]],[[0.19243177399039268,-0.0004879981279373169,0.3306898605705616],[0.19243177399039268,-0.0004879981279373169,-0.3330572530780189],[-0.2518572639504564,-0.0004879981279373169,0.0078125],[0.218845364459749,-0.0004879981279373169,0.29543444514274597],[-0.2291119919888409,-0.19081999957561496,0.29543444514274597],[0.2366094918536834,-0.0004879981279373169,-0.27980944514274597]],[[-0.07363299652934074,-0.056689387559890725,0.17679257601290055],[0.06958000361919403,0.005127012729644775,-0.1784670054912567],[-0.31491826199517514,0.005127012729644775,-0.07313224859535694],[0.21297880828225657,0.005127012729644775,0.07606224901974201],[-0.21018327736667008,0.06694341301918028,0.0014650002121925354],[0.21376610227452586,0.06694341301918028,0.0014650002121925354]]][stage-1]);const g=actor(w,stage);for(const[hp,n]of[[140,2],[70,4],[20,6]]){g.run.hp=hp;w.damageVisuals.update(g,0,w.camera);assert.equal(e.geometry.drawRange.count,e.patchCounts[n-1]);}}}finally{w.damageVisuals.dispose();}});
test('geometry/UV/normals/index/bounds and original material identity survive prepare and warm updates',()=>{const m=models(),before=Object.values(m).map(v=>{const b=hullDamageBody(v);return{body:b,bytes:geometryBytes(b.geometry),material:b.material,color:b.material.color.getHex(),roughness:b.material.roughness,metalness:b.material.metalness};}),w={models:m,actors:new THREE.Group(),effects:new THREE.Group(),camera:new THREE.OrthographicCamera(-10,10,10,-10,.1,100),asset:World.prototype.asset,cacheActorHull:World.prototype.cacheActorHull,castle:World.prototype.castle,remove:World.prototype.remove,disposeRuntime:World.prototype.disposeRuntime};w.camera.position.set(22,30,28);w.camera.lookAt(0,0,0);w.feedback=new CombatFeedback(w);w.damageVisuals=new HullDamageVisuals(w);try{w.damageVisuals.prepare(m);for(const stage of[1,2,3]){const g=actor(w,stage);born(w,g);w.damageVisuals.update(g,.1,w.camera);}for(const r of before){assert.deepEqual(geometryBytes(r.body.geometry),r.bytes);assert.equal(r.body.material,r.material);assert.equal(r.material.color.getHex(),r.color);assert.equal(r.material.roughness,r.roughness);assert.equal(r.material.metalness,r.metalness);}}finally{w.damageVisuals.dispose();}});
test('excluded wheel/archive/attachment/decorative overlay cannot become damage body or emitter source',()=>{const w=world();try{const g=actor(w),model=g.player.root.userData.model,body=hullDamageBody(model);for(const flag of['wheel','wheelSourceArchive','derivedWheel','attachment','hullDamageOverlay']){const bait=new THREE.Mesh(new THREE.SphereGeometry(10,80,80),new THREE.MeshStandardMaterial());bait.userData[flag]=true;model.add(bait);assert.equal(hullDamageBody(model),body);model.remove(bait);bait.geometry.dispose();bait.material.dispose();}const p=born(w,g);assert.equal(body.geometry,w.damageVisuals.entry.sourceGeometry);assert.ok(Number.isFinite(p.mesh.position.y));}finally{w.damageVisuals.dispose();}});
test('warmed smoke remains2/global190 bounded with no warm Math.random or geometry allocation',()=>{const w=world(),g=actor(w,3),v=w.damageVisuals,allocated=v.smokePool.stats.allocated,random=Math.random;try{Math.random=()=>{throw Error('Warm smoke must not allocate random UUIDs or use gameplay RNG');};for(let i=0;i<240;i++){w.feedback.update(1/60,w.camera);v.update(g,1/60,w.camera);assert.ok(v.smokes.size<=2);assert.ok(w.feedback.particles.length<=190);}assert.equal(v.smokePool.stats.allocated,allocated);}finally{Math.random=random;v.dispose();}});
test('full190 refuses smoke without replacing unrelated particles or acquiring owned pool slot',()=>{const w=world(),g=actor(w),v=w.damageVisuals,items=Array.from({length:190},()=>({unrelated:true})),allocated=v.smokePool.stats.allocated;try{w.feedback.particles=items;v.update(g,1.25,w.camera);assert.equal(w.feedback.particles,items);assert.equal(v.smokes.size,0);assert.equal(v.smokePool.stats.active,0);assert.equal(v.smokePool.stats.allocated,allocated);}finally{w.feedback.particles=[];v.dispose();}});
test('repair restores tier0/clears only owned plume without new run/save fields',()=>{const w=world(),g=actor(w),keys=Object.keys(g.run);try{born(w,g);const other=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());w.feedback.add(other,new THREE.Vector3(),2,'chip');g.run.hp=220;w.damageVisuals.update(g,.1,w.camera);assert.equal(w.damageVisuals.smokes.size,0);assert.equal(w.damageVisuals.tier,0);assert.equal(w.damageVisuals.entry.mesh.visible,false);assert.equal(w.feedback.particles.length,1);assert.equal(w.feedback.particles[0].mesh,other);assert.deepEqual(Object.keys(g.run),keys);assert.equal(g.run.time,5);assert.equal(g.run.coins,3);}finally{w.feedback.reset();w.damageVisuals.dispose();}});
test('growth/root replacement and repeated clear release old body/pool and bind current HP once',()=>{const w=world(),g=actor(w);try{let previous;for(const stage of[1,2,3]){if(previous)previous.removeFromParent();g.run.stage=stage;g.player.root=w.castle(stage);born(w,g);assert.equal(w.damageVisuals.root,g.player.root);assert.equal(w.damageVisuals.tier,3);assert.equal(w.damageVisuals.smokes.size,1);previous=g.player.root;}w.damageVisuals.clear();w.damageVisuals.clear();assert.equal(w.damageVisuals.root,null);assert.equal(w.damageVisuals.smokePool.stats.active,0);assert.equal(w.feedback.particles.length,0);}finally{w.damageVisuals.dispose();}});
test('reduced/pause/hidden/outcome/heal controls clear owned smoke and preserve original damage tiers',()=>{for(const mode of['reduced','pause','hidden','outcome','heal']){const w=world(),g=actor(w);try{born(w,g);if(mode==='pause')g.screen='pause';if(mode==='outcome')g.run.outcome='defeat';if(mode==='heal')g.run.hp=220;w.damageVisuals.update(g,.1,w.camera,mode==='reduced',mode==='hidden');assert.equal(w.damageVisuals.smokes.size,0);assert.equal(w.damageVisuals.tier,mode==='heal'?0:3);assert.equal(g.run.time,5);}finally{w.damageVisuals.dispose();}}});
test('unsupported camera suppresses cosmetic emission while original cracks/HP remain active',()=>{const w=world(),g=actor(w);try{w.camera.isOrthographicCamera=false;w.damageVisuals.update(g,1.25,w.camera);assert.equal(w.damageVisuals.smokes.size,0);assert.equal(w.damageVisuals.tier,3);assert.equal(w.damageVisuals.entry.mesh.visible,true);assert.equal(g.run.hp,20);}finally{w.damageVisuals.dispose();}});

test('deliberate procedural CPU box control retains warm smoke admission and repair cleanup',()=>{const m=Object.fromEntries(ORACLE.map(o=>{const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));return[o.id,root];})),w={models:m,actors:new THREE.Group(),effects:new THREE.Group(),camera:new THREE.OrthographicCamera(-10,10,10,-10,.1,100),asset:World.prototype.asset,cacheActorHull:World.prototype.cacheActorHull,castle:World.prototype.castle,remove:World.prototype.remove,disposeRuntime:World.prototype.disposeRuntime};w.camera.position.set(22,30,28);w.camera.lookAt(0,0,0);w.feedback=new CombatFeedback(w);w.damageVisuals=new HullDamageVisuals(w);try{w.damageVisuals.prepare(m);const g=actor(w);born(w,g);assert.equal(w.damageVisuals.smokes.size,1);g.run.hp=220;w.damageVisuals.update(g,0,w.camera);assert.equal(w.damageVisuals.smokes.size,0);assert.equal(w.damageVisuals.tier,0);}finally{w.damageVisuals.dispose();}});

test('shared immutable geometry clones reuse one prepared apex record and dispose exact ownership',()=>{const w=world(),clones=Object.fromEntries(Object.entries(w.models).map(([id,m])=>[id,m.clone(true)])),other={...w,models:clones,actors:new THREE.Group(),effects:new THREE.Group()},held=[];other.feedback=new CombatFeedback(other);other.damageVisuals=new HullDamageVisuals(other);try{other.damageVisuals.prepare(clones);for(const stage of[1,2,3]){const first=w.damageVisuals.templates.get(stage).smokeApexCache,second=other.damageVisuals.templates.get(stage).smokeApexCache;assert.equal(first,second,'Shared source clone must reuse geometry/stage/rest record');assert.equal(first?.references??0,2);assert.equal(first.candidates.length,3);held.push(first);}w.damageVisuals.clear();assert.equal(held[0].references,2);other.damageVisuals.dispose();assert.equal(held[0].references,1);w.damageVisuals.dispose();for(const r of held){assert.equal(r.references,0);assert.equal(r.released,true);assert.equal(r.bucket.references,0);}}finally{other.damageVisuals.dispose();w.damageVisuals.dispose();}});
test('attribute version and source disposal invalidate prepared apex without hot-path rebuilding',()=>{const w=world(),g=actor(w),body=hullDamageBody(g.player.root.userData.model),ray=THREE.Ray.prototype.intersectTriangle;let scans=0;try{born(w,g);w.damageVisuals.clearSmoke();body.geometry.attributes.position.needsUpdate=true;THREE.Ray.prototype.intersectTriangle=function(...args){scans++;return ray.apply(this,args);};w.damageVisuals.update(g,1.25,w.camera);assert.equal(w.damageVisuals.smokes.size,0,'Changed source version must not emit from stale cache');assert.equal(scans,0);assert.equal(w.damageVisuals.entry.mesh.visible,true,'Cracks remain active on cache miss');const record=w.damageVisuals.entry.smokeApexCache;body.geometry.dispose();assert.equal(record?.bucket.disposed??false,true);w.damageVisuals.update(g,1.25,w.camera);assert.equal(w.damageVisuals.smokes.size,0);assert.equal(scans,0);}finally{THREE.Ray.prototype.intersectTriangle=ray;w.damageVisuals.dispose();}});
test('new geometry identity gets a distinct record and local rest transform misses without new scans',()=>{const w=world(),g=actor(w),body=hullDamageBody(g.player.root.userData.model),models2=Object.fromEntries(Object.entries(w.models).map(([id,m])=>[id,m.clone(true)])),other={...w,models:models2,actors:new THREE.Group(),effects:new THREE.Group()},ray=THREE.Ray.prototype.intersectTriangle;let scans=0;other.feedback=new CombatFeedback(other);other.damageVisuals=new HullDamageVisuals(other);try{for(const m of Object.values(models2)){const b=hullDamageBody(m);b.geometry=b.geometry.clone();}other.damageVisuals.prepare(models2);assert.notEqual(w.damageVisuals.templates.get(1).smokeApexCache,other.damageVisuals.templates.get(1).smokeApexCache);born(w,g);w.damageVisuals.clearSmoke();body.position.x+=.01;THREE.Ray.prototype.intersectTriangle=function(...args){scans++;return ray.apply(this,args);};w.damageVisuals.update(g,1.25,w.camera);assert.equal(w.damageVisuals.smokes.size,0,'Changed local rest transform cannot reuse cache');assert.equal(scans,0);body.position.x-=.01;w.damageVisuals.update(g,1.25,w.camera);assert.equal(w.damageVisuals.smokes.size,1,'Restored exact transform reuses immutable cache');assert.equal(scans,0);}finally{THREE.Ray.prototype.intersectTriangle=ray;other.damageVisuals.dispose();w.damageVisuals.dispose();}});
