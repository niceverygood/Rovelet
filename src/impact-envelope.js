// Deterministic impact data, pixels and absolute elapsed timing.
export const IMPACT_ENVELOPES=Object.freeze({
 'impact-core':Object.freeze({duration:.085,startScale:.48,endScale:1.2,opacity:1,color:0xfff3d5,ground:false,depthTest:false,renderOrder:3}),
 'impact-afterglow':Object.freeze({duration:.22,startScale:.6,endScale:1.6,opacity:.4,color:0xffa342,ground:false,depthTest:false,renderOrder:3}),
 'impact-ground':Object.freeze({duration:.28,startScale:.25,endScale:1.6,opacity:.6,color:0xffd58a,ground:true,depthTest:true,renderOrder:0})
});
export function sampleImpactEnvelope(kind,elapsed,strength=1){
 const definition=Object.hasOwn(IMPACT_ENVELOPES,kind)?IMPACT_ENVELOPES[kind]:null;if(!definition)throw new RangeError('Unknown impact envelope: '+kind);
 if(!Number.isFinite(elapsed)||!Number.isFinite(strength)||strength<=0)throw new RangeError('Impact envelope time/strength must be finite and strength positive.');
 const progress=Math.min(1,Math.max(0,elapsed/definition.duration)),remaining=1-progress,ease=1-remaining**3;
 return {scale:(definition.startScale+(definition.endScale-definition.startScale)*ease)*strength,opacity:definition.opacity*remaining**2,done:progress>=1};
}
export function createImpactGlowPixels(){
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),radial=Math.max(0,1-dx*dx-dy*dy),index=(y*size+x)*4;pixels[index]=pixels[index+1]=pixels[index+2]=255;pixels[index+3]=Math.round(255*radial**3);}
 return pixels;
}
export function sampleImpactGround(heightAt,x,z){
 if(typeof heightAt!=='function'||!Number.isFinite(x)||!Number.isFinite(z))return {height:0,normal:[0,1,0]};
 const center=heightAt(x,z),height=Number.isFinite(center)?center:0,step=.15,heights=[heightAt(x+step,z),heightAt(x-step,z),heightAt(x,z+step),heightAt(x,z-step)];
 if(!Number.isFinite(center)||!heights.every(Number.isFinite))return {height,normal:[0,1,0]};
 const dx=(heights[0]-heights[1])/(2*step),dz=(heights[2]-heights[3])/(2*step),length=Math.hypot(dx,1,dz);
 return Number.isFinite(length)&&length>0?{height,normal:[-dx/length,1/length,-dz/length]}:{height,normal:[0,1,0]};
}

// Cosmetic-only dimensions are absolute scales, never multiplied by damage.
export const PRIMARY_EXPLOSION_PROFILES=Object.freeze({
 rocket:Object.freeze({count:8,lifeMin:.48,lifeMax:.65,horizontalMin:2,horizontalMax:3.4,upMin:1.2,upMax:2.5,gravity:8,timeScale:1,scale:1.15,opacityScale:.75,ground:true,backBias:.35}),
 meteor:Object.freeze({count:12,lifeMin:.65,lifeMax:.8,horizontalMin:2.8,horizontalMax:4,upMin:2.2,upMax:3.8,gravity:10,timeScale:1.25,scale:1.4,opacityScale:.8,ground:true,backBias:.15}),
 clusterbomb:Object.freeze({count:6,lifeMin:.45,lifeMax:.6,horizontalMin:2,horizontalMax:3,upMin:1,upMax:2,gravity:8,timeScale:.95,scale:1,opacityScale:.7,ground:true,backBias:.25}),
 landmine:Object.freeze({count:9,lifeMin:.55,lifeMax:.75,horizontalMin:1.5,horizontalMax:2.6,upMin:2.6,upMax:3.6,gravity:10,timeScale:1.1,scale:1.25,opacityScale:.75,ground:true,groundScale:1.8,backBias:0}),
 'cluster-fragment':Object.freeze({count:1,lifeMin:.28,lifeMax:.4,horizontalMin:1.2,horizontalMax:2,upMin:.8,upMax:1.4,gravity:8,timeScale:.6,scale:.45,opacityScale:.6,ground:false,backBias:.12})
});
