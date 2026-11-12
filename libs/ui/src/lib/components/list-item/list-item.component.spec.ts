import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import { ButtonComponent } from '../button/button.component';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { FaviconComponent } from '../favicon/favicon.component';
import { ListItemComponent } from './list-item.component';
import { KEYBOARD_KEY } from '../../models/keyboard';

@Component({
  imports: [ListItemComponent, ButtonComponent, FaviconComponent],
  template: `
    <ui-list-item
      [href]="href()"
      [newTab]="newTab()"
      [selected]="selected()"
      [compact]="compact()"
      [thumb]="thumb()"
      [description]="description()"
      [reveal]="reveal()"
      [ripple]="ripple()"
      (activated)="activated.push($event)"
    >
      <ui-favicon slot="leading" letter="y" />
      <span slot="title">NestJS course for frontend developers</span>
      <span slot="meta">stepik.org, in Courses</span>
      <ui-button
        slot="trailing"
        variant="ghost"
        size="sm"
        iconLeft="star"
        iconOnly
        ariaLabel="Add to favorites"
        (click)="favorites.push(1)"
      />
      <ui-button
        slot="trailing"
        variant="ghost"
        size="sm"
        iconLeft="more"
        iconOnly
        ariaLabel="More"
      />
    </ui-list-item>
  `,
})
class HostComponent {
  readonly href = signal<string | undefined>(undefined);
  readonly newTab = signal(false);
  readonly selected = signal(false);
  readonly compact = signal(false);
  readonly thumb = signal<string | undefined>(undefined);
  readonly description = signal<string | undefined>(undefined);
  readonly reveal = signal(false);
  readonly ripple = signal(true);
  readonly activated: MouseEvent[] = [];
  readonly favorites: number[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const row = host.querySelector('ui-list-item') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, row, update, instance: fixture.componentInstance };
}

function pointerDown(target: Element): PointerEvent {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    button: 0,
    isPrimary: true,
    clientX: 10,
    clientY: 10,
  });
  target.dispatchEvent(event);
  return event;
}

const HOVER_ONLY = /^\s*\(hover:\s*hover\)\s*$/;

