import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {parseLiveSnapshot,SnapshotAdapter,ingestLiveSnapshot,readSnapshotFile} from '../dist/snapshot.js';
const exec=promisify(execFile);const now=new Date('2026-11-05T22:05:00Z');
// Every object below is a TEST DOUBLE, not evidence of an actual connector call.
// Only temporary directories are used. Never archive these objects in repository live-* paths.
function sample(){
 const rawResults=[];let serial=1n;
 const geographies=[1,23424977].map(woeid=>{
  const geography=woeid===1?'worldwide':'United States';
  const trendResultId=`trends-${woeid}`;rawResults.push({id:trendResultId,sourceTool:'x.get_trends_by_woeid',result:{data:[]}});
  const topics=['Lower engagement','Higher engagement'].map((name,index)=>{
   const searchResultId=`search-${woeid}-${index}`;rawResults.push({id:searchResultId,sourceTool:'x.search_posts_all',result:{data:[]}});
   const common={origin:'parent-supported-connector',retrievedAt:now.toISOString(),woeid,geography};
   const trend={name,url:`https://x.com/search?q=${encodeURIComponent(name)}`,provenance:{...common,query:JSON.stringify({woeid}),sourceTool:'x.get_trends_by_woeid',rawResultId:trendResultId}};
   const createdAt=woeid===23424977?'2026-10-30T20:19:02Z':'2026-11-05T14:29:22Z';
   const id=(((BigInt(Date.parse(createdAt))-1288834974657n)<<22n)+serial++).toString();
   const posts=[{id,url:`https://x.com/test_user/status/${id}`,text:'TEST-DOUBLE CONTENT: never copy this claim',createdAt,metrics:{likes:index?300:10,reposts:index?50:0,replies:2,quotes:0},provenance:{...common,query:`"${name}" -is:retweet`,sourceTool:'x.search_posts_all',rawResultId:searchResultId,parameters:{start_time:'2026-10-29T22:05:00Z'}}}];
   rawResults.find(r=>r.id===trendResultId).result.data.push({trend_name:name,url:trend.url});
   rawResults.find(r=>r.id===searchResultId).result.data.push({id,text:posts[0].text,created_at:createdAt,public_metrics:{like_count:posts[0].metrics.likes,retweet_count:posts[0].metrics.reposts,reply_count:2,quote_count:0}});
   return {trend,posts};
  });return {woeid,geography,topics};
 });return {schemaVersion:1,mode:'live',snapshotId:'capture-20261105',capturedAt:now.toISOString(),rawResults,geographies};
}
async function temp(t){const dir=await mkdtemp(join(tmpdir(),'launchkit-snapshot-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
test('snapshot normalizes canonical URLs while preserving exact source URL, timestamps, metrics and provenance',async()=>{
 const input=sample(),snapshot=parseLiveSnapshot(input,now);const adapter=new SnapshotAdapter(snapshot,23424977,now);
 const trend=(await adapter.trends({woeid:23424977}))[1],post=(await adapter.examples(trend))[0];
 assert.equal(trend.label,'Higher engagement');assert.equal(trend.provenance.geography,'United States');assert.ok(!trend.sourceId,'no invented source trend ID');
 assert.equal(post.url,`https://x.com/i/status/${post.id}`);assert.equal(post.sourceUrl,`https://x.com/test_user/status/${post.id}`);
 assert.equal(post.createdAt,'2026-10-30T20:19:02Z');assert.equal(post.likes,300);assert.equal(post.provenance.parameters.start_time,'2026-10-29T22:05:00Z');
 await assert.rejects(adapter.trends({woeid:1}),/geography mismatch/);
});
test('weekly ingestion selects one highest-ranked topic per geography, exactly 3 each, without copying post text',async t=>{
 const dir=await temp(t);const input=sample();const result=await ingestLiveSnapshot(input,{now,reviewRoot:dir});
 assert.equal(result.results.length,2);assert.equal(result.results.flatMap(r=>r.drafts).length,6);
 for(const group of result.results){assert.equal(group.drafts.length,3);assert.equal(new Set(group.drafts.map(d=>d.topicId)).size,1);for(const d of group.drafts){assert.equal(d.status,'pending_review');assert.ok(d.text.includes('Higher engagement'));assert.ok(!d.text.includes('never copy'));assert.equal(d.topicProvenance.woeid,group.woeid);assert.ok(d.topicSourceUrl);assert.equal(d.evidence[0].metrics.likes,300);assert.equal(d.evidence[0].provenance.woeid,group.woeid);assert.ok(d.evidence[0].sourceUrl.includes('/test_user/'));assert.ok(d.evidence[0].score>0);}}
 assert.deepEqual(JSON.parse(await readFile(result.archive,'utf8')),input);
 const replay=await ingestLiveSnapshot(input,{now,reviewRoot:dir});assert.ok(replay.results.every(r=>r.replayed));assert.deepEqual(result.results.map(r=>r.drafts),replay.results.map(r=>r.drafts));
 assert.equal((await readdir(dir)).length,3);
});
test('48h override rejects older US evidence before any writes; weekly default accepts it',async t=>{
 const dir=await temp(t);await assert.rejects(ingestLiveSnapshot(sample(),{now,reviewRoot:dir,maxAgeHours:48}),/no eligible evidence/);assert.deepEqual(await readdir(dir),[]);
});
test('different snapshot content receives separate archive identity',async t=>{
 const dir=await temp(t);const a=await ingestLiveSnapshot(sample(),{now,reviewRoot:dir});const changed=sample();changed.snapshotId='capture-revised';const b=await ingestLiveSnapshot(changed,{now,reviewRoot:dir});assert.notEqual(a.archive,b.archive);
});
test('rejects fixture/synthetic declarations, IDs and provenance',()=>{
 for(const mutate of [s=>s.mode='fixture',s=>s.snapshotId='fixture-capture',s=>s.geographies[0].topics[0].posts[0].provenance.origin='fixture',s=>s.rawResults[0].id='synthetic-id',s=>s.geographies[0].topics[0].posts[0].id='900000000000000001',s=>s.geographies[0].topics[0].posts[0].provenance.sourceTool='fake-stream']){const s=sample();mutate(s);assert.throws(()=>parseLiveSnapshot(s,now),/Invalid live snapshot/);}
});
test('rejects malformed IDs, snowflake/time inconsistency, URLs and invalid metrics',()=>{
 for(const change of [{id:'abc'},{id:'18446744073709551616'},{createdAt:'2020-01-01T00:00:00Z'},{url:'https://evil.test/status/1'},{url:'https://x.com/test_user/status/123'},{metrics:{likes:-1,reposts:0,replies:0,quotes:0}},{metrics:{likes:5,reposts:0,replies:0}}]){const s=sample();Object.assign(s.geographies[0].topics[0].posts[0],change);assert.throws(()=>parseLiveSnapshot(s,now),/Invalid live snapshot/);}
});
test('rejects missing raw results, broken provenance references, wrong geography and future timestamps',()=>{
 for(const mutate of [s=>s.rawResults=[],s=>s.geographies[0].topics[0].posts[0].provenance.rawResultId='missing',s=>s.geographies[0].topics[0].trend.provenance.woeid=23424977,s=>s.geographies[0].topics[0].trend.provenance.retrievedAt='2027-01-01T00:00:00Z',s=>s.capturedAt='2027-01-01T00:00:00Z',s=>s.geographies.pop(),s=>s.geographies[1]=s.geographies[0],s=>s.geographies[0].topics[0].trend.provenance.sourceTool='x.unavailable',s=>s.geographies[0].topics[0].posts[0].createdAt='2026-11-05T14:29:22']){const s=sample();mutate(s);assert.throws(()=>parseLiveSnapshot(s,now),/Invalid live snapshot/);}
});
test('duplicate source posts or trend URLs reject rather than silently dropping provenance',()=>{
 for(const kind of ['post','trend']){const s=sample();if(kind==='post')s.geographies[0].topics[0].posts.push(s.geographies[0].topics[0].posts[0]);else s.geographies[0].topics.push(s.geographies[0].topics[0]);assert.throws(()=>parseLiveSnapshot(s,now),/duplicate/);}
});
test('empty evidence in either geography fails with no archive or state',async t=>{const dir=await temp(t);const s=sample();for(const topic of s.geographies[1].topics)topic.posts=[];await assert.rejects(ingestLiveSnapshot(s,{now,reviewRoot:dir}),/no eligible/);assert.deepEqual(await readdir(dir),[]);});
test('live CLI accepts parent-shaped JSON and writes only separate live-* artifacts in a temporary cwd',async t=>{
 const dir=await temp(t),path=join(dir,'input.json');await writeFile(path,JSON.stringify(sample()));assert.ok(await readSnapshotFile(path));
 const result=JSON.parse((await exec(process.execPath,[resolve('dist/live-cli.js'),path],{cwd:dir})).stdout);
 assert.equal(result.results.flatMap(r=>r.drafts).length,6);assert.ok(result.archive.startsWith(join(dir,'.data/reviews/live-')));assert.ok(result.results.every(r=>r.drafts.every(d=>d.status==='pending_review')));
});
test('live CLI refuses missing snapshot, never falls back to fixtures',async()=>{await assert.rejects(exec(process.execPath,['dist/live-cli.js']),/Usage/);});

test('normalized assertions must match retained raw source records and metrics',()=>{
 for(const mutate of [s=>s.geographies[0].topics[0].posts[0].metrics.likes=900,s=>s.geographies[0].topics[0].posts[0].text='invented text',s=>s.geographies[0].topics[0].trend.name='invented trend',s=>s.rawResults[1].result.data=[]]){const s=sample();mutate(s);assert.throws(()=>parseLiveSnapshot(s,now),/match|differs/);}
});
test('MCP JSON text wrappers normalize, but explicitly synthetic raw result flags reject',()=>{
 const s=sample();s.rawResults=s.rawResults.map(r=>({...r,result:{content:[{type:'text',text:JSON.stringify(r.result)}]}}));assert.ok(parseLiveSnapshot(s,now));
 s.rawResults[0].result.synthetic=true;assert.throws(()=>parseLiveSnapshot(s,now),/synthetic/);
});
