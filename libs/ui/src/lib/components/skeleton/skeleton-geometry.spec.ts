import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** The mixins of `styles/_card-geometry.scss` the card and its placeholder both have to include. */
const SHARED = [
  '@include card-body',
  '@include card-meta-text',
  '@include card-title-text',
  '@include card-source-row',
  '@include card-tags-row',
];

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), 'libs/ui/src/lib/components', path), 'utf8');
}

describe('skeleton card geometry', () => {
  const card = read('card/card-content.scss');
  const skeleton = read('skeleton/skeleton.component.scss');

  it.each(SHARED)('the card and its skeleton share %s', (mixin) => {
    expect(card).toContain(mixin);
    expect(skeleton).toContain(mixin);
  });

  it('the preview ratio comes from one variable', () => {
    expect(read('card/card.component.scss')).toContain('$card-media-ratio');
    expect(skeleton).toContain('$card-media-ratio');
    expect(read('../../styles/_card-geometry.scss')).toContain("$card-media-ratio: '4 / 3'");
  });
});
