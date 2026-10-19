// Tiny wheels and barrels remain visible/animated; the full body still casts
// a grounded silhouette. Large actors retain their articulated shadows.
export function applyActorShadowBudget(root,kind){if(!['cannon','pursuer','charger'].includes(kind))return;root.traverse(node=>{if(!node.isMesh)return;let parent=node;while(parent&&parent!==root){if(parent.userData.wheel||parent.name==='gun-yaw'){node.castShadow=false;break;}parent=parent.parent;}});}
