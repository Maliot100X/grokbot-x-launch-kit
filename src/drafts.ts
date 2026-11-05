import { createHash } from 'node:crypto';
import type { Draft, RankedPost, Trend } from './model.js';
export function digest(value: string): string { return createHash('sha256').update(value).digest('hex').slice(0,24); }
export function safeLabel(label: string): string {
  // Never interpolate post text or instructions. Restrict topic metadata to plain words.
  return label.normalize('NFKC').replace(/https?:\/\/\S+|@\S+/g,'').replace(/#(?=[\p{L}\p{N}_])/gu,'').replace(/[^\p{L}\p{N} -]/gu,' ').replace(/\s+/g,' ').trim().slice(0,60) || 'this topic';
}
export function makeDrafts(topic: Trend, posts: RankedPost[], runKey: string, source: 'fixture' | 'connector'): Draft[] {
  if (!posts.length) return [];
  const label = safeLabel(topic.label);
  const evidence = posts.slice(0,3).map(p=>({postId:p.id,url:p.url,...(p.provenance?{provenance:p.provenance,...(p.sourceUrl?{sourceUrl:p.sourceUrl}:{}),createdAt:p.createdAt,metrics:{likes:p.likes,reposts:p.reposts,replies:p.replies,quotes:p.quotes},score:p.score}:{})}));
  const texts = {
    question:`What is your biggest open question about ${label}? Looking for perspectives, not predictions.`,
    observation:`A research prompt: explore ${label} through the linked examples. Engagement is not verification.`,
    discussion:`Let's discuss ${label}: what should builders investigate next? Share evidence and counterexamples.`
  };
  return (['question','observation','discussion'] as const).map(variant=>({
    id:digest(`${runKey}:${topic.id}:${variant}`),topicId:topic.id,variant,source,text:texts[variant],evidence,
    ...(topic.provenance?{topicProvenance:topic.provenance}:{}),
    ...(topic.sourceId?{topicSourceId:topic.sourceId}:{}),...(topic.sourceUrl?{topicSourceUrl:topic.sourceUrl}:{}),
    status:'pending_review',guardrails:[...(source==='fixture'?['SYNTHETIC FIXTURE: evidence URLs unverified']:[]),'Unverified topic metadata; human review required','Evidence is provenance, not proof','No financial, product-performance, or trend-size claims','No automatic publishing or messaging']
  }));
}
