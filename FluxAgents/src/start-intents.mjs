import {validateGraph} from './model.mjs';
export const START_INTENT_LIFETIME=7*24*60*60*1000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function validateStartIntent(raw){if(!raw||raw.version!==1||!uuid(raw.requestId)||!uuid(raw.runnerId)||raw.billing!=='suite'||typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt))||Object.keys(raw).some(k=>!['version','requestId','runnerId','billing','createdAt','graph'].includes(k)))throw Error('The saved start record could not be read. It has been preserved.');return{version:1,requestId:raw.requestId,runnerId:raw.runnerId,billing:'suite',createdAt:raw.createdAt,graph:validateGraph(raw.graph)};}
export function createStartIntent(graph,runnerId,{now=Date.now(),requestId=crypto.randomUUID()}={}){return validateStartIntent({version:1,requestId,runnerId,billing:'suite',createdAt:new Date(now).toISOString(),graph});}
export function startIntentExpired(intent,now=Date.now()){const age=now-Date.parse(intent.createdAt);return age>START_INTENT_LIFETIME||age< -300000;}
export function startIntentBody(raw){const{graph,requestId,runnerId,billing}=validateStartIntent(raw);return{graph,requestId,runnerId,billing};}
