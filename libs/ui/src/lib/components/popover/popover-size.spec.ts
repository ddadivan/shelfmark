import { describe, expect, it } from 'vitest';
import { compileScss } from '../../../testing/scss';

describe('ui-popover panel size (#572)', () => {
  const css = compileScss('lib/components/popover/popover.component.scss');

  it('takes its height cap from --ui-popover-max-block-size, 320px by default', () => {
    expect(css).toMatch(/max-block-size:\s*min\(var\(--ui-popover-max-block-size,\s*20rem\)/);
  });

  it('scrolls only vertically, never sideways', () => {
    expect(css).toMatch(/\.ui-popover__surface[^{]*\{[^}]*overflow:\s*hidden auto/);
  });
});
