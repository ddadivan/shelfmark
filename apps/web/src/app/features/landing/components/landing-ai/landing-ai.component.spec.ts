import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it('draws three examples as named pictures: suggestions, a meaning search and an Ask answer', async () => {
    const { root } = await setup();

    const pictures = Array.from(root.querySelectorAll('.landing-ai__card'));
    expect(pictures.map((picture) => picture.getAttribute('role'))).toEqual(['img', 'img', 'img']);
    expect(pictures.map((picture) => picture.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('AI suggestions'),
      expect.stringContaining('search by meaning'),
      expect.stringContaining('Ask your shelf'),
    ]);
    const chips = Array.from(root.querySelectorAll('.landing-ai__chip'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Learning',
      '#architecture',
      '#backend',
      'new: #system-design',
    ]);
    expect(root.querySelectorAll('.landing-ai__chip--on')).toHaveLength(2);
    expect(root.querySelectorAll('.landing-ai__cite')).toHaveLength(2);
    expect(root.querySelector('img')?.getAttribute('src')).toBe(
      '/media/landing/microservices.webp',
    );
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
