import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AI_BACKFILL_STATE, type AiBackfillStatus } from '@shelfmark/contracts';
import { UiDialogRef } from '@shelfmark/ui';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AI_API } from '../../models/ai-api.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { BackfillDialogComponent } from './backfill-dialog.component';

async function setup(backfill: AiBackfillStatus) {
  const api = fakeAiApi(aiSettingsResponse({ backfill }));
  api.stopBackfill.mockReturnValue(of({ ...backfill, state: AI_BACKFILL_STATE.Stopped }));
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: AI_API, useValue: api },
      { provide: UiDialogRef, useValue: { close } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(BackfillDialogComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === text,
    );
  return { api, close, element, button };
}

describe('BackfillDialogComponent', () => {
  it('shows the progress of a running pass, without axe violations, and pauses it', async () => {
    const { api, close, element, button } = await setup({
      state: AI_BACKFILL_STATE.Running,
      eligible: 72,
      total: 212,
      done: 140,
      estimatedMinutes: 2,
    });
    expect(element.textContent).toContain('Sorting older links');
    expect(element.textContent).toContain('140');
    expect(element.textContent).toContain('of 212 done');
    expect(await axeViolations(element)).toEqual([]);

    button('Pause')?.click();
    expect(api.stopBackfill).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('says the older links are sorted and opens Tidy up', async () => {
    const { close, element, button } = await setup({
      state: AI_BACKFILL_STATE.Done,
      eligible: 0,
      total: 212,
      done: 212,
      estimatedMinutes: null,
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(element.textContent).toContain('Older links are sorted');
    expect(element.textContent).toContain('212 older links now have suggestions');
    button('Open Tidy up')?.click();
    expect(close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/unsorted/tidy');
  });
});
