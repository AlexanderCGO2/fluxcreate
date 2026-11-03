import http from 'node:http';
import {createEditorMcpHandler} from '../../FluxLab/server/mcp-http.mjs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAIService } from '../server/ai-service.mjs';
import { AIEditError } from '../src/ai-commands.mjs';
import {handleSettings,resolveRequestConnection} from '../../FluxCreate/server/settings.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.jsx': 'text/plain; charset=utf-8', '.png': 'image/png' };
function json(res,status,body){if(res.destroyed)return;const encoded=JSON.stringify(body);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(encoded);}
class RequestError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const MAX_REQUEST_BYTES=4*1024*1024;
const oversized=()=>new RequestError('The editable scene is too large for this AI request. Simplify the composition first.',413);
async function readJSON(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){req.resume();throw new RequestError('Send an application/json request.',415);}
  if(Number(req.headers['content-length'])>MAX_REQUEST_BYTES){req.resume();throw oversized();}
  // Throwing out of an IncomingMessage async iterator destroys its socket before
  // the client can receive a useful 413 response. Bound the event stream instead.
  const encoded=await new Promise((resolve,reject)=>{
    let length=0,finished=false;const chunks=[];
    const cleanup=()=>{req.off('data',onData);req.off('end',onEnd);req.off('error',onError);req.off('aborted',onAborted);};
    const fail=error=>{if(finished)return;finished=true;cleanup();req.once('error',()=>{});chunks.length=0;req.resume();reject(error);};
    const onData=chunk=>{length+=chunk.length;if(length>MAX_REQUEST_BYTES){fail(oversized());return;}chunks.push(chunk);};
    const onEnd=()=>{if(finished)return;finished=true;cleanup();resolve(Buffer.concat(chunks).toString('utf8'));};
    const onError=()=>fail(new RequestError('The request could not be read.'));
    const onAborted=()=>fail(new RequestError('AI request cancelled.',499));
    req.on('data',onData);req.once('end',onEnd);req.once('error',onError);req.once('aborted',onAborted);
    if(req.aborted)onAborted();
  });
  let body;try{body=JSON.parse(encoded);}catch{throw new RequestError('The request is not valid JSON.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError('An AI request must be an object.');
  return body;
}
export function serve(port = Number(process.env.PORT || 4320), {aiService = createAIService()} = {}) {
  const mcp=createEditorMcpHandler({appId:'fluxiffects',editor:{appId:'fluxiffects',plan:(input,options)=>aiService.plan(input,options)}});
  const server = http.createServer(async (req, res) => {
    try {
      const actualPort=server.address()?.port;
      const hosts=new Set([`localhost:${actualPort}`,`127.0.0.1:${actualPort}`]);
      if(!hosts.has(req.headers.host)){json(res,403,{error:'Use the local FluxMotion address.'});return;}
      let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{throw new RequestError('The requested address is not valid.');}
      if(pathname.startsWith('/api/')){
        const allowedOrigins=new Set([...hosts].map(host=>`http://${host}`));
        if((req.headers.origin&&!allowedOrigins.has(req.headers.origin))||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'This action must originate from your local FluxMotion workspace.'});return;}
        if(await handleSettings(req,res,pathname.slice(4)))return;
        const connection=await resolveRequestConnection(req);
        if(pathname==='/api/mcp')return mcp(req,res,{connection});
        if(req.method==='GET'&&pathname==='/api/health'){json(res,200,{app:'fluxiffects',version:'0.3.0'});return;}
        if(req.method==='GET'&&pathname==='/api/ai/status'){json(res,200,await aiService.status(connection));return;}
        if(req.method==='POST'&&pathname==='/api/ai/plan'){
          const controller=new AbortController();req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
          const body=await readJSON(req);if(controller.signal.aborted)throw new RequestError('AI request cancelled.',499);const result=await aiService.plan(body,{signal:controller.signal,connection});json(res,200,result);return;
        }
        json(res,404,{error:'Unknown local service endpoint.'});return;
      }
      if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Method not allowed.'});return;}
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      const info = await stat(file);
      if (!info.isFile()) throw Object.assign(new Error('Not a file'),{code:'ENOENT'});
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method==='HEAD'?undefined:await readFile(file));
    } catch(error) {
      if(res.destroyed)return;
      if(error.code==='ENOENT'){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
      const known=error instanceof RequestError||error instanceof AIEditError;
      const status=known&&Number.isInteger(error.status)&&error.status>=400&&error.status<=599?error.status:500;
      // The reader drains rejected uploads without buffering them. Closing the
      // connection early can reset an active upload before its JSON error arrives.
      json(res,status,{error:known?error.message:'The local operation could not be completed.'});
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`FluxMotion is ready at http://localhost:${server.address().port}`));
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) serve();
