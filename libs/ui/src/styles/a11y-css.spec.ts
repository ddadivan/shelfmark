import { describe, expect, it } from 'vitest';
import { compileScss } from '../testing/scss';

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
