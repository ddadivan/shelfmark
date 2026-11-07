import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { FaviconComponent } from './favicon.component';

@Component({
  imports: [FaviconComponent],
  template: `<ui-favicon [src]="src()" [letter]="letter()" />`,
})
class HostComponent {
  readonly src = signal<string | undefined>(undefined);
  readonly letter = signal<string | undefined>(undefined);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const favicon = host.querySelector('ui-favicon') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, favicon, update };
}

describe('FaviconComponent', () => {
  it('shows the link icon without src and letter, and is decorative', () => {
    const { favicon } = setup();
    expect(favicon.querySelector('ui-icon')).not.toBeNull();
    expect(favicon.querySelector('img')).toBeNull();
    expect(favicon.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the first letter, grapheme-safe, when there is a letter', () => {
    const { favicon, update } = setup();
    update((c) => c.letter.set('  yandex.ru'));
    expect(favicon.querySelector('.ui-favicon__letter')?.textContent).toBe('y');
    update((c) => c.letter.set('👩‍💻 dev'));
    expect(favicon.querySelector('.ui-favicon__letter')?.textContent).toBe('👩');
    update((c) => c.letter.set('   '));
    expect(favicon.querySelector('ui-icon')).not.toBeNull();
  });

  it('renders the image bound as src with lazy loading and no referrer', () => {
    const { favicon, update } = setup();
    update((c) => c.src.set(CARD_STORY_IMAGE.Favicon));
    const img = favicon.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(CARD_STORY_IMAGE.Favicon);
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('width')).toBe('16');
    expect(img.getAttribute('height')).toBe('16');
  });

  it('falls back to the letter, then the icon, when the image fails; retries on a new src', () => {
    const { favicon, update } = setup();
    update((c) => {
      c.src.set(CARD_STORY_IMAGE.Broken);
      c.letter.set('Y');
    });
    favicon.querySelector('img')?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(favicon.querySelector('img')).toBeNull();
    expect(favicon.querySelector('.ui-favicon__letter')?.textContent).toBe('Y');
    update((c) => c.letter.set(undefined));
    expect(favicon.querySelector('ui-icon')).not.toBeNull();
    update((c) => c.src.set(CARD_STORY_IMAGE.Favicon));
    expect(favicon.querySelector('img')).not.toBeNull();
  });

  it('has no axe violations in every state', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.letter.set('Y'));
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.src.set(CARD_STORY_IMAGE.Favicon));
    expect(await axeViolations(host)).toEqual([]);
  });
});
