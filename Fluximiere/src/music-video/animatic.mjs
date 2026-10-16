import {compileShotTiming} from './timing.mjs';
import {createProject,makeClip,validateProject} from '../model.mjs';
export function makeAnimatic(plan,frames=[],song){
 const {shots,coverage}=compileShotTiming(plan);
 if(!song||song.id!==plan.song.assetId||song.type!=='audio'||!song.src?.startsWith('data:audio/'))throw new Error('Load the original song before assembling the preview.');
 if(Math.abs(song.duration-plan.analysis.duration)>.001)throw new Error('Original song duration does not match the beat map.');
 const assets=[song],clips=[],lineage={};
 for(const [index,shot] of shots.entries()){
  const frame=frames.find(f=>shot.referenceIds.includes(f.id));
  if(frame&&!assets.some(a=>a.id===frame.id))assets.push(frame);
  const common={id:`mv-${plan.id}-${shot.id}`,name:shot.narrative||`Shot ${index+1}`,start:shot.startFrame/24,duration:(shot.endFrame-shot.startFrame)/24,x:plan.width/2,y:plan.height/2,width:plan.width,height:plan.height,muted:true};
  const clip=frame?makeClip('image',{...common,assetId:frame.id}):makeClip('card',{...common,color:index%2?'#24274b':'#53417f',secondary:index%2?'#66528e':'#b4878b',text:shot.narrative||`Shot ${index+1}`});
  clips.push(clip);lineage[clip.id]={planId:plan.id,planRevision:plan.revision,shotId:shot.id,shotRevision:shot.revision};
 }
 clips.push(makeClip('audio',{id:`mv-song-${plan.id}`,name:song.name,assetId:song.id,start:0,duration:song.duration,track:'A1',playbackRate:1,volume:1,muted:false}));
 const project=validateProject({...createProject(),id:`mv-${plan.id}`,name:`${plan.name} · animatic`,width:plan.width,height:plan.height,fps:24,duration:coverage.duration,assets,clips,brief:plan.concept.slice(0,6000)});
 return {project,coverage,lineage,warnings:['Storyboard preview: reference stills and placeholders, not generated video.','Save the music-video recipe separately to retain direction and beat metadata.']};
}
