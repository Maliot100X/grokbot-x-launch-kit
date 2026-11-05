import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const exec=promisify(execFile);
test('CLI clearly labels fixture provenance and persists idempotent evidence-linked drafts',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'launchkit-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));const path=join(dir,'state.json');
 const first=JSON.parse((await exec(process.execPath,['dist/cli.js',path])).stdout);
 assert.match(first.label,/SYNTHETIC FIXTURE/);assert.match(first.label,/NOT LIVE/);assert.equal(first.replayed,false);assert.equal(first.topics,2);assert.equal(first.draftCount,6);
 for(const d of first.drafts){assert.equal(d.source,'fixture');assert.ok(d.evidence.every(e=>e.url===`https://x.com/i/status/${e.postId}`));}
 const second=JSON.parse((await exec(process.execPath,['dist/cli.js',path])).stdout);assert.equal(second.replayed,true);assert.deepEqual(first.drafts,second.drafts);
});
