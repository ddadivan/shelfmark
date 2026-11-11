import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { HeadingLevel } from '../heading';
import { axeViolations } from '../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../testing/scss';
import { ButtonComponent } from '../button/button.component';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import { CardComponent } from './card.component';
import { CARD_STORY_IMAGE } from './stories/card-story-image.const';

@Component({
  imports: [CardComponent, ButtonComponent],
  template: `
    <ui-card
      [image]="image()"
      [href]="href()"
      [newTab]="newTab()"
      [selected]="selected()"
      [description]="description()"
      [actionsPinned]="pinned()"
      [reveal]="reveal()"
      [placeholderTone]="tone()"
      [favorited]="favorited()"
      [headingLevel]="level()"
      (activated)="activated.push($event)"
    >
      <span slot="fallback">Y</span>
      <span slot="overlay">youtube.com Open</span>
      <span slot="meta">youtube.com</span>
      <ui-button
        slot="favorite"
        variant="ghost"
        size="sm"
        iconLeft="star"
        iconOnly
        ariaLabel="Add to favorites"
        (click)="favorites.push(1)"
      />
      <span slot="title">Angular 22 Signal Forms</span>
      <p class="note">Watch on the weekend</p>
      <ui-button
        slot="actions"
        variant="ghost"
        size="sm"
        iconLeft="more"
        iconOnly
        ariaLabel="More"
        (click)="menu.push(1)"
      />
    </ui-card>
  `,
})
class HostComponent {
  readonly image = signal<string | undefined>(undefined);
  readonly href = signal<string | undefined>(undefined);
  readonly newTab = signal(false);
  readonly selected = signal(false);
  readonly description = signal<string | undefined>(undefined);
  readonly pinned = signal(false);
  readonly reveal = signal(false);
  readonly tone = signal(0);
  readonly favorited = signal(false);
  readonly level = signal<HeadingLevel>(2);
  readonly activated: MouseEvent[] = [];
  readonly favorites: number[] = [];
  readonly menu: number[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const card = host.querySelector('ui-card') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, card, update, fixture, instance: fixture.componentInstance };
}

/** The tab stops: every native control in the card (the ui-button wrappers are not focusable). */
function controls(card: HTMLElement): HTMLElement[] {
  return Array.from(card.querySelectorAll<HTMLElement>('a[href], button'));
}

/** The plain `(hover: hover)` query, not the combined one for the zoom. */
const HOVER_ONLY = /^\s*\(hover:\s*hover\)\s*$/;

