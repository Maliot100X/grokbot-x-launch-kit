import type { JsonStore } from './store.js';
import { digest } from './drafts.js';
export class ConnectorFailure extends Error {
  constructor(message:string,readonly kind:'rate_limit'|'transient'|'permanent',readonly retryAfterMs=0){super(message);}
}
export interface RetryPolicy { maxAttempts:number; baseMs:number; capMs:number; }
export function backoff(attempt:number,p:RetryPolicy,retryAfterMs=0):number {
  return Math.max(retryAfterMs,Math.min(p.capMs,p.baseMs*2**(attempt-1)));
}
/** Bounded task retry only; never an activity watcher or polling loop. Injectable wait for tests. */
export async function withRetry<T>(operation:string,task:()=>Promise<T>,store:JsonStore,p:RetryPolicy,wait:(ms:number)=>Promise<void>,now:()=>Date):Promise<T> {
  if (!Number.isInteger(p.maxAttempts)||p.maxAttempts<1||p.maxAttempts>10||!Number.isFinite(p.baseMs)||p.baseMs<0||!Number.isFinite(p.capMs)||p.capMs<p.baseMs) throw new Error('Invalid retry policy');
  for(let attempt=1;attempt<=p.maxAttempts;attempt++){
    try { return await task(); } catch(error){
      const retry=error instanceof ConnectorFailure && error.kind!=='permanent';
      if (!retry || attempt===p.maxAttempts){
        await store.transaction(s=>{
          const at=now().toISOString();
          // Never persist raw exception text: it could contain secrets or untrusted content.
          s.dlq.push({id:digest(`${operation}:${at}:${s.dlq.length}`),operation,attempts:attempt,reason:error instanceof ConnectorFailure?error.kind:'unknown',at});
          s.audit.push({at,action:'operation:dead_letter',subject:operation});
        });
        throw error;
      }
      const failure=error as ConnectorFailure;
      const hint=Number.isFinite(failure.retryAfterMs)&&failure.retryAfterMs>=0?failure.retryAfterMs:0;
      await wait(backoff(attempt,p,hint));
    }
  }
  throw new Error('Unreachable');
}
export interface RateLimitSnapshot { remaining:number; resetAt:Date; }
export function earliestAllowed(snapshot:RateLimitSnapshot,now:Date):Date {
  if (!Number.isFinite(snapshot.resetAt.getTime())||!Number.isInteger(snapshot.remaining)||snapshot.remaining<0) throw new Error('Invalid rate limit');
  return snapshot.remaining===0 && snapshot.resetAt>now ? snapshot.resetAt : now;
}
/** Implement ONLY when a supported connector provides signed deliveries. Fail closed by default. */
export interface WebhookSignatureVerifier { verify(rawBody:Uint8Array,headers:Readonly<Record<string,string>>,receivedAt:Date):Promise<boolean>; }
export async function verifiedWebhook(raw:Uint8Array,headers:Readonly<Record<string,string>>,at:Date,verifier:WebhookSignatureVerifier|undefined,accept:(body:Uint8Array)=>Promise<void>):Promise<void> {
  if (!verifier || !await verifier.verify(raw,headers,at)) throw new Error('Webhook rejected: signature unverified');
  await accept(raw);
}

/** Apply bounded retries/DLQ to any supported read-only bridge, including fixtures. */
export function monitoredResearchAdapter(
  adapter: import('./adapters.js').ResearchAdapter, store:JsonStore, policy:RetryPolicy,
  wait:(ms:number)=>Promise<void>, now:()=>Date
): import('./adapters.js').ResearchAdapter {
  return {
    source:adapter.source,
    trends:request=>withRetry('research.trends',()=>adapter.trends(request),store,policy,wait,now),
    examples:trend=>withRetry('research.examples',()=>adapter.examples(trend),store,policy,wait,now)
  };
}
