import {isHosted} from '../../FluxCreate/shared/hosting.mjs';
import {hostedAPI} from './hosted/api.mjs';
type Session={app:string;protocolVersion:number;token:string;model:{available:boolean;provider:string;model:string}};
let token='',connection:Promise<Session>|null=null;
export function connect():Promise<Session>{
 if(isHosted())return hostedAPI.connect();
 if(connection)return connection;
 connection=(async()=>{const response=await fetch('/api/session',{cache:'no-store'});if(!response.ok)throw new Error('Could not connect to the local workbench.');const data=await response.json() as Session;if(data.app!=='fluxini'||data.protocolVersion!==1||typeof data.token!=='string'||!data.token)throw new Error('The local workbench returned an invalid session.');token=data.token;return data;})().finally(()=>{connection=null;});
 return connection;
}
export async function api<T>(url:string,body?:unknown):Promise<T>{
 if(isHosted())return hostedAPI.api(url,body) as Promise<T>;
 const serialized=body===undefined?undefined:JSON.stringify(body);
 for(let attempt=0;attempt<2;attempt++){
  const sentToken=token,response=await fetch('/api'+url,{method:serialized===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-fluxini-token':sentToken},...(serialized===undefined?{}:{body:serialized})}),data=await response.json();
  // Only retry authentication failures rejected before the server executes the operation.
  const expired=response.status===403&&(data.code==='SESSION_EXPIRED'||data.error==='Session expired. Reload the workbench.');
  if(expired&&attempt===0){if(token===sentToken)await connect();continue;}
  if(!response.ok)throw new Error(data.error||'The operation failed.');return data as T;
 }
 throw new Error('Could not reconnect to the local workbench.');
}