describe('CardComponent', () => {
  it('renders the slots in place', () => {
    const { card } = setup();
    expect(card.querySelector('.ui-card__link')?.textContent).toContain('Angular 22 Signal Forms');
    expect(card.querySelector('.ui-card__body .note')?.textContent).toBe('Watch on the weekend');
    expect(card.querySelector('.ui-card__site')?.textContent).toBe('youtube.com');
    expect(card.querySelector('.ui-card__favorite ui-button')).not.toBeNull();
    expect(card.querySelector('.ui-card__actions ui-button')).not.toBeNull();
    expect(card.querySelector('.ui-card__overlay')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('describes the full title with a tooltip only while the clamp cuts it', () => {
    const { card, update } = setup();
    const link = card.querySelector('.ui-card__link') as HTMLElement;
    const sizes = (scroll: number, client: number) => {
      Object.defineProperty(link, 'scrollHeight', { configurable: true, value: scroll });
      Object.defineProperty(link, 'clientHeight', { configurable: true, value: client });
    };
    sizes(44, 44);
    link.dispatchEvent(new Event('focus'));
    update(() => undefined);
    expect(link.getAttribute('aria-description')).toBeNull();

    sizes(66, 44);
    link.dispatchEvent(new Event('focus'));
    update(() => undefined);
    expect(link.getAttribute('aria-description')).toBe('Angular 22 Signal Forms');

    sizes(44, 44);
    link.dispatchEvent(new Event('focus'));
    update(() => undefined);
    expect(link.getAttribute('aria-description')).toBeNull();
  });

  it('reads hover for the full-title tooltip on the title text, not on the whole card (#314)', () => {
    const { card, fixture } = setup();
    const link = card.querySelector('.ui-card__link') as HTMLElement;
    const text = link.querySelector('.ui-card__title-text') as HTMLElement;
    expect(text.textContent?.trim()).toBe('Angular 22 Signal Forms');
    // The text is above the link's stretched layer, so the pointer on it reaches it.
    expect(getComputedStyle(text).zIndex).toBe('2');
    const tooltip = fixture.debugElement
      .query(By.css('.ui-card__link'))
      .injector.get(TooltipDirective);
    expect(tooltip.pointerTarget()).toBe(text);
  });

  it('forwards a click on the open bar to the title link, keeping modifier keys', () => {
    const { card, instance } = setup();
    card
      .querySelector('.ui-card__overlay')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(instance.activated).toHaveLength(1);
    expect(instance.activated[0].ctrlKey).toBe(true);
  });

  it('is a button without href and a link with href', () => {
    const { card, update } = setup();
    const main = () => card.querySelector('.ui-card__link') as HTMLElement;
    expect(main().tagName).toBe('BUTTON');
    expect(main().getAttribute('type')).toBe('button');
    update((c) => c.href.set('https://example.test/a'));
    expect(main().tagName).toBe('A');
    expect(main().getAttribute('href')).toBe('https://example.test/a');
    expect(main().hasAttribute('target')).toBe(false);
    expect(main().getAttribute('rel')).toBe('noreferrer');
    update((c) => c.newTab.set(true));
    expect(main().getAttribute('target')).toBe('_blank');
    expect(main().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('wraps the link in an h2 by default and in the chosen level otherwise', () => {
    const { card, update } = setup();
    const heading = () => card.querySelector('.ui-card__heading') as HTMLElement;
    expect(heading().tagName).toBe('H2');
    expect(heading().querySelector('.ui-card__link')).not.toBeNull();
    for (const level of [1, 3, 4, 5, 6] as const) {
      update((c) => c.level.set(level));
      expect(heading().tagName).toBe(`H${level}`);
      expect(heading().querySelector('.ui-card__link')).not.toBeNull();
    }
    expect(card.querySelectorAll('.ui-card__heading')).toHaveLength(1);
  });

  it('keeps the heading static positioned so the link stretches over the card', () => {
    const css = compileScss('lib/card/card.component.scss');
    const rule = /\.ui-card__heading\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(rule).toContain('margin: 0');
    expect(rule).toContain('font: inherit');
    expect(rule).not.toContain('position');
  });

  it('has one activation target; the favorite and the actions are separate siblings', () => {
    const { card, update } = setup();
    update((c) => c.href.set('https://example.test/a'));
    const all = controls(card);
    // Link, favorite button, actions button: three flat controls, none inside another.
    expect(all.length).toBe(3);
    expect(card.querySelectorAll('a[href]').length).toBe(1);
    for (const control of all) {
      expect(control.parentElement?.closest('a, button')).toBeNull();
    }
    const link = card.querySelector('a[href]') as HTMLElement;
    expect(link.querySelector('a, button, input, [tabindex]')).toBeNull();
  });

  it('emits activated for the title control only, not for the favorite or the actions', () => {
    const { card, instance } = setup();
    const main = card.querySelector('.ui-card__link') as HTMLElement;
    const favorite = card.querySelector('.ui-card__favorite button') as HTMLElement;
    const more = card.querySelector('.ui-card__more button') as HTMLElement;
    main.click();
    expect(instance.activated.length).toBe(1);
    favorite.click();
    more.click();
    expect(instance.activated.length).toBe(1);
    expect(instance.favorites.length).toBe(1);
    expect(instance.menu.length).toBe(1);
  });

  it('stretches the link over the card and lifts the nested controls above it', () => {
    const css = compileScss('lib/card/card.component.scss');
    expect(css).toMatch(/\.ui-card__link::after\s*{[^}]*inset: 0;[^}]*z-index: 1;/);
    expect(css).toMatch(/\.ui-card__more\s*{[^}]*z-index: 2;/);
    expect(css).toMatch(/\.ui-card__actions\s*{[^}]*z-index: 2;/);
  });

  it('shows the image bound as src, lazy, without referrer', () => {
    const { card, update } = setup();
    update((c) => c.image.set(CARD_STORY_IMAGE.Preview));
    const img = card.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(CARD_STORY_IMAGE.Preview);
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.getAttribute('alt')).toBe('');
    expect(card.querySelector('.ui-card__fallback')).toBeNull();
  });

  it('shows the fallback slot without an image and when the image fails', () => {
    const { card, update } = setup();
    expect(card.querySelector('.ui-card__fallback')?.textContent).toBe('Y');
    expect(card.querySelector('img')).toBeNull();
    update((c) => c.image.set(CARD_STORY_IMAGE.Broken));
    card.querySelector('img')?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('.ui-card__fallback')?.textContent).toBe('Y');
    update((c) => c.image.set(CARD_STORY_IMAGE.Preview));
    expect(card.querySelector('img')).not.toBeNull();
  });

  it('draws the placeholder on a rotating tone and keeps a favorite visible', () => {
    const { card, update } = setup();
    const art = () => card.querySelector('.ui-card__placeholder');
    expect(art()?.getAttribute('data-tone')).toBe('0');
    expect(art()?.getAttribute('aria-hidden')).toBe('true');
    expect(art()?.querySelectorAll('circle, rect').length).toBe(4);
    update((c) => c.tone.set(5));
    expect(art()?.getAttribute('data-tone')).toBe('2');
    update((c) => c.favorited.set(true));
    expect(card.classList).toContain('ui-card--favorited');
  });

  it('marks the selected card and sets aria-current on the control', () => {
    const { card, update } = setup();
    const main = () => card.querySelector('.ui-card__link') as HTMLElement;
    expect(card.classList.contains('ui-card--selected')).toBe(false);
    expect(main().hasAttribute('aria-current')).toBe(false);
    update((c) => c.selected.set(true));
    expect(card.classList.contains('ui-card--selected')).toBe(true);
    expect(main().getAttribute('aria-current')).toBe('true');
    update((c) => c.href.set('https://example.test/a'));
    expect(main().getAttribute('aria-current')).toBe('true');
  });

  it('adds the pinned and reveal classes and a screen reader description', () => {
    const { card, update } = setup();
    update((c) => {
      c.pinned.set(true);
      c.reveal.set(true);
      c.description.set('opens in a new tab');
    });
    expect(card.classList.contains('ui-card--pinned')).toBe(true);
    expect(card.classList.contains('ui-card--reveal')).toBe(true);
    const description = card.querySelector('.ui-card__description') as HTMLElement;
    expect(description.textContent).toBe('opens in a new tab');
    const link = card.querySelector('.ui-card__link') as HTMLElement;
    expect(link.getAttribute('aria-describedby')).toBe(description.id);
    expect(link.contains(description)).toBe(false);
    update((c) => c.description.set(undefined));
    expect(link.hasAttribute('aria-describedby')).toBe(false);
  });

  describe('styles', () => {
    const css = compileScss('lib/card/card.component.scss');

    it('applies hover only under (hover: hover)', () => {
      expect(withoutMedia(css, /hover:\s*hover/)).not.toContain(':hover');
      const hover = mediaBlocks(css, HOVER_ONLY).join('\n');
      expect(hover).toContain('var(--shadow-card-spread)');
      expect(hover).toContain('.ui-card__more');
    });

    it('shows the actions without hover on touch', () => {
      const touch = mediaBlocks(css, /hover:\s*none/).join('\n');
      expect(touch).toMatch(/\.ui-card__more\s*{[^}]*opacity: 1;/);
    });

    it('drops the zoom and the slides under reduced motion but keeps colour and shadow', () => {
      const hover = mediaBlocks(css, HOVER_ONLY).join('\n');
      expect(hover).not.toContain('scale(1.06)');
      const zoom = mediaBlocks(css, /no-preference/).join('\n');
      expect(zoom).toContain('scale(1.06)');
      const reduced = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/).join('\n');
      expect(reduced).toContain('transform: none');
      expect(css).toContain('box-shadow var(--duration-slow)');
    });
  });

  it('has no axe violations as a button, a link and selected', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.href.set('https://example.test/a');
      c.image.set(CARD_STORY_IMAGE.Preview);
    });
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.selected.set(true));
    expect(await axeViolations(host)).toEqual([]);
  });
});
