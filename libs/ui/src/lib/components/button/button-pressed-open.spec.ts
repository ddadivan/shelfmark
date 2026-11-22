import { describe, expect, it } from 'vitest';
import { compileScss } from '../../../testing/scss';

describe('ui-button pressed while open (#562 effect 8)', () => {
  const css = compileScss('lib/components/button/button.component.scss').replaceAll(/["']/g, '');
  const open = '[aria-haspopup]:not([aria-haspopup=false])[aria-expanded=true]';

  it('keeps the pressed background for popup triggers only', () => {
    expect(css).toContain(`.ui-button--secondary${open}:not(.ui-button--disclosure)`);
    expect(css).toContain(`.ui-button--primary${open}:not(.ui-button--disclosure)`);
  });

  it('marks an open secondary or ghost trigger with the accent tint (#564)', () => {
    for (const variant of ['secondary', 'ghost']) {
      const rule = css.split('}').find((r) => r.includes(`.ui-button--${variant}${open}`));
      expect(rule).toContain('background: var(--accent-bg)');
      expect(rule).toContain('color: var(--accent-text)');
    }
  });

  it('drops the press scale while open and leaves plain aria-expanded toggles alone', () => {
    expect(css).toMatch(/\.ui-button\[aria-haspopup\][^{]*\{\s*transform:\s*none/);
    // every rule on aria-expanded is scoped to a popup trigger
    const rules = css.split('}').filter((r) => r.includes('[aria-expanded=true]'));
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r).toContain('[aria-haspopup]');
    }
  });
});
