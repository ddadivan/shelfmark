import { compileScss } from '../../testing/scss';

describe('dialog sizes (CSS)', () => {
  it('gives the dialog one 24px icon size for its buttons, selects and chips', () => {
    expect(compileScss('lib/dialog/dialog.component.scss')).toMatch(
      /--ui-dialog-icon-size:\s*var\(--icon-size-lg\)/,
    );
    for (const file of [
      'lib/button/button.component.scss',
      'lib/select/select.component.scss',
      'lib/chip/chip.component.scss',
    ]) {
      expect(compileScss(file)).toMatch(/--ui-icon-size:\s*var\(--ui-dialog-icon-size\)/);
    }
  });

  it('spaces the footer buttons by --space-4', () => {
    const css = compileScss('lib/dialog/dialog.component.scss');
    expect(css).toMatch(/\.ui-dialog__foot\s*\{[^}]*gap:\s*var\(--space-4\)/);
  });
});

describe('pressed menu trigger (CSS)', () => {
  it('shows the pressed state while aria-expanded is true', () => {
    const css = compileScss('lib/button/button.component.scss');
    expect(css).toMatch(
      /\.ui-button--secondary\[aria-expanded=true\][^{]*\{[^}]*--surface-pressed/,
    );
    expect(css).toMatch(/\.ui-button--primary\[aria-expanded=true\]\s*\{[^}]*--primary-hover/);
  });
});

describe('empty state actions (CSS)', () => {
  it('equal-width buttons, 12px apart, wrapping', () => {
    const css = compileScss('lib/empty-state/empty-state.component.scss');
    expect(css).toMatch(/--ui-button-min-width:\s*10rem/);
    expect(css).toMatch(/\.ui-empty-state__actions\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.ui-empty-state__actions\s*\{[^}]*gap:\s*var\(--space-3\)/);
  });
});
