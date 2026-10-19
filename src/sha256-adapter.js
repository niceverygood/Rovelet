// The caller supplies the runtime capability. No insecure fallback or implicit
// assumption that crypto.subtle exists on a WKWebView custom scheme.
export function webCryptoSha256(cryptoProvider){
 if(typeof cryptoProvider?.subtle?.digest!=='function')throw new Error('SHA-256 capability unavailable');
 return async text=>{const bytes=new TextEncoder().encode(text),digest=await cryptoProvider.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');};
}
