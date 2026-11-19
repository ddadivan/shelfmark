import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { VIEW_DRAFT_OUTCOME, type ViewDraftResponse } from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiData } from './mock-ai-data';
import { MockAiViewDraft, mockViewPhrase } from './mock-ai-view-draft';
import { MOCK_VIEW_DRAFT_MS } from './models/mock-view-draft-ms.const';

function setup(enabled = true) {
  localStorage.clear();
  if (enabled) {
    localStorage.setItem('sm-mock-ai', JSON.stringify({ settings: { enabled: true } }));
  }
  const injector = Injector.create({ providers: [MockLibraryData, MockAiData, MockAiViewDraft] });
  return runInInjectionContext(injector, () => ({
    api: injector.get(MockAiViewDraft),
    data: injector.get(MockAiData),
  }));
}

async function answer(source: Observable<ViewDraftResponse>): Promise<ViewDraftResponse> {
  const result = firstValueFrom(source);
  await vi.advanceTimersByTimeAsync(MOCK_VIEW_DRAFT_MS);
  return result;
}

async function status(source: Observable<unknown>): Promise<number> {
  const result = firstValueFrom(source).then(
    () => 0,
    (error: unknown) => (error instanceof HttpErrorResponse ? error.status : -1),
  );
  await vi.advanceTimersByTimeAsync(MOCK_VIEW_DRAFT_MS);
  return result;
}

describe('MockAiViewDraft', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('collapses white space and control characters like the API', () => {
    expect(mockViewPhrase('  a\u0000  b \n c ')).toBe('a b c');
  });

  it('drafts a view from the phrase and counts one question', async () => {
    const { api, data } = setup();
    const before = data.askAllowance().questionsLeft;
    const response = await answer(api.draft('videos, newest first'));
    expect(response.outcome).toBe(VIEW_DRAFT_OUTCOME.Done);
    expect(response.draft?.query.kind).toBe('video');
    expect(response.draft?.set).toContain('kind');
    expect(response.allowance.questionsLeft).toBe(before - 1);
  });

  it('answers quota and unavailable for the markers without counting', async () => {
    const { api, data } = setup();
    const before = data.askAllowance().questionsLeft;
    const quota = await answer(api.draft('something ai-quota'));
    expect(quota.outcome).toBe(VIEW_DRAFT_OUTCOME.Quota);
    expect(quota.allowance.questionsLeft).toBe(0);
    const failed = await answer(api.draft('something ai-fail'));
    expect(failed.outcome).toBe(VIEW_DRAFT_OUTCOME.Unavailable);
    expect(failed.draft).toBeNull();
    expect(data.askAllowance().questionsLeft).toBe(before);
  });

  it('answers 400 for a bad phrase and 409 while AI is off', async () => {
    expect(await status(setup().api.draft('ab'))).toBe(400);
    expect(await status(setup(false).api.draft('videos please'))).toBe(409);
  });
});