describe('ListItemComponent', () => {
  it('renders the slots in place', () => {
    const { row } = setup();
    expect(row.querySelector('.ui-list-item__leading ui-favicon')).not.toBeNull();
    expect(row.querySelector('.ui-list-item__link .ui-list-item__title')?.textContent).toContain(
      'NestJS course',
    );
    expect(row.querySelector('.ui-list-item__link .ui-list-item__meta')?.textContent).toContain(
      'stepik.org',
    );
    expect(row.querySelectorAll('.ui-list-item__trailing ui-button').length).toBe(2);
  });

  it('is a button without href and a link with href', () => {
    const { row, update } = setup();
    const main = () => row.querySelector('.ui-list-item__link') as HTMLElement;
    expect(main().tagName).toBe('BUTTON');
    expect(main().getAttribute('type')).toBe('button');
    update((c) => c.href.set('https://example.test/a'));
    expect(main().tagName).toBe('A');
    expect(main().getAttribute('href')).toBe('https://example.test/a');
    expect(main().hasAttribute('target')).toBe(false);
    update((c) => c.newTab.set(true));
    expect(main().getAttribute('target')).toBe('_blank');
    expect(main().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('has one activation target and no control nested in another', () => {
    const { row, update } = setup();
    update((c) => c.href.set('https://example.test/a'));
    expect(row.querySelectorAll('a[href]').length).toBe(1);
    const controls = Array.from(row.querySelectorAll<HTMLElement>('a[href], button'));
    expect(controls.length).toBe(3);
    for (const control of controls) {
      expect(control.parentElement?.closest('a, button')).toBeNull();
    }
  });

  it('emits activated for the title control only', () => {
    const { row, instance } = setup();
    (row.querySelector('.ui-list-item__link') as HTMLElement).click();
    expect(instance.activated.length).toBe(1);
    (row.querySelector('.ui-list-item__trailing button') as HTMLElement).click();
    expect(instance.activated.length).toBe(1);
    expect(instance.favorites.length).toBe(1);
  });

  it('marks selected and compact rows', () => {
    const { row, update } = setup();
    const main = () => row.querySelector('.ui-list-item__link') as HTMLElement;
    expect(main().hasAttribute('aria-current')).toBe(false);
    update((c) => {
      c.selected.set(true);
      c.compact.set(true);
      c.reveal.set(true);
      c.description.set('opens in a new tab');
    });
    expect(row.classList.contains('ui-list-item--selected')).toBe(true);
    expect(row.classList.contains('ui-list-item--compact')).toBe(true);
    expect(row.classList.contains('ui-list-item--reveal')).toBe(true);
    expect(main().getAttribute('aria-current')).toBe('true');
    const description = row.querySelector('.ui-list-item__description') as HTMLElement;
    expect(description.textContent).toBe('opens in a new tab');
    expect(main().getAttribute('aria-describedby')).toBe(description.id);
    expect(main().contains(description)).toBe(false);
  });

  it('shows no thumb unless one is set, then the image or a picture icon', () => {
    const { row, update } = setup();
    expect(row.querySelector('.ui-list-item__thumb')).toBeNull();
    update((c) => c.thumb.set(CARD_STORY_IMAGE.Preview));
    const img = row.querySelector('.ui-list-item__thumb img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(CARD_STORY_IMAGE.Preview);
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    update((c) => c.thumb.set(CARD_STORY_IMAGE.Broken));
    row.querySelector('img')?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(row.querySelector('.ui-list-item__thumb img')).toBeNull();
    expect(row.querySelector('.ui-list-item__thumb ui-icon')).not.toBeNull();
    update((c) => c.thumb.set(''));
    expect(row.querySelector('.ui-list-item__thumb ui-icon')).not.toBeNull();
  });

  describe('ripple', () => {
    it('plays on a press of the row and uses the ripple host class', () => {
      const { row } = setup();
      expect(row.classList.contains('ui-ripple-host')).toBe(true);
      pointerDown(row.querySelector('.ui-list-item__link') as Element);
      expect(row.querySelectorAll(':scope > .ui-ripple').length).toBe(1);
    });

    it('does not play on a press or Enter / Space on a trailing control, and the events still bubble', () => {
      const { host, row } = setup();
      const seen: string[] = [];
      const listen = (event: Event) => seen.push(event.type);
      for (const type of ['pointerdown', 'keydown', 'keyup']) {
        document.addEventListener(type, listen);
      }
      try {
        const trailing = row.querySelector('.ui-list-item__trailing button') as HTMLElement;
        pointerDown(trailing);
        for (const key of [KEYBOARD_KEY.Enter, KEYBOARD_KEY.Space]) {
          trailing.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          trailing.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        }
        expect(row.querySelectorAll(':scope > .ui-ripple').length).toBe(0);
        expect(seen).toEqual(['pointerdown', 'keydown', 'keyup', 'keydown', 'keyup']);
      } finally {
        for (const type of ['pointerdown', 'keydown', 'keyup']) {
          document.removeEventListener(type, listen);
        }
      }
      expect(host).toBeTruthy();
    });

    it('can be switched off', () => {
      const { row, update } = setup();
      update((c) => c.ripple.set(false));
      expect(row.classList.contains('ui-ripple-host')).toBe(false);
      pointerDown(row.querySelector('.ui-list-item__link') as Element);
      expect(row.querySelectorAll(':scope > .ui-ripple').length).toBe(0);
    });

    it('plays no ripple under reduced motion', () => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
      try {
        const { row } = setup();
        pointerDown(row.querySelector('.ui-list-item__link') as Element);
        expect(row.querySelectorAll(':scope > .ui-ripple').length).toBe(0);
      } finally {
        window.matchMedia = original;
      }
    });
  });

  describe('styles', () => {
    const css = compileScss('lib/components/list-item/list-item.component.scss');

    it('applies hover only under (hover: hover)', () => {
      expect(withoutMedia(css, /hover:\s*hover/)).not.toContain(':hover');
      expect(mediaBlocks(css, HOVER_ONLY).join('\n')).toContain('var(--surface-hover)');
    });

    it('shows the pressed colour under reduced motion, where there is no ripple', () => {
      const reduced = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/).join('\n');
      expect(reduced).toContain('var(--surface-pressed)');
    });

    it('stretches the link over the row and lifts the trailing controls above it', () => {
      expect(css).toMatch(/\.ui-list-item__link::after\s*{[^}]*inset: 0;[^}]*z-index: 1;/);
      expect(css).toMatch(/\.ui-list-item__trailing\s*{[^}]*z-index: 2;/);
    });
  });

  it('has no axe violations as a button, a link, selected, compact and with a thumb', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.href.set('https://example.test/a');
      c.thumb.set(CARD_STORY_IMAGE.Preview);
    });
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.selected.set(true);
      c.compact.set(true);
    });
    expect(await axeViolations(host)).toEqual([]);
  });
});
