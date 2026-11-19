import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shelfmark/ui';
import { AiLinkStateService } from '../../ai/services/ai-link-state.service';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkSummaryService } from './add-link-summary.service';

function setup() {
  const model = signal({ summary: '' });
  TestBed.configureTestingModule({
    providers: [
      AddLinkSummaryService,
      { provide: AddLinkFormService, useValue: { original: undefined, model, text: String } },
      { provide: AiSettingsStore, useValue: { summariesOn: signal(true) } },
      { provide: AiLinkStateService, useValue: { rewriting: signal(false), state: signal(null) } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  });
  const service = TestBed.inject(AddLinkSummaryService);
  const type = (summary: string) => model.set({ summary });
  return { service, type };
}

describe('AddLinkSummaryService (Add link)', () => {
  it('sends nothing while the field never showed or holds AI text untouched', () => {
    const { service, type } = setup();
    expect(service.createSummary()).toBeUndefined();
    expect(service.fillDraft('AI words.')).toBe(true);
    expect(service.createSummary()).toBeUndefined();
    type('  AI words.  ');
    expect(service.createSummary()).toBeUndefined();
  });

  it("sends the user's own text", () => {
    const { service, type } = setup();
    service.fillDraft('AI words.');
    type('  My words.  ');
    expect(service.createSummary()).toBe('My words.');
  });

  it('sends null once the user cleared the AI text: no summary, not the draft one (#507)', () => {
    const { service, type } = setup();
    service.fillDraft('AI words.');
    type('   ');
    expect(service.createSummary()).toBeNull();
  });

  it('sends nothing for an empty field after a new address forgot the draft text', () => {
    const { service, type } = setup();
    service.fillDraft('AI words.');
    service.forgetDraft();
    type('');
    expect(service.createSummary()).toBeUndefined();
  });
});
