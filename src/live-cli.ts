import { readSnapshotFile,ingestLiveSnapshot } from './snapshot.js';
const path=process.argv[2];
if(!path)throw new Error('Usage: node dist/live-cli.js <parent-produced-snapshot.json>');
const result=await ingestLiveSnapshot(await readSnapshotFile(path));
console.log(JSON.stringify(result,null,2));
