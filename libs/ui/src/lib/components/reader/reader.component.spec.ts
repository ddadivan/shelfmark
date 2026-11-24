import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { THEME_ATTRIBUTE } from '../../models/theme/models/theme-attribute.const';
import { READER_FONT } from './models/reader-font.const';
import type { ReaderFont } from './models/reader-font.type';
import { READER_LINE_SPACING } from './models/reader-line-spacing.const';
import type { ReaderLineSpacing } from './models/reader-line-spacing.type';
import { READER_THEME } from './models/reader-theme.const';
import type { ReaderTheme } from './models/reader-theme.type';
import { READER_VIEW_BLOCK } from './models/reader-block-kind.const';
import type { ReaderViewBlock } from './models/reader-view-block.interface';
import { ReaderComponent } from './reader.component';

const BLOCKS: ReaderViewBlock[] = [
  { kind: READER_VIEW_BLOCK.Paragraph, text: 'First <b>paragraph</b>', items: [], imageUrl: null },
  { kind: READER_VIEW_BLOCK.Heading, text: 'A heading', items: [], imageUrl: null },
  { kind: READER_VIEW_BLOCK.List, text: '', items: ['one', 'two'], imageUrl: null },
  { kind: READER_VIEW_BLOCK.Quote, text: 'A quote', items: [], imageUrl: null },
  { kind: READER_VIEW_BLOCK.Code, text: 'npm test', items: [], imageUrl: null },
  { kind: READER_VIEW_BLOCK.Image, text: 'A caption', items: [], imageUrl: '/img.png' },
];

@Component({
  imports: [ReaderComponent],
  template: `<ui-reader
    site="angular.dev"
    faviconLetter="a"
    heading="Zoneless"
    [meta]="meta()"
    [notice]="notice()"
    [image]="image()"
    [blocks]="blocks()"
    [font]="font()"
    [theme]="theme()"
    [textSize]="textSize()"
    [lineSpacing]="spacing()"
    (progressed)="progress.set($event)"
    ><p slot="summary">Summary</p>
    <p class="note">Note</p></ui-reader
  >`,
})
class HostComponent {
  readonly meta = signal('Team · 5 min read');
  readonly notice = signal('');
  readonly image = signal<string | null>(null);
  readonly blocks = signal<readonly ReaderViewBlock[]>(BLOCKS);
  readonly font = signal<ReaderFont>(READER_FONT.Sans);
  readonly theme = signal<ReaderTheme | null>(null);
  readonly textSize = signal(18);
  readonly spacing = signal<ReaderLineSpacing>(READER_LINE_SPACING.Normal);
  readonly progress = signal(-1);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const reader = host.querySelector('ui-reader') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, host, reader, update };
}

