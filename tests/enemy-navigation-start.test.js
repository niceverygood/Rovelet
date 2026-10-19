import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {World} from '../src/world.js';import {EnemyNavigation,NavigationGrid,clearRoute} from '../src/enemy-navigation.js';import {createEnemyMotion,stepEnemyMotion} from '../src/enemy-motion.js';
const target={x:-9.401517154873218,z:-6.9443779246657975},initial={x:12.09037290225534,z:5.553158195408698},insideMargin={x:12.065595128774158,z:5.076625528199264};
function meadow(){const world={decor:new THREE.Group(),obstacles:[],asset:()=>new THREE.Group(),makeVillage(){}};World.prototype.makeModelEnvironment.call(world);assert.equal(world.obstacles.length,73);return world;}
function segmentGap(a,b,obstacles,radius){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;return Math.min(...obstacles.map(o=>{const t=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0;return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)-o.radius-radius;}));}
function simulate(from,heading){
 const world=meadow(),nav=new EnemyNavigation(),state={},position=new THREE.Vector3(from.x,0,from.z);let motion=createEnemyMotion(heading),travel=0,minGap=Infinity,maxStep=0;
 for(let i=0;i<120*30;i++){
  const waypoint=nav.target(position,target,world.obstacles,state,1/30,1.4);if(!waypoint.blocked)assert.ok(segmentGap(position,waypoint,world.obstacles,1.4)>=-1e-7,'waypoint crosses a physical obstacle');
  motion=stepEnemyMotion(motion,{kind:'elite',dx:waypoint.x-position.x,dz:waypoint.z-position.z,distance:waypoint.blocked?0:Math.hypot(target.x-position.x,target.z-position.z),detouring:waypoint.detouring},1/30);
  const before=position.clone();position.x+=motion.dx;position.z+=motion.dz;World.prototype.resolveCollision.call(world,position,1.4);
  const requested=Math.hypot(motion.dx,motion.dz),actual=position.distanceTo(before);if(requested>.0001&&actual<requested*.65)motion.speed*=actual/requested;travel+=actual;maxStep=Math.max(maxStep,actual);for(const o of world.obstacles)minGap=Math.min(minGap,Math.hypot(position.x-o.x,position.z-o.z)-o.radius-1.4);
 }
 const result={distance:Math.hypot(position.x-target.x,position.z-target.z),speed:motion.speed,travel,maxStep,minGap,stats:nav.stats};
 assert.ok(result.distance<6.1,JSON.stringify(result));assert.ok(result.distance>2.3);assert.equal(clearRoute(position,target,world.obstacles,.45),true);assert.ok(result.speed<.01);assert.ok(result.travel>15);assert.ok(result.maxStep<.06,'no teleport');assert.ok(result.minGap>=-1e-7);assert.ok(result.stats.maxExpanded<=4000);assert.equal(nav.grids.size,1);
}
for(const [label,heading]of [['north',0],['east',Math.PI/2],['toward player',Math.atan2(target.x-initial.x,target.z-initial.z)]]){
 test('actual isolated meadow start reaches firing range with initial heading '+label,()=>simulate(initial,heading));
 test('actual legal hull pose inside the routing margin escapes with heading '+label,()=>{const world=meadow();assert.equal(clearRoute(insideMargin,insideMargin,world.obstacles,1.4),true);assert.equal(clearRoute(insideMargin,insideMargin,world.obstacles,1.75),false);simulate(insideMargin,heading);});
}
test('virtual starts reach the large component without using an unsafe grid corner',()=>{
 const world=meadow(),grid=new NavigationGrid(world.obstacles,1.75),nearest=grid.point(grid.nearest(initial));assert.deepEqual(nearest,{x:12,z:6});const path=grid.findPath(initial,target,1.4);assert.ok(path.length>2);assert.ok(segmentGap(initial,path[0],world.obstacles,1.4)>=0);
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];assert.equal(clearRoute(a,b,world.obstacles,1.75),true);if(a.x!==b.x&&a.z!==b.z){assert.equal(grid.blocked[grid.id(a.x,b.z)],0);assert.equal(grid.blocked[grid.id(b.x,a.z)],0);}}
});
test('nearby waypoints are retained when skipping one would cut the next corner',()=>{
 const obstacles=[{x:0,z:0,radius:1}],nav=new EnemyNavigation(),position={x:-2,z:0},goal={x:2,z:0},first={x:-2,z:.8},next={x:-.5,z:2};nav.grid(obstacles,.8);
 assert.equal(clearRoute(first,next,obstacles,.8),true);assert.equal(clearRoute(position,next,obstacles,.8),false);
 const state={version:nav.version,radius:.45,cooldown:1,goalX:goal.x,goalZ:goal.z,index:0,direct:false,path:[first,next]};const point=nav.target(position,goal,obstacles,state,1/30);
 assert.equal(state.index,0);assert.equal(point.x,first.x);assert.equal(point.z,first.z);assert.equal(nav.stats.searches,0);
});
test('continuous grid edges and smoothed paths avoid a circle between free endpoints',()=>{
 const obstacles=[{x:.5,z:.85,radius:.1}],grid=new NavigationGrid(obstacles,.8),from={x:-2,z:0},goal={x:3,z:0};assert.equal(grid.blocked[grid.id(0,0)],0);assert.equal(grid.blocked[grid.id(1,0)],0);assert.equal(clearRoute({x:0,z:0},{x:1,z:0},obstacles,.8),false);
 const path=grid.findPath(from,goal),smooth=grid.smooth(path,from,goal);assert.ok(path.length);for(let i=1;i<path.length;i++)assert.equal(clearRoute(path[i-1],path[i],obstacles,.8),true);for(let i=0;i<smooth.length;i++)assert.equal(clearRoute(i?smooth[i-1]:from,smooth[i],obstacles,.8),true);
});
test('a physically closed enclosure remains blocked with a bounded search',()=>{
 const obstacles=Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8)*4,z:Math.sin(i*Math.PI/8)*4,radius:1})),nav=new EnemyNavigation(),point=nav.target({x:0,z:0},{x:10,z:0},obstacles,{},1/30);
 assert.equal(point.blocked,true);assert.ok(nav.stats.maxExpanded<=4000);assert.equal(nav.stats.unreachable,1);
});
test('margin escape permits floating point contact but never shrinks unrelated obstacle clearance',()=>{
 const contact=new NavigationGrid([{x:10,z:4,radius:.8}],1.75);assert.ok(contact.smooth([{x:13,z:4}],{x:12.2,z:4},{x:13,z:4},1.4).length);
 const obstacles=[{x:0,z:0,radius:1},{x:4,z:2.6,radius:1}],grid=new NavigationGrid(obstacles,1.75),from={x:2.5,z:0},goal={x:5,z:0};assert.equal(clearRoute(from,goal,obstacles,1.4),true);assert.deepEqual(grid.smooth([goal],from,goal,1.4),[]);
 assert.deepEqual(contact.smooth([{x:13,z:4}],{x:12.1,z:4},{x:13,z:4},1.4),[],'physically overlapping starts are not escape connectors');
});
