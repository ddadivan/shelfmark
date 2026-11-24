import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  Injector,
  Service,
  signal,
} from '@angular/core';
import { runViewTransition } from '../../library/utils/view-transition';
import { LandingLoopGateDirective } from '../directives/landing-loop-gate.directive';
import { LANDING_LOOP } from '../models/landing-loop.const';
import type { LandingPreviewScope } from '../models/landing-preview-scope.type';
import { LANDING_PREVIEW_STATES } from '../models/landing-preview-states.const';
import type { LandingPreviewTab } from '../models/landing-preview-tab.type';
import { previewIsHome, previewStateIndex } from '../utils/landing-preview';
import { LandingMotionService } from './landing-motion.service';

/**
 * The app preview's cycle (16-landing), scoped to the preview: every 3.6 s the next frame (All
 * links › All, › Videos, Shopping, Favorites, Watch later); the feed changes through a View
 * Transition (each card glides) or, without one, a short fade. The toast shows on All links ›
 * All only. A click on a row or a tab picks its frame and the cycle resumes 6 s later. It runs
 * only while the preview is on screen in a visible tab (`LandingLoopGateDirective`); with reduced
 * motion nothing moves: the first frame stands with its toast.
 */
@Service({ autoProvided: false })
export class LandingPreviewCycleService {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly gate = inject(LandingLoopGateDirective);
  private readonly reduced = inject(LandingMotionService).reducedMotion;

  private readonly index = signal(0);
  private readonly held = signal(false);
  private readonly toastTimer = signal(false);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  readonly state = computed(() => LANDING_PREVIEW_STATES[this.reduced() ? 0 : this.index()]);
  /** The first frame is still on: the cards play their landing (never repeated). */
  readonly intro = signal(true);
  /** The fallback fade is running (no View Transitions in this browser). */
  readonly fading = signal(false);
  /** Each card carries its `view-transition-name` only while a transition runs. */
  readonly named = signal(false);
  readonly toast = computed(
    () => previewIsHome(this.state()) && (this.reduced() || this.toastTimer()),
  );

  constructor() {
    this.later(() => this.toastTimer.set(true), LANDING_LOOP.PreviewToastMs);
    effect((onCleanup) => {
      if (!this.gate.active() || this.held()) {
        return;
      }
      const timer = setInterval(
        () => this.show((this.index() + 1) % LANDING_PREVIEW_STATES.length),
        LANDING_LOOP.PreviewStepMs,
      );
      onCleanup(() => clearInterval(timer));
    });
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearTimeout(timer)));
  }

  /** A click on a sidebar row or a tab: its frame now, the cycle a little later. */
  pick(scope: LandingPreviewScope, tab: LandingPreviewTab): void {
    const index = previewStateIndex(scope, tab);
    if (index < 0 || this.reduced()) {
      return;
    }
    this.held.set(true);
    this.show(index);
    this.later(() => this.held.set(false), LANDING_LOOP.PreviewResumeMs);
  }

  private show(index: number): void {
    if (index === this.index()) {
      return;
    }
    const home = previewIsHome(LANDING_PREVIEW_STATES[index]);
    this.toastTimer.set(false);
    if (home) {
      this.later(() => this.toastTimer.set(true), LANDING_LOOP.PreviewToastAgainMs);
    }
    const update = (): void => {
      this.intro.set(false);
      this.index.set(index);
    };
    if ('startViewTransition' in this.document) {
      runViewTransition(this.document, this.injector, update, {
        on: () => this.named.set(true),
        off: () => this.named.set(false),
      });
      return;
    }
    this.fading.set(true);
    this.later(() => {
      update();
      this.fading.set(false);
    }, LANDING_LOOP.PreviewFadeMs);
  }

  private later(run: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, ms);
    this.timers.add(timer);
  }
}
