import handler from '../FluxCreate/server/hosted-bundle.mjs';
export default function(req,res){const url=new URL(req.url,'https://workspace.invalid');if(url.pathname==='/api/dispatch'){req.url='/api/'+(url.searchParams.get('app')||'')+'/'+(url.searchParams.get('path')||'');}return handler(req,res);}
