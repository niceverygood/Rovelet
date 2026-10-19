// WORK candidate. Prepare all geometry and pooled objects before combat starts.
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ObjectPool} from './effect-pool.js';
import {RUNTIME_LIMITS} from './runtime-limits.js';

export const HULL_DAMAGE_LIMITS=Object.freeze({tiers:Object.freeze([.65,.35,.15]),atlasSize:256,patches:6,triangles:1536,smoke:2,smokeInterval:1.25,smokeLife:1.2});
const IDS=['','castle-small','castle-medium','castle-large'];
const SMOKE_BASE_SIZES=Object.freeze([0,.38,.5,.6]);
// Authored actual-body wall rays: axis, side, bbox height, lateral fraction, projector factor.
// Original embedded albedo/UV were inspected on CPU; no runtime texture read.
const WALL_RAYS=Object.freeze({"1":[["z",1,0.3,0.15,0.5],["z",-1,0.3,0.15,0.75],["x",-1,0.5,0.675,0.5],["x",1,0.5,0.85,0.5],["x",-1,0.55,0.5,0.5],["x",1,0.55,0.85,0.5]],"2":[["z",1,0.5,0.675,1],["z",-1,0.5,0.675,0.75],["x",-1,0.5,0.5,0.75],["x",1,0.5,0.85,0.75],["x",-1,0.3,0.85,1],["x",1,0.5,0.15,0.5]],"3":[["z",1,0.4,0.325,0.75],["z",-1,0.5,0.5,1],["x",-1,0.5,0.325,0.75],["x",1,0.5,0.675,1],["x",-1,0.6,0.5,1],["x",1,0.6,0.5,1]]});
const finiteVector=v=>v?.isVector3&&[v.x,v.y,v.z].every(Number.isFinite);
export function hullDamageTier(hp,maxHp){if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<=0)return 0;const ratio=THREE.MathUtils.clamp(hp/maxHp,0,1);return ratio<=.15?3:ratio<=.35?2:ratio<=.65?1:0;}
function excluded(node){for(let n=node;n;n=n.parent)if(n.visible===false||n.userData?.wheel||n.userData?.rollingDetail||n.userData?.wheelSourceArchive||n.userData?.derivedWheel||n.userData?.attachment||n.userData?.hullDamageOverlay||/^(gun-|wheel-|rolling-tread|medium-source-archive|medium-parallel-wheels)/.test(n.name))return true;return false;}
export function hullDamageBody(model){let body=null,count=0;model?.traverse(node=>{if(!node.isMesh||node.isSkinnedMesh||node.morphTargetInfluences||excluded(node))return;const p=node.geometry?.getAttribute('position'),n=node.geometry?.index?.count??p?.count??0;if(p&&n>count){body=node;count=n;}});return body;}

export function createHullDamagePixels(){
 const size=256,data=new Uint8Array(size*size*4);let tileX=0,tileY=0,state=0x78b1a93d;const noise=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const paint=(x,y,alpha)=>{x=Math.round(x);y=Math.round(y);if(x<tileX+6||x>tileX+121||y<tileY+6||y>tileY+121)return;const i=(y*size+x)*4;data[i]=87;data[i+1]=65;data[i+2]=48;data[i+3]=Math.max(data[i+3],Math.round(255*alpha));};
 const line=(x0,y0,x1,y1,width,alpha)=>{const steps=Math.ceil(Math.hypot(x1-x0,y1-y0)*2);for(let s=0;s<=steps;s++){const t=steps?s/steps:0;for(let dx=-width;dx<=width;dx++)for(let dy=-width;dy<=width;dy++)if(dx*dx+dy*dy<=width*width+.1)paint(x0+(x1-x0)*t+dx,y0+(y1-y0)*t+dy,alpha);}};
 for(let tile=0;tile<3;tile++){const ox=tile%2*128,oy=Math.floor(tile/2)*128;tileX=ox;tileY=oy;if(tile>0)for(let y=10;y<118;y++)for(let x=10;x<118;x++){const d=((x-64)/49)**2+((y-65)/39)**2;if(d<1)paint(ox+x,oy+y,.30*(1-d)**2*(.72+noise()*.28));}
  let x=ox+57,y=oy+14;for(let j=0;j<8;j++){const nx=x+(noise()-.5)*19,ny=y+11+noise()*3;line(x,y,nx,ny,4,.90);if(j===2||j===5)line(nx,ny,nx+(j===2?-1:1)*(12+noise()*10),ny+7+noise()*8,2,.90);x=nx;y=ny;}}
 // Fourth atlas cell is a soft, low-alpha smoke disc, never a hull decal.
 for(let y=132;y<252;y++)for(let x=132;x<252;x++){const d=Math.hypot((x-192)/58,(y-192)/58),i=(y*size+x)*4;if(d<1){data[i]=110;data[i+1]=107;data[i+2]=96;data[i+3]=Math.round(255*(1-d)**2);}}
 return data;
}

