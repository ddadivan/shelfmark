import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, DialogComponent, ReducedMotion } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { HOW_IT_WORKS_CHAPTERS } from '../../models/how-it-works-chapters.const';
import { HOW_IT_WORKS_VIDEO } from '../../models/how-it-works-video.const';
import type { HowItWorksChapter } from '../../models/how-it-works-chapter.interface';
import type { HowItWorksMedia } from '../../models/how-it-works-media.interface';

/** `/media/how-it-works-phone.mp4` (and `.webm`) with its poster and captions. */
function mediaFor(phone: boolean): HowItWorksMedia {
  const device = phone ? HOW_IT_WORKS_VIDEO.Phone : HOW_IT_WORKS_VIDEO.Desktop;
  const base = `${HOW_IT_WORKS_VIDEO.Base}-${device}`;
  return {
    mp4: `${base}.${HOW_IT_WORKS_VIDEO.Mp4}`,
    webm: `${base}.${HOW_IT_WORKS_VIDEO.Webm}`,
    poster: `${base}.${HOW_IT_WORKS_VIDEO.Poster}`,
    captions: `${base}.${HOW_IT_WORKS_VIDEO.Captions}`,
    phone,
  };
}

/**
 * "Shelfmark in 2 minutes" (HowItWorks.dc.html, board 1): the promo video with native controls,
 * captions on by default (it starts muted), and chapters that jump to their start. It plays at
 * once, except with reduced motion: then only the poster shows until the person presses play.
 * Two recordings (#315): the desktop one (1440 x 900) and the phone one (390 x 844), picked by
 * the layout at the moment the dialog opens.
 */
@Component({
  selector: 'app-how-it-works-dialog',
  imports: [ButtonComponent, DialogComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works-dialog.component.html',
  styleUrl: './how-it-works-dialog.component.scss',
})
export class HowItWorksDialogComponent {
  protected readonly media = mediaFor(inject(ViewportService).phone());
  protected readonly video = HOW_IT_WORKS_VIDEO;
  protected readonly chapters = HOW_IT_WORKS_CHAPTERS;
  protected readonly autoplay = !inject(ReducedMotion).reduced();
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');
  private readonly time = signal(0);
  /** The chapter that is playing (the last one whose start has passed). */
  protected readonly current = computed(
    () => [...this.chapters].reverse().find((chapter) => this.time() >= chapter.start)?.id,
  );

  protected onTime(event: Event): void {
    this.time.set((event.target as HTMLVideoElement).currentTime);
  }

  protected jump(chapter: HowItWorksChapter): void {
    const player = this.player()?.nativeElement;
    if (player) {
      player.currentTime = chapter.start;
      this.time.set(chapter.start);
      void player.play().catch(() => undefined);
    }
  }

  /** "0:18" for 18 seconds. */
  protected clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
