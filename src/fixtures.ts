import type { ResearchAdapter } from './adapters.js';
import type { Post } from './model.js';
export const FIXTURE_NOW=new Date('2026-11-05T12:00:00Z');
const post=(id:string,likes:number,reposts:number):Post=>({id,url:`https://x.com/i/status/${id}`,text:'SYNTHETIC FIXTURE ONLY - not a real post',createdAt:'2026-11-05T11:00:00Z',likes,reposts,replies:4,quotes:2});
/** IDs/URLs are synthetic placeholders, NOT verified links or live evidence. */
export class FixtureAdapter implements ResearchAdapter {
  readonly source='fixture' as const;
  async trends(){return [
    {id:'agents',label:'Agent reliability',observedAt:FIXTURE_NOW.toISOString()},
    {id:'builders',label:'Builder workflows',observedAt:FIXTURE_NOW.toISOString()}
  ];}
  async examples(trend:{id:string}){return trend.id==='agents'?[post('900000000000000001',120,30),post('900000000000000002',50,12)]:[post('900000000000000003',40,10)];}
}
