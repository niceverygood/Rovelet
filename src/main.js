import {t,messageKey,localize,setLanguage} from './i18n.js';
import './style.css';
import {World} from './world.js';import {Game} from './game.js';import {UI} from './ui.js';
import {SAVE_KEY} from './data.js';
import {FrameSchedule} from './frame-schedule.js';
let initialLanguage='ko';try{initialLanguage=JSON.parse(localStorage.getItem(SAVE_KEY))?.settings?.language??'ko';}catch{}setLanguage(initialLanguage);document.querySelector('#loading h1').textContent=t('loading.title');document.querySelector('#loading-label').textContent=t('loading.prepare');
async function boot(){try{let nativeRuntime=null;if(globalThis.Capacitor?.isNativePlatform?.()===true){const nativeModule=await import('./native-runtime.js');nativeRuntime=await nativeModule.prepareNativeRuntime({Capacitor:globalThis.Capacitor,document,language:initialLanguage});let language='ko';try{language=JSON.parse(localStorage.getItem(SAVE_KEY))?.settings?.language??'ko';}catch{}setLanguage(language);}const world=new World(document.querySelector('#scene'));await world.load((n,total)=>{document.querySelector('#loading-label').textContent=`${t("main.110")}${n} / ${total}`;document.querySelector('#loading-fill').style.width=`${n/total*100}%`;});if(nativeRuntime)while(!nativeRuntime.session.verifyLocalReady().localReady)await nativeRuntime.retryLocalReady();const game=nativeRuntime?new Game(world,{storage:nativeRuntime.session.port,native:true,nativePersistence:nativeRuntime.session}):new Game(world);const ui=new UI(game);let nativeOwner=null;let frameSchedule;if(nativeRuntime){frameSchedule=new FrameSchedule(performance.now());nativeOwner=await nativeRuntime.bind({game,ui,world,frameSchedule,document,inputTarget:window,blurTarget:window});}
 document.querySelector('#loading-label').textContent=t('loading.finishing');
 await new Promise(requestAnimationFrame);
 // Upload textures and prepare the complete first scene behind the loading overlay.
 // A zero-duration tick preserves the saved game and does not advance combat.
 game.update(0);
 await new Promise(requestAnimationFrame);
 document.querySelector('#loading').classList.add('hidden');ui.enableInteraction();setTimeout(()=>document.querySelector('#loading')?.remove(),700);
 frameSchedule??=new FrameSchedule(performance.now());
 window.addEventListener('resize',()=>frameSchedule.invalidate());
 // Browsers can suspend RAF entirely in a hidden tab. Reset at the event,
 // rather than letting that hidden wall time reach the first returning tick.
 if(!nativeRuntime)document.addEventListener('visibilitychange',()=>frameSchedule.reset(performance.now()));
 function frame(now){const dt=frameSchedule.step(now,{mode:game.mode,screen:game.screen,hidden:nativeOwner?nativeOwner.lifecycle.isHidden():document.hidden});if(dt!==null)game.update(dt);requestAnimationFrame(frame);}
 requestAnimationFrame(frame);window.addEventListener('beforeunload',()=>{if(nativeOwner){void nativeOwner.background();return;}if(game.mode==='run'&&!game.run?.outcome)game.checkpointRun();});if(import.meta.env.DEV)window.__hearth={game,world,ui,frameSchedule};}catch(error){console.error(error);document.querySelector('#loading').innerHTML=`${t("main.111")}${String(error.message).replaceAll('<','&lt;')}${t("main.112")}`;document.querySelector('[data-retry-load]')?.addEventListener('click',()=>location.reload());}}
boot();


