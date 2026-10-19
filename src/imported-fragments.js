import * as THREE from 'three';

// Keep the authored mesh hierarchy and PBR groups intact. ObjectPool owns each
// instance's materials; geometry and textures stay shared with the loaded asset.
export class ImportedFragmentFactory{
 constructor(resolveModel){if(typeof resolveModel!=='function')throw new TypeError('Imported fragment model provider must be a function.');this.resolveModel=resolveModel;}
 create(key){
  const assetId='impact-shard';if(key!==assetId)throw new Error('Unregistered imported fragment: '+key);
  const source=this.resolveModel(assetId);if(!source?.isObject3D)throw new Error('Missing imported fragment model: '+assetId);
  const visual=source.clone(true),bounds=new THREE.Box3(),point=new THREE.Vector3();let meshes=0;
  visual.updateWorldMatrix(true,true);
  visual.traverse(node=>{
   if(!node.isMesh)return;
   if(node.isSkinnedMesh||node.isInstancedMesh)throw new Error('Imported shard requires static mesh geometry.');
   const position=node.geometry?.getAttribute('position');if(!position?.count)throw new Error('Imported shard has missing mesh bounds.');
   meshes++;
   // Read transformed vertices without writing bounding boxes or buffers on
   // shared source geometry, including nested/rotated source transforms.
   for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld);if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.z))throw new Error('Imported shard bounds must be finite.');bounds.expandByPoint(point);}
   node.castShadow=false;node.receiveShadow=false;
  });
  const size=bounds.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
  if(!meshes||bounds.isEmpty()||!Number.isFinite(extent)||extent<=1e-9)throw new Error('Imported shard has empty mesh bounds.');
  visual.position.sub(bounds.getCenter(new THREE.Vector3()));
  const root=new THREE.Group(),wrapper=new THREE.Group();wrapper.name='imported-fragment-visual';wrapper.add(visual);wrapper.scale.setScalar(.16/extent);root.add(wrapper);
  root.name='fragment-'+assetId;root.userData.importedFragment={assetId};return root;
 }
}
