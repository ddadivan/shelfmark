import { AI_SEARCH_STATE } from '@shelfmark/contracts';
import { meaningStatusLine } from './meaning-status-line';

describe('meaningStatusLine', () => {
  const status = (state: (typeof AI_SEARCH_STATE)[keyof typeof AI_SEARCH_STATE]) => ({
    state,
    ready: 840,
    total: 1000,
  });

  it('says nothing while off, unknown, off on the server or unavailable', () => {
    expect(meaningStatusLine(false, status(AI_SEARCH_STATE.Ready), null)).toBeNull();
    expect(meaningStatusLine(true, null, null)).toBeNull();
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Off), null)).toBeNull();
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Unavailable), null)).toBeNull();
  });

  it('counts while processing, says ready, and names the reset day at the limit', () => {
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Processing), null)).toEqual({
      key: 'ai.settings.meaning.progress',
      ready: 840,
      total: 1000,
    });
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Ready), null)).toEqual({
      key: 'ai.settings.meaning.ready',
    });
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Quota), '2026-12-01')).toEqual({
      key: 'ai.settings.meaning.quota',
      date: '2026-12-01',
    });
    expect(meaningStatusLine(true, status(AI_SEARCH_STATE.Quota), null)).toBeNull();
  });
});
