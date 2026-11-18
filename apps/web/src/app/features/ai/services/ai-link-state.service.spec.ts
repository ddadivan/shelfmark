import { TestBed } from '@angular/core/testing';
import {
  AI_APPLIED_PART,
  AI_JOB_STATUS,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
  type LinkAiState,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../testing/fake-ai-api';
import { AI_API } from '../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AiLinkStateService } from './ai-link-state.service';
import { AiSettingsStore } from './ai-settings.store';

const STATE: LinkAiState = {
  aiStatus: AI_JOB_STATUS.Done,
  reason: null,
  summary: 'A summary.',
  summarySource: SUMMARY_SOURCE.Ai,
  suggestions: [
    {
      id: 's-open',
      kind: SUGGESTION_KIND.Tag,
      state: SUGGESTION_STATE.Suggested,
      tagName: 'signals',
      folderId: null,
    },
    {
      id: 's-auto',
      kind: SUGGESTION_KIND.Folder,
      state: SUGGESTION_STATE.AutoApplied,
      tagName: null,
      folderId: 'f1',
    },
  ],
  autoApplied: { folderId: 'f1', tags: ['angular'] },
};

async function setup(api: FakeAiApi = fakeAiApi()) {
  TestBed.configureTestingModule({
    providers: [{ provide: AI_API, useValue: api }, AiLinkStateService],
  });
  await TestBed.inject(AiSettingsStore).load();
  return { api, service: TestBed.inject(AiLinkStateService) };
}

describe('AiLinkStateService', () => {
  it('loads once while AI is on and lists only the open suggestions', async () => {
    const api = fakeAiApi();
    api.getLinkAi.mockReturnValue(of(STATE));
    const { service } = await setup(api);
    await service.load('l1');
    await service.load('l1');
    expect(api.getLinkAi).toHaveBeenCalledTimes(1);
    expect(service.suggestions().map((item) => item.id)).toEqual(['s-open']);
    expect(service.autoApplied()).toEqual({ folderId: 'f1', tags: ['angular'] });
  });

  it('asks nothing while AI is off, and shows nothing when the request fails', async () => {
    const off = fakeAiApi(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } }));
    const { service } = await setup(off);
    await service.load('l1');
    expect(off.getLinkAi).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const failing = fakeAiApi();
    failing.getLinkAi.mockReturnValue(throwError(() => new Error('down')));
    const second = await setup(failing);
    await second.service.load('l1');
    expect(second.service.state()).toBeNull();
  });

  it('dismisses at once and tells the server', async () => {
    const api = fakeAiApi();
    api.getLinkAi.mockReturnValue(of(STATE));
    const { service } = await setup(api);
    await service.load('l1');
    service.dismiss('s-open');
    expect(service.suggestions()).toEqual([]);
    expect(api.dismissSuggestion).toHaveBeenCalledWith('s-open');
  });

  it('undoes one part and keeps the other mark', async () => {
    const api = fakeAiApi();
    api.getLinkAi.mockReturnValue(of(STATE));
    api.undoApply.mockReturnValue(of({ ...MOCK_LINKS[0], folderId: null }));
    const { service } = await setup(api);
    await service.load('l1');
    const link = await service.undo('l1', AI_APPLIED_PART.Folder);
    expect(link?.folderId).toBeNull();
    expect(api.undoApply).toHaveBeenCalledWith('l1', { part: AI_APPLIED_PART.Folder });
    expect(service.autoApplied()).toEqual({ folderId: null, tags: ['angular'] });
    await service.undo('l1', AI_APPLIED_PART.Tags);
    expect(service.autoApplied()).toBeNull();

    api.undoApply.mockReturnValue(throwError(() => new Error('gone')));
    expect(await service.undo('l1', AI_APPLIED_PART.Tags)).toBeNull();
  });

  it('rewrites the summary and reports a refusal as null', async () => {
    const api = fakeAiApi();
    const rewritten: LinkAiState = { ...STATE, summary: 'A new one.' };
    api.rewriteSummary.mockReturnValueOnce(of(rewritten));
    const { service } = await setup(api);
    expect(await service.rewrite('l1')).toEqual(rewritten);
    expect(service.state()?.summary).toBe('A new one.');
    expect(service.rewriting()).toBe(false);
    api.rewriteSummary.mockReturnValueOnce(throwError(() => new Error('409')));
    expect(await service.rewrite('l1')).toBeNull();
  });
});
