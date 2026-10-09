import { spawn } from 'node:child_process';
const build=spawn(process.execPath,['scripts/build.mjs','--debug'],{stdio:'inherit',windowsHide:true});
const code=await new Promise(resolve=>build.on('exit',resolve));if(code)process.exit(code);
const server=spawn(process.execPath,['server/index.mjs'],{stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??0));
