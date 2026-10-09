import type { Project, Patch } from './engine/project.ts';
export type { Project, Patch };
export interface ProjectState { project: Project; canUndo: boolean; canRedo: boolean; undoDepth?:number; redoDepth?:number; pendingMemory: number; }
export interface MemoryEvent { id: string; kind: string; summary: string; revision: number; created_at: string; nodeIds: string[]; }
export interface Preference { id: string; statement: string; source_id: string; status: 'candidate'|'approved'|'rejected'; node_id:string|null; }
export interface ContextPackage { projectId: string; revision: number; intent: string; sections: { id: string; budget: number|null; lines: string[]; dropped: string[]; tokens: number }[]; tokenEstimate: number; retrieval: string; }
export interface MemoryData { events:MemoryEvent[];preferences:Preference[];context:ContextPackage; }
