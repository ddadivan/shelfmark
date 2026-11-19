import type { AskActivity } from '@shelfmark/contracts';

/** What Ask is doing right now (the status pill under the spark); never the tool or its words. */
export interface AskEntryActivity {
  readonly activity: AskActivity;
}
