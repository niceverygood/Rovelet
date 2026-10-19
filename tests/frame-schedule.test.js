import test from 'node:test';import assert from 'node:assert/strict';
import {FrameSchedule} from '../src/frame-schedule.js';
const menu={mode:'title',screen:'title'};
const running={mode:'run',screen:''};
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

for(const hz of [60,120,144])test(`inactive world/UI ticks retain 30Hz and elapsed time at ${hz}Hz refresh`,()=>{
 const scheduler=new FrameSchedule(0),ticks=[];
 assert.equal(scheduler.step(0,menu),0);
 for(let frame=1;frame<=hz*10;frame++){const dt=scheduler.step(frame*1000/hz,menu);if(dt!==null)ticks.push(dt);}
 assert.equal(ticks.length,300);
 close(ticks.reduce((sum,dt)=>sum+dt,0),10);
 assert.ok(ticks.every(dt=>dt>0&&dt<=.05));
});

test('active combat updates at every RAF and both screen and mode changes wake immediately',()=>{
 const scheduler=new FrameSchedule(0),paused={mode:'run',screen:'pause'};
 scheduler.step(0,paused);
 assert.equal(scheduler.step(5,paused),null);
 assert.equal(scheduler.step(6,running),0);
 close(scheduler.step(7,running),.001);
 close(scheduler.step(8,paused),.001);
 assert.equal(scheduler.step(9,paused),null);
 close(scheduler.step(10,{mode:'run',screen:'upgrade'}),.002);
 assert.equal(scheduler.step(11,{mode:'run',screen:'upgrade'}),null);
 close(scheduler.step(12,{mode:'village',screen:'upgrade'}),.002);
});

test('starting combat or a lab discards waiting menu time while active-to-active changes preserve elapsed time',()=>{
 const scheduler=new FrameSchedule(0),lab={mode:'lab',screen:'collection'},paused={mode:'run',screen:'pause'};
 scheduler.step(0,menu);
 assert.equal(scheduler.step(20,menu),null);
 assert.equal(scheduler.step(21,running),0);
 close(scheduler.step(22,running),.001);
 close(scheduler.step(23,lab),.001);
 close(scheduler.step(24,{mode:'lab',screen:'settings'}),.001);
 close(scheduler.step(25,paused),.001);
 assert.equal(scheduler.step(26,paused),null);
 assert.equal(scheduler.step(30,lab),0);
 close(scheduler.step(31,lab),.001);
 close(scheduler.step(32,running),.001);
});

test('all lab screens and manual playback retain full RAF timing for remaining effects',()=>{
 for(const screen of ['collection','settings','credits','']){
  const scheduler=new FrameSchedule(0),lab={mode:'lab',screen,auto:false};
  scheduler.step(0,lab);let total=0;
  for(let frame=1;frame<=144;frame++){const dt=scheduler.step(frame*1000/144,lab);assert.notEqual(dt,null);total+=dt;}
  close(total,1);
 }
});

test('hidden frames do not update and an hour without RAF does not advance the returning game',()=>{
 const scheduler=new FrameSchedule(0);scheduler.step(0,running);
 assert.equal(scheduler.step(10,{...running,hidden:true}),null);
 assert.equal(scheduler.step(20,{...running,hidden:true}),null);
 scheduler.reset(3600020);
 assert.equal(scheduler.step(3600020,running),0);
 close(scheduler.step(3600030,running),.01);
 // The visibility state also protects callers if no returning event was sent.
 assert.equal(scheduler.step(3600040,{...running,hidden:true}),null);
 assert.equal(scheduler.step(7200040,running),0);
 close(scheduler.step(7200050,running),.01);
});

test('visibility events reset elapsed time even when the browser never delivered a hidden RAF',()=>{
 const scheduler=new FrameSchedule(0);scheduler.step(0,menu);
 scheduler.reset(10);scheduler.reset(3600010);
 close(scheduler.step(3600015,menu),.005);
 assert.equal(scheduler.step(3600016,menu),null);
});

test('resize invalidation wakes a waiting frame without dropping its accumulated elapsed time',()=>{
 const scheduler=new FrameSchedule(0);scheduler.step(0,menu);
 assert.equal(scheduler.step(10,menu),null);scheduler.invalidate();
 close(scheduler.step(11,menu),.011);
 assert.equal(scheduler.step(12,menu),null);
 close(scheduler.step(45,menu),.034);
});

test('stalls clamp dt, skip missed deadlines, and never replay an update burst',()=>{
 const scheduler=new FrameSchedule(0);scheduler.step(0,menu);
 assert.equal(scheduler.step(1000,menu),.05);
 assert.equal(scheduler.step(1000,menu),null);
 assert.equal(scheduler.step(1001,menu),null);
 close(scheduler.step(1034,menu),.034);
 assert.equal(scheduler.step(1035,menu),null);
 close(scheduler.step(1067,menu),.033);
 assert.equal(scheduler.step(2000,running),0);
 close(scheduler.step(2001,running),.001);
 assert.equal(scheduler.step(3000,running),.05);
 close(scheduler.step(3001,running),.001);
});
