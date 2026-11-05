import { resolve } from 'node:path';
import { FixtureAdapter,FIXTURE_NOW } from './fixtures.js';
import { JsonStore } from './store.js';
import { runOnce } from './pipeline.js';
import { monitoredResearchAdapter } from './monitoring.js';
const store=new JsonStore(resolve(process.argv[2]??'.data/fixture-state.json'));
const result=await runOnce(monitoredResearchAdapter(new FixtureAdapter(),store,{maxAttempts:3,baseMs:100,capMs:1000},async()=>{throw new Error('Fixture demo must never wait/retry');},()=>FIXTURE_NOW),store,{now:FIXTURE_NOW,slot:'example:fixture:v1:2026-11-05T12'});
const state=await store.read();
console.log(JSON.stringify({label:'SYNTHETIC FIXTURE DATA — NOT LIVE X RESEARCH; URLs are unverified placeholders',store:store.path,replayed:result.replayed,topics:new Set(state.drafts.filter(d=>result.run.draftIds.includes(d.id)).map(d=>d.topicId)).size,draftCount:result.run.draftIds.length,drafts:state.drafts.filter(d=>result.run.draftIds.includes(d.id))},null,2));
