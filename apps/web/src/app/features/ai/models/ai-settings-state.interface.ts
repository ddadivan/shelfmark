import type { AiSettingsResponse } from '@shelfmark/contracts';

/** State of `AiSettingsStore`. */
export interface AiSettingsState {
  /** `GET /api/ai/settings`, with optimistic changes applied; `null` until loaded. */
  response: AiSettingsResponse | null;
  loading: boolean;
  /** The first load failed (a later failure keeps what is known). */
  error: boolean;
}
