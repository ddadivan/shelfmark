import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { COVER_CHOICES_MAX } from '../models/cover-choices-max.const';
import { coverOptions } from './cover-options';

const labels = {
  none: 'No cover',
  current: 'Current cover',
  option: (title: string) => `Cover from ${title}`,
};

function link(n: number, image = true): LinkResponse {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return {
    ...MOCK_LINKS[0],
    id,
    title: `Link ${n}`,
    imageUrl: image ? `/api/links/${id}/image?v=0123456789abcdef` : null,
  };
}

describe('coverOptions', () => {
  it('offers "No cover", then each link with a captured preview once', () => {
    const options = coverOptions([link(1), link(2, false), link(3), link(1)], null, labels);
    expect(options.map((option) => option.label)).toEqual([
      'No cover',
      'Cover from Link 1',
      'Cover from Link 3',
    ]);
    expect(options[0]).toEqual({ value: '', label: 'No cover', icon: 'close' });
    expect(options[1]?.image).toBe(link(1).imageUrl);
  });

  it('never binds a pending or foreign image path', () => {
    const pending = { ...link(4), imageUrl: `/api/links/${link(4).id}/image?v=pending` };
    const foreign = { ...link(5), imageUrl: 'https://evil.example/x.png' };
    expect(coverOptions([pending, foreign], null, labels)).toEqual([]);
  });

  it('caps the pictures and keeps the current cover when its link is not offered', () => {
    const many = Array.from({ length: COVER_CHOICES_MAX + 3 }, (_, i) => link(i + 10));
    const current = { id: link(99).id, url: link(99).imageUrl };
    const options = coverOptions(many, current, labels);
    expect(options).toHaveLength(COVER_CHOICES_MAX + 2);
    expect(options[1]).toEqual({ value: link(99).id, label: 'Current cover', image: current.url });
  });

  it('offers nothing when no link has a picture and there is no cover', () => {
    expect(coverOptions([link(1, false)], null, labels)).toEqual([]);
  });
});
