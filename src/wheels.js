import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {compactSubset} from './geometry-subset.js';
// Medium wheels already have broad Meshy rims. Detached cleats made these
// wheels look broken; keep a thin connected rim with subtle phase markers.
export function addRollingTread(rotor,radius,axis,width,continuous=false){
 if(continuous){const geometry=new THREE.TorusGeometry(radius*.985,radius*.025,4,26),p=geometry.getAttribute('position'),colors=new Float32Array(p.count*3),palette=[0x98764e,0x866443,0xab8659].map(hex=>new THREE.Color(hex));
  for(let i=0;i<p.count;i++){const sector=Math.floor(THREE.MathUtils.euclideanModulo(Math.atan2(p.getY(i),p.getX(i)),Math.PI*2)/(Math.PI*2)*13),color=palette[sector%5===0?2:sector%2];colors.set([color.r,color.g,color.b],i*3);}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));if(axis==='x')geometry.rotateY(Math.PI/2);const tread=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));tread.name='rolling-tread';tread.userData.rollingDetail=true;tread.castShadow=true;tread.receiveShadow=true;rotor.add(tread);return tread;
 }
 const pieces=[];
 for(let i=0;i<13;i++){const a=i*Math.PI*2/13,r=radius*1.012,geometry=new THREE.BoxGeometry(radius*.27,radius*.07,width);geometry.translate(0,r,0);geometry.rotateZ(a);if(axis==='x')geometry.rotateY(Math.PI/2);const color=new THREE.Color(i%4===0?0xcda16b:i%2?0x72513a:0x96704c),colors=new Float32Array(geometry.getAttribute('position').count*3);for(let v=0;v<colors.length;v+=3){colors[v]=color.r;colors[v+1]=color.g;colors[v+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(geometry);}
 const geometry=mergeGeometries(pieces);for(const p of pieces)p.dispose();const tread=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));tread.name='rolling-tread';tread.userData.rollingDetail=true;tread.castShadow=true;tread.receiveShadow=true;rotor.add(tread);return tread;
}
// Calibrated in the original Meshy coordinates. Keep the source UVs/materials.
const SPECS={
 'castle-small':{axis:'z',centers:[-.19,.13],sides:[-.195,.195],y:-.355,radius:.12,depth:.075},
 'castle-medium':{axis:'z',centers:[-.16,.16],sides:[-.285,.285],y:-.347,radius:.131,depth:.085,repairs:{2:{source:1,mirrorZ:true}}},
 'castle-large':{axis:'z',centers:[-.245,-.025,.265],sides:[-.176,.176],y:-.229,radius:.092,depth:.057},
 'enemy-tower':{axis:'x',centers:[-.175,.17],sides:[-.17,.17],y:-.355,radius:.123,depth:.055}
};
// A centroid can sit in a wheel while a long chassis face crosses it.
// Keep those bridges on the body, with room for the sculpted wheel edges.
function wheelTriangleWithinBounds(position,a,b,c,part,radius,depth){
 const radialLimitSq=(radius*1.5)**2,axialLimit=Math.max(depth*2,radius),edgeLimitSq=(radius*2.2)**2;
 let previousX=position.getX(c)-part.pivot.x,previousY=position.getY(c)-part.pivot.y,previousZ=position.getZ(c)-part.pivot.z;
 for(const index of [a,b,c]){
  const x=position.getX(index)-part.pivot.x,y=position.getY(index)-part.pivot.y,z=position.getZ(index)-part.pivot.z;
  const radial=part.axis==='z'?x:z,axial=part.axis==='z'?z:x,dx=x-previousX,dy=y-previousY,dz=z-previousZ;
  if(radial*radial+y*y>radialLimitSq||Math.abs(axial)>axialLimit||dx*dx+dy*dy+dz*dz>edgeLimitSq)return false;
  previousX=x;previousY=y;previousZ=z;
 }
 return true;
}
// Medium source anatomy candidate2: four parallel B-donor drive wheels.
// A/D/C original faces remain in invisible, shared source-archive meshes.
// Source GLB is untouched; this is an intentional mounting repair, not raw rest pose.
import MEDIUM_WHEEL_SOURCE from './medium-wheel-calibration.json' with {type:'json'};
const MEDIUM_SOURCE_CAPS=[{"pivot":[-0.257,-0.354,-0.068],"axisVector":[0.9878058844322275,-0.11008981488099799,-0.11008981488099799]},{"pivot":[-0.129,-0.3475,0.291],"axisVector":[-0.07498432991240138,0.027994149833963183,0.996791692302189]},{"pivot":[-0.124,-0.355,-0.334],"axisVector":[0.6650581951382234,0.10000875114860502,0.7400647584996771]},{"pivot":[0.181,-0.36,0.265],"axisVector":[0.991245363594993,0,0.13203268213374278]}];
const MEDIUM_PARALLEL_CALIBRATION={...{"sourceTriangles":15185,"donorPart":1,"mounts":[{"position":[-0.129,-0.3475,0.291],"front":true,"mirror":false},{"position":[-0.129,-0.3475,-0.291],"front":true,"mirror":true},{"position":[0.181,-0.3475,0.291],"front":false,"mirror":false},{"position":[0.181,-0.3475,-0.291],"front":false,"mirror":true}],"radius":0.127,"depth":0.084},parts:MEDIUM_WHEEL_SOURCE.parts.map((part,k)=>({...part,...MEDIUM_SOURCE_CAPS[k]}))};
function articulateMediumParallel(model){
 let source;model.traverse(o=>{if(o.isMesh&&!source)source=o;});if(!source)return;
 const original=source.geometry,index=original.index,position=original.getAttribute('position');
 if(!index||index.count!==MEDIUM_PARALLEL_CALIBRATION.sourceTriangles*3)throw new Error('Medium source topology mismatch');
 const owned=new Uint8Array(index.count/3),parts=MEDIUM_PARALLEL_CALIBRATION.parts;
 const selected=ids=>{const indices=[];for(const id of ids){if(!Number.isInteger(id)||id<0||id>=owned.length||owned[id])throw new Error('Medium source ownership mismatch');owned[id]=1;indices.push(index.getX(id*3),index.getX(id*3+1),index.getX(id*3+2));}return indices;};
 const selections=parts.map(part=>selected(part.sourceIds)),body=[];
 for(let id=0;id<owned.length;id++)if(!owned[id])body.push(index.getX(id*3),index.getX(id*3+1),index.getX(id*3+2));
 source.geometry=compactSubset(original,body);source.geometry.userData.sharedAsset=true;
 const holder=new THREE.Group();holder.name='medium-parallel-wheels';holder.position.copy(source.position);holder.quaternion.copy(source.quaternion);holder.scale.copy(source.scale);source.parent.add(holder);
 for(let k=0;k<parts.length;k++)if(k!==MEDIUM_PARALLEL_CALIBRATION.donorPart){const archiveGeometry=compactSubset(original,selections[k]);archiveGeometry.userData.sharedAsset=true;const archive=new THREE.Mesh(archiveGeometry,source.material);archive.name='medium-source-archive-'+k;archive.visible=false;archive.userData={wheelSourceArchive:true,sourceWheelPart:k,sourceTriangleCount:parts[k].sourceIds.length};holder.add(archive);}
 const donorPart=parts[MEDIUM_PARALLEL_CALIBRATION.donorPart],donorGeometry=compactSubset(original,selections[MEDIUM_PARALLEL_CALIBRATION.donorPart]);
 const axis=new THREE.Vector3().fromArray(donorPart.axisVector).normalize(),alignment=new THREE.Quaternion().setFromUnitVectors(axis,new THREE.Vector3(0,0,1)),v=new THREE.Vector3();
 const donorPosition=donorGeometry.getAttribute('position'),donorNormal=donorGeometry.getAttribute('normal');
 for(let i=0;i<donorPosition.count;i++){v.fromBufferAttribute(donorPosition,i).sub(new THREE.Vector3().fromArray(donorPart.pivot)).applyQuaternion(alignment);donorPosition.setXYZ(i,v.x,v.y,v.z);if(donorNormal){v.fromBufferAttribute(donorNormal,i).applyQuaternion(alignment);donorNormal.setXYZ(i,v.x,v.y,v.z);}}
 donorPosition.needsUpdate=true;if(donorNormal)donorNormal.needsUpdate=true;donorGeometry.computeBoundingBox();donorGeometry.computeBoundingSphere();donorGeometry.userData.sharedAsset=true;
 for(const [i,mount]of MEDIUM_PARALLEL_CALIBRATION.mounts.entries()){
  const pivot=new THREE.Group();pivot.name='wheel-steer-'+i;pivot.position.fromArray(mount.position);pivot.userData={wheel:true,front:mount.front,axis:'z',radius:MEDIUM_PARALLEL_CALIBRATION.radius};
  const rotor=new THREE.Mesh(donorGeometry,source.material);rotor.name='wheel-roll';rotor.scale.z=mount.mirror?-1:1;rotor.castShadow=true;rotor.receiveShadow=true;
  rotor.userData=i?{derivedWheel:true,derivedSourceWheel:0,sourceWheelPart:1}:{sourceWheelPart:1,sourceTriangleCount:donorPart.sourceIds.length};
  addRollingTread(rotor,MEDIUM_PARALLEL_CALIBRATION.radius,'z',MEDIUM_PARALLEL_CALIBRATION.depth*1.45,true);pivot.add(rotor);holder.add(pivot);
 }
 model.userData.wheelCount=4;model.userData.mediumWheelRepair='parallel-source-B-candidate2';
}
export function articulateWheels(id,model){if(id==='castle-medium')return articulateMediumParallel(model);const spec=SPECS[id];if(!spec)return;let source;model.traverse(o=>{if(o.isMesh&&!source)source=o;});if(!source)return;const original=source.geometry,p=original.getAttribute('position'),index=original.index,body=[],parts=[];
 for(const center of spec.centers)for(const side of spec.sides){
  const repair=spec.repairs?.[parts.length],pivot=new THREE.Vector3(spec.axis==='z'?center:side,spec.y,spec.axis==='z'?side:center);
  const axis=repair?spec.axis:id==='castle-medium'&&center>0?'x':spec.axis;
  parts.push({pivot,axis,repair,indices:[],front:spec.axis==='z'?center===spec.centers[0]:center===spec.centers.at(-1)});
 }
 for(let i=0;i<(index?.count??p.count);i+=3){
  const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2,x=(p.getX(a)+p.getX(b)+p.getX(c))*(1/3),y=(p.getY(a)+p.getY(b)+p.getY(c))*(1/3),z=(p.getZ(a)+p.getZ(b)+p.getZ(c))*(1/3);let chosen=null,best=Infinity;
  for(const part of parts){if(part.repair)continue;const dx=x-part.pivot.x,dy=y-part.pivot.y,dz=z-part.pivot.z,axial=part.axis==='z'?dz:dx,radial=Math.hypot(part.axis==='z'?dx:dz,dy);if(radial<=spec.radius*1.04&&Math.abs(axial)<(id==='castle-medium'&&part.axis==='x'?.065:spec.depth)){const score=radial/spec.radius+Math.abs(axial)/spec.depth*.15;if(score<best){chosen=part;best=score;}}}
  if(chosen&&!wheelTriangleWithinBounds(p,a,b,c,chosen,spec.radius,id==='castle-medium'&&chosen.axis==='x'?.065:spec.depth))chosen=null;
  (chosen?chosen.indices:body).push(a,b,c);
 }
 source.geometry=compactSubset(original,body);
 // The source medium rear wheel is incomplete. Reuse the same Meshy front
 // wheel without changing its buffers; displaced original faces stay on the body.
 const rotors=[];
 for(const [i,part]of parts.entries()){
  if(!part.repair&&part.indices.length<30)throw new Error('Wheel calibration failed: '+id+' '+i);
  const pivot=new THREE.Group();pivot.name='wheel-steer-'+i;pivot.position.copy(part.pivot);pivot.userData={wheel:true,front:part.front,axis:part.axis,radius:spec.radius};
  let rotor;
  if(part.repair){
   const donor=rotors[part.repair.source];if(!donor)throw new Error('Wheel repair donor missing: '+id+' '+i);
   rotor=new THREE.Mesh(donor.geometry,donor.material);rotor.scale.z=part.repair.mirrorZ?-1:1;
   rotor.userData.derivedWheel=true;rotor.userData.derivedSourceWheel=part.repair.source;
  }else{
   rotor=new THREE.Mesh(compactSubset(original,part.indices),source.material);rotor.geometry.translate(-part.pivot.x,-part.pivot.y,-part.pivot.z);
   if(id==='castle-medium'&&part.axis==='x'){rotor.geometry.rotateY(-Math.PI/2);pivot.userData.axis='z';}
  }
  rotor.name='wheel-roll';addRollingTread(rotor,spec.radius,pivot.userData.axis,spec.depth*1.45,id==='castle-medium');rotor.castShadow=true;rotor.receiveShadow=true;pivot.add(rotor);source.parent.add(pivot);rotors.push(rotor);
 }
 model.userData.wheelCount=parts.length;
}
export function wheelTravel(dx,dz,headingDelta,offsetX,offsetZ,heading,steering=0){const c=Math.cos(heading),s=Math.sin(heading),localX=dx*c-dz*s,localZ=dx*s+dz*c;return (localX+headingDelta*offsetZ)*Math.sin(steering)+(localZ-headingDelta*offsetX)*Math.cos(steering);}
const wrap=a=>THREE.MathUtils.euclideanModulo(a+Math.PI,Math.PI*2)-Math.PI;
export function updateWheels(root,steering=0){let state=root.userData.wheelMotion;if(!state){root.updateWorldMatrix(true,true);const wheels=[];root.traverse(o=>{if(o.userData.wheel){const offset=root.worldToLocal(o.getWorldPosition(new THREE.Vector3())),scale=o.getWorldScale(new THREE.Vector3());wheels.push({pivot:o,rotor:o.getObjectByName('wheel-roll'),offset,radius:o.userData.radius*scale.y,angle:0});}});state=root.userData.wheelMotion={wheels,x:root.position.x,z:root.position.z,heading:root.rotation.y};}
 const dx=root.position.x-state.x,dz=root.position.z-state.z,dh=wrap(root.rotation.y-state.heading),mid=state.heading+dh*.5;
 for(const w of state.wheels){const turn=w.pivot.userData.front?-steering:0;w.pivot.rotation.y=turn;if(Math.hypot(dx,dz)<3){const travel=wheelTravel(dx,dz,dh,w.offset.x,w.offset.z,mid,turn);w.angle=wrap(w.angle+travel/w.radius);}w.rotor.rotation[w.pivot.userData.axis]=w.angle;}
 state.travel=Math.hypot(dx,dz)<3?Math.hypot(dx,dz):0;state.x=root.position.x;state.z=root.position.z;state.heading=root.rotation.y;return state;
}
export function wheelContact(world,root,state,reduced=false){if(!root.userData.drive||!state.wheels.length)return;state.contactDistance=(state.contactDistance??0)+state.travel;if(state.contactDistance<.38)return;state.contactDistance%=.38;if(reduced)return;
 for(const wheel of state.wheels.slice(-2)){const position=wheel.offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),root.rotation.y).add(root.position);position.y=world.heightAt(position.x,position.z)+.027;const track=world.particle?world.particle('track',0x788b44):new THREE.Mesh(new THREE.PlaneGeometry(.19,.24),new THREE.MeshBasicMaterial({color:0x788b44,transparent:true,opacity:.25,depthWrite:false}));track.scale.x=Math.min(.19,wheel.radius*.5)/.19;Object.assign(track.material,{opacity:.25,polygonOffset:true,polygonOffsetFactor:-1});track.rotation.set(-Math.PI/2,0,-root.rotation.y);track.position.copy(position);world.feedback.add(track,new THREE.Vector3(),.85,'track',0);world.puff(position,0xd4d5aa,1);const dust=world.smoke.at(-1);if(dust){dust.life=.4;dust.max=.8;dust.velocity=new THREE.Vector3(-Math.sin(root.rotation.y)*.18*Math.sign(root.userData.drive.speed),.23,-Math.cos(root.rotation.y)*.18*Math.sign(root.userData.drive.speed));}}
}



