const APP_IDS=new Set(['fluxcreate','fluxoto','fluxidesign','fluximiere','flux3d','fluxiffects','fluxini','fluxlab','fluxagents']);
export function isHosted(){return globalThis.__FLUXCREATE_HOSTED__===true||typeof location!=='undefined'&&/^\/(fluxoto|fluxidesign|fluximiere|flux3d|fluxiffects|fluxini|fluxlab|fluxagents)(?:\/|$)/.test(location.pathname);}
function appId(id){if(!APP_IDS.has(id))throw Error('Unknown FluxCreate workspace.');return id;}
export function apiURL(id,path='/'){appId(id);return(isHosted()?`/api/${id}`:'/api')+(path.startsWith('/')?path:`/${path}`);}
export function assetURL(id,path){appId(id);return(isHosted()&&id!=='fluxcreate'?`/${id}`:'')+'/'+path.replace(/^\/+/, '');}
export function suiteURL(){return isHosted()?'/':'http://localhost:4325/';}
export const PUBLIC_DEMO_APP_IDS = ['fluxoto', 'fluxidesign', 'fluxiffects', 'flux3d'];
export function isPublicDemo() { return globalThis.__FLUXCREATE_PUBLIC_DEMO__ === true; }
