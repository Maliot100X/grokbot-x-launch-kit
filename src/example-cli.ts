import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readSnapshotFile, ingestLiveSnapshot } from './snapshot.js';
/**
 * Offline demo: ingests the FICTIONAL example snapshot into a temporary directory.
 * The example uses the live snapshot schema only so the real validator runs; it is not live data.
 * No network calls, no publishing, no messaging.
 */
const path = resolve(process.argv[2] ?? 'docs/examples/snapshot.example.json');
const now = new Date('2026-01-15T19:00:00Z');
const dir = await mkdtemp(join(tmpdir(), 'launchkit-example-'));
try {
  const input = await readSnapshotFile(path);
  const first = await ingestLiveSnapshot(input, { now, reviewRoot: dir });
  const replay = await ingestLiveSnapshot(input, { now, reviewRoot: dir });
  const ids = (r: typeof first) => r.results.flatMap(g => g.drafts.map(d => d.id));
  console.log(JSON.stringify({
    label: 'EXAMPLE DATA — FICTIONAL SNAPSHOT, NOT LIVE X RESEARCH. Drafts are pending human review; nothing is posted.',
    geographies: first.results.map(g => ({ geography: g.geography, draftCount: g.drafts.length, drafts: g.drafts.map(d => ({ id: d.id, variant: d.variant, status: d.status, text: d.text, evidence: d.evidence.length })) })),
    replayed: replay.results.every(g => g.replayed),
    deterministicReplay: JSON.stringify(ids(first)) === JSON.stringify(ids(replay)),
  }, null, 2));
} finally { await rm(dir, { recursive: true, force: true }); }
