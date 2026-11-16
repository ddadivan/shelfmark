import type { ChangelogRelease } from '../models/changelog-release.interface';
import { previewDraft } from './preview-draft';

describe('previewDraft', () => {
  it('dates only the draft and keeps the shipped releases as they are', () => {
    const releases: ChangelogRelease[] = [
      { version: '2.1.0', date: null, items: [] },
      { version: '2.0.0', date: '2026-11-14', items: [] },
    ];

    expect(previewDraft(releases, '2026-11-17')).toEqual([
      { version: '2.1.0', date: '2026-11-17', items: [] },
      { version: '2.0.0', date: '2026-11-14', items: [] },
    ]);
  });
});
