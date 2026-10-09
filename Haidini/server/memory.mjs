import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { buildSceneContext } from '../src/flux/context.ts';

export class FluxMemory {
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, project_id TEXT NOT NULL, branch_id TEXT NOT NULL, revision INTEGER NOT NULL, kind TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_scope ON events(project_id,branch_id,created_at);
      CREATE VIRTUAL TABLE IF NOT EXISTS event_search USING fts5(summary, content='events', content_rowid='rowid');
      CREATE TRIGGER IF NOT EXISTS event_insert AFTER INSERT ON events BEGIN INSERT INTO event_search(rowid,summary) VALUES(new.rowid,new.summary); END;
      CREATE TABLE IF NOT EXISTS preferences(id TEXT PRIMARY KEY, project_id TEXT NOT NULL, branch_id TEXT NOT NULL, statement TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES events(id), status TEXT NOT NULL, decided_at TEXT);
      PRAGMA foreign_keys=ON;`);
    if(!this.db.prepare('PRAGMA table_info(events)').all().some(c=>c.name==='node_ids'))this.db.exec("ALTER TABLE events ADD COLUMN node_ids TEXT NOT NULL DEFAULT '[]'");
    if(!this.db.prepare('PRAGMA table_info(preferences)').all().some(c=>c.name==='node_id'))this.db.exec('ALTER TABLE preferences ADD COLUMN node_id TEXT');
  }
  scope(project) {
    if (!project?.id || !project?.branchId || project.workspaceId !== 'local') throw new Error('A complete local project scope is required.');
    return [project.id, project.branchId];
  }
  remember(event) {
    if (!event.id || !event.projectId || event.branchId !== 'main' || !Number.isInteger(event.revision)) throw new Error('Invalid memory event.');
    return this.db.prepare('INSERT OR IGNORE INTO events(id,project_id,branch_id,revision,kind,summary,created_at,node_ids) VALUES(?,?,?,?,?,?,?,?)').run(event.id,event.projectId,event.branchId,event.revision,event.kind,event.summary,event.createdAt,JSON.stringify(event.nodeIds||[])).changes > 0;
  }
  history(project, limit=30) {
    return this.db.prepare('SELECT * FROM events WHERE project_id=? AND branch_id=? ORDER BY rowid DESC LIMIT ?').all(...this.scope(project),limit).map(row=>({...row,nodeIds:JSON.parse(row.node_ids)}));
  }
  search(project, query, limit=5) {
    const scope=this.scope(project);
    const words=String(query).match(/[\p{L}\p{N}_]+/gu)?.slice(0,16) ?? [];
    if(!words.length)return [];
    const term=words.map(w=>'"'+w+'"').join(' OR ');
    return this.db.prepare(`SELECT e.* FROM event_search JOIN events e ON e.rowid=event_search.rowid WHERE event_search MATCH ? AND e.project_id=? AND e.branch_id=? ORDER BY bm25(event_search),e.rowid DESC LIMIT ?`).all(term,...scope,limit).map(row=>({...row,nodeIds:JSON.parse(row.node_ids)}));
  }
  preferences(project, approvedOnly=false) {
    return this.db.prepare(`SELECT * FROM preferences WHERE project_id=? AND branch_id=? ${approvedOnly ? "AND status='approved' AND decided_at IS NOT NULL" : ''} ORDER BY rowid DESC`).all(...this.scope(project));
  }
  proposePreference(project, statement, sourceId, nodeId=null) {
    const [id,branch]=this.scope(project);
    if(typeof statement!=='string'||!statement.trim()||statement.length>240)throw new Error('A preference must contain 1–240 characters.');
    const source=this.db.prepare('SELECT id FROM events WHERE id=? AND project_id=? AND branch_id=?').get(sourceId,id,branch);
    if(!source)throw new Error('The preference needs a source from this project.');
    if(nodeId!==null&&!project.graph.nodes.some(n=>n.id===nodeId))throw new Error('The selected node does not belong to this project.');
    const key=randomUUID();
    this.db.prepare('INSERT INTO preferences(id,project_id,branch_id,statement,source_id,status,decided_at,node_id) VALUES(?,?,?,?,?,?,NULL,?)').run(key,id,branch,statement.trim(),sourceId,'candidate',nodeId);
    return key;
  }
  decidePreference(project,id,status) {
    if(!['approved','rejected'].includes(status))throw new Error('Invalid preference decision.');
    const result=this.db.prepare('UPDATE preferences SET status=?,decided_at=? WHERE id=? AND project_id=? AND branch_id=?').run(status,new Date().toISOString(),id,...this.scope(project));
    if(!result.changes)throw new Error('Preference not found in this project.');
  }
  assemble(project, intent, selection=[]) {
    this.scope(project);
    if(!Array.isArray(selection)||selection.length>64||selection.some(id=>!project.graph.nodes.some(n=>n.id===id)))throw new Error('Invalid scene selection.');
    return buildSceneContext(project,intent,selection,this.history(project,40),this.search(project,intent),this.preferences(project,true));
  }
  close(){this.db.close();}
}
