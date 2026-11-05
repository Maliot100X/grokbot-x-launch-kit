import type { TrendRequest } from './config.js';
import type { Trend, Post } from './model.js';
/** Implement with sanctioned connector reads ONLY. No HTTP/OAuth or write methods. */
export interface ResearchAdapter {
  readonly source: 'fixture' | 'connector';
  trends(request?: TrendRequest): Promise<Trend[]>;
  examples(trend: Trend): Promise<Post[]>;
}
export class UnsupportedCapability extends Error {}
export interface StreamingRule { value: string; tag: string; }
/** Deliberately unavailable: not a simulation, subscription, socket or stream. */
export class UnavailableStreamingAdapter {
  readonly available = false;
  async reconcile(_desired: readonly StreamingRule[]): Promise<never> {
    throw new UnsupportedCapability('Streaming-rule reconciliation unavailable in this connector adapter');
  }
}
