import React from 'react';
export function RecoveryNotice({label='document',onOpen,onNew,onDownload}){
 return <section className="flux-recovery-notice" role="alert"><div><strong>Your saved {label} needs recovery.</strong><p>Autosave is paused. This preview will not replace your saved data. Open a project file or start a new {label} to resume saving.</p></div><div className="flux-recovery-actions">{onDownload&&<button onClick={onDownload}>Download saved data</button>}<button onClick={onOpen}>Open recovery file</button><button onClick={onNew}>Start new {label}</button></div></section>;
}
