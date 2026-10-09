/** A failed read or invalid autosave must never be mistaken for an empty workspace. */
export async function recoverStoredDocument(read,validate){
 let raw;
 try{raw=await read();if(raw===null||raw===undefined)return {project:null,recovery:null};return {project:validate(raw),recovery:null};}
 catch(error){return {project:null,recovery:{message:error instanceof Error?error.message:'The saved document could not be opened.',...(raw===undefined?{}:{raw})}};}
}
