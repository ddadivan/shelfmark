import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from './storage-key.const';
import { STORAGE_KEY_SCOPE } from './storage-key-scope.const';
import { USER_STORAGE_KEYS } from './user-storage-keys.const';

describe('STORAGE_KEY registry', () => {
  it('has a scope for every key and no scope without a key', () => {
    expect(Object.keys(STORAGE_KEY_SCOPE).sort()).toEqual(Object.keys(STORAGE_KEY).sort());
  });

  it('has no duplicate key strings', () => {
    const values = Object.values(STORAGE_KEY);
    expect(new Set(values).size).toBe(values.length);
  });

  it('derives the per-user list from the user scope', () => {
    expect([...USER_STORAGE_KEYS].sort()).toEqual(
      [
        'sm-emoji-recent',
        'sm-recent-folders',
        'sm-reminders-seen',
        'sm-session-hint',
        'sm-extension-banner-dismissed',
        'sm-backfill-reminder-dismissed',
        'sm-last-export',
        'sm-recent-searches',
        'sm-notifications-push-device',
        'sm-tidy-entry',
        'sm-folder-shape',
        'sm-connected-accounts',
      ].sort(),
    );
  });
});
