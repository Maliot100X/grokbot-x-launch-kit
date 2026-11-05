import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyState, type State, type DraftStatus } from './model.js';
export class StoreBusy extends Error {}
/** Atomic snapshot replacement under a fail-fast filesystem lock. Single local filesystem only. */
export class JsonStore {
  constructor(readonly path: string) {}
  async read(): Promise<State> {
    try {
      const s = JSON.parse(await readFile(this.path,'utf8')) as State;
      if (s.version!==1 || ![s.runs,s.drafts,s.audit,s.dlq].every(Array.isArray)) throw new Error('Invalid store schema');
      return s;
    } catch(e) { if ((e as NodeJS.ErrnoException).code==='ENOENT') return emptyState(); throw e; }
  }
  async transaction<T>(fn:(state:State)=>T|Promise<T>): Promise<T> {
    await mkdir(dirname(this.path),{recursive:true});
    const lock = `${this.path}.lock`;
    try { await mkdir(lock); } catch(e) { if ((e as NodeJS.ErrnoException).code==='EEXIST') throw new StoreBusy('Store busy; retry externally, never remove a live lock'); throw e; }
    const tmp = `${this.path}.${randomUUID()}.tmp`;
    try {
      const state = await this.read();
      const result = await fn(state);
      await writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600,flag:'wx'});
      await rename(tmp,this.path);
      return result;
    } finally { await rm(tmp,{force:true}); await rm(lock,{recursive:true,force:true}); }
  }
  async review(id:string, status:Exclude<DraftStatus,'pending_review'>, now:Date):Promise<void> {
    if (!['approved_for_export','rejected'].includes(status)) throw new Error('Invalid review status');
    await this.transaction(state=>{
      const draft=state.drafts.find(d=>d.id===id);
      if (!draft || draft.status!=='pending_review') throw new Error('Draft missing or already reviewed');
      draft.status=status;
      state.audit.push({at:now.toISOString(),action:`review:${status}`,subject:id});
    });
  }
}
