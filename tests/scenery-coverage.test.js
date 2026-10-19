import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {WebGLShadowMap} from 'three/src/renderers/webgl/WebGLShadowMap.js';
import {WebGLBackground} from 'three/src/renderers/webgl/WebGLBackground.js';
import * as subject from '../src/scenery-occlusion.js';

function renderer({samples=4,buffers=1,antialias=true,target=null,lost=false}={}){
 const gl={SAMPLES:0x80a9,SAMPLE_BUFFERS:0x80a8,COLOR_BUFFER_BIT:0x4000,getContextAttributes:()=>({antialias}),isContextLost:()=>lost,getParameter:parameter=>parameter===0x80a9?samples:parameter===0x80a8?buffers:undefined,clear(){},colorMask(){}};
 return {getContext:()=>gl,getRenderTarget:()=>target,state:{buffers:{color:{setMask(){}}}}};
}
const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
function authored(material){return {color:material.color.toArray(),roughness:material.roughness,metalness:material.metalness,opacity:material.opacity,transparent:material.transparent,blending:material.blending,depthWrite:material.depthWrite,depthTest:material.depthTest,alphaTest:material.alphaTest,alphaHash:material.alphaHash,side:material.side,map:material.map,normalMap:material.normalMap,roughnessMap:material.roughnessMap,metalnessMap:material.metalnessMap,alphaMap:material.alphaMap,userData:structuredClone(material.userData)};}
function geometryBytes(geometry){return {groups:structuredClone(geometry.groups),index:crypto.createHash('sha256').update(Buffer.from(geometry.index.array.buffer)).digest('hex'),attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,a])=>[name,crypto.createHash('sha256').update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex')])),box:geometry.boundingBox?.clone()??null,sphere:geometry.boundingSphere?.clone()??null};}

test('coverage selector requires a live antialiased multisample default buffer and safely falls back for incomplete, lost, throwing or target contexts',()=>{
 assert.equal(typeof subject.sceneryCoverageMode,'function');
 assert.equal(subject.sceneryCoverageMode(renderer()),'multisample');
 assert.equal(subject.sceneryCoverageMode(renderer({samples:2})),'multisample');
 for(const value of [undefined,null,{},renderer({samples:0}),renderer({samples:1}),renderer({samples:NaN}),renderer({buffers:0}),renderer({buffers:NaN}),renderer({antialias:false}),renderer({antialias:null}),renderer({lost:true}),renderer({target:{}}),{...renderer(),getRenderTarget:()=>undefined},{getContext:()=>null,getRenderTarget:()=>null},{getContext:()=>({}),getRenderTarget:()=>null},{getContext(){throw Error('context');},getRenderTarget:()=>null},{...renderer(),getRenderTarget(){throw Error('target');}}])assert.equal(subject.sceneryCoverageMode(value),'dither');
 const query=renderer();query.getContext().getParameter=()=>{throw Error('parameter');};assert.equal(subject.sceneryCoverageMode(query),'dither');
 const lost=renderer();lost.getContext().isContextLost=()=>{throw Error('lost');};assert.equal(subject.sceneryCoverageMode(lost),'dither');
 for(const name of ['clear','colorMask']){const incomplete=renderer();delete incomplete.getContext()[name];assert.equal(subject.sceneryCoverageMode(incomplete),'dither');}const noMask=renderer();delete noMask.state.buffers.color.setMask;assert.equal(subject.sceneryCoverageMode(noMask),'dither');
});

test('alpha-only frame completion restores GL and renderer color-mask cache, changes no RGB/depth/stencil state and restores masks even when clear throws',()=>{
 const effect=new subject.SceneryOcclusion({coverageMode:'multisample'}),scene=new THREE.Scene(),r=renderer(),gl=r.getContext(),calls=[];scene.background=new THREE.Color('#c6dca3');effect.uniforms.hearthOcclusionEnabled.value=1;let cached=false;
 r.state.buffers.color.setMask=value=>{calls.push(['cachedMask',value]);if(cached!==value){gl.colorMask(value,value,value,value);cached=value;}};
 gl.colorMask=(...value)=>calls.push(['rawMask',...value]);gl.clear=bits=>calls.push(['clear',bits]);gl.getParameter=()=>{throw Error('No per-frame parameter query.');};gl.clearColor=()=>{throw Error('Existing opaque Color background clear alpha must be reused.');};gl.depthMask=gl.stencilMask=gl.viewport=gl.scissor=gl.enable=gl.disable=()=>{throw Error('Unrelated GL state must remain untouched.');};
 assert.equal(effect.finishFrame(r,scene),true);assert.deepEqual(calls,[['cachedMask',true],['rawMask',true,true,true,true],['rawMask',false,false,false,true],['clear',gl.COLOR_BUFFER_BIT],['rawMask',true,true,true,true]]);assert.equal(cached,true);assert.equal(effect.snapshot().stats.alphaClears,1);
 calls.length=0;assert.equal(effect.finishFrame(r,scene),true);assert.deepEqual(calls,[['cachedMask',true],['rawMask',false,false,false,true],['clear',gl.COLOR_BUFFER_BIT],['rawMask',true,true,true,true]]);assert.equal(effect.snapshot().stats.alphaClears,2);
 calls.length=0;gl.clear=()=>{calls.push(['clearThrow']);throw Error('clear failed');};assert.throws(()=>effect.finishFrame(r,scene),/clear failed/);assert.deepEqual(calls,[['cachedMask',true],['rawMask',false,false,false,true],['clearThrow'],['rawMask',true,true,true,true]]);assert.equal(cached,true);assert.equal(effect.snapshot().stats.alphaClears,2);
});

test('actual Scene callback chains once after the existing callback and clears only active multisample default-buffer Color backgrounds with Three opaque clear-alpha contract',()=>{
 const effect=new subject.SceneryOcclusion({coverageMode:'multisample'}),scene=new THREE.Scene(),r=renderer(),gl=r.getContext(),events=[];scene.background=new THREE.Color('#c6dca3');effect.uniforms.hearthOcclusionEnabled.value=1;
 const clearValues=[];r.outputColorSpace=THREE.SRGBColorSpace;r.xr={getEnvironmentBlendMode:()=>undefined};r.clear=()=>{};r.state.buffers.depth={setTest(){},setMask(){}};r.state.buffers.color.setClear=(...values)=>clearValues.push(values);
 const background=new WebGLBackground(r,{get:()=>null},r.state,{},true,true);background.render(scene);assert.equal(clearValues.length,1);assert.equal(clearValues[0][3],1,'Installed Three Color background explicitly clears alpha to one.');const opaqueClear=structuredClone(clearValues);
 gl.clear=bits=>events.push(['clear',bits]);gl.colorMask=(...value)=>events.push(['mask',...value]);r.state.buffers.color.setMask=value=>events.push(['cache',value]);gl.getParameter=()=>{throw Error('No frame query.');};
 const camera=new THREE.Camera();scene.onAfterRender=function(...args){assert.equal(this,scene);assert.deepEqual(args,[r,scene,camera]);events.push(['previous']);return 'existing-return';};assert.equal(effect.bindScene(scene),scene);const callback=scene.onAfterRender;effect.bindScene(scene);assert.equal(scene.onAfterRender,callback);assert.equal(scene.onAfterRender(r,scene,camera),'existing-return');assert.deepEqual(events,[['previous'],['cache',true],['mask',false,false,false,true],['clear',gl.COLOR_BUFFER_BIT],['mask',true,true,true,true]]);assert.deepEqual(clearValues,opaqueClear);assert.equal(effect.snapshot().stats.alphaClears,1);
 const fallback=new subject.SceneryOcclusion();fallback.uniforms.hearthOcclusionEnabled.value=1;events.length=0;assert.equal(fallback.finishFrame(r,scene),false);assert.deepEqual(events,[]);
 for(const prepare of [()=>{effect.uniforms.hearthOcclusionEnabled.value=0;},()=>{r.getRenderTarget=()=>({});},()=>{gl.isContextLost=()=>true;},()=>{scene.background=null;},()=>{scene.background=new THREE.Texture();},()=>{r.getContext=()=>null;},()=>{gl.clear=undefined;},()=>{gl.colorMask=undefined;},()=>{r.state.buffers.color.setMask=undefined;}]){effect.uniforms.hearthOcclusionEnabled.value=1;r.getRenderTarget=()=>null;r.getContext=()=>gl;gl.isContextLost=()=>false;scene.background=new THREE.Color();gl.clear=bits=>events.push(['clear',bits]);gl.colorMask=(...value)=>events.push(['mask',...value]);r.state.buffers.color.setMask=value=>events.push(['cache',value]);events.length=0;prepare();assert.equal(effect.finishFrame(r,scene),false);assert.deepEqual(events,[]);}
 background.dispose();
});

test('multisample binding changes only its explicit runtime flag once, preserves authored PBR/alpha state, installs clones and separates stable shader keys from the default fallback',()=>{
 const fallback=new subject.SceneryOcclusion(),effect=new subject.SceneryOcclusion({coverageMode:'multisample'});
 assert.equal(fallback.options.coverageMode,'dither');assert.equal(effect.snapshot().coverageMode,'multisample');assert.ok(Object.isFrozen(effect.options));
 for(const coverageMode of ['toString','auto',null,1])assert.throws(()=>new subject.SceneryOcclusion({coverageMode}),/options|occlusion/i);
 const texture=new THREE.DataTexture(new Uint8Array([240,210,180,255]),1,1),normal=texture.clone(),material=new THREE.MeshStandardMaterial({map:texture,normalMap:normal,roughnessMap:texture,metalnessMap:texture,roughness:.91,metalness:.14,side:THREE.DoubleSide});material.userData.sharedAsset=true;
 const original=authored(material),originalVersion=material.version;assert.equal(material.alphaToCoverage,false);assert.equal(effect.bindMaterial(material),material);assert.equal(material.alphaToCoverage,true);assert.deepEqual(authored(material),original);assert.ok(material.version>originalVersion);
 const version=material.version,key=material.customProgramCacheKey();effect.bindMaterial(material);assert.equal(material.version,version);assert.equal(material.customProgramCacheKey(),key);assert.ok(key.includes('hearth-scenery-occlusion-v3'));assert.ok(key.includes('multisample'));
 const clone=material.clone();effect.bindMaterial(clone);const output=shader();clone.onBeforeCompile(output,{});assert.equal(clone.alphaToCoverage,true);assert.ok(output.fragmentShader.includes('diffuseColor.a*=hearthCoverage'));
 const plain=new THREE.MeshStandardMaterial();fallback.bindMaterial(plain);assert.equal(plain.alphaToCoverage,false);assert.notEqual(plain.customProgramCacheKey(),key);
 for(const unsupported of [new THREE.MeshBasicMaterial(),new THREE.MeshStandardMaterial({transparent:true}),new THREE.MeshStandardMaterial({blending:THREE.AdditiveBlending})]){effect.bindMaterial(unsupported);assert.equal(unsupported.alphaToCoverage,false);}
});

test('multisample output retains the same finite mask/depth gate and vertex path while the dither fallback retains its deterministic discard',()=>{
 const results={};
 for(const coverageMode of ['multisample','dither']){const effect=new subject.SceneryOcclusion({coverageMode,depthMode:'center'}),material=new THREE.MeshStandardMaterial();let chained=0;material.onBeforeCompile=value=>{chained++;value.uniforms.existing={value:1};};material.customProgramCacheKey=()=> 'existing-key';effect.bindMaterial(material);const output=shader(),vertex=output.vertexShader;material.onBeforeCompile(output,{});assert.equal(chained,1);assert.equal(output.vertexShader,vertex);assert.equal(output.uniforms.existing.value,1);assert.equal(output.uniforms.hearthOcclusionRect,effect.uniforms.hearthOcclusionRect);assert.ok(output.fragmentShader.includes('vViewPosition.z<hearthOcclusionFrontDepth-hearthOcclusionShape.w'));assert.ok(output.fragmentShader.includes('all(lessThanEqual(abs(gl_FragCoord.xy-hearthOcclusionRect.xy),hearthOcclusionRect.zw))'));assert.ok(output.fragmentShader.includes('mix(1.0,hearthOcclusionShape.z,hearthOcclusionMask(gl_FragCoord.xy))'));assert.equal(material.transparent,false);assert.equal(material.blending,THREE.NormalBlending);assert.equal(material.depthWrite,true);assert.equal(material.opacity,1);results[coverageMode]=output.fragmentShader;}
 assert.ok(results.multisample.includes('diffuseColor.a*=hearthCoverage'));assert.ok(!results.multisample.includes('if (hearthCoverage<hearthThreshold) discard'));
 assert.ok(results.dither.includes('if (hearthCoverage<hearthThreshold) discard'));assert.ok(!results.dither.includes('diffuseColor.a*=hearthCoverage'));
});

test('actual installed Three shadow material excludes camera coverage, retains opaque source texture alpha and preserves original geometry',()=>{
 const effect=new subject.SceneryOcclusion({coverageMode:'multisample'}),texture=new THREE.DataTexture(new Uint8Array([220,240,210,255]),1,1),material=new THREE.MeshStandardMaterial({map:texture}),geometry=new THREE.BoxGeometry(1,2,1),original=geometryBytes(geometry);effect.bindMaterial(material);assert.equal(material.alphaToCoverage,true);
 const mesh=new THREE.Mesh(geometry,material),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight();mesh.castShadow=true;mesh.frustumCulled=false;scene.add(mesh,light,light.target);light.position.set(0,10,5);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);light.shadow.mapSize.set(16,16);
 const captured=[],noop=()=>{},fake={getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget:noop,clear:noop,localClippingEnabled:false,state:{setBlending:noop,setScissorTest:noop,viewport:noop,buffers:{depth:{getReversed:()=>false,setTest:noop},color:{setClear:noop}}},renderBufferDirect(shadowCamera,unused,source,depth,object){captured.push({source,depth,object});}};
 const shadows=new WebGLShadowMap(fake,{update:object=>object.geometry},{maxTextureSize:1024});shadows.enabled=true;shadows.render([light],scene,camera);assert.equal(captured.length,1);const depth=captured[0].depth;assert.notEqual(depth,material);assert.equal(depth.alphaToCoverage,false,'Three does not copy the main-pass multisample flag into its shadow material.');assert.equal(depth.alphaTest,.5,'Three approximates alpha-to-coverage for authored texture alpha only.');assert.equal(depth.map,texture);assert.equal(texture.image.data[3],255);assert.equal(depth.opacity,1);assert.equal(depth.transparent,false);const output={...shader(),fragmentShader:THREE.ShaderLib.depth.fragmentShader};depth.onBeforeCompile(output,{});assert.ok(!output.fragmentShader.includes('hearthOcclusion'));assert.equal(Object.keys(output.uniforms).length,0);assert.deepEqual(geometryBytes(geometry),original);assert.equal(mesh.customDepthMaterial,undefined);light.shadow.map.dispose();
});
