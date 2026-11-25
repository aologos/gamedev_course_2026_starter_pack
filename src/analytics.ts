import { version } from '../package.json';

type Params = Record<string, string | number | boolean>;
type Metrika = (id: number, method: 'reachGoal', goal: string, params: Params) => void;

const COUNTER_ID = 114657868;

export function track(event: string, params: Params = {}): void {
  const data = { ...params, game_version: version };
  if (import.meta.env.DEV) console.log('[analytics]', event, data);

  const ym = (window as Window & { ym?: Metrika }).ym;
  if (typeof ym !== 'function') return;

  try {
    ym(COUNTER_ID, 'reachGoal', event, data);
  } catch (error) {
    console.warn('Analytics error', error);
  }
}
