import {BUILDINGS,buildingCost,unlockedWeapons} from './data.js';
import {upgradeStats} from './village-stats.js';
const PRIMARY={garage:['maxHp','speedBonus'],smithy:['damageMultiplier','intervalMultiplier'],greenhouse:['regen','rewardMultiplier']};
export function firstFacilityPlans(save){
 if(save.runs>0||Object.values(save.buildings).some(level=>level>0))return [];
 const old=unlockedWeapons(save);
 return Object.keys(BUILDINGS).map(key=>{const preview=upgradeStats(save,key),cost=buildingCost(key,save.buildings[key]),next={...save,buildings:{...save.buildings,[key]:save.buildings[key]+1}};
  return {key,cost,affordable:save.coins>=cost,effects:PRIMARY[key].map(stat=>({stat,before:preview.before[stat],after:preview.after[stat]})),unlocks:unlockedWeapons(next).filter(key=>!old.includes(key))};
 });
}
