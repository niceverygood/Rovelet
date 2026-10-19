import * as THREE from 'three';

// Retain the scenery family tag; the v3 mode suffix distinguishes both programs.
const PROGRAM_KEY='hearth-scenery-occlusion-v2|hearth-scenery-occlusion-v3';
const COMMON='#include <common>',ALPHA_TEST='#include <alphatest_fragment>';
const DECLARATIONS=`
uniform float hearthOcclusionEnabled;
uniform vec4 hearthOcclusionRect;
uniform vec4 hearthOcclusionShape;
uniform float hearthOcclusionFrontDepth;
float hearthOcclusionBayer2(vec2 p) {
  p=mod(p,2.0);
  return mod(2.0*p.x+3.0*p.y,4.0);
}
float hearthOcclusionBayer4(vec2 p) {
  return 4.0*hearthOcclusionBayer2(p)+hearthOcclusionBayer2(floor(p*0.5));
}
float hearthOcclusionMask(vec2 pixel) {
  float radius=hearthOcclusionShape.x;
  vec2 q=abs(pixel-hearthOcclusionRect.xy)-(hearthOcclusionRect.zw-vec2(radius));
  float distanceToEdge=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
  return 1.0-smoothstep(-hearthOcclusionShape.y,0.0,distanceToEdge);
}
`;
const COVERAGE_GATE=`
if (hearthOcclusionEnabled>0.5 &&
    vViewPosition.z<hearthOcclusionFrontDepth-hearthOcclusionShape.w &&
    all(lessThanEqual(abs(gl_FragCoord.xy-hearthOcclusionRect.xy),hearthOcclusionRect.zw))) {
  float hearthCoverage=mix(1.0,hearthOcclusionShape.z,hearthOcclusionMask(gl_FragCoord.xy));
`;
const DISCARD=COVERAGE_GATE+`
  float hearthThreshold=(hearthOcclusionBayer4(floor(gl_FragCoord.xy))+0.5)/16.0;
  if (hearthCoverage<hearthThreshold) discard;
}
`;
const MULTISAMPLE=COVERAGE_GATE+`
  diffuseColor.a*=hearthCoverage;
}
`;
const finiteVector=vector=>Number.isFinite(vector.x)&&Number.isFinite(vector.y)&&Number.isFinite(vector.z);
const finiteMatrix=matrix=>matrix.elements.every(Number.isFinite);
const visibleAncestors=object=>{for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
function uniqueMarker(source,marker){return source.split(marker).length===2;}

// Select once before binding materials. Targets and unverified contexts retain dither.
export function sceneryCoverageMode(renderer){
 try{
  if(typeof renderer?.getContext!=='function'||typeof renderer?.getRenderTarget!=='function'||typeof renderer?.state?.buffers?.color?.setMask!=='function'||renderer.getRenderTarget()!==null)return 'dither';
  const gl=renderer.getContext();
  if(typeof gl?.getContextAttributes!=='function'||typeof gl?.isContextLost!=='function'||typeof gl?.getParameter!=='function'||typeof gl?.clear!=='function'||typeof gl?.colorMask!=='function'||gl.isContextLost()||gl.getContextAttributes()?.antialias!==true||!Number.isFinite(gl.SAMPLES)||!Number.isFinite(gl.SAMPLE_BUFFERS)||!Number.isFinite(gl.COLOR_BUFFER_BIT))return 'dither';
  const samples=gl.getParameter(gl.SAMPLES),buffers=gl.getParameter(gl.SAMPLE_BUFFERS);
  return Number.isInteger(samples)&&samples>=2&&Number.isInteger(buffers)&&buffers>=1?'multisample':'dither';
 }catch{return 'dither';}
}

// Camera readability only. Original textures/geometry and light-space shadows remain unchanged.
export class SceneryOcclusion{
 constructor({coverage=.18,padding=18,feather=12,cornerRadius=18,depthEpsilon=.08,depthMode='near',coverageMode='dither'}={}){
  if(!Number.isFinite(coverage)||coverage<0||coverage>1||
     ![padding,feather,cornerRadius,depthEpsilon].every(Number.isFinite)||
     padding<0||feather<=0||cornerRadius<0||depthEpsilon<0||!['near','center','far'].includes(depthMode)||!['dither','multisample'].includes(coverageMode))throw new TypeError('Invalid scenery occlusion options.');
  this.options=Object.freeze({coverage,padding,feather,cornerRadius,depthEpsilon,depthMode,coverageMode});this.depths={near:0,center:0,root:0,far:0};
  this.uniforms={hearthOcclusionEnabled:{value:0},hearthOcclusionRect:{value:new THREE.Vector4()},hearthOcclusionShape:{value:new THREE.Vector4()},hearthOcclusionFrontDepth:{value:0}};
  this.stats={boundMaterials:0,skippedMaterials:0,updates:0,boundsBuilds:0,alphaClears:0};
  this.bound=new WeakSet();this.skipped=new WeakSet();this.bounds=new WeakMap();this.scenes=new WeakSet();
  this.bufferSize=new THREE.Vector2();this.inverseRoot=new THREE.Matrix4();this.localMatrix=new THREE.Matrix4();this.instanceMatrix=new THREE.Matrix4();this.box=new THREE.Box3();
  this.point=new THREE.Vector3();this.viewPoint=new THREE.Vector3();this.projected=new THREE.Vector3();
 }
 bindScene(scene){
  if(!scene?.isScene||typeof scene.onAfterRender!=='function'||this.scenes.has(scene))return scene;
  const previous=scene.onAfterRender,effect=this;
  scene.onAfterRender=function(...args){const result=previous.apply(this,args);effect.finishFrame(args[0],scene);return result;};
  this.scenes.add(scene);return scene;
 }
 finishFrame(renderer,scene){
  if(this.options.coverageMode!=='multisample'||this.uniforms.hearthOcclusionEnabled.value!==1||!scene?.isScene||!scene.background?.isColor)return false;
  let gl,color;
  try{
   if(typeof renderer?.getContext!=='function'||typeof renderer?.getRenderTarget!=='function'||renderer.getRenderTarget()!==null)return false;
   gl=renderer.getContext();color=renderer.state?.buffers?.color;
   if(typeof color?.setMask!=='function'||typeof gl?.isContextLost!=='function'||typeof gl?.clear!=='function'||typeof gl?.colorMask!=='function'||!Number.isFinite(gl.COLOR_BUFFER_BIT)||gl.isContextLost())return false;
  }catch{return false;}
  // World uses Three's Color background clear alpha of one. Retain its RGB,
  // depth/stencil and clear color; make only the displayed buffer alpha opaque.
  color.setMask(true);
  try{gl.colorMask(false,false,false,true);gl.clear(gl.COLOR_BUFFER_BIT);this.stats.alphaClears++;return true;}
  finally{gl.colorMask(true,true,true,true);}
 }
 bindMaterial(material){
  if(!material?.isMeshStandardMaterial||material.transparent||material.blending!==THREE.NormalBlending){
   if(material&&!this.skipped.has(material)){this.skipped.add(material);this.stats.skippedMaterials++;}
   return material;
  }
  if(this.bound.has(material))return material;
  const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey(),uniforms=this.uniforms,coverageMode=this.options.coverageMode;
  material.onBeforeCompile=function(shader,renderer){
   previousCompile.call(this,shader,renderer);
   if(!uniqueMarker(shader.fragmentShader,COMMON)||!uniqueMarker(shader.fragmentShader,ALPHA_TEST)||shader.fragmentShader.includes('float hearthOcclusionBayer2'))throw new Error('Unsupported scenery occlusion shader layout.');
   Object.assign(shader.uniforms,uniforms);
   shader.fragmentShader=shader.fragmentShader.replace(COMMON,COMMON+'\n'+DECLARATIONS).replace(ALPHA_TEST,ALPHA_TEST+'\n'+(coverageMode==='multisample'?MULTISAMPLE:DISCARD));
  };
  material.customProgramCacheKey=()=>previousKey+'|'+PROGRAM_KEY+':'+coverageMode;
  // Only main-pass sample coverage changes; Three uses a separate shadow material.
  if(coverageMode==='multisample')material.alphaToCoverage=true;
  material.needsUpdate=true;
  this.bound.add(material);this.stats.boundMaterials++;return material;
 }
 localBounds(actor,revision){
  const old=this.bounds.get(actor);if(old&&old.revision===revision)return old.box;
  actor.updateWorldMatrix(true,true);if(!finiteMatrix(actor.matrixWorld)||Math.abs(actor.matrixWorld.determinant())<1e-12)return null;this.inverseRoot.copy(actor.matrixWorld).invert();
  const box=new THREE.Box3();
  actor.traverse(node=>{
   if(!node.isMesh||!node.geometry||node.isSkinnedMesh||Object.values(node.geometry.morphAttributes).some(attributes=>attributes.length))return;
   for(let parent=node;parent;parent=parent.parent){if(!parent.visible)return;if(parent===actor)break;}
   let source;
   // Never populate a cache on shared source geometry. Missing bounds are
   // read into temporary boxes only during the actor/revision cache build.
   const positions=node.geometry.getAttribute('position');if(!positions?.count)return;
   const geometryBox=node.geometry.boundingBox??new THREE.Box3().setFromBufferAttribute(positions);
   if(!finiteVector(geometryBox.min)||!finiteVector(geometryBox.max))return;
   if(node.isInstancedMesh){source=node.boundingBox;if(!source){source=new THREE.Box3();for(let i=0;i<node.count;i++){node.getMatrixAt(i,this.instanceMatrix);if(!finiteMatrix(this.instanceMatrix))return;source.union(this.box.copy(geometryBox).applyMatrix4(this.instanceMatrix));}}}
   else source=geometryBox;
   if(!source||source.isEmpty()||!finiteVector(source.min)||!finiteVector(source.max))return;
   this.localMatrix.multiplyMatrices(this.inverseRoot,node.matrixWorld);if(!finiteMatrix(this.localMatrix))return;
   box.union(this.box.copy(source).applyMatrix4(this.localMatrix));
  });
  this.bounds.set(actor,{revision,box});this.stats.boundsBuilds++;return box;
 }
 update({renderer,camera,actor,enabled=false,revision=actor?.weaponEmitters}={}){
  this.stats.updates++;this.uniforms.hearthOcclusionEnabled.value=0;
  if(!enabled||!actor?.isObject3D||!visibleAncestors(actor)||typeof renderer?.getDrawingBufferSize!=='function'||typeof renderer?.getPixelRatio!=='function'||!camera?.isCamera)return;
  const bounds=this.localBounds(actor,revision);if(!bounds||bounds.isEmpty()||!finiteVector(bounds.min)||!finiteVector(bounds.max))return;
  actor.updateWorldMatrix(true,false);camera.updateMatrixWorld();renderer.getDrawingBufferSize(this.bufferSize);
  const width=this.bufferSize.x,height=this.bufferSize.y,pixelRatio=renderer.getPixelRatio();
  if(![width,height,pixelRatio,camera.near,camera.far].every(Number.isFinite)||width<=0||height<=0||pixelRatio<=0||camera.near<0||camera.far<=camera.near||!finiteMatrix(actor.matrixWorld)||Math.abs(actor.matrixWorld.determinant())<1e-12)return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,front=Infinity,back=-Infinity;
  for(let corner=0;corner<8;corner++){
   this.point.set(corner&1?bounds.max.x:bounds.min.x,corner&2?bounds.max.y:bounds.min.y,corner&4?bounds.max.z:bounds.min.z).applyMatrix4(actor.matrixWorld);
   this.viewPoint.copy(this.point).applyMatrix4(camera.matrixWorldInverse);
   this.projected.copy(this.point).project(camera);
   if(!finiteVector(this.viewPoint)||!finiteVector(this.projected))return;
   front=Math.min(front,-this.viewPoint.z);back=Math.max(back,-this.viewPoint.z);
   const x=(this.projected.x*.5+.5)*width,y=(this.projected.y*.5+.5)*height;
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  if(!Number.isFinite(front)||!Number.isFinite(back)||front<=camera.near||front>=camera.far||maxX<=0||maxY<=0||minX>=width||minY>=height||maxX-minX<=1e-6||maxY-minY<=1e-6)return;
  const {padding,feather,cornerRadius,coverage,depthEpsilon}=this.options;
  const halfX=(maxX-minX)*.5+padding*pixelRatio,halfY=(maxY-minY)*.5+padding*pixelRatio;
  if(halfX<=0||halfY<=0)return;
  this.uniforms.hearthOcclusionRect.value.set((minX+maxX)*.5,(minY+maxY)*.5,halfX,halfY);
  this.uniforms.hearthOcclusionShape.value.set(Math.min(cornerRadius*pixelRatio,halfX*.3,halfY*.3),Math.min(feather*pixelRatio,halfX,halfY),coverage,depthEpsilon);
  this.viewPoint.setFromMatrixPosition(actor.matrixWorld).applyMatrix4(camera.matrixWorldInverse);const rootDepth=-this.viewPoint.z;if(!Number.isFinite(rootDepth))return;
  Object.assign(this.depths,{near:front,center:(front+back)*.5,root:rootDepth,far:back});
  // The retained uniform name is historical: it holds the selected limit,
  // not necessarily the nearest actor point. Final mode needs pixel QA.
  this.uniforms.hearthOcclusionFrontDepth.value=this.depths[this.options.depthMode];this.uniforms.hearthOcclusionEnabled.value=1;
 }
 snapshot(){return {enabled:this.uniforms.hearthOcclusionEnabled.value,center:this.uniforms.hearthOcclusionRect.value.toArray().slice(0,2),halfSize:this.uniforms.hearthOcclusionRect.value.toArray().slice(2),frontDepth:this.uniforms.hearthOcclusionFrontDepth.value,depthMode:this.options.depthMode,coverageMode:this.options.coverageMode,depths:{...this.depths},shape:this.uniforms.hearthOcclusionShape.value.toArray(),stats:{...this.stats}};}
}
