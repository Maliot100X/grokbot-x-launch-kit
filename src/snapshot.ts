import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { ResearchAdapter } from './adapters.js';
import type { Provenance, Trend, Post } from './model.js';
import type { TrendRequest } from './config.js';
import { rankPosts } from './ranking.js';
import { digest } from './drafts.js';
import { JsonStore } from './store.js';
import { runOnce } from './pipeline.js';

export interface SnapshotPost {
  id:string; url:string; text:string; createdAt:string;
  metrics:{likes:number;reposts:number;replies:number;quotes:number}; provenance:Provenance;
}
export interface SnapshotTopic {
  trend:{name:string;url:string;sourceId?:string;provenance:Provenance}; posts:SnapshotPost[];
}
export interface LiveSnapshot {
  schemaVersion:1; mode:'live'; snapshotId:string; capturedAt:string;
  rawResults:{id:string;sourceTool:string;result:unknown}[];
  geographies:{woeid:1|23424977;geography:'worldwide'|'United States';topics:SnapshotTopic[]}[];
}
const GEO = new Map<number,string>([[1,'worldwide'],[23424977,'United States']]);
function ensure(ok:unknown,message:string):asserts ok { if(!ok) throw new Error(`Invalid live snapshot: ${message}`); }
function obj(value:unknown):Record<string,unknown> { ensure(value && typeof value==='object' && !Array.isArray(value),'expected object'); return value as Record<string,unknown>; }
function text(value:unknown,name:string):asserts value is string { ensure(typeof value==='string'&&value.trim().length>0,`missing ${name}`); }
function date(value:unknown,name:string):number { text(value,name);ensure(/(?:Z|[+-]\d{2}:\d{2})$/.test(value),`${name} requires timezone`);const n=Date.parse(value);ensure(Number.isFinite(n),`invalid ${name}`);return n; }
function notSynthetic(value:string):boolean { return !/(?:fixture|synthetic|test[-_ ]?double|mock|placeholder)/i.test(value); }
function searchUrl(url:unknown):asserts url is string {
  text(url,'trend.url');let parsed:URL;try{parsed=new URL(url);}catch{throw new Error('Invalid live snapshot: trend URL');}
  ensure(parsed.protocol==='https:'&&parsed.hostname==='x.com'&&parsed.pathname==='/search'&&!parsed.username&&!parsed.password&&!!parsed.searchParams.get('q'),'trend requires an actual X search URL');
}
/** Handles plain JSON and MCP content[].text JSON wrappers, never executes content. */
function rawRecords(value:unknown):Record<string,unknown>[] {
  const records:Record<string,unknown>[]=[];let nodes=0;
  const walk=(v:unknown,depth:number):void=>{
    ensure(++nodes<=100000&&depth<=32,'raw result nesting/size limit');
    if(Array.isArray(v)){for(const item of v)walk(item,depth+1);return;}
    if(v&&typeof v==='object'){
      const o=v as Record<string,unknown>;
      ensure(o.fixture!==true&&o.synthetic!==true&&o.isFixture!==true,'raw result marked synthetic');
      if(typeof o.mode==='string')ensure(notSynthetic(o.mode),'raw result marked fixture');
      records.push(o);for(const child of Object.values(o))walk(child,depth+1);return;
    }
    if(typeof v==='string'&&/^[\s]*[\[{]/.test(v)){
      let parsed:unknown;try{parsed=JSON.parse(v);}catch{return;}
      walk(parsed,depth+1);
    }
  };walk(value,0);return records;
}
/** Reject structural fiction; JSON alone cannot prove a source came from X. */
export function parseLiveSnapshot(value:unknown,now=new Date()):LiveSnapshot {
  const s=obj(value);ensure(s.schemaVersion===1&&s.mode==='live','requires schemaVersion=1 and mode=live');
  text(s.snapshotId,'snapshotId');ensure(notSynthetic(s.snapshotId),'synthetic snapshot provenance');
  const captured=date(s.capturedAt,'capturedAt');ensure(captured<=now.getTime(),'future capture');
  ensure(Array.isArray(s.rawResults)&&s.rawResults.length>0&&s.rawResults.length<=1000,'rawResults required (max 1000)');
  const raw=new Map<string,{sourceTool:string;records:Record<string,unknown>[]}>();
  for(const value of s.rawResults){const r=obj(value);text(r.id,'rawResult.id');text(r.sourceTool,'rawResult.sourceTool');ensure(notSynthetic(r.id)&&notSynthetic(r.sourceTool),'synthetic raw provenance');ensure(!raw.has(r.id)&&r.result!==undefined&&r.result!==null,'duplicate/empty raw result');raw.set(r.id,{sourceTool:r.sourceTool,records:rawRecords(r.result)});}
  const provenance=(value:unknown,woeid:number):Provenance=>{
    const v=obj(value);ensure(v.origin==='parent-supported-connector','requires parent-supported-connector provenance');
    ensure(v.woeid===woeid&&v.geography===GEO.get(woeid),'provenance geography mismatch');
    const retrieved=date(v.retrievedAt,'retrievedAt');ensure(retrieved<=captured,'retrieval after capture');
    for(const name of ['query','sourceTool','rawResultId'])text(v[name],name);
    ensure(notSynthetic(v.sourceTool as string)&&notSynthetic(v.rawResultId as string),'synthetic source provenance');
    ensure(raw.get(v.rawResultId as string)?.sourceTool===v.sourceTool,'unknown/mismatched rawResult reference');
    return v as unknown as Provenance;
  };
  ensure(Array.isArray(s.geographies)&&s.geographies.length===2,'requires exactly worldwide and US geographies');
  const scopes=new Set<number>();
  for(const value of s.geographies){
    const geo=obj(value);ensure(typeof geo.woeid==='number'&&GEO.has(geo.woeid)&&geo.geography===GEO.get(geo.woeid)&&!scopes.has(geo.woeid),'invalid or duplicate geography');scopes.add(geo.woeid);
    ensure(Array.isArray(geo.topics)&&geo.topics.length>0&&geo.topics.length<=100,'topics required (max 100 per geography)');
    const topics=new Set<string>();
    for(const item of geo.topics){
      const topic=obj(item),trend=obj(topic.trend);text(trend.name,'trend.name');searchUrl(trend.url);
      ensure(!topics.has(trend.url),'duplicate trend URL');topics.add(trend.url);
      if(trend.sourceId!==undefined){text(trend.sourceId,'trend.sourceId');ensure(notSynthetic(trend.sourceId),'synthetic trend ID');}
      const tp=provenance(trend.provenance,geo.woeid);ensure(tp.sourceTool==='x.get_trends_by_woeid','trend requires parent-verified supported trends tool');
      const rawTrend=raw.get(tp.rawResultId)!.records.find(r=>(r.trend_name??r.name)===trend.name&&r.url===trend.url);
      ensure(rawTrend,'trend does not match referenced raw result');
      if(trend.sourceId!==undefined)ensure(String(rawTrend.id)===trend.sourceId,'trend source ID mismatch');
      ensure(Array.isArray(topic.posts)&&topic.posts.length<=100,'posts array required (max 100 per trend)');
      const posts=new Set<string>();
      for(const value of topic.posts){
        const post=obj(value);text(post.id,'post.id');ensure(/^\d{15,20}$/.test(post.id),'requires modern numeric X snowflake ID');
        const id=BigInt(post.id);ensure(id>0n&&id<=18446744073709551615n,'out-of-range post ID');
        // Reject known fixture IDs and IDs inconsistent with actual creation timestamps.
        ensure(!['900000000000000001','900000000000000002','900000000000000003'].includes(post.id),'known fixture ID');
        const created=date(post.createdAt,'createdAt');const snowflakeTime=Number(id>>22n)+1288834974657;
        ensure(Math.abs(snowflakeTime-created)<=60000,'snowflake/time mismatch');
        text(post.url,'post.url');let url:URL;try{url=new URL(post.url);}catch{throw new Error('Invalid live snapshot: post URL');}
        ensure(url.protocol==='https:'&&url.hostname==='x.com'&&!url.username&&!url.password&&!url.search&&!url.hash&&new RegExp(`^/(?:i|[A-Za-z0-9_]+)/status/${post.id}$`).test(url.pathname),'post URL/ID mismatch');
        text(post.text,'post.text');ensure(post.text.length<=100000,'post text too large');
        const pp=provenance(post.provenance,geo.woeid);ensure(created<=Date.parse(pp.retrievedAt),'post created after retrieval');
        ensure(pp.sourceTool==='x.search_posts_all','post requires supported x.search_posts_all provenance');
        const metrics=obj(post.metrics);for(const field of ['likes','reposts','replies','quotes'])ensure(Number.isSafeInteger(metrics[field])&&(metrics[field] as number)>=0,`invalid metric ${field}`);
        const rawPost=raw.get(pp.rawResultId)!.records.find(r=>r.id===post.id);
        ensure(rawPost&&rawPost.text===post.text&&Date.parse(String(rawPost.created_at??rawPost.createdAt))===created,'post fields do not match referenced raw result');
        if(rawPost.url!==undefined)ensure(rawPost.url===post.url,'raw post URL mismatch');
        const publicMetrics=obj(rawPost.public_metrics);
        for(const [field,rawField] of [['likes','like_count'],['reposts','retweet_count'],['replies','reply_count'],['quotes','quote_count']] as const)ensure(metrics[field]===publicMetrics[rawField],`metric ${field} differs from raw result`);
        ensure(!posts.has(post.id),'duplicate post within topic');posts.add(post.id);
      }
    }
  }
  return structuredClone(s) as unknown as LiveSnapshot;
}

export class SnapshotAdapter implements ResearchAdapter {
  readonly source='connector' as const;
  readonly snapshot:LiveSnapshot;
  constructor(input:unknown,readonly woeid:1|23424977,now=new Date()){
    this.snapshot=parseLiveSnapshot(input,now);ensure(GEO.has(woeid),'unsupported geography');
  }
  private topics(){return this.snapshot.geographies.find(g=>g.woeid===this.woeid)!.topics;}
  async trends(request?:TrendRequest):Promise<Trend[]> {
    ensure(!request||request.woeid===this.woeid,'adapter/request geography mismatch');
    return this.topics().map(({trend})=>({id:digest(`${this.woeid}:${trend.url}`),label:trend.name,observedAt:trend.provenance.retrievedAt,sourceUrl:trend.url,...(trend.sourceId?{sourceId:trend.sourceId}:{}),provenance:trend.provenance}));
  }
  async examples(trend:Trend):Promise<Post[]> {
    const topic=this.topics().find(t=>digest(`${this.woeid}:${t.trend.url}`)===trend.id);ensure(topic,'unknown trend');
    // Keep canonical ranking URL separately from the actual source URL preserved in provenance archive.
    return topic.posts.map(p=>({id:p.id,url:`https://x.com/i/status/${p.id}`,text:p.text,createdAt:p.createdAt,...p.metrics,provenance:p.provenance,sourceUrl:p.url}));
  }
}
async function writeOnce(path:string,content:string){
  try{await writeFile(path,content,{flag:'wx',mode:0o600});}
  catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;ensure(await readFile(path,'utf8')===content,'archive path already contains different data');}
}
/** Parent supplies JSON. No live retrieval. Tests may override reviewRoot to a temporary directory. */
export async function ingestLiveSnapshot(input:unknown,options:{now?:Date;reviewRoot?:string;maxAgeHours?:number}={}){
  const now=options.now??new Date(),snapshot=parseLiveSnapshot(input,now),maxAgeHours=options.maxAgeHours??168;
  ensure(Number.isFinite(maxAgeHours)&&maxAgeHours>0&&maxAgeHours<=168,'invalid max age (live maximum 168h)');
  const adapters=([1,23424977] as const).map(w=>new SnapshotAdapter(snapshot,w,now));
  // Both scopes must have evidence before writing any archive or draft state.
  for(const adapter of adapters){
    let eligible=false;
    for(const trend of await adapter.trends()){
      const age=now.getTime()-Date.parse(trend.observedAt);
      if(age<0||age>maxAgeHours*3600000)continue;
      const posts=rankPosts(await adapter.examples(trend),now).filter(p=>now.getTime()-Date.parse(p.createdAt)<=maxAgeHours*3600000);
      if(posts.length)eligible=true;
    }
    ensure(eligible,`no eligible evidence for WOEID ${adapter.woeid}; no drafts written`);
  }
  const content=JSON.stringify(snapshot,null,2)+'\n';
  const contentHash=createHash('sha256').update(content).digest('hex');
  const root=resolve(options.reviewRoot??'.data/reviews');await mkdir(root,{recursive:true});
  const archive=join(root,`live-${contentHash}-snapshot.json`);await writeOnce(archive,content);
  const results=[];
  for(const adapter of adapters){
    const statePath=join(root,`live-${contentHash}-${adapter.woeid}-state.json`),store=new JsonStore(statePath);
    const result=await runOnce(adapter,store,{now,slot:`snapshot:v1:${contentHash}:${adapter.woeid}:${maxAgeHours}`,woeid:adapter.woeid,maxTopics:1,maxAgeHours});
    const state=await store.read();const drafts=state.drafts.filter(d=>result.run.draftIds.includes(d.id));
    ensure(drafts.length===3,'expected exactly 3 drafts per geography');
    results.push({woeid:adapter.woeid,geography:GEO.get(adapter.woeid),statePath,replayed:result.replayed,drafts});
  }
  return {label:'PARENT-PROVIDED LIVE SNAPSHOT — NOT INDEPENDENTLY VERIFIED; PENDING HUMAN REVIEW',archive,contentHash,results};
}
export async function readSnapshotFile(path:string):Promise<unknown>{
  ensure((await stat(path)).size<=20*1024*1024,'snapshot file exceeds 20 MiB');return JSON.parse(await readFile(path,'utf8')) as unknown;
}
