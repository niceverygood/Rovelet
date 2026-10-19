import CATALOG from './locales/catalog.json' with {type:'json'};
export const LANGUAGES=['ko','en'];let language='ko';const proxies=new WeakMap();
export function getLanguage(){return language;}
export function setLanguage(value){language=LANGUAGES.includes(value)?value:'ko';if(typeof document!=='undefined'){document.documentElement.lang=language;document.title=t('product.title');}return language;}
export function t(key){const message=CATALOG[key];return message?.[language]??message?.ko??key;}
export function messageKey(key){return '@message:'+key;}
// Data keeps message IDs; resolving on access lets existing weapon/boss records follow language changes.
export function localize(value){if(typeof value==='string'&&value.startsWith('@message:'))return t(value.slice(9));if(!value||typeof value!=='object')return value;if(proxies.has(value))return proxies.get(value);const proxy=new Proxy(value,{get(target,key,receiver){return localize(Reflect.get(target,key,receiver));}});proxies.set(value,proxy);return proxy;}
export function validateCatalog(){return Object.entries(CATALOG).flatMap(([key,entry])=>LANGUAGES.filter(locale=>typeof entry[locale]!=='string'||locale==='en'&&/[가-힣]/.test(entry[locale])).map(locale=>key+'.'+locale));}