describe('ReaderComponent', () => {
  it('renders the site, title, meta, slots and every block kind as text', () => {
    const { reader } = setup();
    expect(reader.querySelector('.ui-reader__site')?.textContent).toContain('angular.dev');
    expect(reader.querySelector('h2')?.textContent).toBe('Zoneless');
    expect(reader.querySelector('.ui-reader__meta')?.textContent).toBe('Team · 5 min read');
    expect(reader.querySelector('[slot=summary]')).not.toBeNull();
    expect(reader.querySelector('.note')).not.toBeNull();
    const paragraph = reader.querySelector('.ui-reader__paragraph');
    expect(paragraph?.textContent).toBe('First <b>paragraph</b>');
    expect(paragraph?.querySelector('b')).toBeNull();
    expect(reader.querySelector('h3')?.textContent).toBe('A heading');
    expect(reader.querySelectorAll('li').length).toBe(2);
    expect(reader.querySelector('blockquote')?.textContent).toBe('A quote');
    expect(reader.querySelector('pre code')?.textContent).toBe('npm test');
    expect(reader.querySelector('figcaption')?.textContent).toBe('A caption');
    expect(reader.querySelector('.ui-reader__figure img')?.getAttribute('alt')).toBe('');
  });

  it('shows the notice and the lead picture only when given, and drops a broken picture', () => {
    const { reader, update } = setup();
    expect(reader.querySelector('.ui-reader__notice')).toBeNull();
    expect(reader.querySelector('.ui-reader__figure--lead')).toBeNull();
    update((c) => {
      c.notice.set('No article text');
      c.image.set('/a.png');
      c.meta.set('');
    });
    expect(reader.querySelector('.ui-reader__notice')?.textContent).toContain('No article text');
    const img = reader.querySelector('.ui-reader__figure--lead img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/a.png');
    expect(reader.querySelector('.ui-reader__meta')).toBeNull();
    img.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(reader.querySelector('.ui-reader__figure--lead')).toBeNull();
  });

  it('puts the reading settings on host attributes and the text size in rem', () => {
    const { reader, update } = setup();
    expect(reader.style.getPropertyValue('--ui-reader-size')).toBe('1.125rem');
    expect(reader.getAttribute('data-width')).toBe('normal');
    expect(reader.getAttribute('data-spacing')).toBe('normal');
    update((c) => {
      c.font.set(READER_FONT.Serif);
      c.textSize.set(22);
      c.spacing.set(READER_LINE_SPACING.Relaxed);
    });
    expect(reader.getAttribute('data-font')).toBe('serif');
    expect(reader.getAttribute('data-spacing')).toBe('relaxed');
    expect(reader.style.getPropertyValue('--ui-reader-size')).toBe('1.375rem');
  });

  it('keeps the text size between 14 and 24px', () => {
    const { reader, update } = setup();
    update((c) => c.textSize.set(40));
    expect(reader.style.getPropertyValue('--ui-reader-size')).toBe('1.5rem');
    update((c) => c.textSize.set(2));
    expect(reader.style.getPropertyValue('--ui-reader-size')).toBe('0.875rem');
    update((c) => c.textSize.set(Number.NaN));
    expect(reader.style.getPropertyValue('--ui-reader-size')).toBe('1.125rem');
  });

  it('follows the app until a theme is chosen, then draws on that theme base', () => {
    const { reader, update } = setup();
    expect(reader.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(reader.hasAttribute('data-reader-theme')).toBe(false);
    const cases: [ReaderTheme, string][] = [
      [READER_THEME.Light, 'light'],
      [READER_THEME.Sepia, 'light'],
      [READER_THEME.Dark, 'dark'],
      [READER_THEME.Black, 'dark'],
    ];
    for (const [theme, base] of cases) {
      update((c) => c.theme.set(theme));
      expect(reader.getAttribute(THEME_ATTRIBUTE)).toBe(base);
      expect(reader.getAttribute('data-reader-theme')).toBe(theme);
    }
  });

  it('reports the share scrolled once per frame', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const { fixture, reader } = setup();
    Object.defineProperty(reader, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(reader, 'clientHeight', { value: 500, configurable: true });
    reader.scrollTop = 250;
    reader.dispatchEvent(new Event('scroll'));
    reader.dispatchEvent(new Event('scroll'));
    const before = frames.length;
    reader.dispatchEvent(new Event('scroll'));
    // A scroll while a frame is pending asks for no second one.
    expect(frames).toHaveLength(before);
    frames.forEach((frame) => frame(0));
    expect(fixture.componentInstance.progress()).toBe(0.5);
    vi.restoreAllMocks();
  });

  it('counts a text that does not scroll as read', () => {
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const { fixture, reader } = setup();
    reader.dispatchEvent(new Event('scroll'));
    expect(fixture.componentInstance.progress()).toBe(1);
    vi.restoreAllMocks();
  });

  it('is a focusable scroll region named by the title, and a code block is focusable too', () => {
    const { reader } = setup();
    expect(reader.getAttribute('role')).toBe('region');
    expect(reader.getAttribute('tabindex')).toBe('0');
    const title = reader.querySelector('h2');
    expect(title?.id).toMatch(/^ui-reader-title-\d+$/);
    expect(reader.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(reader.querySelector('pre')?.getAttribute('tabindex')).toBe('0');
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
