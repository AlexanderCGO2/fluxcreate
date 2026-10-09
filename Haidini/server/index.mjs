import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { FluxMemory } from './memory.mjs';
import { FontStore } from './fonts.mjs';
import { ProjectStore } from './projects.mjs';
import { modelStatus, planChange } from './planner.mjs';
import { loadConnection } from './connection.mjs';
import { readExchangeMetadata, preparePackage, prepareExchange, exportExchange, exchangeSummary } from './exchange.mjs';
import { validatePatch, ProjectError } from '../src/engine/project.ts';

export async function createWorkbench({dataDir,webDir,port=4318,host='127.0.0.1',planner=planChange}={}) {
  const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  dataDir??=process.env.FLUXINI_DATA_DIR||path.join(base,'.data');
  webDir??=process.env.FLUXINI_WEB_DIR||path.join(base,'dist');
  await mkdir(dataDir,{recursive:true});
  const memory=new FluxMemory(path.join(dataDir,'memory.sqlite'));
  const projects=new ProjectStore(path.join(dataDir,'projects.sqlite'),memory);
  const fonts=new FontStore(path.join(dataDir,'fonts.sqlite'));
  const token=randomBytes(32).toString('hex');
  let origin='';
  const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  async function body(req,limit=128*1024){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)throw new ProjectError('Request is too large.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new ProjectError('Invalid JSON.');}}
  let planning=false;
  const server=http.createServer(async(req,res)=>{
    try {
      if(req.headers.host!==new URL(origin).host)return reply(res,403,{error:'Invalid host.'});
      if(req.headers.origin&&req.headers.origin!==origin)return reply(res,403,{error:'Cross-origin requests are not allowed.'});
      if(req.headers['sec-fetch-site']==='cross-site')return reply(res,403,{error:'Cross-site requests are not allowed.'});
      const url=new URL(req.url,origin),route=url.pathname;
      if(route.startsWith('/api/')){
        if(req.method==='GET'&&route==='/api/session')return reply(res,200,{app:'fluxini',protocolVersion:1,token,model:modelStatus()});
        if(req.headers['x-fluxini-token']!==token)return reply(res,403,{code:'SESSION_EXPIRED',error:'Session expired. Reload the workbench.'});
        if(req.method==='GET'&&route==='/api/fonts')return reply(res,200,fonts.list());
        if(req.method==='POST'&&route==='/api/fonts/import')return reply(res,201,fonts.import(await body(req,5*1024*1024)));
        const fontMatch=route.match(/^\/api\/fonts\/([a-zA-Z0-9_-]{1,80})$/);
        if(fontMatch){if(req.method==='GET')return reply(res,200,fonts.get(fontMatch[1]));if(req.method==='POST')return reply(res,200,fonts.update(fontMatch[1],await body(req)));}
        if(req.method==='GET'&&route==='/api/projects')return reply(res,200,projects.list());
        if(req.method==='POST'&&route==='/api/projects'){const input=await body(req,16*1024*1024);let project=input.project,exchange=null;if(project?.format==='fluxini-project-v1'){const pack=project,prepared=preparePackage(pack,fonts);project=prepared.project;if(pack.exchange)exchange=readExchangeMetadata(pack.exchange);for(const asset of prepared.assets)fonts.save(asset);}return reply(res,201,projects.create(project,input.template,exchange));}
        if(req.method==='POST'&&route==='/api/exchange/import'){
          const input=await body(req,16*1024*1024);if(input.restoreOriginal!==undefined&&typeof input.restoreOriginal!=='boolean')throw new ProjectError('Choose whether to restore the earlier source scene.');
          const prepared=prepareExchange(input.markdown,fonts,input.restoreOriginal===true);
          if(input.preview===true)return reply(res,200,{report:prepared.report});
          for(const asset of prepared.assets)fonts.save(asset);
          return reply(res,201,{...projects.create(prepared.project,undefined,prepared.exchange),report:prepared.report});
        }
        if(req.method==='GET'&&route==='/api/trash')return reply(res,200,projects.trashed());
        const match=route.match(/^\/api\/projects\/([a-f0-9-]+)(?:\/(.+))?$/);
        if(!match)throw new ProjectError('Unknown endpoint.',404);
        const id=match[1],action=match[2];
        if(req.method==='POST'&&action==='restore'){await body(req);return reply(res,200,projects.restore(id));}
        const project=projects.get(id).project;
        if(req.method==='GET'){
          if(!action)return reply(res,200,projects.status(id));
          if(action==='export'){const previous=projects.exchange(id),pack={format:'fluxini-project-v1',project,fonts:fonts.assets(project),...(previous?{exchange:exportExchange(project,fonts,previous).exchange}:{})};if(Buffer.byteLength(JSON.stringify(pack))>16*1024*1024)throw new ProjectError('This project package exceeds 16 MB. Reduce its imported font styles.');return reply(res,200,pack);}
          if(action==='exchange'){const result=exportExchange(project,fonts,projects.exchange(id));return reply(res,200,{markdown:result.markdown,summary:result.summary});}
          if(action==='exchange-info'){const exchange=projects.exchange(id);return reply(res,200,exchange?exchangeSummary(exchange):{name:project.name,sourceApp:'fluxini',brief:'',notes:'',canvas:{width:1920,height:1080,pixelsPerUnit:100},canRestoreOriginal:false});}
          if(action==='history')return reply(res,200,projects.history(id,{before:url.searchParams.has('before')?Number(url.searchParams.get('before')):undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):30}));
          if(action==='memory')return reply(res,200,{events:memory.history(project),preferences:memory.preferences(project),context:memory.assemble(project,url.searchParams.get('q')||'scene particles text terrain',url.searchParams.getAll('node'))});
        }
        if(req.method==='POST'){
          const input=await body(req);
          if(action==='exchange'){
            if(input.baseRevision!==project.revision)throw new ProjectError('The scene changed. Open Export again to include the latest edits.',409);
            const result=exportExchange(project,fonts,projects.exchange(id),input);projects.saveExchange(id,result.exchange);return reply(res,200,{markdown:result.markdown,summary:result.summary});
          }
          if(action==='restore-revision')return reply(res,200,projects.restoreRevision(id,input.baseRevision,input.revision));
          if(action==='duplicate')return reply(res,201,projects.duplicate(id,input.baseRevision));
          if(action==='delete')return reply(res,200,projects.remove(id,input.baseRevision));
          if(action==='patch')return reply(res,200,projects.patch(id,input));
          if(action==='preview'){const fresh=projects.get(id).project;return reply(res,200,{patch:validatePatch(fresh,input)});}
          if(action==='lock')return reply(res,200,projects.lock(id,input.baseRevision,input.nodeId,input.param,input.locked));
          if(action==='undo'||action==='redo')return reply(res,200,projects.move(id,input.baseRevision,action==='undo'?-1:1));
          if(action==='preferences'){
            if(input.action==='propose')memory.proposePreference(project,input.statement,input.sourceId,input.nodeId??null);
            else memory.decidePreference(project,input.id,input.status);
            return reply(res,200,{preferences:memory.preferences(project)});
          }
          if(action==='plan'){
            if(planning)throw new ProjectError('A scene request is already running.',429);
            planning=true;
            try {const current=projects.get(id).project;const result=await planner(current,input.intent,memory,undefined,input.selection||[]);validatePatch(projects.get(id).project,result.patch);return reply(res,200,result);}
            finally{planning=false;}
          }
        }
        throw new ProjectError('Unknown action.',404);
      }
      if(req.method!=='GET')return reply(res,405,{error:'Method not allowed.'});
      const relative=decodeURIComponent(route==='/'?'/index.html':route);
      const file=path.resolve(webDir,'.'+relative),relativeFile=path.relative(path.resolve(webDir),file);
      if(relativeFile.startsWith('..')||path.isAbsolute(relativeFile))return reply(res,403,{error:'Invalid path.'});
      const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
      if(!types[ext])return reply(res,404,{error:'Not found.'});
      const content=await readFile(file);
      res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(content);
    }catch(error){
      if(error.code==='ENOENT')return reply(res,404,{error:'Build the workbench first.'});
      const status=error.status||400;
      reply(res,status,{error:error instanceof ProjectError?error.message:error.name==='ZodError'?'The file or response has an unsupported format.':'The operation could not be completed. Check the local connection or configuration.'});
    }
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  origin=`http://${host}:${server.address().port}`;
  const flushTimer=setInterval(()=>projects.flush(),5000);flushTimer.unref();
  return {server,origin,projects,memory,fonts,close:async()=>{clearInterval(flushTimer);await new Promise(resolve=>server.close(resolve));projects.close();memory.close();fonts.close();}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await loadConnection(process.env.FLUXINI_DATA_DIR||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.data'));
  const app=await createWorkbench({port:Number(process.env.FLUXINI_PORT??4318)});
  console.log('FLUXINI_READY '+app.origin);
  if(process.env.FLUXINI_PARENT_PID){const parent=Number(process.env.FLUXINI_PARENT_PID);const timer=setInterval(()=>{try{process.kill(parent,0);}catch{app.close().then(()=>process.exit(0));}},2000);timer.unref();}
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
