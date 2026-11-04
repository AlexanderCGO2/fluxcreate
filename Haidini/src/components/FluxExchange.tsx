import '../exchange.css';

export interface ExchangeSummary {
  name:string;sourceApp:'fluxini'|'fluxiffects';brief:string;notes:string;
  canvas:{width:number;height:number;pixelsPerUnit:number};canRestoreOriginal:boolean;
}
export interface ExchangeReport extends ExchangeSummary {
  warnings:string[];nodeCount:number;animationCount:number;restoredOriginal:boolean;
}
export function ExchangeReportView({report}:{report:ExchangeReport}){
  return <div className="exchange-report"><div className="exchange-summary"><span>{report.sourceApp==='fluxiffects'?'From FluxMotion':'From FluxEffects'}</span><h3>{report.name}</h3><p>{report.nodeCount} objects · {report.animationCount} animation tracks · {report.canvas.width} × {report.canvas.height}</p></div>{report.brief&&<section><h4>Creative brief</h4><p className="exchange-notes">{report.brief}</p></section>}{report.notes&&<section><h4>Handoff notes</h4><p className="exchange-notes">{report.notes}</p></section>}<section><h4>{report.restoredOriginal?'Saved native source restored':'Conversion report'}</h4>{report.warnings.length?<ul>{report.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>:<p>The native FluxEffects scene and its editable settings are preserved.</p>}</section></div>;
}
export function ExchangeFields({brief,notes,onBrief,onNotes,disabled}:{brief:string;notes:string;onBrief:(value:string)=>void;onNotes:(value:string)=>void;disabled:boolean}){
  return <div className="exchange-fields"><p>Move editable text, shapes and supported motion between FluxEffects and FluxMotion. The Markdown file carries your brief, handoff notes and native source snapshots. Each app shows any conversion limits before import.</p><label className="dialog-field">Creative brief<textarea aria-label="Exchange creative brief" rows={3} maxLength={6000} placeholder="What should this piece communicate?" value={brief} onChange={event=>onBrief(event.target.value)} disabled={disabled}/></label><label className="dialog-field">Handoff notes<textarea aria-label="Exchange handoff notes" rows={3} maxLength={12000} placeholder="What should the next editor keep or change?" value={notes} onChange={event=>onNotes(event.target.value)} disabled={disabled}/></label><small>Native source recovery preserves features that the other app cannot edit. Conversion follows the latest exported scene.</small></div>;
}
