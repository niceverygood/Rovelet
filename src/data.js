import {t,messageKey,localize} from './i18n.js';
import BALANCE from './balance.json' with {type:'json'};
import {ADVANCED_WEAPONS,BASE_FAMILIES} from './weapon-catalog.js';
export const WEAPONS = localize({...ADVANCED_WEAPONS,
 cannon:{name:messageKey("data.056"),desc:messageKey("data.057"),...BALANCE.weapons.cannon,color:0xffb940,icon:'cannon'},
 mortar:{name:messageKey("data.058"),desc:messageKey("data.059"),...BALANCE.weapons.mortar,color:0xff9853,icon:'mortar'},
 ballista:{name:messageKey("data.060"),desc:messageKey("data.061"),...BALANCE.weapons.ballista,color:0xe9c289,icon:'ballista'},
 crystal:{name:messageKey("data.062"),desc:messageKey("data.063"),...BALANCE.weapons.crystal,color:0x7bceff,icon:'crystal'},
 beehive:{name:messageKey("data.064"),desc:messageKey("data.065"),...BALANCE.weapons.beehive,color:0xffd455,icon:'beehive'},
 steam:{name:messageKey("data.066"),desc:messageKey("data.067"),...BALANCE.weapons.steam,color:0xfff8de,icon:'steam'}
});
for(const [key,family]of Object.entries(BASE_FAMILIES)){WEAPONS[key].family=family;WEAPONS[key].shape=key;WEAPONS[key].impact=key+'-impact';WEAPONS[key].sound=key+'-shot';}
export const MAX_BUILDING_LEVEL=BALANCE.facilities.maxLevel;
export const BUILDINGS=localize({
 garage:{name:messageKey("data.068"),desc:messageKey("data.069"),cost:BALANCE.facilities.cost.garage,asset:'house',color:'#598f74'},
 smithy:{name:messageKey("data.070"),desc:messageKey("data.071"),cost:BALANCE.facilities.cost.smithy,asset:'smithy',color:'#bc794a'},
 greenhouse:{name:messageKey("data.072"),desc:messageKey("data.073"),cost:BALANCE.facilities.cost.greenhouse,asset:'greenhouse',color:'#87a65e'}
});
export const RUN_DURATION=600;
export const SAVE_KEY='wandering-hearth:v1';
export function freshSave(){return {version:1,schemaVersion:2,tutorialSeen:false,campaign:{unlocked:1,completed:[],selected:'meadow-1',best:{}},coins:140,buildings:{garage:0,smithy:0,greenhouse:0},runs:0,victories:0,totalKills:0,bestTime:0,weapon:'cannon',settings:{sound:true,volume:.35,bgmVolume:.45,sfxVolume:1,vibration:false,language:'ko',contrast:false,reducedMotion:false},settledRuns:[]};}
export function xpNeeded(level){return Math.floor(BALANCE.progression.xpBase+level*BALANCE.progression.xpLinear+level*level*BALANCE.progression.xpQuadratic);}
export function buildingCost(key,level){return BUILDINGS[key].cost*(level+1);}
export function maxSlots(stage){return BALANCE.progression.slots[stage];}
export function weaponStats(key,level){const w=WEAPONS[key];return {...w,damage:w.damage*(1+(level-1)*BALANCE.progression.weaponDamagePerLevel),rate:w.rate/(1+(level-1)*BALANCE.progression.weaponRatePerLevel)};}
export const FACILITY_UNLOCKS={smithy:[['mortar','ballista'],['sniper','harpoon','boomerang'],['scattergun','ricochet','sawblade'],['rocket','fireball','flamethrower'],['railgun','clusterbomb'],['meteor']],greenhouse:[['crystal','beehive'],['icebolt','icicle','seedpod'],['lightning','tesla'],['acidflask','stormcloud'],['sonicwave','chakram','landmine'],['tornado','frostbomb']]};
export function unlockedWeapons(save){return [...new Set(['cannon','steam',...Object.entries(FACILITY_UNLOCKS).flatMap(([key,tiers])=>tiers.slice(0,save.buildings[key]).flat())])];}