function surfaceHit(body,box,axis,yFraction,lateralFraction=.5,side=1){
 const p=body.geometry.getAttribute('position'),index=body.geometry.index,size=box.getSize(new THREE.Vector3()),origin=box.getCenter(new THREE.Vector3());origin.y=box.min.y+size.y*yFraction;origin[axis==='x'?'z':'x']=box.min[axis==='x'?'z':'x']+size[axis==='x'?'z':'x']*lateralFraction;origin[axis]=(side>0?box.max[axis]:box.min[axis])+side*(Math.max(size.x,size.z)+.01);
 const direction=new THREE.Vector3(axis==='x'?-side:0,0,axis==='z'?-side:0),ray=new THREE.Ray(origin,direction),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();let nearest=Infinity,result=null;
 for(let i=0,n=index?.count??p.count;i<n;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);if(!ray.intersectTriangle(a,b,c,false,hit))continue;const d=hit.distanceToSquared(origin);if(d>=nearest)continue;const normal=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());if(normal.dot(direction)>0)normal.negate();if(!finiteVector(normal)||normal.lengthSq()<.9)continue;nearest=d;result={point:hit.clone(),normal};}
 return result;
}
// Frozen original red-roof triangles; downward probes are preparation only.
// Emission uses one of their actual vertices, never the probe centroid.
const SMOKE_APEX_RAYS=Object.freeze({"1":[0.3116733576441469,0.49360897775414453],"2":[0.22658975927506642,0.4341453527069569],"3":[0.5904935874593487,0.6151195267601525]});
const SMOKE_APEX_EPSILON=.01;
const SMOKE_APEX_CACHES=new WeakMap(),DISPOSED_SMOKE_GEOMETRIES=new WeakSet();
function smokeApexValid(body,record){
 if(!record||record.released||record.bucket.disposed||body.geometry!==record.geometry)return false;
 if(body.matrixAutoUpdate)body.updateMatrix();
 if(!body.matrix.elements.every((v,i)=>Number.isFinite(v)&&v===record.restMatrix[i]))return false;
 return record.attributes.every(s=>{const a=s.name==='index'?body.geometry.index:body.geometry.getAttribute(s.name);return a===s.attribute&&(!a||(a.array===s.array&&a.version===s.version&&a.count===s.count&&a.itemSize===s.itemSize));});
}
function acquireSmokeApex(body,box,stage){
 const geometry=body.geometry;if(DISPOSED_SMOKE_GEOMETRIES.has(geometry))return null;
 if(body.matrixAutoUpdate)body.updateMatrix();const restMatrix=body.matrix.toArray(),key=stage+'|'+restMatrix.join(',');
 let bucket=SMOKE_APEX_CACHES.get(geometry);
 if(!bucket){bucket={geometry,entries:new Map(),references:0,disposed:false};bucket.onDispose=()=>{bucket.disposed=true;DISPOSED_SMOKE_GEOMETRIES.add(geometry);SMOKE_APEX_CACHES.delete(geometry);};geometry.addEventListener('dispose',bucket.onDispose);SMOKE_APEX_CACHES.set(geometry,bucket);}
 let record=bucket.entries.get(key);if(record&&smokeApexValid(body,record)){record.references++;bucket.references++;return record;}
 const p=geometry.getAttribute('position'),index=geometry.index,size=box.getSize(new THREE.Vector3()),fraction=SMOKE_APEX_RAYS[stage],ray=new THREE.Ray(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();let nearest=Infinity,best=null;
 if(fraction){ray.set(new THREE.Vector3(box.min.x+size.x*fraction[0],box.max.y+size.y,box.min.z+size.z*fraction[1]),new THREE.Vector3(0,-1,0));
  for(let t=0,n=index?.count??p.count;t<n;t+=3){const ids=[index?index.getX(t):t,index?index.getX(t+1):t+1,index?index.getX(t+2):t+2];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);if(!ray.intersectTriangle(a,b,c,false,hit))continue;const distance=hit.distanceToSquared(ray.origin);if(distance>=nearest)continue;nearest=distance;const normal=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());if(normal.y<0)normal.negate();best={triangle:t/3,vertexIDs:ids,points:[a.toArray(),b.toArray(),c.toArray()],normal:normal.toArray()};}
 }
 const candidates=best&&best.normal[1]>.35?best.points.map((point,i)=>({point,normal:best.normal,sourceVertexID:best.vertexIDs[i],triangle:best.triangle})):[];
 record={bucket,key,geometry,stage,restMatrix,attributes:['position','normal','uv','index'].map(name=>{const attribute=name==='index'?geometry.index:geometry.getAttribute(name);return{name,attribute,array:attribute?.array,version:attribute?.version,count:attribute?.count,itemSize:attribute?.itemSize};}),candidates,references:1,released:false};bucket.references++;bucket.entries.set(key,record);return record;
}
function releaseSmokeApex(record){if(!record||record.released)return;record.references--;record.bucket.references--;if(record.references===0){record.released=true;if(record.bucket.entries.get(record.key)===record)record.bucket.entries.delete(record.key);}if(record.bucket.references===0){record.geometry.removeEventListener('dispose',record.bucket.onDispose);if(SMOKE_APEX_CACHES.get(record.geometry)===record.bucket)SMOKE_APEX_CACHES.delete(record.geometry);}}
function selectSmokeApex(body,entry,camera,s){
 const record=entry.smokeApexCache;if(!camera?.isOrthographicCamera||typeof camera.getWorldDirection!=='function'||!smokeApexValid(body,record))return false;
 camera.getWorldDirection(s.view).negate();if(!finiteVector(s.view)||s.view.y<=0)return false;
 body.updateWorldMatrix(true,false);if(!body.matrixWorld.elements.every(Number.isFinite)||Math.abs(body.matrixWorld.determinant())<1e-12)return false;s.normalMatrix.getNormalMatrix(body.matrixWorld);let highest=-Infinity,selected=null;
 for(const candidate of record.candidates){s.point.fromArray(candidate.point).applyMatrix4(body.matrixWorld);if(!finiteVector(s.point)||s.point.y<=highest)continue;highest=s.point.y;s.best.copy(s.point);selected=candidate;}
 if(!selected)return false;s.normal.fromArray(selected.normal).applyMatrix3(s.normalMatrix).normalize();if(!finiteVector(s.normal)||s.normal.y<=0)return false;s.best.addScaledVector(s.normal,SMOKE_APEX_EPSILON);return true;
}

