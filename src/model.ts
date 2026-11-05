export interface Provenance {
  origin: 'parent-supported-connector'; retrievedAt: string; woeid: 1 | 23424977;
  geography: 'worldwide' | 'United States'; query: string; sourceTool: string; rawResultId: string; parameters?: Record<string,unknown>;
}
export interface Trend { id: string; label: string; observedAt: string; sourceId?: string; sourceUrl?: string; provenance?: Provenance; }
export interface Post { id: string; url: string; text: string; createdAt: string; likes: number; reposts: number; replies: number; quotes: number; provenance?: Provenance; sourceUrl?: string; }
export interface RankedPost extends Post { score: number; }
export type Variant = 'question' | 'observation' | 'discussion';
export type DraftStatus = 'pending_review' | 'approved_for_export' | 'rejected';
export interface Draft { id: string; topicId: string; variant: Variant; source: 'fixture' | 'connector'; text: string; topicProvenance?: Provenance; topicSourceId?: string; topicSourceUrl?: string; evidence: {postId: string; url: string; sourceUrl?: string; provenance?: Provenance; createdAt?: string; metrics?: {likes:number; reposts:number; replies:number; quotes:number}; score?: number}[]; status: DraftStatus; guardrails: string[]; }
export interface Audit { at: string; action: string; subject: string; }
export interface Run { key: string; source: 'fixture' | 'connector'; at: string; draftIds: string[]; }
export interface DeadLetter { id: string; operation: string; attempts: number; reason: string; at: string; }
export interface State { version: 1; runs: Run[]; drafts: Draft[]; audit: Audit[]; dlq: DeadLetter[]; }
export function emptyState(): State { return {version:1,runs:[],drafts:[],audit:[],dlq:[]}; }
