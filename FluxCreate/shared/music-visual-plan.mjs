/** Provider-independent creative intent; it never asserts model support or starts generation. */
export function validateVisualPlan(value,{required=false}={}){
 const fail=message=>{throw Error(`Music video visual plan: ${message}`);};
 if(value==null){if(required)fail('the director must choose an image strategy.');return null;}
 const fields=['mode','reason','sceneStrategy','continuityNotes','startPrompt','endPrompt'];
 if(typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).some(k=>!fields.includes(k)))fail('unknown or malformed fields.');
 if(!['references','start-frame','start-end-frames'].includes(value.mode))fail('choose references, start-frame or start-end-frames.');
 if(!['independent-shot','continuous-scene'].includes(value.sceneStrategy))fail('choose a valid scene strategy.');
 const text=(key,max)=>{const s=value[key];if(typeof s!=='string'||s.length>max||/^(?:data:|blob:)/i.test(s))fail(`${key} must be text up to ${max} characters.`);return s;};
 const result={mode:value.mode,reason:text('reason',1000),sceneStrategy:value.sceneStrategy,continuityNotes:text('continuityNotes',2000),startPrompt:text('startPrompt',2000),endPrompt:text('endPrompt',2000)};
 if(!result.reason.trim())fail('explain the image strategy.');
 if(result.sceneStrategy==='continuous-scene'&&!result.continuityNotes.trim())fail('describe continuity across the longer scene.');
 if(result.mode!=='references'&&!result.startPrompt.trim())fail('a start-frame prompt is required.');
 if(result.mode==='start-end-frames'&&!result.endPrompt.trim())fail('an end-frame prompt is required.');
 if(result.mode==='references'&&(result.startPrompt||result.endPrompt)||result.mode==='start-frame'&&result.endPrompt)fail('frame prompts must match the selected strategy.');
 return result;
}
