// Checkpoint selection is separate from GPU copies so seek policy can be verified.
export function checkpointForSeek(currentStep:number,targetStep:number,keys:Iterable<number>):number|null{
 if(currentStep===targetStep)return null;
 let best=0;
 for(const step of keys)if(step<=targetStep&&step>best)best=step;
 return targetStep<currentStep||best>currentStep?best:null;
}
