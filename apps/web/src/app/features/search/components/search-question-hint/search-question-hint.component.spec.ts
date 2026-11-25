import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiAskButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { SearchAskService } from '../../services/search-ask.service';
import { SearchQuestionHintComponent } from './search-question-hint.component';

async function setup(query: string, askOn = true) {
  const asker = { ask: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: AiSettingsStore, useValue: { askOn: signal(askOn) } },
      { provide: SearchAskService, useValue: asker },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(SearchQuestionHintComponent);
  fixture.componentRef.setInput('query', query);
  await fixture.whenStable();
  return { fixture, asker, element: fixture.nativeElement as HTMLElement };
}

describe('SearchQuestionHintComponent', () => {
  it('offers Ask for a text that reads like a question', async () => {
    const { fixture, asker, element } = await setup('which angular video should I watch first?');

    expect(element.textContent).toContain('Looks like a question.');
    // The header's Ask pill (author), not a ghost button.
    expect(element.querySelector('ui-ask-button')?.textContent).toContain('Ask your shelf');
    const button = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiAskButtonHarness);
    await button.click();

    expect(asker.ask).toHaveBeenCalledWith('which angular video should I watch first?');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('stays away for a plain search and while Ask is off', async () => {
    expect((await setup('angular')).element.textContent?.trim()).toBe('');
    TestBed.resetTestingModule();
    expect((await setup('how many jackets?', false)).element.textContent?.trim()).toBe('');
  });
});
