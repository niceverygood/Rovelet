import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createStaticServer} from './scripts/static-server.mjs';import info from './package.json' with {type:'json'};
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist'),port=Number(process.env.PORT??4180),host=process.env.HOST??'127.0.0.1',basePath=process.env.GAME_BASE??'/';
if(!fs.existsSync(path.join(root,'index.html'))){console.error('Production build missing. Run pnpm build first.');process.exit(1);}
const server=createStaticServer({root,version:info.version,basePath});server.listen(port,host,()=>console.log('Wandering Hearth '+info.version+': http://'+host+':'+port+basePath));server.on('error',error=>{console.error(error.message);process.exitCode=1;});
