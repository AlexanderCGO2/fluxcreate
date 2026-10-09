/** Selection mode is intentionally limited to commands on existing selected nodes. */
export function validatePlannerScope(commands,selection,scope){
 if(scope!=='selection')return;
 if(!Array.isArray(selection)||!selection.length)throw Object.assign(Error('Select an object before requesting a selected-object edit.'),{status:400});
 const chosen=new Set(selection);
 for(const command of commands){const target=command.op==='animate'?command.track?.nodeId:command.nodeId;if(!target||!chosen.has(target)||['duplicate','studioObject'].includes(command.op))throw Object.assign(Error('The proposal changes objects outside the selection. Choose Whole document or request a smaller edit.'),{status:400});}
}
