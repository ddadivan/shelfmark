import { LINK_CLICK_ACTION } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import type { PreviewClick } from '../models/preview-click.interface';
import { wantsPreview } from './wants-preview';

const base: PreviewClick = {
  url: 'https://angular.dev/guide',
  clickAction: LINK_CLICK_ACTION.Preview,
  newTabHosts: [],
  previewOpen: false,
  modifier: false,
};

describe('wantsPreview', () => {
  it('follows the setting on a plain click', () => {
    expect(wantsPreview(base)).toBe(true);
    expect(wantsPreview({ ...base, clickAction: LINK_CLICK_ACTION.Open })).toBe(false);
  });

  it('does the other one with a modifier', () => {
    expect(wantsPreview({ ...base, modifier: true })).toBe(false);
    expect(wantsPreview({ ...base, clickAction: LINK_CLICK_ACTION.Open, modifier: true })).toBe(
      true,
    );
  });

  it('switches an open preview whatever the site', () => {
    const open = { ...base, clickAction: LINK_CLICK_ACTION.Open, previewOpen: true };
    expect(
      wantsPreview({ ...open, url: 'https://github.com/a/b', newTabHosts: ['github.com'] }),
    ).toBe(true);
    expect(wantsPreview({ ...open, modifier: true })).toBe(false);
  });

  it('skips sites that open in a new tab and addresses a frame cannot show', () => {
    expect(
      wantsPreview({ ...base, url: 'https://github.com/a', newTabHosts: ['github.com'] }),
    ).toBe(false);
    expect(wantsPreview({ ...base, url: 'http://example.com' })).toBe(false);
  });

  it('always previews a video in its player', () => {
    expect(wantsPreview({ ...base, url: 'http://youtu.be/dQw4w9WgXcQ' })).toBe(true);
  });
});
