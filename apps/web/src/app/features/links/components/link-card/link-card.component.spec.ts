import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LIBRARY_SETTINGS_DEFAULT, LINK_OPEN_TARGET } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { USER_SETTINGS_API } from '../../../settings/models/user-settings-api.const';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
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

/** The open menu's item whose label starts with `label`. */
function menuItem(label: string): HTMLElement {
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  );
  if (!item) {
    throw new Error(`No menu item "${label}"`);
  }
  return item;
}

describe('LinkCardComponent', () => {
  it('opens in a new tab by default and in the same tab when the account says so (#284)', async () => {
    const { element, fixture } = await setup();
    const link = () => element.querySelector<HTMLAnchorElement>('a[href]');
    expect(link()?.getAttribute('target')).toBe('_blank');
    expect(link()?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(element.textContent).toContain('Opens in a new tab');

    TestBed.resetTestingModule();
    // A theme another spec left in this browser would make the load save it (an update).
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        {
          provide: USER_SETTINGS_API,
          useValue: {
            get: () =>
              of({
                trashRetentionDays: 30,
                folderColours: true,
                pauseHistory: false,
                ...MOCK_APPEARANCE_DEFAULTS,
                ...LIBRARY_SETTINGS_DEFAULT,
                openLinksIn: LINK_OPEN_TARGET.SameTab,
              }),
          },
        },
      ],
    });
    await loadEnglish();
    await TestBed.inject(UserSettingsStore).load();
    const same = TestBed.createComponent(LinkCardComponent);
    same.componentRef.setInput('link', LINK);
    await same.whenStable();
    const anchor = (same.nativeElement as HTMLElement).querySelector('a[href]');
    expect(anchor?.hasAttribute('target')).toBe(false);
    expect(anchor?.getAttribute('rel')).toBe('noreferrer');
    expect((same.nativeElement as HTMLElement).textContent).not.toContain('Opens in a new tab');
    fixture.destroy();
  });

  it('readOnly drops the favorite button, the actions menu and the select box, and keeps the link', async () => {
    const { fixture, element } = await setup();
    fixture.componentRef.setInput('readOnly', true);
    await fixture.whenStable();

    expect(element.querySelector('button[aria-label^="Actions for"]')).toBeNull();
    expect(element.querySelector('button[aria-pressed]')).toBeNull();
    // A guest cannot select someone else's links (#267 selection is for the owner's feed).
    expect(element.querySelector('input[type="checkbox"]')).toBeNull();
    expect(element.querySelector('a[href]')?.getAttribute('target')).toBe('_blank');
  });

  it('has a decorative open bar with the address and "Open", and no extra tab stop', async () => {
    const { element } = await setup();

    const bar = element.querySelector('.ui-card__overlay');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(bar?.textContent).toContain('angular.dev/overview');
    expect(bar?.textContent).toContain('Open');
    expect(bar?.querySelector('.link-card__open-arrow')?.textContent).toBe('↗');
    expect(bar?.querySelector('a, button')).toBeNull();
    expect(element.querySelectorAll('a[href]')).toHaveLength(1);
  });

  it('has no open bar for a link that cannot be opened', async () => {
    const { element } = await setup({ ...LINK, url: 'javascript:alert(1)' });

    expect(element.querySelector('.link-card__open')).toBeNull();
  });

  it('shows the captured same-origin image and icon', async () => {
    const { element } = await setup({
      ...LINK,
      imageUrl: '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/image?v=0123456789abcdef',
      faviconUrl: '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/favicon?v=0123456789abcdef',
    });

    const sources = Array.from(element.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );
    expect(sources).toEqual([
      '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/image?v=0123456789abcdef',
      '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/favicon?v=0123456789abcdef',
    ]);
  });

  it('never loads a remote image, only the letter fallback', async () => {
    const { element } = await setup({
      ...LINK,
      imageUrl: 'https://evil.test/a.png',
      faviconUrl: 'https://evil.test/i.png',
    });

    expect(element.querySelectorAll('img')).toHaveLength(0);
  });

  it('opens the title in a new tab without leaking the opener', async () => {
    const { element } = await setup();

    const anchor = element.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe(LINK.url);
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.textContent).toContain('Angular overview');
  });

  it('shows the host without www, the note, three tags and a +N chip', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('angular.dev');
    expect(element.textContent).not.toContain('www.');
    expect(element.textContent).toContain('Start here.');
    expect(element.querySelectorAll('ui-chip')).toHaveLength(4);
    expect(element.querySelector('ui-chip.ui-chip--neutral')?.textContent?.trim()).toBe('+1');
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
    menuItem('Delete').click();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('emits editRequested from the first item of the actions menu', async () => {
    const { fixture, element } = await setup();
    const requested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(requested);

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    menuItem('Edit').click();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('emits openRequested and favoriteToggled from the actions menu', async () => {
    const { fixture, element } = await setup();
    const opened = vi.fn();
    const toggled = vi.fn();
    fixture.componentInstance.openRequested.subscribe(opened);
    fixture.componentInstance.favoriteToggled.subscribe(toggled);

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    menuItem('Open').click();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    menuItem('Add to favorites').click();

    expect(opened).toHaveBeenCalledTimes(1);
    expect(toggled).toHaveBeenCalledTimes(1);
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
