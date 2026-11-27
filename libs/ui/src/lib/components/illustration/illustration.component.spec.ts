import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import { IllustrationComponent } from './illustration.component';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationMotion } from './models/illustration-motion.type';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_NAMES } from './models/illustration-names.const';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

/** Compiles every sheet of the component (it loads one per concern, under the style budget). */
function compiledCss(): string {
  return compileScss('lib/components/illustration/illustration.component.scss');
}

interface Inputs {
  name: IllustrationName;
  motion?: IllustrationMotion;
  label?: string;
}

function render(inputs: Inputs) {
  const fixture = TestBed.createComponent(IllustrationComponent);
  fixture.componentRef.setInput('name', inputs.name);
  if (inputs.motion !== undefined) {
    fixture.componentRef.setInput('motion', inputs.motion);
  }
  if (inputs.label !== undefined) {
    fixture.componentRef.setInput('label', inputs.label);
  }
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function mode(host: HTMLElement): string[] {
  return Object.values(ILLUSTRATION_MOTION).filter((m) =>
    host.classList.contains(`ui-illustration--${m}`),
  );
}

/** Parts that are sage or danger: only allowed inside the focus group. */
const COLOURED =
  '[class*="ui-illustration__accent"], [class*="ui-illustration__danger"], .ui-illustration__handle';

class FakeObserver {
  static instances: FakeObserver[] = [];
  constructor(readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    FakeObserver.instances.push(this);
  }
  observe(): void {
    // Driven by the test.
  }
  unobserve(): void {
    // Driven by the test.
  }
  disconnect(): void {
    // Nothing to release.
  }
}

describe('IllustrationComponent', () => {
  describe.each(ILLUSTRATION_NAMES)('scene %s', (name) => {
    it('draws a square svg on the 120 grid with only token-based colours', () => {
      const { host } = render({ name });
      const svg = host.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 120 120');
      expect(svg?.querySelectorAll('rect, path, circle, ellipse').length).toBeGreaterThan(2);
      expect(host.querySelector('[fill], [stroke], [style]:not([style=""])')).toBeNull();
    });

    it('has one focus group and no sage or danger part outside it', () => {
      const { host } = render({ name });
      expect(host.querySelectorAll('.ui-illustration__focus')).toHaveLength(1);
      const outside = [...host.querySelectorAll(COLOURED)].filter(
        (el) => !el.closest('.ui-illustration__focus'),
      );
      expect(outside).toEqual([]);
    });

    it('has at most two sparks, all of them twinkling', () => {
      const { host } = render({ name });
      const sparks = host.querySelectorAll('.ui-illustration__spark');
      expect(sparks.length).toBeLessThanOrEqual(2);
      for (const spark of sparks) {
        expect(spark.classList.contains('ui-illustration__twinkle')).toBe(true);
      }
    });

    it('loops by default', () => {
      const { host } = render({ name });
      expect(ILLUSTRATION_DEFAULT_MOTION[name]).toBe(ILLUSTRATION_MOTION.Loop);
      expect(mode(host)).toEqual([ILLUSTRATION_MOTION.Loop]);
    });

    it.each<IllustrationMotion>(Object.values(ILLUSTRATION_MOTION))(
      'honours motion=%s',
      (motion) => {
        const { host } = render({ name, motion });
        expect(mode(host)).toEqual([motion]);
      },
    );
  });

  it('uses the sage tokens on every scene but error, which takes danger', () => {
    for (const name of ILLUSTRATION_NAMES) {
      const { host } = render({ name });
      const danger = host.querySelectorAll('[class*="ui-illustration__danger"]').length;
      expect(danger > 0).toBe(name === 'error');
    }
  });

  it('follows a later change of name and motion', () => {
    const { fixture, host } = render({ name: 'empty-feed' });
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.Loop]);
    fixture.componentRef.setInput('motion', ILLUSTRATION_MOTION.None);
    fixture.detectChanges();
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.None]);
    fixture.componentRef.setInput('name', 'welcome-find');
    fixture.componentRef.setInput('motion', ILLUSTRATION_MOTION.Once);
    fixture.detectChanges();
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.Once]);
  });

  describe('ids', () => {
    it('are unique per instance, so scenes can share a page', () => {
      const first = render({ name: 'not-found' });
      const second = render({ name: 'not-found' });
      const idOf = (host: HTMLElement) => host.querySelector('clipPath')?.getAttribute('id');
      const clipOf = (host: HTMLElement) =>
        host.querySelector('[clip-path]')?.getAttribute('clip-path');
      expect(idOf(first.host)).toBeTruthy();
      expect(idOf(first.host)).not.toBe(idOf(second.host));
      expect(clipOf(first.host)).toBe(`url(#${idOf(first.host)})`);
      expect(clipOf(second.host)).toBe(`url(#${idOf(second.host)})`);
    });

    it('never repeat in a scene', () => {
      for (const name of ILLUSTRATION_NAMES) {
        const { host } = render({ name });
        const ids = [...host.querySelectorAll('[id]')].map((el) => el.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('pausing', () => {
    beforeEach(() => {
      FakeObserver.instances = [];
      vi.stubGlobal('IntersectionObserver', FakeObserver);
    });
    afterEach(() => vi.unstubAllGlobals());

    function report(isIntersecting: boolean): void {
      for (const observer of FakeObserver.instances) {
        observer.callback([{ isIntersecting }]);
      }
    }

    it('is paused until the scene is on screen and again once it leaves', async () => {
      const { fixture, host } = render({ name: 'offline' });
      await fixture.whenStable();
      expect(host.classList.contains('ui-illustration--paused')).toBe(true);
      report(true);
      fixture.detectChanges();
      expect(host.classList.contains('ui-illustration--paused')).toBe(false);
      report(false);
      fixture.detectChanges();
      expect(host.classList.contains('ui-illustration--paused')).toBe(true);
    });

    it('is paused while the tab is hidden', async () => {
      const doc = TestBed.inject(DOCUMENT);
      let state: DocumentVisibilityState = 'visible';
      vi.spyOn(doc, 'visibilityState', 'get').mockImplementation(() => state);
      const { fixture, host } = render({ name: 'offline' });
      await fixture.whenStable();
      report(true);
      fixture.detectChanges();
      expect(host.classList.contains('ui-illustration--paused')).toBe(false);
      state = 'hidden';
      doc.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();
      expect(host.classList.contains('ui-illustration--paused')).toBe(true);
      state = 'visible';
      doc.dispatchEvent(new Event('visibilitychange'));
      fixture.detectChanges();
      expect(host.classList.contains('ui-illustration--paused')).toBe(false);
    });

    it('never pauses for want of an observer', () => {
      vi.unstubAllGlobals();
      const { host } = render({ name: 'offline' });
      expect(host.classList.contains('ui-illustration--paused')).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('is decorative without a label', async () => {
      const { host } = render({ name: 'offline' });
      expect(host.getAttribute('aria-hidden')).toBe('true');
      expect(host.hasAttribute('role')).toBe(false);
      expect(host.hasAttribute('aria-label')).toBe(false);
      expect(await axeViolations(host)).toEqual([]);
    });

    it('is an image with a name when labelled', async () => {
      const { host } = render({ name: 'offline', label: 'No connection' });
      expect(host.getAttribute('role')).toBe('img');
      expect(host.getAttribute('aria-label')).toBe('No connection');
      expect(host.hasAttribute('aria-hidden')).toBe(false);
      expect(await axeViolations(host)).toEqual([]);
    });
  });

  describe('style system', () => {
    const css = compiledCss();

    it('is square: 15rem by default, 10rem on a phone, through --ui-illustration-size', () => {
      expect(css).toMatch(/--ill-default-size:\s*15rem/);
      expect(css).toMatch(/width:\s*var\(--ui-illustration-size,\s*var\(--ill-default-size\)\)/);
      const phone = mediaBlocks(css, /width\s*<\s*40em|max-width:\s*39\.99em/).join('\n');
      expect(phone).toMatch(/--ill-default-size:\s*10rem/);
    });

    it('draws line widths that do not follow the drawn size', () => {
      expect(css).toMatch(/container-type:\s*inline-size/);
      expect(css).toMatch(/--ill-w-line:\s*clamp\(0\.125rem,\s*1\.04cqi,\s*0\.15625rem\)/);
      expect(css).toMatch(/--ill-w-handle:\s*clamp\(0\.28125rem,\s*2\.5cqi,\s*0\.375rem\)/);
      expect(css).toMatch(/--ill-w-edge:\s*1;/);
      expect(css).toMatch(/--ill-w-dash:\s*1\.5;/);
      expect(css).toMatch(/\.ui-illustration__card[^{]*\{[^}]*vector-effect:\s*non-scaling-stroke/);
      expect(css).toMatch(/stroke-linecap:\s*round/);
    });

    it('colours objects neutral and the focus detail sage, from tokens', () => {
      expect(css).toMatch(
        /\.ui-illustration__card\s*\{[^}]*fill:\s*var\(--surface\)[^}]*stroke:\s*var\(--line-strong\)/,
      );
      expect(css).toMatch(/\.ui-illustration__line\s*\{[^}]*fill:\s*var\(--surface-pressed\)/);
      expect(css).toMatch(/\.ui-illustration__ink\s*\{[^}]*stroke:\s*var\(--text-muted\)/);
      expect(css).toMatch(/\.ui-illustration__accent\s*\{[^}]*fill:\s*var\(--ai\)/);
      expect(css).toMatch(/\.ui-illustration__accent-tint\s*\{[^}]*fill:\s*var\(--ai-bg\)/);
      expect(css).toMatch(/\.ui-illustration__accent-edge\s*\{[^}]*stroke:\s*var\(--ai-line\)/);
      expect(css).toMatch(/\.ui-illustration__danger\s*\{[^}]*fill:\s*var\(--danger\)/);
      expect(css).toMatch(/\.ui-illustration__danger-tint\s*\{[^}]*fill:\s*var\(--danger-bg\)/);
      expect(css).not.toMatch(/:\s*(#[0-9a-f]{3,8}|rgb|hsl)/i);
      expect(css).not.toContain('--ui-illustration-edge');
      expect(css).not.toContain('--ui-illustration-key-edge');
    });

    it('declares no keyframes of its own', () => {
      expect(css).not.toContain('@keyframes');
    });
  });

  describe('motion styles', () => {
    const css = compiledCss();
    const loopRules = css
      .split('}')
      .filter((r) => r.includes(':host(.ui-illustration--loop)') && r.includes('animation:'));

    it('loops every moving part forever with ui-ill keyframes', () => {
      const active = loopRules.filter((r) => !r.includes('animation: none'));
      expect(active).toHaveLength(17);
      for (const rule of active) {
        expect(rule).toContain('infinite');
        expect(rule).toMatch(/animation:\s*ui-ill-[a-z-]+ /);
        const seconds = Number(/ (\d+(?:\.\d+)?)s /.exec(rule)?.[1]);
        expect(seconds).toBeGreaterThanOrEqual(1.4);
        expect(seconds).toBeLessThanOrEqual(5);
      }
    });

    it('plays one move of the marked parts in once mode and holds the end frame', () => {
      const rules = css
        .split('}')
        .filter(
          (r) =>
            r.includes(':host(.ui-illustration--once)') &&
            r.includes('animation:') &&
            !r.includes('animation: none'),
        );
      expect(rules.length).toBeGreaterThanOrEqual(8);
      for (const rule of rules) {
        expect(rule).toMatch(/ 1 \w+ both;/);
        expect(rule).not.toContain('infinite');
      }
    });

    it('pauses the clock of both modes, without touching the drawing', () => {
      const paused = css.split('}').filter((r) => r.includes('ui-illustration--paused'));
      expect(paused.length).toBe(25);
      for (const rule of paused) {
        expect(rule).toContain('animation-play-state: paused');
      }
    });

    it('has no rule for the none mode', () => {
      expect(css).not.toContain('ui-illustration--none');
    });

    it('removes every animation under reduced motion (OS and the app setting)', () => {
      const reduced = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/);
      expect(reduced).toHaveLength(25);
      for (const block of reduced) {
        expect(block).toMatch(/animation: none;/);
      }
      expect(css).toMatch(/\[data-motion=['"]?reduced['"]?\]/);
      // Outside the reduced block the animations are all there.
      expect(withoutMedia(css, /prefers-reduced-motion/)).toContain('infinite');
    });
  });
});
