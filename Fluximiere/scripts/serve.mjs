import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serveApp} from '../../FluxCreate/server/index.mjs';
export const serve=(port=4323,options={})=>serveApp({appId:'fluximiere',root:new URL('../',import.meta.url),port,...options});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await serve();
