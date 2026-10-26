const excluded=new Set(['node_modules','.data','.git','.vercel','.codex','.agents','.aws','.ssh','.gnupg','target','artifacts','dist','server-dist','.test-data','.staging-dist','playwright-report','test-results']);
export function includeReleasePath(relative){
 return relative.split(/[\\/]/).filter(Boolean).every(name=>!excluded.has(name)&&!/^\.env(?:$|\.)/.test(name)&&!/^\.runtime/.test(name)&&name!=='hosted-bundle.mjs'&&!/\.(?:sqlite(?:-wal|-shm)?|log|pem|key|p12|pfx|har)$/i.test(name));
}
