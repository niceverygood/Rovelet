export const VILLAGE_CAMERA_LIMITS=Object.freeze({homeZoom:22,minZoom:10,maxZoom:34,panRadius:14,dragThreshold:5,panDamping:10,buttonFactor:1.18});
const finite=Number.isFinite,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),modified=e=>e.ctrlKey||e.altKey||e.metaKey;
const stop=e=>{e.preventDefault?.();e.stopImmediatePropagation?.();};

// Invert the rendered orthographic screen basis onto ground Y=0. This reads
// the last rendered camera matrix; it never advances a camera or a game tick.
export function villagePanDelta(dx,dy,camera,rect){
 const m=camera?.matrixWorld?.elements,z=camera?.zoom??1;
 if(!camera?.isOrthographicCamera||!m||![dx,dy,rect?.width,rect?.height,z,camera.left,camera.right,camera.top,camera.bottom,...m].every(finite)||rect.width<=0||rect.height<=0||camera.right<=camera.left||camera.top<=camera.bottom||z<=0||Math.abs(m[9])<1e-6)return null;
 const x=dx*(camera.right-camera.left)/(rect.width*z),y=-dy*(camera.top-camera.bottom)/(rect.height*z),oy=m[1]*x+m[5]*y;
 return {x:-(m[0]*x+m[4]*y-m[8]*oy/m[9]),z:-(m[2]*x+m[6]*y-m[10]*oy/m[9])};
}

