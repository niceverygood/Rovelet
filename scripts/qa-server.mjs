import {createServer} from '../node_modules/vite/dist/node/index.js';
const server=await createServer({root:new URL('../',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),configFile:false,base:'./',server:{port:4176,strictPort:true,host:'127.0.0.1',hmr:false,watch:null}});await server.listen();console.log('Isolated QA server http://127.0.0.1:4176/ (no file-watch reloads)');
