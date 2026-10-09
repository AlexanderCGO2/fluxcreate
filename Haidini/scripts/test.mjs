import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.test-data',{recursive:true});
const run=spawnSync(process.execPath,['--test',...(process.argv.length>2?process.argv.slice(2):['tests/*.test.mjs'])],{stdio:'inherit',windowsHide:true});
process.exitCode=run.status??1;
