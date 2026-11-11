import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, DialogComponent, NoticeComponent } from '@shelfmark/ui';
import { HOW_IT_WORKS_CHAPTERS } from '../models/how-it-works-chapters.const';
import { HOW_IT_WORKS_VIDEO } from '../models/how-it-works-video.const';
import type { HowItWorksChapter } from '../models/how-it-works-chapter.interface';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * "Shelfmark in 60 seconds" (HowItWorks.dc.html, board 1): the promo video with native controls,
 * captions on by default (it starts muted), and chapters that jump to their start. It plays at
 * once, except with reduced motion. Until the recording exists (#271) a note replaces the player.
 */
@Component({
  selector: 'app-how-it-works-dialog',
  imports: [ButtonComponent, DialogComponent, NoticeComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works-dialog.component.html',
  styleUrl: './how-it-works-dialog.component.scss',
})
export class HowItWorksDialogComponent {
  protected readonly video = HOW_IT_WORKS_VIDEO;
  protected readonly chapters = HOW_IT_WORKS_CHAPTERS;
  protected readonly autoplay =
    !inject(DOCUMENT).defaultView?.matchMedia?.(REDUCED_MOTION_QUERY).matches;
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
