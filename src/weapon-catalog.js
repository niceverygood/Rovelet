import {t,messageKey,localize} from './i18n.js';
import BALANCE from './balance.json' with {type:'json'};
const weapon=(name,desc,family,color,shape,key)=>({name,desc,family,color,shape,icon:shape,impact:shape+'-impact',sound:shape+'-shot',...BALANCE.weapons[key]});
export const ADVANCED_WEAPONS=localize({
 scattergun:weapon(messageKey("weapon-catalog.284"),messageKey("weapon-catalog.285"),'straight',0xe4b269,'pellet','scattergun'),
 sniper:weapon(messageKey("weapon-catalog.286"),messageKey("weapon-catalog.287"),'pierce',0xf3dfb4,'dart','sniper'),
 ricochet:weapon(messageKey("weapon-catalog.288"),messageKey("weapon-catalog.289"),'straight',0xffca65,'ricochet','ricochet'),
 railgun:weapon(messageKey("weapon-catalog.290"),messageKey("weapon-catalog.291"),'pierce',0xace8ef,'beam','railgun'),
 fireball:weapon(messageKey("weapon-catalog.292"),messageKey("weapon-catalog.293"),'area',0xff824c,'fireball','fireball'),
 icebolt:weapon(messageKey("weapon-catalog.294"),messageKey("weapon-catalog.295"),'straight',0x8bdcff,'icebolt','icebolt'),
 lightning:weapon(messageKey("weapon-catalog.296"),messageKey("weapon-catalog.297"),'chain',0xe2dcff,'lightning','lightning'),
 boomerang:weapon(messageKey("weapon-catalog.298"),messageKey("weapon-catalog.299"),'pierce',0xd7bc7e,'boomerang','boomerang'),
 chakram:weapon(messageKey("weapon-catalog.300"),messageKey("weapon-catalog.301"),'area',0xa8d1ba,'chakram','chakram'),
 rocket:weapon(messageKey("weapon-catalog.302"),messageKey("weapon-catalog.303"),'homing',0xffc381,'rocket','rocket'),
 meteor:weapon(messageKey("weapon-catalog.304"),messageKey("weapon-catalog.305"),'lob',0xffa271,'meteor','meteor'),
 clusterbomb:weapon(messageKey("weapon-catalog.306"),messageKey("weapon-catalog.307"),'lob',0xdcb66c,'clusterbomb','clusterbomb'),
 frostbomb:weapon(messageKey("weapon-catalog.308"),messageKey("weapon-catalog.309"),'lob',0xc1e9ff,'frostbomb','frostbomb'),
 tesla:weapon(messageKey("weapon-catalog.310"),messageKey("weapon-catalog.311"),'deploy',0xa6cfff,'tesla','tesla'),
 landmine:weapon(messageKey("weapon-catalog.312"),messageKey("weapon-catalog.313"),'deploy',0xc7a267,'landmine','landmine'),
 flamethrower:weapon(messageKey("weapon-catalog.314"),messageKey("weapon-catalog.315"),'area',0xffb05b,'flame','flamethrower'),
 stormcloud:weapon(messageKey("weapon-catalog.316"),messageKey("weapon-catalog.317"),'deploy',0xb7c3e9,'stormcloud','stormcloud'),
 acidflask:weapon(messageKey("weapon-catalog.318"),messageKey("weapon-catalog.319"),'lob',0xa6cf76,'acidflask','acidflask'),
 icicle:weapon(messageKey("weapon-catalog.320"),messageKey("weapon-catalog.321"),'pierce',0x9bd8f5,'icicle','icicle'),
 harpoon:weapon(messageKey("weapon-catalog.322"),messageKey("weapon-catalog.323"),'straight',0xb3c3c4,'harpoon','harpoon'),
 sawblade:weapon(messageKey("weapon-catalog.324"),messageKey("weapon-catalog.325"),'pierce',0xc5d3ce,'sawblade','sawblade'),
 seedpod:weapon(messageKey("weapon-catalog.326"),messageKey("weapon-catalog.327"),'deploy',0xb9d67a,'seedpod','seedpod'),
 sonicwave:weapon(messageKey("weapon-catalog.328"),messageKey("weapon-catalog.329"),'area',0xe9e1ad,'sonicwave','sonicwave'),
 tornado:weapon(messageKey("weapon-catalog.330"),messageKey("weapon-catalog.331"),'area',0xc4e5dc,'tornado','tornado')
});
export const BASE_FAMILIES={cannon:'straight',mortar:'lob',ballista:'pierce',crystal:'homing',beehive:'homing',steam:'area'};
