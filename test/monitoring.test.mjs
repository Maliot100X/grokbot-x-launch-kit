import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {JsonStore} from '../dist/store.js';
import {withRetry,backoff,ConnectorFailure,earliestAllowed,verifiedWebhook,monitoredResearchAdapter} from '../dist/monitoring.js';
import {prepareEncryptedChatDraft} from '../dist/chat.js';
const now=new Date('2026-11-05T12:00:00Z');const policy={maxAttempts:3,baseMs:100,capMs:150};
async function setup(t){const d=await mkdtemp(join(tmpdir(),'claw-monitor-'));t.after(()=>rm(d,{recursive:true,force:true}));return new JsonStore(join(d,'state.json'));}
test('capped exponential backoff honors rate-limit retry-after even above cap',()=>{assert.equal(backoff(1,policy),100);assert.equal(backoff(3,policy),150);assert.equal(backoff(1,policy,5000),5000);});
test('transient failures retry a bounded task then succeed, no real waits',async t=>{
 const store=await setup(t);let attempts=0;const waits=[];
 const result=await withRetry('trends',async()=>{if(++attempts<3)throw new ConnectorFailure('temporary','transient');return 42;},store,policy,async ms=>{waits.push(ms);},()=>now);
 assert.equal(result,42);assert.deepEqual(waits,[100,150]);assert.equal((await store.read()).dlq.length,0);
});
test('rate-limit delay is honored and exhausted retry goes to persistent redacted DLQ',async t=>{
 const store=await setup(t);const waits=[];await assert.rejects(withRetry('examples',async()=>{throw new ConnectorFailure('DO NOT PERSIST THIS','rate_limit',2000);},store,policy,async ms=>{waits.push(ms);},()=>now));
 assert.deepEqual(waits,[2000,2000]);const s=await store.read();assert.equal(s.dlq[0].attempts,3);assert.equal(s.dlq[0].reason,'rate_limit');assert.ok(!JSON.stringify(s).includes('DO NOT'));assert.equal(s.audit[0].action,'operation:dead_letter');
});
test('permanent and unknown failures fail fast without waiting',async t=>{
 const store=await setup(t);let calls=0;
 for(const error of [new ConnectorFailure('bad','permanent'),Error('unknown')])await assert.rejects(withRetry('safe-operation',async()=>{calls++;throw error;},store,policy,async()=>{assert.fail('unexpected delay');},()=>now));
 assert.equal(calls,2);assert.equal((await store.read()).dlq.length,2);
});
test('invalid retry policy rejects without a task call',async t=>{const store=await setup(t);await assert.rejects(withRetry('test',async()=>assert.fail(),store,{...policy,maxAttempts:0},async()=>{},()=>now),/Invalid/);});
test('rate-limit gate computes reset eligibility without polling',()=>{
 const resetAt=new Date(now.getTime()+5000);assert.equal(earliestAllowed({remaining:0,resetAt},now),resetAt);assert.equal(earliestAllowed({remaining:1,resetAt},now),now);assert.throws(()=>earliestAllowed({remaining:-1,resetAt},now),/Invalid/);
});
test('webhooks reject missing/failed verification and preserve original bytes on success',async()=>{
 const raw=new Uint8Array([0,42,255]);let calls=0;const accept=async bytes=>{assert.equal(bytes,raw);calls++;};
 await assert.rejects(verifiedWebhook(raw,{},now,undefined,accept),/unverified/);
 await assert.rejects(verifiedWebhook(raw,{},now,{verify:async()=>false},accept),/unverified/);assert.equal(calls,0);
 await verifiedWebhook(raw,{},now,{verify:async(bytes,headers,at)=>bytes===raw&&at===now},accept);assert.equal(calls,1);
});
test('Chat fails closed with absent encryption or invalid envelope, storing no plaintext',async()=>{
 const saved=[];const sink={put:async d=>{saved.push(d);}};
 await assert.rejects(prepareEncryptedChatDraft('id','private text',undefined,sink),/unavailable/);
 await assert.rejects(prepareEncryptedChatDraft('id','private text',{seal:async()=>({})},sink),/Invalid/);assert.equal(saved.length,0);
});
test('Chat sealing contract passes associated draft context and persists envelope only (test double, not crypto)',async()=>{
 const saved=[];const sealer={seal:async(text,context)=>{assert.equal(text,'private text');assert.equal(context.draftId,'id');return {version:1,algorithm:'external-aead',ciphertext:'TEST-DOUBLE-NOT-CRYPTO',nonce:'test-only',keyRef:'external-ref'};}};
 await prepareEncryptedChatDraft('id','private text',sealer,{put:async d=>{saved.push(d);}});
 assert.equal(saved[0].status,'encrypted_pending_review');assert.ok(!JSON.stringify(saved).includes('private text'));
});

test('monitored research adapter retries ingestion and supports the full draft pipeline',async t=>{
 const {runOnce}=await import('../dist/pipeline.js');const {FixtureAdapter}=await import('../dist/fixtures.js');
 const store=await setup(t);const fixture=new FixtureAdapter();let calls=0;const trends=fixture.trends.bind(fixture);
 fixture.trends=async()=>{if(++calls===1)throw new ConnectorFailure('temporary','transient');return trends();};
 const waits=[];const adapter=monitoredResearchAdapter(fixture,store,policy,async ms=>{waits.push(ms);},()=>now);
 await runOnce(adapter,store,{now,slot:'integration'});assert.equal((await store.read()).drafts.length,6);assert.deepEqual(waits,[100]);assert.equal(calls,2);
});

test('monitoring wrapper preserves WOEID request parameters',async t=>{
 const store=await setup(t);let captured;
 const adapter=monitoredResearchAdapter({source:'fixture',trends:async request=>{captured=request;return [];},examples:async()=>[]},store,policy,async()=>{},()=>now);
 await adapter.trends({woeid:23424977});assert.deepEqual(captured,{woeid:23424977});
});
