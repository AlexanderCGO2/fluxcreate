import{validateGraph,simulate}from'../src/model.mjs';
function validated(fn){try{return fn();}catch(e){e.status=400;throw e;}}
export function createAgentsService(){return{status:async()=>({app:'fluxagents',live:false,mode:'hosted',reason:'Live background runs need durable server storage. Design and simulate here; run locally to keep real workflows working after the browser closes.'}),validate:async body=>validated(()=>({graph:validateGraph(body?.graph)})),simulate:async body=>validated(()=>simulate(body?.graph,{input:body?.input}))};}
