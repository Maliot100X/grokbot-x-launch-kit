import type { Post, RankedPost } from './model.js';
export function validPost(p: Post, now: Date): boolean {
  return /^\d+$/.test(p.id) && p.url === `https://x.com/i/status/${p.id}` &&
    typeof p.text === 'string' && p.text.length > 0 &&
    [p.likes,p.reposts,p.replies,p.quotes].every(n=>Number.isSafeInteger(n)&&n>=0) &&
    Number.isFinite(Date.parse(p.createdAt)) && Date.parse(p.createdAt)<=now.getTime();
}
/** Weighted engagement with age decay; never interprets popularity as truth. */
export function rankPosts(posts: Post[], now: Date): RankedPost[] {
  const unique = new Map<string,Post>();
  for (const p of posts) if (validPost(p,now) && !unique.has(p.id)) unique.set(p.id,p);
  return [...unique.values()].map(p=>({...p,score:Number((Math.log1p(p.likes+3*p.reposts+2*p.replies+3*p.quotes)/(1+(now.getTime()-Date.parse(p.createdAt))/3600000/24)).toFixed(8))}))
    .sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
}