function prepareSurface(body,stage){
 const p=body.geometry.getAttribute('position');for(let i=0;i<p.count;i++)if(![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite))throw Error('Nonfinite hull surface.');
 const box=new THREE.Box3().setFromBufferAttribute(p),size=box.getSize(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)<=0)throw Error('Degenerate hull surface.');body.updateWorldMatrix(true,false);if(!body.matrixWorld.elements.every(Number.isFinite))throw Error('Nonfinite hull transform.');
 const inverse=body.matrixWorld.clone().invert(),normalMatrix=new THREE.Matrix3().getNormalMatrix(body.matrixWorld),worldHeight=new THREE.Vector3(0,size.y,0).transformDirection(body.matrixWorld).length()*size.y*body.getWorldScale(new THREE.Vector3()).y,pieces=[],counts=[],patchCounts=[],anchors=[];let total=0;
 // Preserve the original smoke origin independently of the newly authored wall patches.
 let smokeHit=null;for(const delta of [0,.035,-.035,.07,-.07]){smokeHit=surfaceHit(body,box,'z',Math.max(.2,Math.min(.8,.66+delta)));if(smokeHit)break;}if(!smokeHit)throw Error('No actual hull smoke anchor.');
 for(const [slot,[axis,side,y,lateral,factor]]of WALL_RAYS[stage].entries()){
  const hit=surfaceHit(body,box,axis,y,lateral,side);if(!hit){for(const g of pieces)g.dispose();throw Error('No authored hull triangle at damage anchor '+slot);}
  const center=hit.point.clone().applyMatrix4(body.matrixWorld),normal=hit.normal.clone().applyMatrix3(normalMatrix).normalize(),orientation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal)),geometry=new DecalGeometry(body,center,orientation,new THREE.Vector3(.21,.23,.075).multiplyScalar(worldHeight*factor));
  if(geometry.getAttribute('position').count===0||geometry.getAttribute('position').count/3>HULL_DAMAGE_LIMITS.triangles/HULL_DAMAGE_LIMITS.patches){geometry.dispose();for(const g of pieces)g.dispose();throw Error('Authored hull decal exceeds bounded surface budget.');}
  geometry.applyMatrix4(inverse);const pattern=Math.floor(slot/2),uv=geometry.getAttribute('uv'),ox=pattern%2*.5,oy=Math.floor(pattern/2)*.5;for(let i=0;i<uv.count;i++)uv.setXY(i,ox+uv.getX(i)*.5,oy+uv.getY(i)*.5);total+=geometry.getAttribute('position').count;patchCounts.push(total);if(slot%2===1)counts.push(total);anchors.push(hit.point.toArray());pieces.push(geometry);
 }
 const geometry=mergeGeometries(pieces,false);for(const g of pieces)g.dispose();if(!geometry)throw Error('Hull decal merge failed.');geometry.userData.effectShared=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.setDrawRange(0,0);return {geometry,counts,patchCounts,anchors,smokeAnchor:smokeHit.point.toArray(),smokeApexCache:acquireSmokeApex(body,box,stage)};
}

