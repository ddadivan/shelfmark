import { compileScss, mediaBlocks } from '../../../../testing/scss';

describe('touch target size', () => {
  it.each([
    [
      'ui-menu-item',
      'lib/components/menu/menu-item/menu-item.component.scss',
      /\.ui-menu-item\s*{[^}]*min-height: 2\.75rem/,
    ],
    [
      'ui-list-item',
      'lib/components/list-item/list-item.component.scss',
      /:host\s*{[^}]*min-height: 2\.75rem/,
    ],
  ])('%s is 2.75rem tall on coarse pointers', (_name, path, rule) => {
    const coarse = mediaBlocks(compileScss(path), /pointer:\s*coarse/).join('\n');
    expect(coarse).toMatch(rule);
  });
});
