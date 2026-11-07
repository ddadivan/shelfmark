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
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, IconComponent, LogoComponent } from '@shelfmark/ui';
import { LANDING_CHAT_FEED_MESSAGES } from '../../models/landing-chat-feed-messages.const';
import { LANDING_CHAT_MESSAGES } from '../../models/landing-chat-messages.const';
import { LANDING_CHAT_PHASE } from '../../models/landing-chat-phase.const';
import type { LandingChatPhase } from '../../models/landing-chat-phase.type';
import { LANDING_CHAT_TIMING } from '../../models/landing-chat-timing.const';
import { LandingChatBubbleComponent } from './landing-chat-bubble/landing-chat-bubble.component';
import { LandingChatShelfComponent } from './landing-chat-shelf/landing-chat-shelf.component';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The hero demo: a phone with the "Saved Messages" chat and a button that moves its links onto
 * the shelf.
 *
 * Motion (story 20): the chat is an endless feed. Every `MessageIntervalMs` the track rises by one
 * slot (`transform` only); the list is the feed twice, so after one lap the track snaps back
 * unseen. The loop runs only while the block is in the viewport and the tab is visible. With
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
    '(pointerenter)': 'hovered.set(true)',
    '(pointerleave)': 'hovered.set(false)',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'focused.set(false)',
  },
})
export class LandingChatComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The five links of the static frame (reduced motion) and for assistive technology. */
  protected readonly messages = LANDING_CHAT_MESSAGES;
  /** The feed twice: after `feedSize` rises the track looks the same as at the start. */
  protected readonly feed = [...LANDING_CHAT_FEED_MESSAGES, ...LANDING_CHAT_FEED_MESSAGES];
  protected readonly rise = `${LANDING_CHAT_TIMING.RiseMs}ms`;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly feedSize = LANDING_CHAT_FEED_MESSAGES.length;
  private readonly phase = signal<LandingChatPhase>(LANDING_CHAT_PHASE.Chat);
  private readonly reducedMotion = signal(false);
  private readonly inView = signal(false);
  private readonly tabVisible = signal(true);
  private readonly hovered = signal(false);
  private readonly focused = signal(false);
  /** The visitor stopped the feed with the pause button (WCAG 2.2.2). */
  protected readonly userPaused = signal(false);
  private clearTimer: ReturnType<typeof setTimeout> | undefined;

  /** True once the links are on the shelf instead of in the chat. */
  protected readonly sorted = computed(() => this.phase() === LANDING_CHAT_PHASE.Shelf);
  /** The messages are leaving, the shelf is about to show. */
  protected readonly clearing = computed(() => this.phase() === LANDING_CHAT_PHASE.Clearing);
  /** The endless feed is rendered; otherwise the static final frame. */
  protected readonly animated = computed(() => !this.reducedMotion());

  /** How many messages the track has risen; `0..feedSize`. */
  protected readonly step = signal(0);
  /** The track jumps back to the start without a transition. */
  protected readonly snapping = signal(false);

  protected readonly running = computed(
    () =>
      this.animated() &&
      !this.userPaused() &&
      !this.hovered() &&
      !this.focused() &&
      this.inView() &&
      this.tabVisible() &&
      this.phase() === LANDING_CHAT_PHASE.Chat,
  );

  constructor() {
    this.watchReducedMotion();
    this.watchTab();
    this.destroyRef.onDestroy(() => clearTimeout(this.clearTimer));

    // One timer while the feed may run; the cleanup stops it on pause and on destroy.
    effect((onCleanup) => {
      if (!this.running()) {
        return;
      }
      const timer = setInterval(() => this.advance(), LANDING_CHAT_TIMING.MessageIntervalMs);
      onCleanup(() => clearInterval(timer));
    });

    afterNextRender(() => this.watchViewport());
  }

  protected toggle(): void {
    clearTimeout(this.clearTimer);
    if (this.phase() !== LANDING_CHAT_PHASE.Chat) {
      // Back in the chat the feed starts from its first frame, so it never waits on a stale lap.
      this.step.set(0);
      this.snapping.set(false);
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

  protected togglePause(): void {
    this.userPaused.update((value) => !value);
  }

  /** After the last rise of a lap the track is back at the start: jump there, nobody sees it. */
  protected onRiseEnd(event: TransitionEvent): void {
    if (event.target === event.currentTarget && this.step() >= this.feedSize) {
      this.snapping.set(true);
      this.step.set(0);
    }
  }

  private advance(): void {
    if (this.step() >= this.feedSize) {
      // `transitionend` did not arrive (the tab was throttled): recover instead of running out
      // of messages.
      this.snapping.set(true);
      this.step.set(0);
      return;
    }
    this.snapping.set(false);
    this.step.update((value) => value + 1);
  }

  private watchReducedMotion(): void {
    const query = this.document.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) {
      return;
    }
    this.reducedMotion.set(query.matches);
    const onChange = (event: MediaQueryListEvent): void => {
      this.reducedMotion.set(event.matches);
      if (event.matches && this.phase() === LANDING_CHAT_PHASE.Clearing) {
        // No movement any more: show the shelf now instead of flashing the static list.
        clearTimeout(this.clearTimer);
        this.phase.set(LANDING_CHAT_PHASE.Shelf);
      }
    };
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  private watchTab(): void {
    const sync = (): void => this.tabVisible.set(this.document.visibilityState !== 'hidden');
    sync();
    this.document.addEventListener('visibilitychange', sync);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', sync));
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