export class VillageCamera{
 constructor(world,{events=globalThis.window,document=globalThis.document}={}){
  this.world=world;this.canvas=world.renderer.domElement;this.events=events;this.document=document;this.pointers=new Map();this.blockedEnds=new Set();this.enabled=false;this.suppressClick=false;this.gesture=null;this.originalTouchAction=this.canvas.style.touchAction??'';this.listeners=[];
  this.targetZoom=VILLAGE_CAMERA_LIMITS.homeZoom;this.targetX=0;this.targetZ=0;this.panX=0;this.panZ=0;
  const on=(target,name,fn,options)=>{target?.addEventListener(name,fn,options);this.listeners.push([target,name,fn,options]);};
  on(this.canvas,'wheel',e=>this.wheel(e),{passive:false});
  on(this.canvas,'pointerdown',e=>this.down(e),true);on(this.canvas,'pointermove',e=>this.move(e),true);
  on(this.canvas,'pointerup',e=>this.up(e),true);on(this.canvas,'pointercancel',e=>this.cancelPointer(e),true);
  on(this.canvas,'lostpointercapture',e=>{if(this.pointers.has(e.pointerId))this.cancel();},true);
  on(this.canvas,'click',e=>{if(this.suppressClick&&e.detail!==0){this.suppressClick=false;stop(e);}},true);
  on(events,'blur',()=>this.cancel());on(events,'resize',()=>this.cancel());on(document,'visibilitychange',()=>this.sync());
 }
 allowed(){const g=this.world.game;return g?.mode==='village'&&g.screen==='village'&&!g.placement&&!g.nativeInputBlocked&&!g.nativeCriticalPending&&!g.nativeCriticalHeld&&g.ui?.inputReady===true&&!this.document?.hidden&&this.world.camera?.isOrthographicCamera===true;}
 sync(){const allowed=this.allowed();if(allowed!==this.enabled){if(!allowed){this.cancel();const g=this.world.game;if(g?.mode==='village'&&g.screen!=='placement'&&!g.placement){this.targetX=this.panX;this.targetZ=this.panZ;if(finite(this.world.zoom))this.zoom(this.world.zoom);}}this.enabled=allowed;this.canvas.style.touchAction=allowed?'none':this.originalTouchAction;}return allowed;}
 zoom(value){if(finite(value))this.targetZoom=clamp(value,VILLAGE_CAMERA_LIMITS.minZoom,VILLAGE_CAMERA_LIMITS.maxZoom);}
 pan(dx,dz){if(!finite(dx)||!finite(dz))return;let x=this.targetX+dx,z=this.targetZ+dz;const length=Math.hypot(x,z),max=VILLAGE_CAMERA_LIMITS.panRadius;if(length>max){x*=max/length;z*=max/length;}this.targetX=x;this.targetZ=z;}
 command(action){if(!this.sync())return false;if(action==='village-zoom-in')this.zoom(this.targetZoom/VILLAGE_CAMERA_LIMITS.buttonFactor);else if(action==='village-zoom-out')this.zoom(this.targetZoom*VILLAGE_CAMERA_LIMITS.buttonFactor);else if(action==='village-camera-reset'){this.cancel();this.targetZoom=VILLAGE_CAMERA_LIMITS.homeZoom;this.targetX=this.targetZ=0;}else return false;return true;}
 wheel(e){if(modified(e)||!this.sync()||!finite(e.deltaY))return;const rect=this.canvas.getBoundingClientRect();if(!finite(rect.height)||rect.height<=0)return;const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rect.height:1);this.cancel();this.zoom(this.targetZoom*Math.exp(clamp(pixels,-1200,1200)*.0015));e.preventDefault();}
 capture(id){try{if(!this.canvas.setPointerCapture)return false;this.canvas.setPointerCapture(id);return true;}catch{return false;}}
 release(id){try{if(this.canvas.hasPointerCapture?.(id))this.canvas.releasePointerCapture(id);}catch{}}
 down(e){
  this.blockedEnds.delete(e.pointerId);if(modified(e)||!this.sync()||e.button!==0||!finite(e.clientX)||!finite(e.clientY))return;
  const type=e.pointerType||'mouse';if(this.pointers.size>=2||this.pointers.size&&([...this.pointers.values()][0].type!=='touch'||type!=='touch'))return;
  if(!this.pointers.size){this.suppressClick=false;this.gesture={dragged:false,type,rect:this.canvas.getBoundingClientRect()};}
  if(!this.capture(e.pointerId)){if(!this.pointers.size)this.gesture=null;return;}
  this.pointers.set(e.pointerId,{type,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  if(this.pointers.size===2){this.gesture.dragged=true;this.gesture.pair=this.pair();e.preventDefault();}
 }
 pair(){const [a,b]=this.pointers.values();return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};}
 move(e){
  if(this.blockedEnds.has(e.pointerId)){if(e.pointerType!=='touch'&&e.buttons===0)this.blockedEnds.delete(e.pointerId);else{stop(e);return;}}
  if(!this.sync())return;const p=this.pointers.get(e.pointerId);if(!p)return;if(modified(e)){this.cancel();return;}if(!finite(e.clientX)||!finite(e.clientY))return;
  const previousX=p.x,previousY=p.y;p.x=e.clientX;p.y=e.clientY;const gesture=this.gesture;
  if(this.pointers.size===2){const pair=this.pair(),previous=gesture.pair;if(previous){const d=villagePanDelta(pair.x-previous.x,pair.y-previous.y,this.world.camera,gesture.rect);if(d)this.pan(d.x,d.z);if(previous.distance>1&&pair.distance>1)this.zoom(this.targetZoom*previous.distance/pair.distance);}gesture.pair=pair;stop(e);return;}
  let dx=p.x-previousX,dy=p.y-previousY;if(!gesture.dragged&&Math.hypot(p.x-p.startX,p.y-p.startY)>VILLAGE_CAMERA_LIMITS.dragThreshold){gesture.dragged=true;dx=p.x-p.startX;dy=p.y-p.startY;}
  if(!gesture.dragged)return;if(p.type!=='touch'){const d=villagePanDelta(dx,dy,this.world.camera,gesture.rect);if(d)this.pan(d.x,d.z);}stop(e);
 }
 up(e){
  if(this.blockedEnds.delete(e.pointerId)){stop(e);return;}const p=this.pointers.get(e.pointerId);if(!p)return;
  if(this.gesture?.dragged){this.suppressClick=true;stop(e);}this.pointers.delete(e.pointerId);this.release(e.pointerId);
  if(!this.pointers.size)this.gesture=null;else if(this.gesture)this.gesture.pair=null;
 }
 cancelPointer(e){if(this.pointers.has(e.pointerId))this.cancel();this.blockedEnds.delete(e.pointerId);}
 cancel(){const ids=[...this.pointers.keys()];if(ids.length){this.suppressClick=true;for(const id of ids)this.blockedEnds.add(id);}this.pointers.clear();this.gesture=null;for(const id of ids)this.release(id);}
 reset(){this.cancel();this.targetZoom=VILLAGE_CAMERA_LIMITS.homeZoom;this.targetX=this.targetZ=this.panX=this.panZ=0;this.enabled=false;this.canvas.style.touchAction=this.originalTouchAction;}
 step(dt,mode){
  this.sync();if(mode!=='village'||this.world.game?.mode!=='village')return null;
  const placement=this.world.game.screen==='placement'||!!this.world.game.placement,lambda=1-Math.exp(-VILLAGE_CAMERA_LIMITS.panDamping*Math.max(0,finite(dt)?dt:0));
  this.panX+=((placement?0:this.targetX)-this.panX)*lambda;this.panZ+=((placement?0:this.targetZ)-this.panZ)*lambda;
  return {zoom:placement?VILLAGE_CAMERA_LIMITS.homeZoom:this.targetZoom,panX:this.panX,panZ:this.panZ};
 }
 snapshot(){return {enabled:this.enabled,targetZoom:this.targetZoom,targetX:this.targetX,targetZ:this.targetZ,panX:this.panX,panZ:this.panZ,pointers:this.pointers.size,suppressClick:this.suppressClick};}
 dispose(){this.cancel();for(const [target,name,fn,options]of this.listeners)target?.removeEventListener(name,fn,options);this.listeners=[];this.canvas.style.touchAction=this.originalTouchAction;}
}
