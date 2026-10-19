import * as THREE from 'three';
import {WEAPONS} from './data.js';

// Preserve authored PBR meshes/groups and shared buffers. ObjectPool clones the
// instance materials; the logical projectile root stays at the collision point.
export class ImportedProjectileFactory{
 constructor(resolveModel){if(typeof resolveModel!=='function')throw new TypeError('Imported projectile model provider must be a function.');this.resolveModel=resolveModel;}
 create(key,r=.13){
  if(key!=='cannon')return null;
  if(!Number.isFinite(r)||r<=0)throw new RangeError('Imported projectile radius must be positive and finite.');
  const assetId='projectile-ironshot',source=this.resolveModel(assetId);
  if(!source?.isObject3D)throw new Error('Missing imported projectile model: '+assetId);
  const visual=source.clone(true),bounds=new THREE.Box3(),point=new THREE.Vector3();let meshes=0;
  visual.updateWorldMatrix(true,true);
  visual.traverse(node=>{
   if(!node.isMesh)return;
   if(node.isSkinnedMesh||node.isInstancedMesh)throw new Error('Imported ironshot requires static mesh geometry.');
   const position=node.geometry?.getAttribute('position');if(!position?.count)throw new Error('Imported ironshot has missing mesh bounds.');
   meshes++;
   // Reading vertices avoids computing a boundingBox on the shared source
   // geometry. Only this clone's visual transform is adjusted, never its buffers.
   for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld);if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.z))throw new Error('Imported ironshot bounds must be finite.');bounds.expandByPoint(point);}
   node.castShadow=false;node.receiveShadow=false;
  });
  const size=bounds.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
  if(!meshes||bounds.isEmpty()||!Number.isFinite(extent)||extent<=1e-9)throw new Error('Imported ironshot has empty mesh bounds.');
  visual.position.sub(bounds.getCenter(new THREE.Vector3()));
  const root=new THREE.Group(),wrapper=new THREE.Group();wrapper.name='imported-projectile-visual';wrapper.add(visual);wrapper.scale.setScalar((.30*r/.13)/extent);root.add(wrapper);
  root.name='projectile-'+key;root.userData.projectile={key,shape:WEAPONS[key].shape,age:0};root.userData.importedProjectile={assetId};
  return root;
 }
}
