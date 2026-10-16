export function activeAssets(plan,assets){const ids=new Set([plan.song,...plan.references,...plan.takes.map(t=>t.asset)].filter(Boolean).map(r=>r.assetId));return new Map([...assets].filter(([id])=>ids.has(id)));}
export function attachSong(plan,result){
 const same=plan.song?.hash===result.ref.hash;
 if(same&&(plan.song.sampleRate!==result.ref.sampleRate||plan.song.sampleCount!==result.ref.sampleCount))throw Error('This browser decoded the song differently. Keep the original board and create a new project for this decode.');
 const ref={...result.ref,assetId:same?plan.song.assetId:result.ref.assetId};
 const references=plan.references.filter(r=>r.assetId!==plan.song?.sourceAssetId);if(result.originalRef)references.push(result.originalRef);
 // Relinking a prepared WAV must retain the original-source metadata and bytes.
 if(same&&!result.originalRef&&plan.song.sourceAssetId){Object.assign(ref,{sourceAssetId:plan.song.sourceAssetId,sourceDuration:plan.song.sourceDuration,fadeOutSeconds:plan.song.fadeOutSeconds});references.push(plan.references.find(r=>r.assetId===plan.song.sourceAssetId));}
 return {plan:{...plan,revision:plan.revision+1,song:ref,references,...(same?{}:{analysis:null,sections:[],scenes:[],shots:[],generationUnits:[],takes:[],locks:[]})},asset:{...result.asset,...ref}};
}
export function attachReference(plan,result){
 const match=plan.references.find(r=>r.hash===result.ref.hash&&r.role===result.ref.role);
 if(!match&&result.ref.role==='character'&&plan.references.some(r=>r.role==='character'))throw Error('The board already has a character reference. Relink the same image or start another board.');
 if(!match&&plan.references.filter(r=>r.role!=='audio').length>=9)throw Error('This director workspace supports up to nine reference images.');
 const ref=match??result.ref;
 return {plan:{...plan,revision:plan.revision+1,references:match?plan.references:[...plan.references,ref]},asset:{...result.asset,...ref}};
}
