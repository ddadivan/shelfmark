import { DEMO_LIMIT } from '../demo/demo-limit.const';
import { LINK_LIMIT } from './link-limit.const';

/** The most links one account may hold (Trash counts): demo sandboxes are capped far lower. */
export function linkCapFor(isDemo: boolean): number {
  return isDemo ? DEMO_LIMIT.MaxLinks : LINK_LIMIT.PerUserMax;
}
