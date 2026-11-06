import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { compile } from 'sass';
import { axeViolations } from '../../testing/axe';
import { IllustrationComponent } from './illustration.component';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationMotion } from './models/illustration-motion.type';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_NAMES } from './models/illustration-names.const';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

const SCSS_PATH = 'libs/ui/src/lib/illustration/illustration.component.scss';

/** Compiles the component styles; walks up from the cwd when the spec is bundled. */
function compiledCss(): string {
  const direct = import.meta.dirname;
  if (direct && existsSync(resolve(direct, 'illustration.component.scss'))) {
    return compile(resolve(direct, 'illustration.component.scss')).css;
  }
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(resolve(dir, SCSS_PATH))) {
      return compile(resolve(dir, SCSS_PATH)).css;
    }
    if (dirname(dir) === dir) {
      throw new Error(`Cannot find ${SCSS_PATH}`);
    }
  }
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

describe('IllustrationComponent', () => {
  describe.each(ILLUSTRATION_NAMES)('scene %s', (name) => {
    it('draws a non-empty svg with only token-based fills', () => {
      const { host } = render({ name });
      const svg = host.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 240 150');
      expect(svg?.querySelectorAll('rect, path, circle').length).toBeGreaterThan(2);
      expect(host.querySelector('[fill^="#"], [stroke^="#"], [style]')).toBeNull();
    });

    it('uses its default motion', () => {
      const { host } = render({ name });
      expect(mode(host)).toEqual([ILLUSTRATION_DEFAULT_MOTION[name]]);
    });

    it.each<IllustrationMotion>(Object.values(ILLUSTRATION_MOTION))(
      'honours motion=%s',
      (motion) => {
        const { host } = render({ name, motion });
        expect(mode(host)).toEqual([motion]);
      },
    );
  });

  it('defaults the welcome scenes to loop and the other five to once', () => {
    const welcome = ILLUSTRATION_NAMES.filter((n) => n.startsWith('welcome-'));
    expect(welcome).toHaveLength(3);
    for (const name of ILLUSTRATION_NAMES) {
      expect(ILLUSTRATION_DEFAULT_MOTION[name]).toBe(
        welcome.includes(name) ? ILLUSTRATION_MOTION.Loop : ILLUSTRATION_MOTION.Once,
      );
    }
  });

  it('follows a later change of name and motion', () => {
    const { fixture, host } = render({ name: 'empty-feed' });
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.Once]);
    fixture.componentRef.setInput('name', 'welcome-find');
    fixture.detectChanges();
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.Loop]);
    fixture.componentRef.setInput('motion', ILLUSTRATION_MOTION.None);
    fixture.detectChanges();
    expect(mode(host)).toEqual([ILLUSTRATION_MOTION.None]);
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

  describe('motion styles', () => {
    const css = compiledCss();

    it('loops forever with a cycle between 3 and 5 seconds', () => {
      const rules = css
        .split('}')
        .filter((r) => r.includes(':host(.ui-illustration--loop)') && r.includes('animation:'));
      expect(rules.length).toBeGreaterThanOrEqual(5);
      for (const rule of rules) {
        if (rule.includes('animation: none')) {
          continue;
        }
        expect(rule).toContain('infinite');
        const seconds = Number(/ (\d+(?:\.\d+)?)s /.exec(rule)?.[1]);
        expect(seconds).toBeGreaterThanOrEqual(3);
        expect(seconds).toBeLessThanOrEqual(5);
      }
    });

    it('plays once and holds the final frame', () => {
      const rules = css
        .split('}')
        .filter(
          (r) =>
            r.includes(':host(.ui-illustration--once)') &&
            r.includes('animation:') &&
            !r.includes('animation: none'),
        );
      expect(rules.length).toBeGreaterThanOrEqual(5);
      for (const rule of rules) {
        expect(rule).toMatch(/ 1 both;/);
        expect(rule).not.toContain('infinite');
      }
    });

    it('has no rule for the none mode', () => {
      expect(css).not.toContain('ui-illustration--none');
    });

    it('removes every animation under reduced motion', () => {
      const blocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
      // five parts, two modes each
      expect(blocks).toHaveLength(10);
      for (const block of blocks) {
        expect(block).toMatch(/animation: none;/);
      }
    });

    it('uses no hard-coded colours', () => {
      expect(css).not.toMatch(/:\s*#[0-9a-f]{3,8}/i);
    });
  });
});
