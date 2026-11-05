import { DEFAULT_WOEID, validateWoeid } from './config.js';
import type { ResearchAdapter } from './adapters.js';
import { JsonStore } from './store.js';
import { rankPosts } from './ranking.js';
import { digest, makeDrafts } from './drafts.js';
export interface RunOptions { now: Date; slot: string; maxTopics?: number; maxAgeHours?: number; woeid?: number; }
/** One invocation, no timers. A future owner-approved scheduler can call this entry point. */
export async function runOnce(adapter:ResearchAdapter, store:JsonStore, options:RunOptions) {
  const {now,slot,maxTopics=2,maxAgeHours=48,woeid=DEFAULT_WOEID}=options;
  validateWoeid(woeid);
  if (!Number.isFinite(now.getTime()) || !slot.trim() || !Number.isInteger(maxTopics) || maxTopics<1 || maxTopics>20 || !Number.isFinite(maxAgeHours) || maxAgeHours<=0) throw new Error('Invalid run options');
  // Source separates fixture and connector records. Slot must identify project/config version too.
  const key=digest(`${adapter.source}:${slot}`);
  const existing=(await store.read()).runs.find(r=>r.key===key);
  if (existing) return {replayed:true,run:existing};
  const trends=await adapter.trends({woeid});
  const seen=new Set<string>();
  const candidates=[];
  for (const trend of trends) {
    const age=now.getTime()-Date.parse(trend.observedAt);
    if (!trend.id || seen.has(trend.id) || !Number.isFinite(age) || age<0 || age>maxAgeHours*3600000) continue;
    seen.add(trend.id);
    const posts=rankPosts(await adapter.examples(trend),now).filter(p=>now.getTime()-Date.parse(p.createdAt)<=maxAgeHours*3600000);
    if (posts.length) candidates.push({trend,posts,score:posts.slice(0,3).reduce((sum,p)=>sum+p.score,0)});
  }
  candidates.sort((a,b)=>b.score-a.score||a.trend.id.localeCompare(b.trend.id));
  const drafts=candidates.slice(0,maxTopics).flatMap(c=>makeDrafts(c.trend,c.posts,key,adapter.source));
  return store.transaction(state=>{
    const prior=state.runs.find(r=>r.key===key);
    if (prior) return {replayed:true,run:prior};
    const run={key,source:adapter.source,at:now.toISOString(),draftIds:drafts.map(d=>d.id)};
    state.runs.push(run); state.drafts.push(...drafts);
    state.audit.push({at:run.at,action:'run:committed',subject:key},...drafts.map(d=>({at:run.at,action:'draft:pending_review',subject:d.id})));
    return {replayed:false,run};
  });
}
