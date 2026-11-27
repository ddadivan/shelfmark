import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';

const region = compileScss('lib/components/toast/toast-region/toast-region.component.scss');
const toast = compileScss('lib/components/toast/toast.component.scss');

describe('toast styles', () => {
  it('centres the region at the bottom on every screen (author decision, no bottom-left)', () => {
    expect(region).toMatch(/:host\s*\{[^}]*justify-items:\s*center/);
    expect(region).not.toContain('flex-start');
    expect(mediaBlocks(region, /min-width/).join('')).not.toContain('justify-items');
  });

  it('uses one shrinkable column, so a long detail line never pushes the toasts off centre', () => {
    expect(region).toMatch(/:host\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('sits 24px up and lets the app lift it above its own bottom bar', () => {
    expect(region).toContain('var(--ui-toast-offset, var(--space-6))');
  });

  it('piles the toasts in one cell and fans them out on hover and focus', () => {
    expect(region).toMatch(/\.ui-toast-region__item\s*\{[^}]*grid-area:\s*1\s*\/\s*1/);
    expect(region).toMatch(/data-depth=['"]1['"]\]\s*\{[^}]*scale\(0\.95\)/);
    expect(region).toMatch(/data-depth=['"]2['"]\]\s*\{[^}]*scale\(0\.9\)/);
    expect(region).toContain(':host(:hover)');
    expect(region).toContain(':host(:focus-within)');
    expect(region).toMatch(/\.ui-toast-region__live\s*\{\s*display:\s*contents/);
  });

  it('plays the toast enter and leave presets, and no movement under reduced motion', () => {
    expect(region).toContain('ui-toast-in var(--duration-slow) var(--ease-spring) both');
    expect(region).toContain('ui-toast-out var(--duration-fast) var(--ease-in) both');
    expect(mediaBlocks(region, /prefers-reduced-motion/).join('')).toContain('ui-reveal');
    expect(mediaBlocks(region, /prefers-reduced-motion/).join('')).toContain('transition: none');
  });

  it('is the inverted surface with 12px corners, up to 40rem wide, with a truncating detail line', () => {
    expect(toast).toContain('box-shadow: var(--shadow-l2)');
    expect(toast).toContain('border-radius: var(--radius-md)');
    expect(toast).toMatch(/:host\s*\{[^}]*background:\s*var\(--text\)/);
    expect(toast).toMatch(/:host\s*\{[^}]*color:\s*var\(--ui-toast-ink\)/);
    expect(toast).not.toContain('--shadow-popover');
    expect(toast).toContain('max-inline-size: min(40rem, 100%)');
    // At least 30rem (up to 40rem) where there is room (author, Nov 27), 24px between the text and the controls.
    expect(toast).toContain('min-inline-size: min(30rem, 100%)');
    expect(toast).toMatch(/\.ui-toast__title\s*\{[^}]*line-height:\s*1\.2/);
    expect(toast).toMatch(/\.ui-toast__text\s*\{[^}]*margin-inline-end:\s*var\(--space-3\)/);
    expect(toast).toMatch(/\.ui-toast__detail\s*\{[^}]*text-overflow:\s*ellipsis/);
    expect(toast).toMatch(/\.ui-toast__detail\s*\{[^}]*white-space:\s*nowrap/);
  });

  it('puts the actions on their own line under the text on a phone (author, Nov 27)', () => {
    const phone = mediaBlocks(toast, /max-width|width\s*</).join('\n');
    expect(phone).toMatch(/:host[^{]*\{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.ui-toast__action[^{]*\{[^}]*order:\s*2/);
    expect(phone).toMatch(/\.ui-toast__close[^{]*\{[^}]*order:\s*1/);
  });

  it('tints the icon tile by kind', () => {
    expect(toast).toMatch(/ui-toast--success\)\s*\.ui-toast__icon\s*\{[^}]*var\(--ui-toast-tile\)/);
    expect(toast).toMatch(/ui-toast--danger\)\s*\.ui-toast__icon\s*\{[^}]*var\(--danger-bg\)/);
    expect(toast).toMatch(/ui-toast--warn\)\s*\.ui-toast__icon\s*\{[^}]*var\(--warning-bg\)/);
  });

  it('draws the countdown line without animation under reduced motion', () => {
    expect(toast).toContain('animation: ui-toast-count var(--ui-toast-duration, 8s) linear');
    expect(mediaBlocks(toast, /prefers-reduced-motion/).join('')).toContain('display: none');
    expect(toast).toMatch(
      /--paused\)\s*\.ui-toast__timer::after\s*\{\s*animation-play-state:\s*paused/,
    );
  });

  it('shows the key caps from the tablet breakpoint up only', () => {
    expect(withoutMedia(toast, /min-width/)).toMatch(/\.ui-toast__keys\s*\{[^}]*display:\s*none/);
    expect(mediaBlocks(toast, /40em/).join('')).toContain('display: inline-flex');
  });

  it('makes the action 44px on coarse pointers and hover only where hover exists', () => {
    expect(mediaBlocks(toast, /pointer:\s*coarse/).join('')).toContain('min-height: 2.75rem');
    expect(mediaBlocks(toast, /hover:\s*hover/).join('')).toContain('var(--ui-toast-tile-hover)');
    expect(withoutMedia(toast, /hover:\s*hover/)).not.toMatch(/:hover/);
  });
});
