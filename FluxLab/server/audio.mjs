import {randomUUID} from 'node:crypto';
const known=new Set(['google/gemini-3.8-flash-lite-tts','google/gemini-3.8-flash-tts','microsoft/mai-voice-2','microsoft/mai-voice-2-flash','microsoft/mai-voice-2.1','microsoft/mai-voice-2.1-flash','openai/tts-1','openai/tts-1-hd']);
// Provider voices and formats: https://vercel.com/docs/ai-gateway/modalities/text-to-speech
export function audioModelOptions(model){
 if(model.type!=='speech'||!known.has(model.id))return null;
 const google=model.id.startsWith('google/'),microsoft=model.id.startsWith('microsoft/');
 return {voices:google?['Kore','Puck','Zephyr','Charon']:microsoft?['en-US-Harper','de-DE-Mia','es-MX-Valeria','en-US-Ethan']:['alloy','echo','fable','onyx','nova','shimmer'],outputFormats:google?['wav']:['mp3','wav'],maxPromptChars:google?400:1500};
}
const invalid=()=>{throw Error('The provider returned invalid or unsupported MP3/WAV audio.');};
/** Inspect actual container/frame structure before browser decoding; raw PCM is not accepted. */
export function audioHeader(bytes){
 if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE'){
  const end=bytes.readUInt32LE(4)+8;if(end!==bytes.length)invalid();let at=12,format=null,dataBytes=0,chunks=0;
  while(at+8<=end&&++chunks<=1024){const type=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),start=at+8;if(start+size>end)invalid();
   if(type==='fmt '){if(size<16||format)invalid();let code=bytes.readUInt16LE(start);const channels=bytes.readUInt16LE(start+2),sampleRate=bytes.readUInt32LE(start+4),byteRate=bytes.readUInt32LE(start+8),blockAlign=bytes.readUInt16LE(start+12),bits=bytes.readUInt16LE(start+14);if(code===65534){if(size<40||bytes.readUInt16LE(start+16)<22||!bytes.subarray(start+28,start+40).equals(Buffer.from([0,0,16,0,128,0,0,170,0,56,155,113])))invalid();code=bytes.readUInt32LE(start+24);}if(![1,3].includes(code)||![1,2].includes(channels)||sampleRate<8000||sampleRate>96000||![8,16,24,32].includes(bits)||code===3&&bits!==32||blockAlign!==channels*bits/8||byteRate!==sampleRate*blockAlign)invalid();format={channels,sampleRate,byteRate,blockAlign};}
   if(type==='data')dataBytes+=size;at=start+size+(size%2);
  }
  if(at!==end||!format||!dataBytes||dataBytes%format.blockAlign)invalid();const duration=dataBytes/format.byteRate;if(duration>180)throw Error('The generated speech is too long. Use a shorter script.');return {mimeType:'audio/wav',duration,channels:format.channels,sampleRate:format.sampleRate};
 }
 let at=0;if(bytes.toString('ascii',0,3)==='ID3'){if(bytes.length<10||![2,3,4].includes(bytes[3])||bytes.subarray(6,10).some(n=>n&128))invalid();const size=(bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9];at=10+size+(bytes[3]===4&&bytes[5]&16?10:0);if(at>=bytes.length)invalid();}
 let frames=0,duration=0,sampleRate=0,channels=0;
 while(at+4<=bytes.length){if(bytes.length-at===128&&bytes.toString('ascii',at,at+3)==='TAG'){at=bytes.length;break;}const a=bytes[at],b=bytes[at+1],c=bytes[at+2],d=bytes[at+3],version=(b>>3)&3,layer=(b>>1)&3,rate=c>>4,sample=(c>>2)&3;if(a!==255||(b&224)!==224||version===1||layer!==1||rate===0||rate===15||sample===3)invalid();const hz=[44100,48000,32000][sample]/(version===3?1:version===2?2:4),kbps=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[rate],length=Math.floor((version===3?144:72)*kbps*1000/hz)+((c>>1)&1);if(at+length>bytes.length||length<24||sampleRate&&sampleRate!==hz)invalid();sampleRate=hz;channels=(d>>6)===3?1:2;duration+=(version===3?1152:576)/hz;frames++;if(duration>180)throw Error('The generated speech is too long. Use a shorter script.');at+=length;}
 if(at!==bytes.length||frames<2)invalid();return {mimeType:'audio/mpeg',duration,channels,sampleRate};
}
export function createAudioService({fetchImpl,credential,snapshotConnection,connectionScope,models,controlled,boundedJSON,providerFailure,fail,now}){
 const inFlight=new Set();return {async generateAudio(body,{signal,connection}={}){
  connection=snapshotConnection(connection);const scope=connectionScope(connection);
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['kind','model','prompt','voice','outputFormat'].includes(k))||body.kind!=='audio')fail('Include only the speech model, script, voice and audio format.');
  if(typeof body.model!=='string'||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>1500)fail('Write a speech script in 1–1,500 characters and select a model.');
  if(body.voice!==undefined&&(typeof body.voice!=='string'||!body.voice||body.voice.length>100))fail('Choose a supported voice.');if(body.outputFormat!==undefined&&!['mp3','wav'].includes(body.outputFormat))fail('Choose MP3 or WAV audio.');
  if(inFlight.has(scope))fail('Another speech generation is running. Wait for it to finish.',409);if(inFlight.size>=64)fail('The speech service is busy. Try again shortly.',429);inFlight.add(scope);
  try{return await controlled(async signal=>{
   let key;try{key=await credential(connection);}catch{fail('The existing Flux connection is unavailable. Check its settings in FluxEffects.',503);}if(!key)fail('Connect FluxEffects to AI Gateway before generating.',503);
   const catalog=await models({signal}),model=catalog.models.find(m=>m.id===body.model);if(!model?.capabilities.includes('audio')||!model.audio)fail('Choose an available text-to-speech model from the live catalog.');
   if(body.voice!==undefined&&!model.audio.voices.includes(body.voice))fail('Choose a voice supported by this speech model.');if(body.outputFormat!==undefined&&!model.audio.outputFormats.includes(body.outputFormat))fail('Choose an audio format supported by this speech model.');
   const format=body.outputFormat||model.audio.outputFormats[0],limit=Math.min(model.audio.maxPromptChars,format==='wav'?400:1500);if(body.prompt.length>limit)fail(`This ${format.toUpperCase()} speech output accepts up to ${limit.toLocaleString('en-US')} characters. Use a shorter script${format==='wav'&&model.audio.outputFormats.includes('mp3')?' or select MP3':''}.`);const payload={text:body.prompt.trim(),outputFormat:format,...(body.voice?{voice:body.voice}:{})};
   const response=await fetchImpl('https://ai-gateway.vercel.sh/v4/ai/speech-model',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`,'ai-gateway-protocol-version':'0.0.1','ai-gateway-auth-method':'api-key','ai-speech-model-specification-version':'4','ai-model-id':body.model},body:JSON.stringify(payload),signal,redirect:'error'});
   if(!response.ok){await response.body?.cancel();providerFailure(response.status);}const raw=await boundedJSON(response,4*1024*1024),encoded=raw.audio;
   if(typeof encoded!=='string'||!encoded||encoded.length>3500000||encoded.length%4||!/^[a-z0-9+/]*={0,2}$/i.test(encoded))fail('The generated speech is missing, invalid or too large. Use a shorter script or MP3 output.',502);
   let header;try{header=audioHeader(Buffer.from(encoded,'base64'));}catch(error){fail(error.message,502);}if(header.mimeType!==(format==='wav'?'audio/wav':'audio/mpeg'))fail('The provider returned a different audio format. Choose another format or model.',502);
   const warnings=[...(catalog.stale?[catalog.warning]:[]),...(Array.isArray(raw.warnings)&&raw.warnings.length?['The provider adjusted or ignored one or more optional speech settings.']:[])],result={id:randomUUID(),kind:'audio',model:body.model,prompt:payload.text,createdAt:new Date(now()).toISOString(),text:'',images:[],audios:[{id:randomUUID(),...header,src:`data:${header.mimeType};base64,${encoded}`}],warnings};
   if(Buffer.byteLength(JSON.stringify(result))>4*1024*1024)fail('The audio result is too large. Use a shorter script or MP3 output.',502);return result;
  },{signal});}finally{inFlight.delete(scope);}
 }};
}
