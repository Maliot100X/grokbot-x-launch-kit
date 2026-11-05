/** WOEID geographic selectors for the sanctioned x.get_trends_by_woeid tool. */
export const UNITED_STATES_WOEID = 23424977;
export const WORLDWIDE_WOEID = 1;
export const DEFAULT_WOEID = UNITED_STATES_WOEID;
export interface TrendRequest { woeid: number; }
export function validateWoeid(woeid:number):void {
  if (!Number.isSafeInteger(woeid)||woeid<1) throw new Error('Invalid WOEID');
}
