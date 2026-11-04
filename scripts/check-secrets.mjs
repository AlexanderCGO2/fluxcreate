import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const allowedFixtures=JSON.parse(fs.readFileSync(new URL('./secret-fixtures.json',import.meta.url),'utf8'));
const args=new Set(process.argv.slice(2)),findings=[],skipped=[],known=new Set();
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
 ['provider-api-key',/\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{24,}\b/g],
 ['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['google-api-key',/\bAIza[0-9A-Za-z_-]{35}\b/g],
 ['slack-token',/\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g],
 ['npm-token',/\bnpm_[A-Za-z0-9]{30,}\b/g],
 ['stripe-secret',/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g],
 ['jwt-literal',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/g],
 ['bearer-literal',/\bBearer\s+[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]+)*/g],
];
const entropy=s=>{const counts=new Map();for(const c of s)counts.set(c,(counts.get(c)||0)+1);return [...counts.values()].reduce((n,c)=>n-c/s.length*Math.log2(c/s.length),0);};
function detect(text){const hits=[];for(const [rule,re]of rules){re.lastIndex=0;for(const m of text.matchAll(re))hits.push({rule,index:m.index});}
 const assignment=/\b(?:[A-Z0-9_]*(?:API_KEY|API_TOKEN|CLIENT_SECRET|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|CONNECTION_SECRET)|apiKey|apiToken|clientSecret|accessToken|password|secret)\s*["']?\s*[:=]\s*["']([A-Za-z0-9_+\/=.-]{24,})["']/g;
 for(const m of text.matchAll(assignment))if(entropy(m[1])>=3.5)hits.push({rule:'high-entropy-credential-assignment',index:m.index,fingerprint:createHash('sha256').update(m[1]).digest('hex')});
 for(const secret of known){let index=text.indexOf(secret);while(index>=0){hits.push({rule:'known-local-secret',index});index=text.indexOf(secret,index+secret.length);}}
 return hits;
}
function inspect(label,data){const text=data.toString('utf8');for(const hit of detect(text)){const sourcePath=label.replace(/^history\//,'').replace(/@[0-9a-f]{40,64}$/,'');if(hit.rule==='high-entropy-credential-assignment'&&allowedFixtures.some(f=>f.path===sourcePath&&f.sha256===hit.fingerprint))continue;findings.push({path:label,line:text.slice(0,hit.index).split('\n').length,rule:hit.rule,value:'[REDACTED]'});}}
function git(args,options={}){return execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:64*1024*1024,...options});}
const forbidden=relative=>relative.split(/[\\/]/).some(p=>['.data','.vercel','.aws','.ssh','.gnupg','artifacts','node_modules','.test-data','server-dist'].includes(p)||/^\.env(?:$|\.)/.test(p)&&!['.env.example','.env.sample','.env.template'].includes(p)||/^\.runtime/.test(p))||/\.(?:sqlite(?:-wal|-shm)?|p12|pfx|key)$/i.test(relative);
function inspectPath(relative){if(forbidden(relative))findings.push({path:relative,line:1,rule:'private-or-runtime-path',value:'[CONTENTS NOT PRINTED]'});}
function loadKnown(){const dirs=[root,...fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.name.startsWith('.')).map(e=>path.join(root,e.name))];for(const dir of dirs){const key=path.join(dir,'.data','connection-secret');if(fs.existsSync(key)){const b=fs.readFileSync(key);known.add(b.toString('hex'));known.add(b.toString('base64'));known.add(b.toString('base64url'));const t=b.toString('utf8').trim();if(t.length>=20&&!t.includes('\ufffd'))known.add(t);}
 for(const file of ['.env','.env.local','.env.production','.env.production.local']){const p=path.join(dir,file);if(!fs.existsSync(p))continue;const values=parseEnv(fs.readFileSync(p,'utf8'));for(const [name,value]of Object.entries(values))if(/(?:KEY|SECRET|TOKEN|PASSWORD)/i.test(name)&&value.length>=20)known.add(value);}}
}
if(args.has('--self-test')){
 const examples=['ghp_'+'Ab12'.repeat(9),'sk-proj-'+'Ax7B'.repeat(12),'-----BEGIN '+'PRIVATE KEY-----'];
 if(examples.some(s=>!detect(s).length)||detect('AI_GATEWAY_API_KEY= process.env.AI_GATEWAY_API_KEY').length)throw Error('Credential detector self-check failed.');
 console.log('Credential detector self-check passed.');process.exit(0);
}
loadKnown();
let files=0,blobs=0,buildFiles=0;
const current=git(['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean);
for(const relative of new Set(current)){inspectPath(relative);const p=path.join(root,relative);if(!fs.existsSync(p))continue;const st=fs.lstatSync(p);if(!st.isFile()){skipped.push(relative);continue;}if(st.size>32*1024*1024){skipped.push(relative);continue;}inspect(relative,fs.readFileSync(p));files++;}
if(args.has('--history')){
 const objects=git(['rev-list','--objects','--all']).trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf(' ');return {id:i<0?line:line.slice(0,i),name:i<0?'':line.slice(i+1)};});
 const inventory=spawnSync('git',['-C',root,'cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],{input:objects.map(o=>o.id).join('\n')+'\n',encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});if(inventory.status!==0)throw Error('Cannot inventory reachable Git objects.');
 const names=new Map(objects.map(o=>[o.id,o.name]));
 const ids=inventory.stdout.trim().split('\n').filter(line=>line.split(' ')[1]==='blob').map(line=>line.split(' ')[0]);
 for(const o of objects)if(o.name)inspectPath('history/'+o.name);
 const child=spawn('git',['-C',root,'cat-file','--batch'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let buffer=Buffer.alloc(0),header=null,remaining=0,parts=[],discard=false,stderr='';
 child.stderr.on('data',b=>stderr+=b.toString());const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Git blob scan failed.')));});
 child.stdout.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);while(true){if(!header){const end=buffer.indexOf(10);if(end<0)break;header=buffer.subarray(0,end).toString().split(' ');buffer=buffer.subarray(end+1);remaining=Number(header[2])+1;discard=remaining>32*1024*1024;parts=[];if(discard)skipped.push('history/'+header[0]);}if(!buffer.length)break;const count=Math.min(remaining,buffer.length);if(!discard)parts.push(buffer.subarray(0,count));buffer=buffer.subarray(count);remaining-=count;if(remaining)break;if(!discard){const data=Buffer.concat(parts);inspect('history/'+(names.get(header[0])||'blob')+'@'+header[0],data.subarray(0,data.length-1));blobs++;}header=null;parts=[];}});
 child.stdin.end(ids.join('\n')+'\n');await done;if(header||buffer.length)throw Error('Truncated Git batch output.');
}
if(args.has('--build')){const dist=path.join(root,'dist');if(!fs.existsSync(dist))throw Error('Build output is missing; run pnpm build first.');function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink()){skipped.push(path.relative(root,p));continue;}if(e.isDirectory())walk(p);else{const s=fs.statSync(p);if(s.size>32*1024*1024){skipped.push(path.relative(root,p));continue;}inspect(path.relative(root,p),fs.readFileSync(p));buildFiles++;}}}walk(dist);const serverBundle=path.join(root,'FluxCreate/server/hosted-bundle.mjs');if(fs.existsSync(serverBundle)){inspect('FluxCreate/server/hosted-bundle.mjs',fs.readFileSync(serverBundle));buildFiles++;}}
const unique=[...new Map(findings.map(f=>[f.path+':'+f.line+':'+f.rule,f])).values()];
console.log(JSON.stringify({status:unique.length?'REVIEW_REQUIRED':skipped.length?'INCOMPLETE':'PASS',files,historyBlobs:blobs,buildFiles,knownLocalValues:known.size,findings:unique,skipped,limitations:['Pattern and exact-known-value screening; no guarantee against every secret format or encoded secret.','Reachable fetched refs only; not deleted remote refs, GitHub issues, CI logs or external service settings.','No OCR or inspection inside compressed archives; large files and symlinks reported as skipped.','No credentials are used or sent to providers.']},null,2));
process.exitCode=unique.length?1:skipped.length?2:0;
