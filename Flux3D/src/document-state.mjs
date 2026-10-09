export const IMPORT_LIMITS={model:64*1024*1024,project:180*1024*1024};

// Read failures and invalid saved data must remain distinct from an empty workspace.
export async function recoverScene(read,validate){try{const raw=await read();return{project:raw==null?null:validate(raw),recovery:null};}catch(error){return{project:null,recovery:error?.message||'Local scene storage could not be read.'};}}

export function createSceneSession(){let generation=0;return{reset(){generation++;},capture(id){return{id,generation};},isCurrent(token,id){return token.id===id&&token.generation===generation;}};}

export async function readSceneImport(file){const native=/\.(flux3d|json)$/i.test(file.name),limit=native?IMPORT_LIMITS.project:IMPORT_LIMITS.model;if(!Number.isSafeInteger(file.size)||file.size<0||file.size>limit)throw Error(native?'Keep scene projects under 180 MB.':'Keep imported models under 64 MB.');return native?{native:true,data:await file.text()}:{native:false,data:await file.arrayBuffer()};}
