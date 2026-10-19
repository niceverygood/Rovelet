import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.glb':'model/gltf-binary','.json':'application/json','.woff2':'font/woff2'};
const SECURITY={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cross-Origin-Opener-Policy':'same-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'"};
export function createStaticServer({root,version='unknown',basePath='/'}){
 root=path.resolve(root);const base='/'+basePath.replace(/^\/+|\/+$/g,'')+'/',prefix=base==='//'?'':base.slice(0,-1);
 return http.createServer((req,res)=>{
  const end=(status,body='')=>{res.writeHead(status,{...SECURITY,'Content-Type':'text/plain; charset=utf-8'});res.end(body);};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');end(405,'Method not allowed');return;}
  let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{end(400,'Invalid path');return;}
  if(requested.includes('\0')){end(400,'Invalid path');return;}
  if(requested==='/health'||requested===prefix+'/health'){
   let info={version};try{info=JSON.parse(fs.readFileSync(path.join(root,'release-info.json'),'utf8'));}catch{}
   res.writeHead(200,{...SECURITY,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':JSON.stringify({game:'wandering-hearth',...info,assetVersion:info.version,version,basePath:prefix?prefix+'/':'/'}));return;
  }
  if(prefix&&requested===prefix){res.writeHead(301,{...SECURITY,Location:prefix+'/'});res.end();return;}
  // Native JSON viewers request the origin-root icon even for a subpath app.
  if(prefix&&requested==='/favicon.ico')requested=prefix+'/favicon.ico';
  if(prefix){if(!requested.startsWith(prefix+'/')){end(404,'Not found');return;}requested=requested.slice(prefix.length);}
  const filename=path.resolve(root,'.'+(requested==='/'?'/index.html':requested)),relative=path.relative(root,filename);
  if(relative.startsWith('..')||path.isAbsolute(relative)){end(403,'Forbidden');return;}
  fs.stat(filename,(error,stat)=>{
   if(error||!stat.isFile()){end(404,'Not found');return;}
   try{
    let file=filename,encoding='';const accept=req.headers['accept-encoding']??'';
    if(accept.includes('br')&&fs.existsSync(filename+'.br')){file=filename+'.br';encoding='br';}else if(accept.includes('gzip')&&fs.existsSync(filename+'.gz')){file=filename+'.gz';encoding='gzip';}
    const extension=path.extname(filename),metadata=requested==='/'||extension==='.html'||extension==='.json';
    // A ZIP can preserve both length and timestamp across different metadata contents.
    // Hash and serve one small buffer so validation and Content-Length stay coherent.
    const body=metadata?fs.readFileSync(file):null,size=body?body.length:encoding?fs.statSync(file).size:stat.size;
    const identity=body?crypto.createHash('sha256').update(body).digest('hex'):stat.size+'-'+Math.floor(stat.mtimeMs),etag='"'+identity+'-'+encoding+'"';
    const headers={...SECURITY,'Content-Type':TYPES[extension]??'application/octet-stream','Cache-Control':metadata?'no-cache':requested.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600','Vary':'Accept-Encoding','ETag':etag};
    if(encoding)headers['Content-Encoding']=encoding;
    if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
    res.writeHead(200,{...headers,'Content-Length':size});
    if(req.method==='HEAD'){res.end();return;}
    if(body){res.end(body);return;}
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
   }catch{if(!res.headersSent)end(404,'Not found');else res.destroy();}
  });
 });
}

