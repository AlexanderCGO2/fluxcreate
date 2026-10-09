import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { parseProject, ProjectError } from '../src/engine/project.ts';

// Append-only, project-scoped recovery history. The working undo/redo stack may
// branch; these revisions stay recoverable even after the redo stack changes.
export class RevisionArchive {
  constructor(db) {
    this.db=db;
    db.exec(`CREATE TABLE IF NOT EXISTS revision_archive(
      project_id TEXT NOT NULL, revision INTEGER NOT NULL, state BLOB NOT NULL,
      summary TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT, source_revision INTEGER,
      PRIMARY KEY(project_id,revision));
      CREATE TABLE IF NOT EXISTS history_migrations(version INTEGER PRIMARY KEY);`);
    this.insert=db.prepare('INSERT OR IGNORE INTO revision_archive VALUES(?,?,?,?,?,?,?)');
    if(!db.prepare('SELECT version FROM history_migrations WHERE version=1').get()){
      db.exec('BEGIN IMMEDIATE');
      try{
        for(const row of db.prepare('SELECT state FROM snapshots ORDER BY project_id,step').iterate()){
          const p=JSON.parse(row.state);this.add(p,'Saved revision '+p.revision,'legacy',null);
        }
        for(const row of db.prepare('SELECT state FROM projects').iterate()){
          const p=JSON.parse(row.state);this.add(p,'Saved revision '+p.revision,'legacy',null);
        }
        db.prepare('INSERT INTO history_migrations VALUES(1)').run();db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
    }
  }
  add(project,summary,kind,createdAt=new Date().toISOString(),sourceRevision=null){
    this.insert.run(project.id,project.revision,deflateRawSync(JSON.stringify(project)),summary,kind,createdAt,sourceRevision);
  }
  page(id,currentRevision,{before,limit=30}={}){
    if(before!==undefined&&(!Number.isSafeInteger(before)||before<0)||!Number.isInteger(limit)||limit<1||limit>100)throw new ProjectError('Invalid history page.');
    const rows=this.db.prepare('SELECT revision,summary,kind,created_at AS createdAt,source_revision AS sourceRevision FROM revision_archive WHERE project_id=? AND revision<? ORDER BY revision DESC LIMIT ?').all(id,before??Number.MAX_SAFE_INTEGER,limit+1);
    const more=rows.length>limit,entries=rows.slice(0,limit);
    return {entries:entries.map(e=>({...e,current:e.revision===currentRevision})),nextBefore:more?entries.at(-1).revision:null,total:this.db.prepare('SELECT count(*) AS n FROM revision_archive WHERE project_id=?').get(id).n,currentRevision};
  }
  get(id,revision){
    if(!Number.isSafeInteger(revision)||revision<0)throw new ProjectError('Invalid revision.');
    const row=this.db.prepare('SELECT state FROM revision_archive WHERE project_id=? AND revision=?').get(id,revision);
    if(!row)throw new ProjectError('This revision is not in the scene history.',404);
    return parseProject(JSON.parse(inflateRawSync(row.state,{maxOutputLength:16*1024*1024}).toString()));
  }
}
