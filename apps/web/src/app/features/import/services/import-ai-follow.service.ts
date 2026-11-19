import { inject, Injector, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { IMPORT_AI_STATE, type ImportAiSummary } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { IMPORT_AI_POLL } from '../models/import-ai-poll.const';
import { IMPORT_API } from '../models/import-api.const';
import { TIDY_IMPORT_PARAM } from '../models/tidy-import-param.const';

/** How long a toast with the Tidy action stays. */
const TOAST_MS = 12_000;

/**
 * After an import that asked for the AI pass (ADR 0056 decision 9): reads `GET /api/imports/:id`
 * gently until the pass is done or skipped (or `IMPORT_AI_POLL.MaxMs` passed, or the session
 * ended) and says in a toast that descriptions and tags are ready, with a way to the Tidy review of
 * this import. The pass itself is driven by `AiTickService` while the backfill runs, so the AI
 * settings are read again first to let it start. One watch per import.
 */
@Service()
export class ImportAiFollowService {
  private readonly injector = inject(Injector);
  private readonly watching = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    inject(SessionScope).onEnd(() => this.stopAll());
  }

  /** Starts following the import's AI pass. */
  watch(importId: string): void {
    if (this.watching.has(importId)) return;
    void this.injector.get(AiSettingsStore).refresh();
    this.schedule(importId, IMPORT_AI_POLL.FirstMs, Date.now() + IMPORT_AI_POLL.MaxMs);
  }

  private schedule(importId: string, delay: number, until: number): void {
    this.watching.set(
      importId,
      setTimeout(() => void this.poll(importId, until), delay),
    );
  }

  private async poll(importId: string, until: number): Promise<void> {
    let ai: ImportAiSummary | null = null;
    let failed = false;
    try {
      ai = (await firstValueFrom(this.injector.get(IMPORT_API).get(importId))).ai;
    } catch {
      // A failed read is tried again at the next beat.
      failed = true;
    }
    if (!this.watching.has(importId)) return;
    if (!failed && ai === null) {
      // The import has no AI pass (it did not ask, or was undone): nothing to wait for.
      this.watching.delete(importId);
    } else if (ai !== null && ai.state === IMPORT_AI_STATE.Done) {
      this.watching.delete(importId);
      void this.injector.get(AiSettingsStore).refresh();
      this.announce(importId, ai);
    } else if (ai !== null && ai.state === IMPORT_AI_STATE.Skipped) {
      this.watching.delete(importId);
    } else if (Date.now() + IMPORT_AI_POLL.EveryMs > until) {
      this.watching.delete(importId);
    } else {
      this.schedule(importId, IMPORT_AI_POLL.EveryMs, until);
    }
  }

  private announce(importId: string, ai: ImportAiSummary): void {
    const transloco = this.injector.get(TranslocoService);
    const locale = this.injector.get(LocaleService);
    const text = (base: string, count: number) =>
      transloco.translate(pluralKey(base, count), { count: locale.formatNumber(count) });
    const detail = [text('import.ai.summaries', ai.summaries)];
    if (ai.suggestions > 0) detail.push(text('import.ai.suggestions', ai.suggestions));
    this.injector.get(ToastService).show({
      kind: TOAST_KIND.Success,
      title: transloco.translate('import.ai.doneTitle'),
      detail: detail.join(' '),
      duration: TOAST_MS,
      ...(ai.suggestions > 0 && {
        action: {
          label: transloco.translate('import.ai.review'),
          run: () => {
            void this.injector
              .get(Router)
              .navigate(['/', APP_PATH.Tidy], { queryParams: { [TIDY_IMPORT_PARAM]: importId } });
          },
        },
      }),
    });
  }

  private stopAll(): void {
    for (const timer of this.watching.values()) clearTimeout(timer);
    this.watching.clear();
  }
}
