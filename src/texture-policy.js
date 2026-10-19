export const TEXTURE_POLICY_VERSION=1;
export function textureLimit(id,key){return key==='map'?(id.startsWith('castle')?2048:1024):512;}
