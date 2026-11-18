import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UiSuggestionRowHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LandingAiComponent } from './landing-ai.component';

async function setup() {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = await createTranslated(LandingAiComponent);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('LandingAiComponent', () => {
  it('presents AI as optional and off until turned on (#481)', async () => {
    const { root } = await setup();

    expect(root.querySelector('h2')?.textContent?.trim()).toBe(
      'Help with sorting, when you want it',
    );
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      root.querySelector('h2')?.id,
    );
    expect(root.textContent).toContain('Optional AI');
    expect(root.textContent).toContain('Off until you turn it on.');
    expect(root.textContent).toContain('never used to train AI models');
    const points = Array.from(root.querySelectorAll('li')).map((li) =>
      li.querySelector('.landing-ai__point-title')?.textContent?.trim(),
    );
    expect(points).toEqual([
      'Suggestions you accept',
      'Find it by what it’s about',
      'Ask your shelf',
    ]);
  });

  it('links to the AI section of the privacy page', async () => {
    const { root } = await setup();

    const links = root.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].textContent?.trim()).toBe('How AI works in Shelfmark');
    expect(links[0].getAttribute('href')).toBe('/privacy#ai');
  });

  it('shows the real suggestion chips in an inert visual hidden from assistive technology', async () => {
    const { fixture, root } = await setup();

    const visual = root.querySelector('.landing-ai__visual');
    expect(visual?.getAttribute('aria-hidden')).toBe('true');
    expect(visual?.hasAttribute('inert')).toBe(true);
    const row = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiSuggestionRowHarness);
    const chips = await row.getSuggestions();
    expect(await Promise.all(chips.map((chip) => chip.getLabel()))).toEqual([
      'Angular',
      'angular',
      'signals',
      'state management',
    ]);
    expect(await Promise.all(chips.map((chip) => chip.isAccepted()))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
