import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, IconComponent, LogoComponent } from '@shelfmark/ui';
import { LandingMotionService } from '../../landing-motion.service';
import { LANDING_CHAT_FEED_MESSAGES } from '../../models/landing-chat-feed-messages.const';
import { LANDING_CHAT_MESSAGES } from '../../models/landing-chat-messages.const';
import { LANDING_CHAT_PHASE } from '../../models/landing-chat-phase.const';
import type { LandingChatPhase } from '../../models/landing-chat-phase.type';
import { LANDING_CHAT_TIMING } from '../../models/landing-chat-timing.const';
import { LandingChatBubbleComponent } from './landing-chat-bubble/landing-chat-bubble.component';
import { LandingChatShelfComponent } from './landing-chat-shelf/landing-chat-shelf.component';

/**
 * The hero demo: a phone with the "Saved Messages" chat and a button that moves its links onto
 * the shelf.
 *
 * Motion (story 20): the chat plays its messages once. Every `MessageIntervalMs` the track rises
 * by one slot (`transform` only); the list is the feed twice, so after one lap the track shows the
 * same full chat as at the start and stops there. The feed runs only while the block is in the
 * viewport and the tab is visible. It is finite, so no pause control is needed (WCAG 2.2.2 asks
 * for one only for moving content that lasts more than five seconds and has no end). With
 * `prefers-reduced-motion` nothing moves: the chat shows its five links as a static frame and
 * the swap to the shelf is instant.
 */
@Component({
  selector: 'app-landing-chat',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    LandingChatBubbleComponent,
    IconComponent,
    LogoComponent,
    LandingChatShelfComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-chat.component.html',
  styleUrl: './landing-chat.component.scss',
  host: {
    '[style.--landing-chat-rise]': 'rise',
  },
})
export class LandingChatComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  /** Reduced motion and tab visibility, shared with the other landing animations. */
  private readonly motion = inject(LandingMotionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The five links of the static frame (reduced motion) and for assistive technology. */
  protected readonly messages = LANDING_CHAT_MESSAGES;
  /**
   * The feed twice: after `feedSize` rises the track looks the same as at the start. The
   * bubbles are rendered in small batches (the first one with the component), so no single task
   * renders all sixteen, and the loop starts only when they are all there.
   */
  protected readonly feed = computed(() =>
    [...LANDING_CHAT_FEED_MESSAGES, ...LANDING_CHAT_FEED_MESSAGES].slice(0, this.rendered()),
  );
  protected readonly rise = `${LANDING_CHAT_TIMING.RiseMs}ms`;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly feedSize = LANDING_CHAT_FEED_MESSAGES.length;
  /** How many feed bubbles are in the DOM so far. */
  private readonly rendered = signal<number>(LANDING_CHAT_TIMING.BatchSize);
  private readonly phase = signal<LandingChatPhase>(LANDING_CHAT_PHASE.Chat);
  private readonly inView = signal(false);
  private clearTimer: ReturnType<typeof setTimeout> | undefined;

  /** True once the links are on the shelf instead of in the chat. */
  protected readonly sorted = computed(() => this.phase() === LANDING_CHAT_PHASE.Shelf);
  /** The messages are leaving, the shelf is about to show. */
  protected readonly clearing = computed(() => this.phase() === LANDING_CHAT_PHASE.Clearing);
  /** The endless feed is rendered; otherwise the static final frame. */
  protected readonly animated = computed(() => !this.motion.reducedMotion());

  /** How many messages the track has risen; `0..feedSize`, where it stays. */
  protected readonly step = signal(0);
  /** The track jumps to its final frame without a transition (coming back from the shelf). */
  protected readonly snapping = signal(false);

  /** The feed has played all its messages and stays still. */
  protected readonly finished = computed(() => this.step() >= this.feedSize);

  protected readonly running = computed(
    () =>
      this.animated() &&
      !this.finished() &&
      this.inView() &&
      this.rendered() >= this.feedSize * 2 &&
      this.motion.tabVisible() &&
      this.phase() === LANDING_CHAT_PHASE.Chat,
  );

  constructor() {
    // Reduced motion switched on while the messages are leaving: show the shelf now instead of
    // flashing the static list.
    effect(() => {
      if (
        this.motion.reducedMotion() &&
        untracked(() => this.phase()) === LANDING_CHAT_PHASE.Clearing
      ) {
        clearTimeout(this.clearTimer);
        this.phase.set(LANDING_CHAT_PHASE.Shelf);
      }
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.clearTimer));

    // One timer while the feed may run; the cleanup stops it when it leaves the screen, ends or is destroyed.
    effect((onCleanup) => {
      if (!this.running()) {
        return;
      }
      const timer = setInterval(() => this.advance(), LANDING_CHAT_TIMING.MessageIntervalMs);
      onCleanup(() => clearInterval(timer));
    });

    afterNextRender(() => {
      this.watchViewport();
      this.fillFeed();
    });
  }

  protected toggle(): void {
    clearTimeout(this.clearTimer);
    if (this.phase() !== LANDING_CHAT_PHASE.Chat) {
      // Back in the chat the feed is shown complete and still: it does not play a second time.
      this.snapping.set(true);
      this.step.set(this.feedSize);
      this.phase.set(LANDING_CHAT_PHASE.Chat);
    } else if (this.animated()) {
      this.phase.set(LANDING_CHAT_PHASE.Clearing);
      this.clearTimer = setTimeout(
        () => this.phase.set(LANDING_CHAT_PHASE.Shelf),
        LANDING_CHAT_TIMING.ClearMs,
      );
    } else {
      this.phase.set(LANDING_CHAT_PHASE.Shelf);
    }
  }

  private advance(): void {
    this.snapping.set(false);
    this.step.update((value) => Math.min(value + 1, this.feedSize));
  }

  private fillFeed(): void {
    const total = this.feedSize * 2;
    if (!this.animated()) {
      // Reduced motion may be switched off later: the feed must then be complete at once.
      this.rendered.set(total);
      return;
    }
    // The first batch is part of the first render (the feed is never seen empty); the rest
    // follows in small steps so no single task renders every bubble.
    const timer = setInterval(() => {
      const next = Math.min(this.rendered() + LANDING_CHAT_TIMING.BatchSize, total);
      this.rendered.set(next);
      if (next >= total) {
        clearInterval(timer);
      }
    }, LANDING_CHAT_TIMING.BatchMs);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  private watchViewport(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.IntersectionObserver !== 'function') {
      this.inView.set(true);
      return;
    }
    const observer = new view.IntersectionObserver((entries) => {
      const latest = entries.at(-1);
      if (latest) {
        this.inView.set(latest.isIntersecting);
      }
    });
    observer.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
