import {
  LANGUAGE_SETTINGS_DEFAULT,
  isLanguageSettings,
  type LanguageSettings,
} from '@shelfmark/contracts';
import { MOCK_LANGUAGE_STORAGE_KEY } from '../models/mock-language-storage-key.const';

/**
 * The mock account's Settings › Language from `localStorage` (mock builds only) and whether it was
 * ever saved (like the account's `language_saved_at`): only a write stores it.
 */
export function readMockLanguageSettings(storage: Storage | undefined): {
  settings: LanguageSettings;
  saved: boolean;
} {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(MOCK_LANGUAGE_STORAGE_KEY) ?? 'null');
    if (isLanguageSettings(parsed)) {
      return { settings: { ...parsed }, saved: true };
    }
  } catch {
    // Missing, blocked or broken storage: the defaults below.
  }
  return { settings: { ...LANGUAGE_SETTINGS_DEFAULT }, saved: false };
}

/** Stores the mock account's Settings › Language; a blocked storage keeps nothing. */
export function writeMockLanguageSettings(
  storage: Storage | undefined,
  settings: LanguageSettings,
): void {
  try {
    storage?.setItem(MOCK_LANGUAGE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}
