import { TestBed } from '@angular/core/testing';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ReadingSettingsComponent } from './reading-settings.component';

async function setup() {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(ReadingSettingsComponent);
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance };
}

describe('ReadingSettingsComponent', () => {
  afterEach(() => localStorage.clear());

  it('opens the settings in a popover named "Reading settings" without a visible heading', async () => {
    const { fixture, component } = await setup();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    component.popover().openFrom(trigger, { focus: false });
    await fixture.whenStable();
    const dialog = document.querySelector('.reading-settings[role="dialog"]');
    expect(dialog?.classList).toContain('ui-popover--heading-hidden');
    const heading = document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '');
    expect(heading?.textContent).toBe('Reading settings');
    expect(dialog?.querySelector('app-reading-settings-form')).not.toBeNull();
    component.popover().close();
    trigger.remove();
  });
});
