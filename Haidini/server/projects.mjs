import { RevisionArchive } from './revision-archive.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { createProject, applyPatch, parseProject, validateProject, ProjectError, describeCommand } from '../src/engine/project.ts';
import { CATALOG } from '../src/engine/catalog.ts';

export class ProjectStore {
  constructor(file,memory) {
    this.memory=memory;this.db=new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,state TEXT NOT NULL,cursor INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS snapshots(project_id TEXT NOT NULL,step INTEGER NOT NULL,state TEXT NOT NULL,PRIMARY KEY(project_id,step));
      CREATE TABLE IF NOT EXISTS trash(project_id TEXT PRIMARY KEY,deleted_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS exchange_metadata(project_id TEXT PRIMARY KEY,envelope TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,payload TEXT NOT NULL,delivered INTEGER NOT NULL DEFAULT 0);`);
    this.archive=new RevisionArchive(this.db);
    if(!this.list().length)this.create();
    this.flush();
  }
  list(){return this.db.prepare('SELECT state FROM projects WHERE id NOT IN (SELECT project_id FROM trash) ORDER BY rowid DESC').all().map(r=>{const p=JSON.parse(r.state);return {id:p.id,name:p.name,revision:p.revision};});}
  get(id){const row=this.db.prepare('SELECT state,cursor FROM projects WHERE id=? AND id NOT IN (SELECT project_id FROM trash)').get(id);if(!row)throw new ProjectError('Scene not found. It may be in Trash.',404);return {project:parseProject(JSON.parse(row.state)),cursor:row.cursor};}
  trashed(){return this.db.prepare('SELECT p.state,t.deleted_at FROM projects p JOIN trash t ON p.id=t.project_id ORDER BY t.deleted_at DESC').all().map(r=>{const p=JSON.parse(r.state);return {id:p.id,name:p.name,revision:p.revision,deletedAt:r.deleted_at};});}
  duplicate(id,revision){
    const {project}=this.get(id);if(project.revision!==revision)throw new ProjectError('The scene changed. Refresh and try again.',409);
    const names=new Set(this.list().map(p=>p.name));let suffix=' copy',i=2;while(names.has(project.name.slice(0,100-suffix.length)+suffix))suffix=' copy '+i++;
    return this.create({...project,name:project.name.slice(0,100-suffix.length)+suffix},undefined,this.exchange(id));
  }
  remove(id,revision){
    this.transaction(()=>{
      const {project}=this.get(id);if(project.revision!==revision)throw new ProjectError('The scene changed. Refresh and try again.',409);
      this.db.prepare('INSERT INTO trash VALUES(?,?)').run(id,new Date().toISOString());this.enqueue(project,'scene_deleted','Moved scene to Trash.');
      if(!this.list().length){const p=createProject(randomUUID(),'blank');this.db.prepare('INSERT INTO projects VALUES(?,?,0)').run(p.id,JSON.stringify(p));this.db.prepare('INSERT INTO snapshots VALUES(?,0,?)').run(p.id,JSON.stringify(p));this.archive.add(p,'Created an empty scene.','project_created');this.enqueue(p,'project_created','Created an empty scene.');}
    });this.flush();return {projects:this.list(),trash:this.trashed()};
  }
  restore(id){
    this.transaction(()=>{const row=this.db.prepare('SELECT p.state FROM projects p JOIN trash t ON p.id=t.project_id WHERE p.id=?').get(id);if(!row)throw new ProjectError('Scene not found in Trash.',404);this.db.prepare('DELETE FROM trash WHERE project_id=?').run(id);this.enqueue(parseProject(JSON.parse(row.state)),'scene_restored','Restored scene from Trash.');});
    this.flush();return this.status(id);
  }
  status(id){const {project,cursor}=this.get(id);const max=this.db.prepare('SELECT max(step) AS n FROM snapshots WHERE project_id=?').get(id).n;return {project,canUndo:cursor>0,canRedo:cursor<max,undoDepth:cursor,redoDepth:max-cursor,pendingMemory:this.db.prepare('SELECT count(*) AS n FROM outbox WHERE delivered=0').get().n};}
  exchange(id){const row=this.db.prepare('SELECT envelope FROM exchange_metadata WHERE project_id=?').get(id);return row?JSON.parse(row.envelope):null;}
  saveExchange(id,envelope){this.get(id);const serialized=JSON.stringify(envelope);if(Buffer.byteLength(serialized)>16*1024*1024)throw new ProjectError('The exchange package exceeds 16 MB.');this.db.prepare('INSERT INTO exchange_metadata(project_id,envelope) VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET envelope=excluded.envelope').run(id,serialized);}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  enqueue(project,kind,summary,nodeIds=[]){const event={id:randomUUID(),projectId:project.id,branchId:project.branchId,revision:project.revision,kind,summary,nodeIds,createdAt:new Date().toISOString()};this.db.prepare('INSERT INTO outbox(id,payload) VALUES(?,?)').run(event.id,JSON.stringify(event));}
  create(input,template='motion',exchange=null){
    const project=input?{...parseProject(input),id:randomUUID(),revision:0}:createProject(randomUUID(),template);
    this.transaction(()=>{this.db.prepare('INSERT INTO projects VALUES(?,?,0)').run(project.id,JSON.stringify(project));this.db.prepare('INSERT INTO snapshots VALUES(?,0,?)').run(project.id,JSON.stringify(project));if(exchange)this.saveExchange(project.id,exchange);this.archive.add(project,input?'Imported scene.':'Created '+project.name+'.','project_created');this.enqueue(project,'project_created',input?'Imported project as a new local project.':'Created '+project.name+'.',project.graph.nodes.map(n=>n.id));});
    this.flush();return this.status(project.id);
  }
  mutate(id,revision,fn,summary,kind='patch_committed',nodeIds=[],sourceRevision=null) {
    this.transaction(()=>{const {project,cursor}=this.get(id);if(project.revision!==revision)throw new ProjectError('The scene changed. Refresh and try again.',409);const next=validateProject(fn(project)),description=typeof summary==='function'?summary(project):summary;this.archive.add(next,description,kind,undefined,sourceRevision);this.db.prepare('DELETE FROM snapshots WHERE project_id=? AND step>?').run(id,cursor);this.db.prepare('INSERT INTO snapshots VALUES(?,?,?)').run(id,cursor+1,JSON.stringify(next));this.db.prepare('UPDATE projects SET state=?,cursor=? WHERE id=?').run(JSON.stringify(next),cursor+1,id);this.enqueue(next,kind,description,nodeIds);});
    this.flush();return this.status(id);
  }
  patch(id,patch){const nodeIds=[...new Set((patch?.commands||[]).flatMap(c=>c.nodeId?[c.nodeId]:c.op==='animate'?[c.track?.nodeId]:c.op==='add'?[c.id]:c.op==='connect'?[c.edge?.source,c.edge?.target]:[]).filter(Boolean))];return this.mutate(id,patch?.baseRevision,p=>applyPatch(p,patch),p=>patch.summary+' '+patch.commands.map(c=>describeCommand(c,p)).join('; '),'patch_committed',nodeIds);}
  lock(id,revision,nodeId,param,locked){const node=this.get(id).project.graph.nodes.find(n=>n.id===nodeId);if(!node||!CATALOG[node.type].params[param]||typeof locked!=='boolean')throw new ProjectError('Invalid lock.');return this.mutate(id,revision,p=>({...p,revision:p.revision+1,locks:[...p.locks.filter(x=>x.nodeId!==nodeId||x.param!==param),...(locked?[{nodeId,param}]:[])]}),`${locked?'Locked':'Unlocked'} ${node.label} / ${param}.`,'lock_changed',[nodeId]);}
  history(id,options){const {project}=this.get(id);return this.archive.page(id,project.revision,options);}
  restoreRevision(id,revision,target){const saved=this.archive.get(id,target);return this.mutate(id,revision,p=>({...saved,id:p.id,branchId:p.branchId,revision:p.revision+1}),'Restored revision '+target+'.','revision_restored',saved.graph.nodes.map(n=>n.id),target);}
  move(id,revision,direction){
    this.transaction(()=>{const {project,cursor}=this.get(id);if(project.revision!==revision)throw new ProjectError('The scene changed. Refresh and try again.',409);const target=cursor+direction,row=this.db.prepare('SELECT state FROM snapshots WHERE project_id=? AND step=?').get(id,target);if(!row)throw new ProjectError(direction<0?'Nothing to undo.':'Nothing to redo.');const restored=parseProject(JSON.parse(row.state)),next={...restored,revision:project.revision+1};this.archive.add(next,(direction<0?'Undo':'Redo')+' · restored revision '+restored.revision+'.',direction<0?'patch_undone':'patch_redone',undefined,restored.revision);this.db.prepare('UPDATE projects SET state=?,cursor=? WHERE id=?').run(JSON.stringify(next),target,id);this.enqueue(next,direction<0?'patch_undone':'patch_redone',`${direction<0?'Undid':'Redid'} a graph edit. Restored ${next.graph.nodes.length} nodes and ${next.graph.edges.length} connections.`,[...new Set([...project.graph.nodes,...next.graph.nodes].map(n=>n.id))]);});
    this.flush();return this.status(id);
  }
  flush(){for(const row of this.db.prepare('SELECT id,payload FROM outbox WHERE delivered=0 ORDER BY rowid').all()){try{this.memory.remember(JSON.parse(row.payload));this.db.prepare('UPDATE outbox SET delivered=1 WHERE id=?').run(row.id);}catch{return;}}}
  close(){this.db.close();}
}
