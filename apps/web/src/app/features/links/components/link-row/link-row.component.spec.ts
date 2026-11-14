import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinkRowComponent } from './link-row.component';

const LINK: LinkResponse = {
  ...MOCK_LINKS[0],
  title: 'Angular overview',
  url: 'https://www.angular.dev/overview',
  tags: ['docs', 'a', 'b'],
  isFavorite: true,
};

async function setup(link: LinkResponse = LINK, phone = false) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: ViewportService, useValue: { phone: signal(phone), compact: signal(phone) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LinkRowComponent);
  fixture.componentRef.setInput('link', link);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
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

describe('LinkRowComponent', () => {
  it('renders the tags on a desktop and leaves them out of the DOM on a phone', async () => {
    const desktop = await setup();
    expect(desktop.element.querySelector('.link-row__tags')).not.toBeNull();
    TestBed.resetTestingModule();

    const phone = await setup(LINK, true);
    expect(phone.element.querySelector('.link-row__tags')).toBeNull();
  });

  it('shows the captured same-origin icon', async () => {
    const { element } = await setup({
      ...LINK,
      faviconUrl: '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/favicon?v=0123456789abcdef',
    });
    expect(element.querySelector('img')?.getAttribute('src')).toBe(
      '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/favicon?v=0123456789abcdef',
    );
  });

  it('never loads a remote icon', async () => {
    const { element } = await setup({ ...LINK, faviconUrl: 'https://evil.test/i.png' });
    expect(element.querySelector('img')).toBeNull();
  });

  it('opens the title in a new tab and shows the host and two tags', async () => {
    const { element } = await setup();

    const anchor = element.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe(LINK.url);
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.textContent).toContain('Angular overview');
    expect(anchor?.textContent).toContain('angular.dev');
    expect(element.querySelectorAll('ui-chip')).toHaveLength(2);
  });

  it('renders an unsafe URL as a button that does not emit opened', async () => {
    const { fixture, element } = await setup({ ...LINK, url: 'javascript:alert(1)' });
    const opened = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);

    expect(element.querySelector('a')).toBeNull();
    element.querySelector<HTMLButtonElement>('button.ui-list-item__link')?.click();

    expect(opened).not.toHaveBeenCalled();
  });

  it('emits opened, favoriteToggled and deleteRequested', async () => {
    const { fixture, element } = await setup();
    const opened = vi.fn();
    const toggled = vi.fn();
    const requested = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentInstance.favoriteToggled.subscribe(toggled);
    const edited = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(requested);
    fixture.componentInstance.editRequested.subscribe(edited);

    element.querySelector('a')?.addEventListener('click', (event) => event.preventDefault());
    element.querySelector('a')?.click();
    const favorite = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Favorite: Angular overview"]',
    );
    expect(favorite?.getAttribute('aria-pressed')).toBe('true');
    favorite?.click();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    menuItem('Edit').click();
    await fixture.whenStable();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Actions for Angular overview"]')
      ?.click();
    await fixture.whenStable();
    menuItem('Delete').click();

    expect(edited).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(toggled).toHaveBeenCalledTimes(1);
    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('selects from its checkbox (Shift for a range) and shows the checked state', async () => {
    const { fixture, element } = await setup();
    const toggled = vi.fn();
    fixture.componentInstance.selectToggled.subscribe(toggled);

    const box = element.querySelector<HTMLElement>('ui-checkbox');
    box?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    box?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    expect(toggled.mock.calls.map(([toggle]) => toggle)).toEqual([
      { range: false },
      { range: true },
    ]);

    fixture.componentRef.setInput('selecting', true);
    fixture.componentRef.setInput('selected', true);
    await fixture.whenStable();
    expect(element.querySelector('ui-list-item')?.classList).toContain('ui-list-item--checked');
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
