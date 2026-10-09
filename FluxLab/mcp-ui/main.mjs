import {App} from '@modelcontextprotocol/ext-apps';
const app=new App({name:'FluxLab',version:'0.2.0'});
const status=document.querySelector('#status'),models=document.querySelector('#model'),kind=document.querySelector('#kind'),prompt=document.querySelector('#prompt'),result=document.querySelector('#result'),button=document.querySelector('#generate');
const videoSettings=document.querySelector('#video-settings'),duration=document.querySelector('#duration'),aspect=document.querySelector('#aspect'),jobPanel=document.querySelector('#video-job'),check=document.querySelector('#check-video'),open=document.querySelector('#open-video'),jobStatus=document.querySelector('#video-status');
const audioSettings=document.querySelector('#audio-settings'),voice=document.querySelector('#voice'),format=document.querySelector('#audio-format');
let catalog=[],pending=false,job=null,retry=null;
function promptLimit(){const model=catalog.find(m=>m.id===models.value);return kind.value==='audio'?Math.min(model?.audio?.maxPromptChars||1500,(format.value||model?.audio?.outputFormats?.[0])==='wav'?400:1500):kind.value==='video'?model?.video?.maxPromptChars||12000:12000;}
function controls(){button.disabled=pending||!models.value||(kind.value==='video'&&job?.status==='pending');kind.disabled=models.disabled=prompt.disabled=duration.disabled=aspect.disabled=voice.disabled=format.disabled=pending;check.disabled=pending||!job?.ticket;open.disabled=!job?.studioUrl;videoSettings.hidden=kind.value!=='video';audioSettings.hidden=kind.value!=='audio';prompt.maxLength=promptLimit();prompt.title=`Up to ${prompt.maxLength.toLocaleString()} characters`;}
function options(select,values){select.replaceChildren();const auto=document.createElement('option');auto.value='';auto.textContent='Automatic';select.append(auto);for(const value of values){const option=document.createElement('option');option.value=String(value);option.textContent=select===duration?`${value} seconds`:value;select.append(option);}}
function settings(){const model=catalog.find(m=>m.id===models.value);options(duration,model?.video?.durations||[]);options(aspect,model?.video?.aspectRatios||[]);options(voice,model?.audio?.voices||[]);options(format,model?.audio?.outputFormats||[]);controls();}
function choices(){const current=models.value;models.replaceChildren(...catalog.filter(m=>m.capabilities.includes(kind.value)).map(m=>{const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' · '+m.provider;return option;}));if([...models.options].some(o=>o.value===current))models.value=current;settings();}
function showJob(data){job=data;jobPanel.hidden=false;jobStatus.textContent=data.status==='completed'?'Video ready. Open it in FluxLab to play, save or send it to your editor.':data.status==='error'?(data.error?.message||data.error||'Video generation failed.'):'Rendering in the background. Check its status here, or continue in FluxLab.';controls();}
function show(tool){
 if(tool.isError){status.textContent=tool.content?.find(c=>c.type==='text')?.text||'Generation failed.';return;}
 const data=tool.structuredContent;if(data?.models){catalog=data.models;choices();status.textContent=data.status?.available?'Your Flux connection is ready.':data.status?.reason||'Choose a model.';return;}
 if(data?.ticket&&['pending','completed','error'].includes(data.status)){showJob(data);status.textContent=data.status==='pending'?'Your video job has been accepted.':'Video status updated.';return;}
 result.replaceChildren();for(const item of tool.content||[]){
  if(item.type==='text'){const paragraph=document.createElement('pre');paragraph.textContent=item.text;result.append(paragraph);}
  if(item.type==='image'&&/^image\/(png|jpeg|webp)$/.test(item.mimeType)){const image=document.createElement('img');image.src=`data:${item.mimeType};base64,${item.data}`;image.alt='Generated image';const link=document.createElement('a');link.href=image.src;link.download='fluxlab-image.'+(item.mimeType==='image/jpeg'?'jpg':item.mimeType.split('/')[1]);link.textContent='Save image';result.append(image,link);}
  if(item.type==='audio'&&/^audio\/(mpeg|wav)$/.test(item.mimeType)){const audio=document.createElement('audio');audio.controls=true;audio.src=`data:${item.mimeType};base64,${item.data}`;const link=document.createElement('a');link.href=audio.src;link.download='fluxlab-voice.'+(item.mimeType==='audio/mpeg'?'mp3':'wav');link.textContent='Save audio';result.append(audio,link);}
 }status.textContent=data?.warnings?.join(' ')||'Ready for your next idea.';
}
app.ontoolresult=show;kind.onchange=choices;models.onchange=settings;format.onchange=controls;
button.onclick=async()=>{
 if(pending||(kind.value==='video'&&job?.status==='pending'))return;if(!prompt.value.trim()||prompt.value.length>promptLimit()){status.textContent=`Write between 1 and ${promptLimit().toLocaleString()} characters for these settings.`;return;}pending=true;controls();status.textContent='Creating with '+models.value+'…';
 try{
  let name='fluxlab_generate',args={kind:kind.value,model:models.value,prompt:prompt.value,maxOutputTokens:2048,size:'auto'};
  if(kind.value==='video'){name='fluxlab_video_start';args={kind:'video',model:models.value,prompt:prompt.value,...(duration.value?{duration:Number(duration.value)}:{}),...(aspect.value?{aspectRatio:aspect.value}:{})};const fingerprint=JSON.stringify(args);if(retry?.fingerprint!==fingerprint)retry={fingerprint,requestId:crypto.randomUUID()};args.requestId=retry.requestId;}
  if(kind.value==='audio'){name='fluxlab_audio_generate';args={kind:'audio',model:models.value,prompt:prompt.value,...(voice.value?{voice:voice.value}:{}),...(format.value?{outputFormat:format.value}:{})};}
  const tool=await app.callServerTool({name,arguments:args});show(tool);if(!tool.isError&&name==='fluxlab_video_start')retry=null;
 }catch{status.textContent='The host could not complete this request. Retry the same video settings to recover the submission without starting it twice.';}finally{pending=false;controls();}
};
check.onclick=async()=>{if(pending||!job?.ticket)return;pending=true;controls();status.textContent='Checking your video…';try{show(await app.callServerTool({name:'fluxlab_video_status',arguments:{ticket:job.ticket}}));}catch{status.textContent='Status could not be checked. Your video ticket is preserved; try again.';}finally{pending=false;controls();}};
open.onclick=async()=>{if(!job?.studioUrl)return;try{await app.openLink({url:job.studioUrl});}catch{status.textContent='The host could not open FluxLab. Use the studio link in the tool result.';}};
await app.connect();try{show(await app.callServerTool({name:'fluxlab_catalog',arguments:{}}));}catch{status.textContent='Ask the host to open the FluxLab catalog.';}
