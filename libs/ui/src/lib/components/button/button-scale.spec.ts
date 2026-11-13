import { describe, expect, it } from 'vitest';
import { compileScss } from '../../../testing/scss';

const SCALE = 'var(--ui-button-scale, 1)';

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|})\\s*${escaped}\\s*{([^}]*)}`).exec(css);
  return match?.[1] ?? '';
}

describe('ButtonComponent --ui-button-scale', () => {
  const css = compileScss('lib/components/button/button.component.scss');

  it('multiplies the default box, gap and text', () => {
    const base = rule(css, '.ui-button');
    expect(base).toContain(`height: calc(2.5rem * ${SCALE})`);
    expect(base).toContain(`padding: 0 calc(1.125rem * ${SCALE})`);
    expect(base).toContain(`font-size: calc(0.8125rem * ${SCALE})`);
    expect(base).toContain(`line-height: calc(1.125rem * ${SCALE})`);
    expect(base).toContain(`gap: calc(var(--space-2) * ${SCALE})`);
  });

  it('passes the scale to the icons', () => {
    expect(rule(css, '.ui-button')).toContain(`--ui-icon-scale: ${SCALE}`);
    const icon = compileScss('lib/components/icon/icon.component.scss');
    expect(icon).toContain(
      'calc(var(--ui-icon-size, var(--icon-size-lg)) * var(--ui-icon-scale, 1))',
    );
  });

  it('multiplies the sm and lg sizes and the icon-only widths', () => {
    expect(rule(css, '.ui-button--lg')).toContain(`height: calc(3rem * ${SCALE})`);
    expect(rule(css, '.ui-button--lg')).toContain(`font-size: calc(0.9375rem * ${SCALE})`);
    expect(rule(css, '.ui-button--sm')).toContain(
      `height: calc(var(--ui-button-sm-size, 2rem) * ${SCALE})`,
    );
    expect(rule(css, '.ui-button--icon')).toContain(`width: calc(2.5rem * ${SCALE})`);
  });

  it('chip and favicon read their own scale properties', () => {
    expect(compileScss('lib/components/chip/chip.component.scss')).toContain(
      'height: calc(1.75rem * var(--ui-chip-scale, 1))',
    );
    expect(compileScss('lib/components/favicon/favicon.component.scss')).toContain(
      'width: calc(1rem * var(--ui-favicon-scale, 1))',
    );
  });
});
