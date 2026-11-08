import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { ONBOARDING_RESULT } from './models/onboarding-result.const';
import type { OnboardingResult } from './models/onboarding-result.type';
import { OnboardingDialogComponent } from './onboarding-dialog.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const ref = TestBed.inject(DialogService).open<OnboardingDialogComponent, OnboardingResult>(
    OnboardingDialogComponent,
    { size: DIALOG_SIZE.Md, autoFocus: '.onboarding__next button' },
  );
  await vi.waitFor(() => {
    TestBed.tick();
    expect(container()).not.toBeNull();
  });
  return { ref };
}

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container()?.querySelectorAll('button') ?? []).find(
    (button) => button.textContent?.trim() === text,
  );
}

function title(): string {
  return container()?.querySelector('h2')?.textContent?.trim() ?? '';
}

async function click(button: HTMLButtonElement | undefined): Promise<void> {
  button?.click();
  TestBed.tick();
  await Promise.resolve();
}

function press(key: string): void {
  container()
    ?.querySelector('.onboarding')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  TestBed.tick();
}

describe('OnboardingDialogComponent', () => {
  afterEach(() => {
    TestBed.inject(DialogService);
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('starts on the first step with its heading, text, illustration and position', async () => {
    await setup();

    expect(title()).toBe('All your links in one place');
    expect(container()?.textContent).toContain('everything you save lives on one calm shelf');
    expect(container()?.querySelector('ui-illustration')?.getAttribute('aria-hidden')).toBe('true');
    expect(container()?.querySelector('ui-steps')?.getAttribute('aria-label')).toBe('Step 1 of 3');
    expect(buttonByText('Back')).toBeUndefined();
    expect(buttonByText('Skip')).toBeDefined();
  });

  it('keeps focus on the primary button on open', async () => {
    await setup();

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(buttonByText('Next'));
    });
  });

  it('moves with Next and Back, and announces the step politely', async () => {
    await setup();

    await click(buttonByText('Next'));
    expect(title()).toBe('Save in a second');
    expect(container()?.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Step 2 of 3: Save in a second',
    );
    expect(container()?.querySelector('ui-steps')?.getAttribute('aria-label')).toBe('Step 2 of 3');
    expect(buttonByText('Back')).toBeDefined();
    expect(document.activeElement).toBe(buttonByText('Next'));

    await click(buttonByText('Back'));
    expect(title()).toBe('All your links in one place');
    expect(buttonByText('Back')).toBeUndefined();
    // The Back button left the DOM: the primary button has the focus, not <body>.
    await vi.waitFor(() => {
      TestBed.tick();
      expect(document.activeElement).toBe(buttonByText('Next'));
    });
  });

  it('moves with the arrow keys and stops at the ends', async () => {
    const { ref } = await setup();

    press('ArrowLeft');
    expect(title()).toBe('All your links in one place');
    press('ArrowRight');
    press('ArrowRight');
    expect(title()).toBe('Find it right away');
    press('ArrowRight');
    expect(title()).toBe('Find it right away');
    expect(ref.isClosing).toBe(false);
    press('ArrowLeft');
    expect(title()).toBe('Save in a second');
  });

  it('slides the next step in from the right and the previous one from the left', async () => {
    await setup();

    await click(buttonByText('Next'));
    const step = () => container()?.querySelector('.onboarding__step');
    expect(step()?.classList.contains('onboarding__step--back')).toBe(false);

    await click(buttonByText('Back'));
    expect(step()?.classList.contains('onboarding__step--back')).toBe(true);
  });

  it('resolves Skipped from Skip', async () => {
    const { ref } = await setup();

    await click(buttonByText('Skip'));

    await expect(ref.result).resolves.toBe(ONBOARDING_RESULT.Skipped);
  });

  it('offers "Add your first link" on the last step and resolves AddLink', async () => {
    const { ref } = await setup();

    await click(buttonByText('Next'));
    await click(buttonByText('Next'));
    expect(title()).toBe('Find it right away');
    expect(buttonByText('Next')).toBeUndefined();

    await click(buttonByText('Add your first link'));

    await expect(ref.result).resolves.toBe(ONBOARDING_RESULT.AddLink);
  });

  it('resolves undefined on Esc (the store treats it as Skip)', async () => {
    const { ref } = await setup();

    container()?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    await expect(ref.result).resolves.toBeUndefined();
  });

  it('has no axe violations on any step', async () => {
    await setup();
    const root = container();
    expect(root).not.toBeNull();

    for (let step = 0; step < 3; step++) {
      // Colour contrast is off (no layout in jsdom).
      const results = await axe.run(root as HTMLElement, {
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((v) => v.id)).toEqual([]);
      await click(buttonByText('Next') ?? buttonByText('Add your first link'));
    }
  });
});
