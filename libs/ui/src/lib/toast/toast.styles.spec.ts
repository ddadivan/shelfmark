import { compileScss, mediaBlocks, withoutMedia } from '../../testing/scss';

const region = compileScss('lib/toast/toast-region.component.scss');
const toast = compileScss('lib/toast/toast.component.scss');

describe('toast styles', () => {
  it('centres the region at the bottom on every screen (author decision, no bottom-left)', () => {
    expect(region).toMatch(/:host\s*\{[^}]*align-items:\s*center/);
    expect(region).not.toContain('flex-start');
    expect(mediaBlocks(region, /min-width/).join('')).not.toContain('align-items');
  });

  it('lets the app lift the region above its own floating control', () => {
    expect(region).toContain('var(--ui-toast-offset, var(--space-4))');
  });

  it('uses the popover surface, a wrapping text and the 18rem to 28rem size range', () => {
    expect(toast).toContain('box-shadow: var(--shadow-popover)');
    expect(toast).toContain('border-radius: var(--radius-md)');
    expect(toast).toContain('min-width: min(18rem, 100%)');
    expect(toast).toContain('max-width: min(28rem, 100%)');
    expect(toast).toMatch(/\.ui-toast__text\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it('colours the icon by kind', () => {
    expect(toast).toMatch(/ui-toast--success\)\s*\.ui-toast__icon\s*\{\s*color:\s*var\(--accent\)/);
    expect(toast).toMatch(/ui-toast--error\)\s*\.ui-toast__icon\s*\{\s*color:\s*var\(--danger\)/);
    expect(toast).toMatch(/\.ui-toast__icon\s*\{\s*color:\s*var\(--text-muted\)/);
  });

  it('shows the key caps from the tablet breakpoint up only', () => {
    expect(withoutMedia(toast, /min-width/)).toMatch(/\.ui-toast__keys\s*\{[^}]*display:\s*none/);
    expect(mediaBlocks(toast, /40em/).join('')).toContain('display: inline-flex');
  });

  it('makes the action 44px on coarse pointers and hover only where hover exists', () => {
    expect(mediaBlocks(toast, /pointer:\s*coarse/).join('')).toContain('min-height: 2.75rem');
    expect(mediaBlocks(toast, /hover:\s*hover/).join('')).toContain('var(--accent-bg)');
    expect(withoutMedia(toast, /hover:\s*hover/)).not.toContain('background: var(--accent-bg)');
  });
});
