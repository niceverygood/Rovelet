import {t,messageKey,localize} from './i18n.js';
import {STAGES,normalizeCampaign} from './campaign.js';
export const TUTORIAL=localize([{title:messageKey("journey.098"),body:messageKey("journey.099"),hint:messageKey("journey.100"),asset:'castle-small'},{title:messageKey("journey.101"),body:messageKey("journey.102"),hint:messageKey("journey.103"),asset:'cannon'},{title:messageKey("journey.104"),body:messageKey("journey.105"),hint:messageKey("journey.106"),asset:'castle-medium'},{title:messageKey("journey.107"),body:messageKey("journey.108"),hint:messageKey("journey.109"),asset:'greenhouse'}]);
export function campaignFinished(save){const completed=normalizeCampaign(save).completed;return STAGES.every(stage=>completed.includes(stage.id));}
export function tutorialIndex(index){return Math.max(0,Math.min(TUTORIAL.length-1,Number.isInteger(index)?index:0));}
