import { z } from 'zod';
import { normalizeSuiteSource } from '../../../FluxCreate/shared/suite-source.mjs';

export const StudioObjectSchema=z.object({
  preview:z.object({src:z.string().max(4*1024*1024),width:z.number().int().min(1).max(2048),height:z.number().int().min(1).max(2048)}).strict(),
  suiteSource:z.unknown().transform((raw,ctx)=>{try{const source=normalizeSuiteSource(raw);if(!source)throw Error('A studio object needs its original source.');return source;}catch(error){ctx.addIssue({code:'custom',message:(error as Error).message});return z.NEVER;}}),
}).strict().superRefine(({preview},ctx)=>{
  try{
    if(!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(preview.src))throw Error();
    const bytes=Uint8Array.from(atob(preview.src.slice(22,22+48)),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
    if(bytes.length<24||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a||view.getUint32(12)!==0x49484452||view.getUint32(16)!==preview.width||view.getUint32(20)!==preview.height||preview.width*preview.height>4194304)throw Error();
  }catch{ctx.addIssue({code:'custom',message:'Studio objects need a bounded embedded PNG preview with matching dimensions.'});}
});
export type StudioObject=z.infer<typeof StudioObjectSchema>;
