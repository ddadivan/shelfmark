import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createTranslated } from '../../../../../testing/create-translated';
import { LANDING_CHAT_TIMING } from '../../models/landing-chat-timing.const';
import { LandingChatComponent } from './landing-chat.component';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {
    FakeIntersectionObserver.instances.push(this);
  }

  emit(isIntersecting: boolean): void {
    this.callback([{ isIntersecting }]);
  }
}

let motionListeners: ((event: { matches: boolean }) => void)[] = [];

function stubReducedMotion(reduced: boolean): void {
  motionListeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
        motionListeners.push(listener),
      removeEventListener: vi.fn(),
    })),
  );
}

function setTabState(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('LandingChatComponent', () => {
  let fixture: ComponentFixture<LandingChatComponent>;
  let root: HTMLElement;

  const track = (): HTMLElement => {
    const element = root.querySelector<HTMLElement>('.landing-chat__track');
    if (!element) {
      throw new Error('The live feed is not rendered');
    }
    return element;
  };
  const step = (): string => track().style.getPropertyValue('--landing-chat-step');
  const observer = (): FakeIntersectionObserver => FakeIntersectionObserver.instances[0];
  const shelfButton = (): HTMLButtonElement | undefined =>
    Array.from(root.querySelectorAll('button')).at(-1);
  const settle = (): void => TestBed.tick();
  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    settle();
  };
  const click = (): void => {
    shelfButton()?.click();
    settle();
  };

  async function create(options: { reduced: boolean }): Promise<void> {
    stubReducedMotion(options.reduced);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    fixture = await createTranslated(LandingChatComponent);
    root = fixture.nativeElement as HTMLElement;
    vi.useFakeTimers();
  }

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
  });

  afterEach(() => {
    setTabState('visible');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('reduced motion', () => {
    beforeEach(() => create({ reduced: true }));

    it('has no pause button, since nothing moves', () => {
      expect(root.querySelectorAll('button')).toHaveLength(1);
    });

    it('shows the static frame with five links and starts no timers', () => {
      observer().emit(true);
      settle();
      advance(10 * LANDING_CHAT_TIMING.MessageIntervalMs);

      expect(root.textContent).toContain('Saved Messages');
      expect(root.querySelectorAll('.landing-chat__message')).toHaveLength(5);
      expect(root.querySelector('.landing-chat__track')).toBeNull();
      expect(root.textContent).toContain('youtube.com/watch?v=ng22-signal-forms');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('swaps to the shelf and back at once', () => {
      click();

      expect(root.querySelectorAll('.landing-chat-shelf__folder')).toHaveLength(4);
      expect(root.querySelectorAll('.landing-chat-shelf__card')).toHaveLength(5);
      expect(root.textContent).toContain('Your shelf');
      expect(shelfButton()?.textContent?.trim()).toBe('Show the chat again');
      expect(vi.getTimerCount()).toBe(0);

      click();

      expect(root.querySelectorAll('.landing-chat__message')).toHaveLength(5);
    });

    it('has no axe violations in either state', async () => {
      vi.useRealTimers();
      expect(await axeViolations(root)).toEqual([]);

      click();

      expect(await axeViolations(root)).toEqual([]);
    });
  });

  describe('endless feed', () => {
    beforeEach(() => create({ reduced: false }));

    it('renders the feed twice, hidden from assistive technology, with a readable copy', () => {
      expect(root.querySelectorAll('.landing-chat__slot')).toHaveLength(16);
      expect(track().getAttribute('aria-hidden')).toBe('true');
      expect(root.querySelectorAll('.landing-chat__sr li')).toHaveLength(5);
      expect(shelfButton()?.textContent?.trim()).toBe('Put them on the shelf');
    });

    it('waits for the block to enter the viewport', () => {
      advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);

      expect(step()).toBe('0');
      expect(vi.getTimerCount()).toBe(0);
      expect(observer().observe).toHaveBeenCalledWith(fixture.nativeElement);
    });

    it('adds a message every 1.8 s once in view', () => {
      observer().emit(true);
      settle();

      advance(LANDING_CHAT_TIMING.MessageIntervalMs - 1);
      expect(step()).toBe('0');
      advance(1);
      expect(step()).toBe('1');
      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('2');
    });

    it('takes the rise duration from the timing constants', () => {
      expect(root.style.getPropertyValue('--landing-chat-rise')).toBe(
        `${LANDING_CHAT_TIMING.RiseMs}ms`,
      );
    });

    it('wraps seamlessly after a lap: snap back without a transition, then rise again', () => {
      observer().emit(true);
      settle();
      advance(8 * LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('8');
      expect(track().classList).not.toContain('landing-chat__track--snap');

      track().dispatchEvent(new Event('transitionend'));
      settle();
      expect(step()).toBe('0');
      expect(track().classList).toContain('landing-chat__track--snap');

      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('1');
      expect(track().classList).not.toContain('landing-chat__track--snap');
    });

    it('recovers when the transition end was missed', () => {
      observer().emit(true);
      settle();
      advance(9 * LANDING_CHAT_TIMING.MessageIntervalMs);

      expect(step()).toBe('0');
      expect(track().classList).toContain('landing-chat__track--snap');
    });

    it('pauses when the block leaves the viewport and resumes when it returns', () => {
      observer().emit(true);
      settle();
      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('1');

      observer().emit(false);
      settle();
      expect(vi.getTimerCount()).toBe(0);
      advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('1');

      observer().emit(true);
      settle();
      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('2');
    });

    it('pauses while the tab is hidden', () => {
      observer().emit(true);
      settle();

      setTabState('hidden');
      settle();
      expect(vi.getTimerCount()).toBe(0);
      advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('0');

      setTabState('visible');
      settle();
      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('1');
    });

    describe('pause paths (WCAG 2.2.2)', () => {
      const pauseButton = (): HTMLButtonElement =>
        Array.from(root.querySelectorAll('button')).find((button) =>
          button.textContent?.includes('Pause the feed'),
        ) as HTMLButtonElement;

      const phone = (): HTMLElement => root.querySelector('.landing-chat__phone') as HTMLElement;

      beforeEach(() => {
        observer().emit(true);
        settle();
      });

      it('resumes when unpausing with focus on the pause button', () => {
        // Focus and pointer on the button are outside the phone, so they never hold the feed.
        pauseButton().dispatchEvent(new Event('focusin', { bubbles: true }));
        pauseButton().dispatchEvent(new Event('pointerenter', { bubbles: true }));
        pauseButton().click();
        settle();
        expect(vi.getTimerCount()).toBe(0);

        pauseButton().click();
        settle();
        advance(LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('1');
      });

      it('stops and restarts the feed with the pause button, announced by aria-pressed', () => {
        expect(pauseButton().getAttribute('aria-pressed')).toBe('false');

        pauseButton().click();
        settle();
        expect(pauseButton().getAttribute('aria-pressed')).toBe('true');
        expect(vi.getTimerCount()).toBe(0);
        advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('0');

        pauseButton().click();
        settle();
        advance(LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('1');
      });

      it('pauses while the pointer is over the chat and resumes when it leaves', () => {
        phone().dispatchEvent(new Event('pointerenter'));
        settle();
        expect(vi.getTimerCount()).toBe(0);
        advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('0');

        phone().dispatchEvent(new Event('pointerleave'));
        settle();
        advance(LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('1');
      });

      it('pauses while focus is inside the chat and resumes on focusout', () => {
        phone().dispatchEvent(new Event('focusin'));
        settle();
        expect(vi.getTimerCount()).toBe(0);
        advance(5 * LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('0');

        phone().dispatchEvent(new Event('focusout'));
        settle();
        advance(LANDING_CHAT_TIMING.MessageIntervalMs);
        expect(step()).toBe('1');
      });

      it('hides the pause button on the shelf', () => {
        click();
        advance(LANDING_CHAT_TIMING.ClearMs);

        expect(pauseButton()).toBeUndefined();
      });
    });

    it('starts from the first frame when the chat comes back', () => {
      observer().emit(true);
      settle();
      advance(3 * LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('3');
      click();
      advance(LANDING_CHAT_TIMING.ClearMs);

      click();

      expect(step()).toBe('0');
    });

    it('shows the shelf at once when reduced motion turns on while the messages clear', () => {
      observer().emit(true);
      settle();
      click();

      motionListeners.forEach((listener) => listener({ matches: true }));
      settle();

      expect(root.querySelector('app-landing-chat-shelf')).not.toBeNull();
      expect(root.querySelector('.landing-chat__messages')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('clears its timer and listeners on destroy', () => {
      observer().emit(true);
      settle();
      expect(vi.getTimerCount()).toBe(1);

      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
      expect(observer().disconnect).toHaveBeenCalled();
    });

    it('clears the messages, then lands the links on the shelf', () => {
      observer().emit(true);
      settle();

      click();
      expect(root.querySelector('.landing-chat__feed--clearing')).not.toBeNull();
      expect(root.querySelector('app-landing-chat-shelf')).toBeNull();
      advance(LANDING_CHAT_TIMING.ClearMs - 1);
      expect(root.querySelector('app-landing-chat-shelf')).toBeNull();
      advance(1);

      expect(root.querySelector('.landing-chat__feed')).toBeNull();
      expect(root.querySelectorAll('.landing-chat-shelf__folder')).toHaveLength(4);
      expect(root.querySelectorAll('.landing-chat-shelf__card')).toHaveLength(5);
      expect(shelfButton()?.textContent?.trim()).toBe('Show the chat again');
      // Staggered landing: later cards start later.
      const delays = Array.from(
        root.querySelectorAll<HTMLElement>('.landing-chat-shelf__card'),
      ).map((card) => card.style.animationDelay);
      expect(delays[0]).toBe('0ms');
      expect(delays[1]).toBe(`${LANDING_CHAT_TIMING.CardStaggerMs}ms`);
      expect(new Set(delays).size).toBe(5);
      // The feed is paused on the shelf.
      expect(vi.getTimerCount()).toBe(0);
    });

    it('stops the feed while the messages clear and resumes in the chat', () => {
      observer().emit(true);
      settle();

      click();
      expect(vi.getTimerCount()).toBe(1);
      click();

      expect(root.querySelector('.landing-chat__feed--clearing')).toBeNull();
      expect(root.querySelector('.landing-chat__track')).not.toBeNull();
      advance(LANDING_CHAT_TIMING.ClearMs * 2);
      expect(root.querySelector('app-landing-chat-shelf')).toBeNull();
      advance(LANDING_CHAT_TIMING.MessageIntervalMs);
      expect(step()).toBe('1');
    });

    it('returns from the shelf to the live chat', () => {
      observer().emit(true);
      settle();
      click();
      advance(LANDING_CHAT_TIMING.ClearMs);

      click();

      expect(root.querySelector('.landing-chat__track')).not.toBeNull();
      expect(root.querySelector('app-landing-chat-shelf')).toBeNull();
    });

    it('has no axe violations in either state', async () => {
      vi.useRealTimers();
      expect(await axeViolations(root)).toEqual([]);

      click();
      await new Promise((resolve) => setTimeout(resolve, LANDING_CHAT_TIMING.ClearMs + 50));
      settle();

      expect(await axeViolations(root)).toEqual([]);
    });
  });
});
