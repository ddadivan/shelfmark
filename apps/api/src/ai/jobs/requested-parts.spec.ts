import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { requestedParts, toAiParts } from './requested-parts';

const ON = { ...AI_SETTINGS_DEFAULT, enabled: true };
const OPEN = { folderSet: false, tagsSet: false };

describe('requestedParts', () => {
  it('asks for every part the settings and the link leave open', () => {
    expect(requestedParts(ON, OPEN)).toEqual(['tags', 'folder', 'summary']);
  });

  it('never asks for a part the save filled', () => {
    expect(requestedParts(ON, { folderSet: true, tagsSet: false })).toEqual(['tags', 'summary']);
    expect(requestedParts(ON, { folderSet: false, tagsSet: true })).toEqual(['folder', 'summary']);
  });

  it('leaves the summary out when the save declined it', () => {
    expect(requestedParts(ON, { ...OPEN, summaryDeclined: true })).toEqual(['tags', 'folder']);
    expect(requestedParts(ON, { ...OPEN, summaryDeclined: false })).toEqual([
      'tags',
      'folder',
      'summary',
    ]);
  });

  it('never asks for a part that is off', () => {
    expect(requestedParts({ ...ON, tagsMode: 'off', folderMode: 'auto' }, OPEN)).toEqual([
      'folder',
      'summary',
    ]);
    expect(
      requestedParts({ ...ON, tagsMode: 'off', folderMode: 'off', summaries: false }, OPEN),
    ).toEqual([]);
  });

  it('narrows stored names', () => {
    expect(toAiParts(['summary', 'kind', 'tags'])).toEqual(['summary', 'tags']);
  });
});
