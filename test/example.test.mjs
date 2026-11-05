import test from 'node:test';import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const exec=promisify(execFile);
test('example CLI ingests fictional snapshot: 3 drafts per topic, deterministic replay, labelled example data',async()=>{
 const out=JSON.parse((await exec(process.execPath,['dist/example-cli.js'])).stdout);
 assert.match(out.label,/EXAMPLE DATA/);assert.equal(out.geographies.length,2);
 for(const g of out.geographies){assert.equal(g.draftCount,3);for(const d of g.drafts)assert.equal(d.status,'pending_review');}
 assert.equal(out.replayed,true);assert.equal(out.deterministicReplay,true);
});
