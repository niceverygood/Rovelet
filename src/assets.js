const compiledVersions=typeof __HEARTH_ASSET_VERSIONS__==='undefined'?{}:__HEARTH_ASSET_VERSIONS__;
const compiledLicenseVersion=typeof __HEARTH_LICENSE_VERSION__==='undefined'?'':__HEARTH_LICENSE_VERSION__;
const validSha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
export function assetUrl(path,base=import.meta.env?.BASE_URL??'./',page=globalThis.document?.baseURI??'http://localhost/',versions=compiledVersions,licenseVersion=compiledLicenseVersion){
 const relative=String(path).replace(/^\/+/,''),url=new URL(relative,new URL(base,page));let key=relative.split(/[?#]/,1)[0].replace(/^(?:\.\/)+/,'');
 try{key=decodeURIComponent(key);}catch{}
 if(key==='licenses.html'&&validSha(licenseVersion))url.searchParams.set('v',licenseVersion.toLowerCase());
 else if(versions&&Object.hasOwn(versions,key)&&validSha(versions[key]))url.searchParams.set('v',versions[key].toLowerCase());
 return url.href;
}
export function assetMarkup(markup,base,page,versions){return markup.replace(/\b(src|href)=(['"])\/(references|weapon-icons|models)([^'"]*)\2/g,(_,attribute,quote,folder,suffix)=>attribute+'='+quote+assetUrl(folder+suffix,base,page,versions)+quote);}
