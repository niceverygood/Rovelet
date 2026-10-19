// Actor-frame body lean with independent scalar damping state.
import * as THREE from 'three';
export const BODY_MOTION_PROFILES=Object.freeze({
 player:Object.freeze({frequency:8,bob:.012,pitch:.007,pitchLimit:.035,roll:.009,rollLimit:.045,damping:7,absoluteSpeed:true}),
 enemy:Object.freeze({frequency:9,bob:.008,pitch:.006,pitchLimit:.025,roll:.008,rollLimit:.025,damping:8,absoluteSpeed:false})
});
const states=new WeakMap(),finite=value=>Number.isFinite(value)?value:0;
export function bodyMotionSnapshot(model){const state=states.get(model);return state?{pitch:state.pitch,roll:state.roll,facing:state.facing.toArray()}:null;}
export function syncDriveAttachments(model,rig){
 if(rig==null)return rig;
 if(!model?.isObject3D||!rig.isObject3D)throw new TypeError('Attachment motion requires Object3D model and rig.');
 const state=states.get(model);if(state)rig.quaternion.copy(state.lean);else rig.quaternion.identity();
 rig.position.y=model.position.y;return rig;
}
export function poseDriveBody(model,drive,dt,{profile='player',animate=true,attachmentRig=null}={}){
 if(!model?.isObject3D)throw new TypeError('Body motion requires an Object3D model.');
 if(attachmentRig!=null&&!attachmentRig.isObject3D)throw new TypeError('Attachment motion requires an Object3D rig.');
 const config=Object.hasOwn(BODY_MOTION_PROFILES,profile)?BODY_MOTION_PROFILES[profile]:null;if(!config)throw new RangeError('Unknown body motion profile: '+profile);
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Body motion dt must be finite and nonnegative.');
 let state=states.get(model);if(!state){state={facing:model.quaternion.clone(),pitch:0,roll:0,euler:new THREE.Euler(0,0,0,'XYZ'),lean:new THREE.Quaternion()};states.set(model,state);}
 const active=!!animate&&!!drive,speed=active?finite(drive.speed):0,acceleration=active?finite(drive.acceleration):0,yawRate=active?finite(drive.yawRate):0,distance=active?finite(drive.distance):0;
 const pitchTarget=active?THREE.MathUtils.clamp(-acceleration*config.pitch,-config.pitchLimit,config.pitchLimit):0,rollTarget=active?THREE.MathUtils.clamp(yawRate*speed*config.roll,-config.rollLimit,config.rollLimit):0;
 state.pitch=THREE.MathUtils.damp(state.pitch,pitchTarget,config.damping,dt);state.roll=THREE.MathUtils.damp(state.roll,rollTarget,config.damping,dt);
 model.position.y=active?Math.sin(distance*config.frequency)*config.bob*Math.min(config.absoluteSpeed?Math.abs(speed):speed,1):0;
 state.euler.set(state.pitch,0,state.roll,'XYZ');state.lean.setFromEuler(state.euler);model.quaternion.copy(state.lean).multiply(state.facing);syncDriveAttachments(model,attachmentRig);return model;
}
