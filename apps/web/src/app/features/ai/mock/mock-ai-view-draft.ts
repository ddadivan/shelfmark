import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  AI_ERROR_MESSAGE,
  ASK_PERIOD,
  parseViewDraftOutput,
  planMockViewDraft,
  VIEW_DRAFT_LIMIT,
  VIEW_DRAFT_OUTCOME,
  type ViewDraftResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiData } from './mock-ai-data';
import { nextUtcDayStart } from './mock-ask-allowance';
import { mockViewVocabulary } from './mock-view-vocabulary';
import { MOCK_AI_URL_MARKER } from './models/mock-ai-url-marker.const';
import { MOCK_VIEW_DRAFT_MS } from './models/mock-view-draft-ms.const';

/** The phrase as the API reads it: control characters become spaces, white space is collapsed. */
export function mockViewPhrase(phrase: string): string {
  return [...phrase]
    .map((char) => (char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f ? ' ' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * `POST /api/ai/view-draft` over the mock library (mock builds only), in the API's order: a bad
 * phrase is a 400, AI off a 409, then `quota` (the allowance is shared with Ask), then the draft
 * from `planMockViewDraft` narrowed by `parseViewDraftOutput`, exactly as the API's mock provider.
 * A phrase with `ai-quota` answers `quota`, one with `ai-fail` answers `unavailable` (not counted).
 */
@Service()
export class MockAiViewDraft {
  private readonly data = inject(MockAiData);
  private readonly library = inject(MockLibraryData);

  draft(phrase: string): Observable<ViewDraftResponse> {
    return defer(() => this.answer(mockViewPhrase(phrase))).pipe(delay(MOCK_VIEW_DRAFT_MS));
  }

  private answer(phrase: string): Observable<ViewDraftResponse> {
    if (phrase.length < VIEW_DRAFT_LIMIT.PhraseMin || phrase.length > VIEW_DRAFT_LIMIT.PhraseMax) {
      return throwError(() => mockHttpError(HttpStatusCode.BadRequest, ['phrase is invalid']));
    }
    const { settings } = this.data;
    if (!settings.enabled) {
      return throwError(() => mockHttpError(HttpStatusCode.Conflict, AI_ERROR_MESSAGE.AiOff));
    }
    const lower = phrase.toLowerCase();
    if (lower.includes(MOCK_AI_URL_MARKER.Quota)) {
      return of({
        outcome: VIEW_DRAFT_OUTCOME.Quota,
        draft: null,
        allowance: {
          questionsLeft: 0,
          period: ASK_PERIOD.Day,
          resetsOn: nextUtcDayStart(Date.now()),
        },
      });
    }
    if (this.data.askAllowance().questionsLeft === 0) {
      return of({
        outcome: VIEW_DRAFT_OUTCOME.Quota,
        draft: null,
        allowance: this.data.askAllowance(),
      });
    }
    const draft = lower.includes(MOCK_AI_URL_MARKER.Fail)
      ? null
      : parseViewDraftOutput(
          planMockViewDraft(phrase, this.vocabulary()),
          this.vocabulary(),
          phrase,
        );
    if (draft === null) {
      // Not counted, like a failed provider call.
      return of({
        outcome: VIEW_DRAFT_OUTCOME.Unavailable,
        draft: null,
        allowance: this.data.askAllowance(),
      });
    }
    this.data.countQuestion(1);
    return of({
      outcome: VIEW_DRAFT_OUTCOME.Done,
      draft,
      allowance: this.data.askAllowance(),
    });
  }

  private vocabulary() {
    return mockViewVocabulary(this.library.foldersView(), this.library.tagsView());
  }
}
