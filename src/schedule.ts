import type { ResearchAdapter } from './adapters.js';
import type { JsonStore } from './store.js';
import { runOnce } from './pipeline.js';
/** Computes a UTC bucket only. No OS scheduler, timer, routine, or background process. */
export function scheduledSlot(project:string,configVersion:string,now:Date,intervalMinutes=60):string {
  if (!/^[a-z0-9_-]+$/i.test(project)||!/^[a-z0-9_-]+$/i.test(configVersion)||!Number.isFinite(now.getTime())||!Number.isSafeInteger(intervalMinutes)||intervalMinutes<1||intervalMinutes>10080) throw new Error('Invalid schedule configuration');
  const bucket=Math.floor(now.getTime()/(intervalMinutes*60000));
  return `${project}:${configVersion}:${intervalMinutes}:${bucket}`;
}
export function runScheduledOnce(adapter:ResearchAdapter,store:JsonStore,now:Date,project:string,configVersion:string,intervalMinutes=60){
  return runOnce(adapter,store,{now,slot:scheduledSlot(project,configVersion,now,intervalMinutes)});
}
