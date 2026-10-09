const APP_IDS=new Set(['fluxcreate','fluxoto','fluxidesign','fluximiere','flux3d','fluxiffects','fluxini','fluxlab']);
export function isHosted(){return globalThis.__FLUXCREATE_HOSTED__===true||typeof location!=='undefined'&&/^\/(fluxoto|fluxidesign|fluximiere|flux3d|fluxiffects|fluxini|fluxlab)(?:\/|$)/.test(location.pathname);}
function appId(id){if(!APP_IDS.has(id))throw Error('Unknown FluxCreate workspace.');return id;}
export function apiURL(id,path='/'){appId(id);return(isHosted()?`/api/${id}`:'/api')+(path.startsWith('/')?path:`/${path}`);}
export function assetURL(id,path){appId(id);return(isHosted()&&id!=='fluxcreate'?`/${id}`:'')+'/'+path.replace(/^\/+/, '');}
export function suiteURL(){return isHosted()?'/':'http://localhost:4325/';}
