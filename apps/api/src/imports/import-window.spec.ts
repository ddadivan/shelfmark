import { isImportOpen, isImportUndoable, undoCutoff } from './import-window';

const NOW = new Date('2026-11-19T12:00:00Z');
const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * 3_600_000);

describe('import window', () => {
  it('takes batches for 24 hours and never after Undo', () => {
    expect(isImportOpen({ createdAt: hoursAgo(23), undoneAt: null }, NOW)).toBe(true);
    expect(isImportOpen({ createdAt: hoursAgo(25), undoneAt: null }, NOW)).toBe(false);
    expect(isImportOpen({ createdAt: hoursAgo(1), undoneAt: NOW }, NOW)).toBe(false);
  });

  it('can be undone for 7 days, once', () => {
    expect(isImportUndoable({ createdAt: hoursAgo(24 * 6), undoneAt: null }, NOW)).toBe(true);
    expect(isImportUndoable({ createdAt: hoursAgo(24 * 8), undoneAt: null }, NOW)).toBe(false);
    expect(isImportUndoable({ createdAt: hoursAgo(1), undoneAt: NOW }, NOW)).toBe(false);
  });

  it('lists from seven days back', () => {
    expect(undoCutoff(NOW).toISOString()).toBe('2026-11-12T12:00:00.000Z');
  });
});
