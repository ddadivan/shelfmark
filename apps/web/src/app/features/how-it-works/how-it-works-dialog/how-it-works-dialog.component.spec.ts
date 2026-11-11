import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME, UiDialogRef, type Theme } from '@shelfmark/ui';
import { axeViolations } from '../../../../testing/axe';
import { createTranslated } from '../../../../testing/create-translated';
import { ViewportService } from '../../../core/layout/viewport.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { HowItWorksDialogComponent } from './how-it-works-dialog.component';

/** `[src, type]` of each `<source>`, in the order the browser tries them. */
function sources(video: HTMLVideoElement): string[][] {
  return Array.from(video.querySelectorAll('source')).map((source) => [
    source.getAttribute('src') ?? '',
    source.getAttribute('type') ?? '',
  ]);
}

/** The first test loads the translations and runs axe on a cold start. */
const AXE_TIMEOUT_MS = 15_000;

describe('HowItWorksDialogComponent', () => {
  const theme = signal<Theme>(THEME.Light);
  const phone = signal(false);

  beforeEach(() => {
    theme.set(THEME.Light);
    phone.set(false);
    // jsdom has no media playback.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: UiDialogRef, useValue: { close: vi.fn() } },
        { provide: ThemeService, useValue: { resolved: theme } },
        { provide: ViewportService, useValue: { phone } },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = await createTranslated(HowItWorksDialogComponent);
    const root = fixture.nativeElement as HTMLElement;
    const video = root.querySelector('video');
    if (!video) {
      throw new Error('no video');
    }
    return { fixture, root, video };
  }

  it(
    'plays the light desktop recording, muted, with English captions on and three chapters',
    async () => {
      const { root, video } = await render();

      expect(sources(video)).toEqual([
        ['/media/how-it-works-light-desktop.mp4', 'video/mp4; codecs="avc1.64001F"'],
        ['/media/how-it-works-light-desktop.webm', 'video/webm; codecs="vp9"'],
      ]);
      expect(video.getAttribute('poster')).toBe('/media/how-it-works-light-desktop.webp');
      expect(video.muted).toBe(true);
      expect(video.classList).not.toContain('how-it-works__video--phone');
      const track = video.querySelector('track');
      expect(track?.getAttribute('src')).toBe('/media/how-it-works-light-desktop.vtt');
      expect(track?.getAttribute('kind')).toBe('captions');
      expect(track?.getAttribute('srclang')).toBe('en');
      expect(track?.getAttribute('label')).toBe('English');
      expect(track?.hasAttribute('default')).toBe(true);
      expect(
        Array.from(root.querySelectorAll('.how-it-works__chapters li')).map((li) =>
          li.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['Save a link 0:00', 'Folders and tags 0:18', 'Find it again 0:41']);
      expect(await axeViolations(root)).toEqual([]);
    },
    AXE_TIMEOUT_MS,
  );

  it('picks the dark phone recording in the dark theme on a phone', async () => {
    theme.set(THEME.Dark);
    phone.set(true);
    const { video } = await render();

    expect(sources(video).map(([src]) => src)).toEqual([
      '/media/how-it-works-dark-phone.mp4',
      '/media/how-it-works-dark-phone.webm',
    ]);
    expect(video.getAttribute('poster')).toBe('/media/how-it-works-dark-phone.webp');
    expect(video.querySelector('track')?.getAttribute('src')).toBe(
      '/media/how-it-works-dark-phone.vtt',
    );
    expect(video.classList).toContain('how-it-works__video--phone');
  });

  it('jumps to a chapter start, plays and marks that chapter as pressed', async () => {
    const { fixture, root, video } = await render();
    const buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>('.how-it-works__chapters button'),
    );

    buttons[1].click();
    await fixture.whenStable();

    expect(video.currentTime).toBe(18);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('follows the playing chapter as the video time moves', async () => {
    const { fixture, root, video } = await render();

    video.currentTime = 45;
    video.dispatchEvent(new Event('timeupdate'));
    await fixture.whenStable();

    const pressed = root.querySelector('.how-it-works__chapters button[aria-pressed="true"]');
    expect(pressed?.textContent).toContain('Find it again');
  });
});
