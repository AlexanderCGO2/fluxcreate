const fail=message=>{throw new Error(message);};
function source(plan,analysis){
 if(!plan.song||!analysis||plan.song.hash!==analysis.sourceHash)fail('Music source does not match the analysis.');
 if(!Number.isFinite(analysis.duration)||analysis.duration<1||analysis.duration>180||!Number.isInteger(analysis.sampleRate)||analysis.sampleRate<1)fail('Choose a song between 1 and 180 seconds.');
 if(plan.fps!==24)fail('Music-video timing requires 24 fps.');
 return Math.ceil(analysis.duration*24);
}
function musicalBoundaries(analysis,beats,end,feel){
 const rate=analysis.sampleRate,boundaries=[{frame:0,id:null,error:0}],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const windows=analysis.dynamics??[];
 const intensity=seconds=>{
  const near=windows.filter(w=>w.endSample>seconds*rate&&w.startSample<(seconds+3)*rate);
  if(near.length)return near.reduce((sum,w)=>sum+.65*w.energy+.35*w.activity,0)/near.length;
  // Older maps have no energy envelope: use local beat density, never a random pattern.
  const local=beats.filter(b=>b.sample>=seconds*rate&&b.sample<Math.min(analysis.sampleCount,(seconds+4)*rate));
  return clamp(local.length/Math.min(4,analysis.duration-seconds)/4,0,1);
 };
 while(boundaries.at(-1).frame<end){
  const start=boundaries.at(-1).frame;
  const seconds=clamp(5-3*intensity(start/24)+(feel==='energetic'?-.6:feel==='cinematic'?.6:0),2,5),target=start+seconds*24;
  if(end-target<36)break; // Preserve a usable final hold instead of a tiny leftover flash.
  const candidates=beats.map(b=>({beat:b,exact:b.sample/rate*24,frame:Math.round(b.sample/rate*24)})).filter(b=>b.frame>=start+48&&b.frame<=start+120&&b.frame<=end-36&&Math.abs(b.frame-target)<=24);
  if(!candidates.length)fail('The beat map has a gap. Add manual anchors before making shots.');
  const score=b=>{const cue=(analysis.changePoints??[]).filter(c=>Math.abs(c.sample-b.beat.sample)/rate<=.3).reduce((best,c)=>Math.max(best,c.confidence),0);return Math.abs(b.frame-target)-18*cue;};
  candidates.sort((a,b)=>score(a)-score(b)||a.frame-b.frame);const next=candidates[0];boundaries.push({frame:next.frame,id:next.beat.id,error:next.frame-next.exact});
  if(boundaries.length>120)fail('This board exceeds 120 shots.');
 }
 boundaries.push({frame:end,id:null,error:0});return boundaries;
}
export function buildBeatStoryboard(plan,analysis,shotSeconds='music'){
 const end=source(plan,analysis);
 const adaptive=typeof shotSeconds==='string';
 if(adaptive?!['music','energetic','cinematic'].includes(shotSeconds):!Number.isFinite(shotSeconds)||shotSeconds<2||shotSeconds>5)fail('Choose music-led, energetic or cinematic pacing.');
 if(plan.shots?.some(s=>s.selectedTakeId)||plan.locks?.length)fail('Keep locked or reviewed shots; create a new board to rebuild timings.');
 const beats=(analysis.beats??[]).filter(b=>Number.isInteger(b.sample)&&b.sample>=0&&b.sample<=analysis.sampleCount&&(b.manual||b.confidence>=.35));
 if(!beats.length)fail('Add manual beat anchors or analyze a song with a clear beat first.');
 const boundaries=adaptive?musicalBoundaries(analysis,beats,end,shotSeconds):[{frame:0,id:null,error:0}];
 for(let seconds=shotSeconds;!adaptive&&seconds<analysis.duration-.5;seconds+=shotSeconds){
  const target=seconds*analysis.sampleRate;
  const nearest=beats.reduce((a,b)=>Math.abs(b.sample-target)<Math.abs(a.sample-target)?b:a);
  const exact=nearest.sample/analysis.sampleRate*24,frame=Math.round(exact);
  if(Math.abs(nearest.sample-target)/analysis.sampleRate>1)fail('The beat map has a gap. Add manual anchors before making shots.');
  if(frame>boundaries.at(-1).frame&&frame<end)boundaries.push({frame,id:nearest.id,error:frame-exact});
 }
 if(!adaptive)boundaries.push({frame:end,id:null,error:0});
 if(boundaries.length-1>120)fail('This board exceeds 120 shots. Use longer shots.');
 const revision=plan.revision+1,sectionId=`section-${revision}`,sceneId=`scene-${revision}`;
 const shots=boundaries.slice(0,-1).map((b,i)=>({id:`shot-${revision}-${i+1}`,revision:0,sectionId,sceneId,startFrame:b.frame,endFrame:boundaries[i+1].frame,anchorIds:[b.id,boundaries[i+1].id].filter(Boolean),snapErrorFrames:b.error,generationUnitId:null,sourceInFrame:0,narrative:`Shot ${i+1}`,camera:'',look:'',prompt:'',referenceIds:[],performance:false,modelProfile:null,selectedTakeId:null}));
 return {...plan,revision,analysis,sections:[{id:sectionId,name:'Song',startFrame:0,endFrame:end}],scenes:[{id:sceneId,sectionId,name:'Main story'}],shots,generationUnits:[],takes:[]};
}
export function compileShotTiming(plan,analysis=plan.analysis){
 const end=source(plan,analysis),shots=[...(plan.shots??[])].sort((a,b)=>a.startFrame-b.startFrame);
 if(!shots.length||shots.length>120)fail('A storyboard needs between 1 and 120 shots.');
 let cursor=0;
 for(const shot of shots){
  if(!Number.isInteger(shot.startFrame)||!Number.isInteger(shot.endFrame)||shot.endFrame<=shot.startFrame)fail('Invalid shot interval.');
  if(shot.startFrame<cursor)fail('Shots overlap.');if(shot.startFrame>cursor)fail('Picture coverage has a gap.');
  const section=plan.sections.find(s=>s.id===shot.sectionId);if(!section||shot.startFrame<section.startFrame||shot.endFrame>section.endFrame)fail('Shot is outside its musical section.');
  const anchors=(shot.anchorIds??[]).map(id=>analysis.beats?.find(b=>b.id===id));
  if(anchors.some(a=>!a)||shot.startFrame>0&&!anchors.some(a=>Math.abs(a.sample/analysis.sampleRate*24-shot.startFrame)<=.500001))fail('The beat anchors changed. Rebuild the storyboard before directing or assembling it.');
  cursor=shot.endFrame;
 }
 if(cursor!==end)fail('Picture coverage must reach the end of the song.');
 const windows=[];
 for(const section of plan.sections){for(let start=section.startFrame;start<section.endFrame;start+=240){const stop=Math.min(start+240,section.endFrame),cuts=shots.filter(s=>s.startFrame>0&&s.startFrame>=start&&s.startFrame<stop).length;windows.push({sectionId:section.id,startFrame:start,endFrame:stop,cuts,partial:stop-start<240,withinTarget:cuts>=(plan.pacing?.minCutsPer10s??2)&&cuts<=(plan.pacing?.maxCutsPer10s??5)});}}
 return {shots,coverage:{complete:true,totalFrames:end,duration:end/24,trailingSilenceSeconds:end/24-analysis.duration,windows}};
}