export class HullDamageVisuals{
 constructor(world){
  this.world=world;this.templates=new Map();this.root=null;this.body=null;this.entry=null;this.tier=0;this.smokes=new Set();this.elapsed=0;this.sequence=0;this.disposed=false;this.failures=[];
  this.smokeProbe={view:new THREE.Vector3(),normalMatrix:new THREE.Matrix3(),normal:new THREE.Vector3(),point:new THREE.Vector3(),best:new THREE.Vector3()};
  this.atlas=new THREE.DataTexture(createHullDamagePixels(),256,256,THREE.RGBAFormat);this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.minFilter=this.atlas.magFilter=THREE.LinearFilter;this.atlas.generateMipmaps=false;this.atlas.needsUpdate=true;
  this.material=new THREE.MeshBasicMaterial({map:this.atlas,transparent:true,opacity:1,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:true});
  this.smokePool=new ObjectPool(()=>{const geometry=new THREE.PlaneGeometry(1,1),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,.5+uv.getX(i)*.5,.5+uv.getY(i)*.5);return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x756b5e,map:this.atlas,transparent:true,opacity:.7,depthTest:true,depthWrite:false,side:THREE.DoubleSide}));},{maxActive:2,maxFree:2,maxPerKey:2});
  const warm=[this.smokePool.acquire('hull-smoke'),this.smokePool.acquire('hull-smoke')];for(const mesh of warm)this.smokePool.release(mesh);
 }
 prepare(models){
  if(this.disposed)throw Error('Damage visuals already disposed.');if(this.templates.size)return this.snapshot();
  for(let stage=1;stage<=3;stage++){const id=IDS[stage],body=hullDamageBody(models[id]);if(!body){this.failures.push({stage,reason:'missing-static-body'});continue;}try{const surface=prepareSurface(body,stage),mesh=new THREE.Mesh(surface.geometry,this.material);mesh.name='hull-damage-overlay';mesh.userData.hullDamageOverlay=true;mesh.userData.attachment=true;mesh.castShadow=false;mesh.receiveShadow=false;mesh.visible=false;this.templates.set(stage,{...surface,mesh,sourceGeometry:body.geometry,sourceName:body.name});}catch(error){this.failures.push({stage,reason:error.message});}}
  return this.snapshot();
 }
 clearSmoke(){for(const p of this.smokes){const index=this.world.feedback?.particles.indexOf(p)??-1;if(index>=0)this.world.feedback.particles.splice(index,1);if(p.mesh.poolActive)this.smokePool.release(p.mesh);}this.smokes.clear();this.elapsed=0;}
 release(root){if(root&&root!==this.root)return;this.clearSmoke();if(this.entry){this.entry.mesh.removeFromParent();this.entry.mesh.visible=false;this.entry.geometry.setDrawRange(0,0);}this.root=null;this.body=null;this.entry=null;this.tier=0;}
 clear(){this.release();}
 update(game,dt,camera,reduced=false,hidden=false){
  if(this.disposed)return;const root=game?.player?.root,r=game?.run;if(game?.mode!=='run'||!root||!r||root.parent!==this.world.actors){this.release();return;}
  if(root!==this.root){this.release();const entry=this.templates.get(r.stage),body=hullDamageBody(root.userData.model);if(!entry||!body||body.geometry!==entry.sourceGeometry)return;this.root=root;this.body=body;this.entry=entry;body.add(entry.mesh);}
  const tier=hullDamageTier(r.hp,r.maxHp);this.tier=tier;this.entry.mesh.visible=tier>0;this.entry.geometry.setDrawRange(0,tier?this.entry.counts[tier-1]:0);
  for(const p of this.smokes)if(p.life<=0||p.mesh.parent!==this.world.effects||!p.mesh.poolActive){const index=this.world.feedback?.particles.indexOf(p)??-1;if(index>=0)this.world.feedback.particles.splice(index,1);if(p.mesh.poolActive)this.smokePool.release(p.mesh);this.smokes.delete(p);}else{p.mesh.quaternion.copy(camera.quaternion);p.mesh.scale.setScalar((SMOKE_BASE_SIZES[r.stage]??SMOKE_BASE_SIZES[1])+.3*(p.max-p.life)/p.max);}
  const visible=!excluded(this.body),active=tier===3&&r.hp>0&&!r.outcome&&!game.screen&&!reduced&&!hidden&&visible;
  if(!active){this.clearSmoke();return;}
  this.elapsed+=Number.isFinite(dt)&&dt>0?dt:0;if(this.elapsed+1e-12<HULL_DAMAGE_LIMITS.smokeInterval)return;this.elapsed=Math.max(0,this.elapsed-Math.floor((this.elapsed+1e-12)/HULL_DAMAGE_LIMITS.smokeInterval)*HULL_DAMAGE_LIMITS.smokeInterval);
  if(this.smokes.size>=2||(this.world.feedback?.particles.length??190)>=RUNTIME_LIMITS.particles)return;
  if(!selectSmokeApex(this.body,this.entry,camera,this.smokeProbe))return;const mesh=this.smokePool.acquire('hull-smoke');if(!mesh)return;mesh.position.copy(this.smokeProbe.best);mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(SMOKE_BASE_SIZES[r.stage]??SMOKE_BASE_SIZES[1]);const angle=this.sequence++*2.399963229728653,particle=this.world.feedback.add(mesh,new THREE.Vector3(Math.cos(angle)*.025,1.1,Math.sin(angle)*.025),1.2,'hull-smoke',-.025);if(particle)this.smokes.add(particle);
 }
 snapshot(){return {tier:this.tier,stage:this.entry?[...this.templates].find(([,v])=>v===this.entry)?.[0]:null,smokeActive:this.smokes.size,pool:this.smokePool.snapshot(),templates:[...this.templates].map(([stage,e])=>({stage,triangles:e.geometry.getAttribute('position').count/3,counts:[...e.counts],anchors:e.anchors.map(p=>[...p]),sourceName:e.sourceName})),failures:this.failures.map(v=>({...v}))};}
 dispose(){if(this.disposed)return;this.release();this.disposed=true;for(const e of this.templates.values()){releaseSmokeApex(e.smokeApexCache);e.geometry.dispose();}this.templates.clear();const materials=new Set(),geometries=new Set();for(const template of this.smokePool.templates.values())template.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});for(const values of this.smokePool.free.values())for(const mesh of values)for(const p of mesh.poolMaterials)materials.add(p.material);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.material.dispose();this.atlas.dispose();}
}
