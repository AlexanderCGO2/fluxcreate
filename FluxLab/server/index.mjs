import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLabService,LabError} from './service.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536)throw new LabError('The generation request is too large.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new LabError('Include a valid JSON generation request.');}}
export async function serve(port=Number(process.env.PORT||4326),{service=createLabService()}={}){
 const token=randomBytes(32).toString('hex');const server=http.createServer(async(req,res)=>{try{
  const address=server.address(),allowed=new Set([`localhost:${address.port}`,`127.0.0.1:${address.port}`,`[::1]:${address.port}`]);if(!allowed.has(req.headers.host))throw new LabError('Local host required.',403);
  if(req.headers.origin&&!Array.from(allowed).some(host=>req.headers.origin===`http://${host}`))throw new LabError('Same-origin requests only.',403);
  if(req.headers['sec-fetch-site']==='cross-site')throw new LabError('Same-origin requests only.',403);
  const url=new URL(req.url,`http://${req.headers.host}`),pathname=url.pathname;
  if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,app:'fluxlab'});
  if(pathname==='/api/session'&&req.method==='GET')return send(res,200,{token});
  if(pathname==='/api/status'&&req.method==='GET')return send(res,200,await service.status());
  if(pathname==='/api/models'&&req.method==='GET')return send(res,200,await service.models());
  if(pathname==='/api/generate'&&req.method==='POST'){
   const given=Buffer.from(String(req.headers['x-flux-token']||'')),expected=Buffer.from(token);if(given.length!==expected.length||!timingSafeEqual(given,expected))throw new LabError('Refresh FluxLab to reconnect this local session.',403);
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new LabError('Send JSON content.',415);
   const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};req.once('aborted',abort);res.once('close',abort);
   try{const result=await service.generate(await body(req),{signal:controller.signal});if(!res.destroyed)return send(res,200,result);}finally{req.removeListener('aborted',abort);res.removeListener('close',abort);}return;
  }
  if(pathname.startsWith('/api/'))return send(res,404,{error:'Unknown FluxLab endpoint.'});
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
  const name=decodeURIComponent(pathname==='/'?'/index.html':pathname),file=path.resolve(root,'.'+name);if(!file.startsWith(root))throw new LabError('File not found.',404);
  let data;try{data=await readFile(file);}catch{return send(res,404,{error:'FluxLab is not built yet, or this file does not exist.'});}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.map':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'content-type':mime,'x-content-type-options':'nosniff','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch(error){if(!res.destroyed&&!res.headersSent)send(res,error instanceof LabError?error.status:500,{error:error instanceof LabError?error.message:'FluxLab could not complete the request.'});}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=await serve();console.log(`FluxLab is ready at http://localhost:${server.address().port}`);}
