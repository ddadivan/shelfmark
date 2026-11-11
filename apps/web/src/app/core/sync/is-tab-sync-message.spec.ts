import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { isTabSyncMessage } from './is-tab-sync-message';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';

describe('isTabSyncMessage', () => {
  it('accepts every known kind with its payload', () => {
    const link = MOCK_LINKS[0];
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkSaved, link, userId: 'u' })).toBe(true);
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkChanged, link, userId: 'u' })).toBe(true);
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkRemoved, id: 'l', userId: 'u' })).toBe(true);
    for (const kind of [
      TAB_SYNC_KIND.LibraryChanged,
      TAB_SYNC_KIND.SignedOut,
      TAB_SYNC_KIND.SignedIn,
    ]) {
      expect(isTabSyncMessage({ kind, userId: 'u' })).toBe(true);
    }
  });

  it('rejects unknown kinds, a missing user and broken payloads', () => {
    expect(isTabSyncMessage(null)).toBe(false);
    expect(isTabSyncMessage('signed-out')).toBe(false);
    expect(isTabSyncMessage({ kind: 'reboot', userId: 'u' })).toBe(false);
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.SignedOut })).toBe(false);
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkSaved, userId: 'u' })).toBe(false);
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkSaved, link: { id: 1 }, userId: 'u' })).toBe(
      false,
    );
    expect(isTabSyncMessage({ kind: TAB_SYNC_KIND.LinkRemoved, id: 3, userId: 'u' })).toBe(false);
  });
});
