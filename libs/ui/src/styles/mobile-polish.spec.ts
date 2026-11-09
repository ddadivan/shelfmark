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

  it('stacks the dialog footer on a phone, primary on top, destructive last', () => {
    const css = compileScss('lib/dialog/dialog.component.scss');
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-dialog__foot\s*\{[^}]*flex-flow:\s*column-reverse nowrap/);
    expect(phone).toMatch(/\.ui-dialog__foot\s*\{[^}]*align-items:\s*stretch/);
    expect(withoutMedia(css, PHONE)).not.toContain('column-reverse');
  });

  it('makes the slotted footer actions full width on a phone only', () => {
    const css = dialogLayoutCss();
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-dialog__foot > \*\s*\{[^}]*inline-size:\s*100%/);
    expect(phone).toMatch(/\.ui-dialog__foot > ui-button \.ui-button\s*\{[^}]*100%/);
    expect(withoutMedia(css, PHONE)).not.toContain('ui-dialog__foot');
  });

  it('hides the Esc cap and keeps the footer hints readable by screen readers on a phone', () => {
    const css = compileScss('lib/command-list/command-list.component.scss');
    const phone = mediaBlocks(css, PHONE).join('\n');
    expect(phone).toMatch(/\.ui-command-list__field > kbd\s*\{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.ui-command-list__footer\s*\{[^}]*clip-path:\s*inset\(50%\)/);
    expect(phone).not.toMatch(/\.ui-command-list__footer\s*\{[^}]*display:\s*none/);
    expect(withoutMedia(css, PHONE)).toMatch(/\.ui-command-list__footer\s*\{[^}]*padding/);
  });

  it.each([
    'lib/breadcrumbs/breadcrumbs.component.scss',
    'lib/radio-group/radio-group.component.scss',
    'lib/checkbox/checkbox.component.scss',
  ])('%s has a pressed state', (file) => {
    expect(compileScss(file)).toContain(':active');
  });
});
