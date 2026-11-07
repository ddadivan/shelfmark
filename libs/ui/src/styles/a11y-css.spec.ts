import { describe, expect, it } from 'vitest';
import { compileScss, mediaBlocks } from '../testing/scss';

/** Returns every top-level rule whose selector contains `selector`. */
function rulesFor(css: string, selector: RegExp): string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => selector.test(m[1]))
    .map((m) => m[0]);
}

/** Rules the accessibility audit (#62) removed: the new `text-muted` makes them unnecessary. */
describe('contrast workarounds are gone', () => {
  it('the segmented control uses text-muted as it is', () => {
    const css = compileScss('lib/segmented-control/segmented-control.component.scss');
    expect(css).not.toContain('var(--text-muted) 70%');
    expect(css).toContain('color: var(--text-muted)');
  });

  it('the selected card and list item keep the muted meta colour', () => {
    const card = compileScss('lib/card/card.component.scss');
    const row = compileScss('lib/list-item/list-item.component.scss');
    expect(rulesFor(card, /selected[^{]*__meta/)).toEqual([]);
    expect(rulesFor(row, /selected[^{]*__meta/)).toEqual([]);
  });

  it('the radio group keeps text-muted on the checked option', () => {
    const css = compileScss('lib/radio-group/radio-group.component.scss');
    expect(rulesFor(css, /checked[^{]*__desc/)).toEqual([]);
  });

  it('the tooltip shortcut is dimmed by colour, not opacity', () => {
    const css = compileScss('lib/tooltip/tooltip-panel.component.scss');
    const [kbd] = rulesFor(css, /__kbd/);
    expect(kbd).toContain('color-mix');
    expect(kbd).not.toContain('opacity');
  });

  it('the loading story does not dim stale lines with opacity', () => {
    const css = compileScss('../.storybook/loading-stories.scss');
    const [lines] = rulesFor(css, /\.ls-lines/);
    expect(lines).toBeDefined();
    expect(lines).not.toContain('opacity');
  });
});

describe('target sizes', () => {
  const coarse = (css: string) => mediaBlocks(css, /pointer:\s*coarse/).join('\n');

  it('the chip remove button has a hit area that stops 3px short of the next chip', () => {
    const css = compileScss('lib/chip/chip.component.scss');
    expect(css).toMatch(
      /__remove::after\s*{[^}]*inset: -0\.375rem -0\.1875rem -0\.375rem -0\.25rem/,
    );
    expect(coarse(css)).toMatch(
      /__remove::after\s*{[^}]*inset: -0\.875rem -0\.1875rem -0\.875rem -0\.625rem/,
    );
  });

  it('the input clear button is widened on coarse pointers', () => {
    const css = compileScss('lib/input/input.component.scss');
    expect(coarse(css)).toMatch(/::after\s*{[^}]*inset: -0\.625rem/);
  });

  it('the segmented control and breadcrumbs reach 44px on coarse pointers', () => {
    const seg = coarse(compileScss('lib/segmented-control/segmented-control.component.scss'));
    expect(seg).toContain('min-width: 2.75rem');
    expect(seg).toContain('height: 2.75rem');
    const crumbs = coarse(compileScss('lib/breadcrumbs/breadcrumbs.component.scss'));
    expect(crumbs).toContain('min-height: 2.75rem');
  });

  it('tree rows are 44px on a phone and on coarse pointers', () => {
    const css = compileScss('lib/tree/tree.component.scss');
    expect(coarse(css)).toContain('min-height: 2.75rem');
    expect(mediaBlocks(css, /width < 40em/).join('\n')).toContain('min-height: 2.75rem');
  });
});
