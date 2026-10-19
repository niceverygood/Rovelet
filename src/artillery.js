import * as THREE from 'three';
import {compactSubset} from './geometry-subset.js';
// Meshy source files stay untouched. Split the calibrated barrel at runtime,
// preserving its original vertex normals, UVs and material.
const SPECS={
 'castle-small':{pivot:[-.275,-.135,-.065],tip:[-.418,-.135,-.065],cut:-.282,y:[-.215,-.045],z:[-.15,.025],arc:1.48},
 'castle-medium':{pivot:[-.285,-.135,-.115],tip:[-.431,-.135,-.115],cut:-.292,y:[-.205,-.055],z:[-.183,-.04],arc:1.48},
 'castle-large':{pivot:[-.32,-.092,-.103],tip:[-.473,-.092,-.103],cut:-.329,y:[-.153,-.035],z:[-.16,-.035],arc:1.48},
 'enemy-tower':{pivot:[-.22,.012,-.163],tip:[-.344,.012,-.163],cut:-.228,y:[-.095,.125],z:[-.275,-.055],arc:2.05},
 cannon:{pivot:[.08,.14,0],tip:[-.451,.14,0],cut:-.02,y:[-.03,.35],z:[-.2,.2],arc:Math.PI}
};
export function articulateCannon(id,model){const s=SPECS[id];if(!s)return;let source;model.traverse(o=>{if(o.isMesh&&!source)source=o;});if(!source?.geometry)return;const original=source.geometry,position=original.getAttribute('position'),index=original.index;const barrel=[],body=[];const n=index?.count??position.count;
 for(let i=0;i<n;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);const x=ids.reduce((v,j)=>v+position.getX(j),0)/3,y=ids.reduce((v,j)=>v+position.getY(j),0)/3,z=ids.reduce((v,j)=>v+position.getZ(j),0)/3;const inside=x<s.cut&&y>s.y[0]&&y<s.y[1]&&z>s.z[0]&&z<s.z[1];(inside?barrel:body).push(...ids);}
 if(barrel.length<30)throw new Error('Cannon calibration failed: '+id);
 source.geometry=compactSubset(original,body);
 const yaw=new THREE.Group();yaw.name='gun-yaw';yaw.position.fromArray(s.pivot);yaw.userData.arc=s.arc;yaw.userData.recoil=0;
 const pitch=new THREE.Group();pitch.name='gun-pitch';const slide=new THREE.Group();slide.name='gun-slide';const tube=new THREE.Mesh(compactSubset(original,barrel),source.material);tube.geometry.translate(-s.pivot[0],-s.pivot[1],-s.pivot[2]);tube.castShadow=true;tube.receiveShadow=true;slide.add(tube);pitch.add(slide);yaw.add(pitch);source.parent.add(yaw);
 const muzzle=new THREE.Object3D();muzzle.name='gun-muzzle';muzzle.position.fromArray(s.tip).sub(new THREE.Vector3().fromArray(s.pivot));slide.add(muzzle);model.userData.artilleryTriangles=barrel.length/3;
}
const inverse=new THREE.Quaternion();
export function aimFrame(rig){rig.parent.updateWorldMatrix(true,false);return {origin:rig.getWorldPosition(new THREE.Vector3()),inverseParent:rig.parent.getWorldQuaternion(new THREE.Quaternion()).invert()};}
function aimCoordinates(rig,target,frame=aimFrame(rig)){const direction=target.clone().sub(frame.origin).applyQuaternion(frame.inverseParent);return {yaw:Math.atan2(direction.z,-direction.x),pitch:Math.atan2(direction.y,Math.hypot(direction.x,direction.z))};}
export function canAim(rig,target,frame){if(!rig)return false;return Math.abs(aimCoordinates(rig,target,frame).yaw)<=rig.userData.arc;}
const delta=(a,b)=>THREE.MathUtils.euclideanModulo(a-b+Math.PI,Math.PI*2)-Math.PI;
export function aimCannon(rig,target,dt){if(!rig||!target)return false;const aim=aimCoordinates(rig,target);if(Math.abs(aim.yaw)>rig.userData.arc)return false;rig.rotation.y+=THREE.MathUtils.clamp(delta(aim.yaw,rig.rotation.y),-dt*3.8,dt*3.8);const pitch=rig.getObjectByName('gun-pitch');const wanted=-THREE.MathUtils.clamp(aim.pitch,-.42,.55);pitch.rotation.z=THREE.MathUtils.damp(pitch.rotation.z,wanted,15,dt);return Math.abs(delta(aim.yaw,rig.rotation.y))<.035&&Math.abs(wanted-pitch.rotation.z)<.04;}
export function muzzlePose(rig){rig.updateWorldMatrix(true,true);const muzzle=rig.getObjectByName('gun-muzzle');const position=muzzle.getWorldPosition(new THREE.Vector3());const direction=new THREE.Vector3(-1,0,0).transformDirection(muzzle.matrixWorld);return {position,direction};}
export function tickRecoil(rig,dt){if(!rig)return;rig.userData.recoil=Math.max(0,(rig.userData.recoil??0)-dt);const t=rig.userData.recoil;const amount=t>.16?( .22-t)/.06:Math.max(0,t/.16);rig.getObjectByName('gun-slide').position.x=Math.max(0,amount)*.07;}
export function kickCannon(rig){rig.userData.recoil=.22;}
