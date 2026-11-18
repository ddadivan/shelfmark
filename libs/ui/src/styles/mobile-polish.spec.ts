import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileString } from 'sass';
import { compileScss, mediaBlocks, withoutMedia } from '../testing/scss';

const PHONE = /width\s*<\s*40em/;
const STYLES_DIR = resolve(process.cwd(), 'libs/ui/src/styles');

function dialogLayoutCss(): string {
  return compileString("@use 'ui' as *;\n@include dialog-layout;", { loadPaths: [STYLES_DIR] }).css;
}

describe('mobile polish styles', () => {
  it('turns the default tap highlight off on the root', () => {
    const source = readFileSync(resolve(STYLES_DIR, 'global.scss'), 'utf8');
    expect(source).toMatch(/html\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
  });

  it('wraps the dialog footer on a phone: the main action on its own row below the others (#512)', () => {
    const css = compileScss('lib/components/dialog/dialog.component.scss');
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-dialog__foot\s*\{[^}]*flex-flow:\s*row wrap/);
    expect(phone).toMatch(/\.ui-dialog__foot\s*\{[^}]*align-items:\s*stretch/);
    expect(withoutMedia(css, PHONE)).not.toContain('row wrap');
    expect(css).not.toContain('column-reverse');
  });

  it('shares the row above the main action in equal widths on a phone only (#512)', () => {
    const css = dialogLayoutCss();
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-dialog__foot > \*\s*\{[^}]*flex:\s*1 1 0/);
    expect(phone).toMatch(/\.ui-dialog__foot > :last-child\s*\{[^}]*flex:\s*0 0 100%/);
    expect(phone).toMatch(/\.ui-dialog__foot > ui-button \.ui-button\s*\{[^}]*100%/);
    expect(phone).toMatch(/ui-dialog-cancel--with-close[^{]*\{[^}]*display:\s*none/);
    expect(withoutMedia(css, PHONE)).not.toContain('ui-dialog__foot');
  });

  it('hides the Esc cap and keeps the footer hints readable by screen readers on a phone', () => {
    const css = compileScss('lib/components/command-list/command-list.component.scss');
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-command-list__field > kbd\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ui-command-list__footer\s*\{[^}]*clip-path:\s*inset\(50%\)/);
    expect(phone).not.toMatch(/\.ui-command-list__footer\s*\{[^}]*display:\s*none/);
    expect(withoutMedia(css, PHONE)).toMatch(/\.ui-command-list__footer\s*\{[^}]*padding/);
  });

  it.each([
    'lib/components/breadcrumbs/breadcrumbs.component.scss',
    'lib/components/radio-group/radio-group.component.scss',
    'lib/components/checkbox/checkbox.component.scss',
  ])('%s has a pressed state', (file) => {
    expect(compileScss(file)).toContain(':active');
  });
});
