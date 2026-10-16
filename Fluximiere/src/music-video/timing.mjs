const fail=message=>{throw new Error(message);};
function source(plan,analysis){
 if(!plan.song||!analysis||plan.song.hash!==analysis.sourceHash)fail('Music source does not match the analysis.');
 if(!Number.isFinite(analysis.duration)||analysis.duration<1||analysis.duration>180||!Number.isInteger(analysis.sampleRate)||analysis.sampleRate<1)fail('Choose a song between 1 and 180 seconds.');
 if(plan.fps!==24)fail('Music-video timing requires 24 fps.');
 return Math.ceil(analysis.duration*24);
}
export function buildBeatStoryboard(plan,analysis,shotSeconds=3){
 const end=source(plan,analysis);
 if(!Number.isFinite(shotSeconds)||shotSeconds<2||shotSeconds>5)fail('Choose a shot length between 2 and 5 seconds.');
 if(plan.shots?.some(s=>s.selectedTakeId)||plan.locks?.length)fail('Keep locked or reviewed shots; create a new board to rebuild timings.');
 const beats=(analysis.beats??[]).filter(b=>Number.isInteger(b.sample)&&b.sample>=0&&b.sample<=analysis.sampleCount&&(b.manual||b.confidence>=.35));
 if(!beats.length)fail('Add manual beat anchors or analyze a song with a clear beat first.');
 const boundaries=[{frame:0,id:null,error:0}];
 for(let seconds=shotSeconds;seconds<analysis.duration-.5;seconds+=shotSeconds){
  const target=seconds*analysis.sampleRate;
  const nearest=beats.reduce((a,b)=>Math.abs(b.sample-target)<Math.abs(a.sample-target)?b:a);
  const exact=nearest.sample/analysis.sampleRate*24,frame=Math.round(exact);
  if(Math.abs(nearest.sample-target)/analysis.sampleRate>1)fail('The beat map has a gap. Add manual anchors before making shots.');
  if(frame>boundaries.at(-1).frame&&frame<end)boundaries.push({frame,id:nearest.id,error:frame-exact});
 }
 boundaries.push({frame:end,id:null,error:0});
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
