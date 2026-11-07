import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LinkCardComponent } from './link-card.component';

const LINK: LinkResponse = {
  ...MOCK_LINKS[0],
  title: 'Angular overview',
  url: 'https://www.angular.dev/overview',
  note: 'Start here.',
  tags: ['docs', 'a', 'b', 'c'],
  isFavorite: false,
};

async function setup(link: LinkResponse = LINK) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(LinkCardComponent);
  fixture.componentRef.setInput('link', link);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  return { fixture, element };
}

describe('LinkCardComponent', () => {
  it('opens the title in a new tab without leaking the opener', async () => {
    const { element } = await setup();

    const anchor = element.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe(LINK.url);
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.textContent).toContain('Angular overview');
  });

  it('shows the host without www, the note and at most three tags', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('angular.dev');
    expect(element.textContent).not.toContain('www.');
    expect(element.textContent).toContain('Start here.');
    expect(element.querySelectorAll('ui-chip')).toHaveLength(3);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com/file'])(
    'renders %s as a button with no href',
    async (url) => {
      const { fixture, element } = await setup({ ...LINK, url });
      const opened = vi.fn();
      fixture.componentInstance.opened.subscribe(opened);

      expect(element.querySelector('a')).toBeNull();
      element.querySelector<HTMLButtonElement>('button.ui-card__link')?.click();

      expect(opened).not.toHaveBeenCalled();
    },
  );

  it('emits opened when the title is activated', async () => {
    const { fixture, element } = await setup();
    const opened = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);

    element.querySelector('a')?.addEventListener('click', (event) => event.preventDefault());
    element.querySelector('a')?.click();

    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('shows the favorite state and emits when it is toggled', async () => {
    const { fixture, element } = await setup({ ...LINK, isFavorite: true });
    const toggled = vi.fn();
    fixture.componentInstance.favoriteToggled.subscribe(toggled);

    const favorite = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Favorite: Angular overview"]',
    );
    expect(favorite?.getAttribute('aria-pressed')).toBe('true');
    favorite?.click();

    expect(toggled).toHaveBeenCalledTimes(1);
  });

  it('emits deleteRequested from the actions menu', async () => {
    const { fixture, element } = await setup();
    const requested = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(requested);

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    const item = document.querySelector<HTMLElement>('[role="menuitem"]');
    expect(item?.textContent).toContain('Delete');
    item?.click();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
