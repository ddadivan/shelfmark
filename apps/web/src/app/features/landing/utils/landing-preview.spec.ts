import { LANDING_FOLDER } from '../models/landing-folder.const';
import { LANDING_PREVIEW_CARDS } from '../models/landing-preview-cards.const';
import { LANDING_PREVIEW_KIND } from '../models/landing-preview-kind.const';
import { LANDING_PREVIEW_SCOPE } from '../models/landing-preview-scope.const';
import { LANDING_PREVIEW_STATES } from '../models/landing-preview-states.const';
import { previewIsHome, previewShows, previewStateIndex } from './landing-preview';

const shown = (index: number): string[] =>
  LANDING_PREVIEW_CARDS.filter((card) => previewShows(card, LANDING_PREVIEW_STATES[index])).map(
    (card) => card.id,
  );

describe('landing preview frames', () => {
  it('shows every card on All links › All and only the videos on › Videos', () => {
    expect(shown(0)).toHaveLength(LANDING_PREVIEW_CARDS.length);
    expect(shown(1)).toEqual(['nihilism', 'angular', 'neural']);
  });

  it('shows a folder, then the favorites, then Watch later', () => {
    expect(shown(2)).toEqual(['runners', 'jacket']);
    expect(shown(3)).toEqual(['runners', 'angular', 'excalidraw']);
    expect(shown(4)).toEqual(['nihilism']);
  });

  it('finds the frame of a row or a tab, and -1 for a row the cycle does not visit', () => {
    expect(previewStateIndex(LANDING_PREVIEW_SCOPE.All, LANDING_PREVIEW_KIND.Video)).toBe(1);
    expect(previewStateIndex(LANDING_FOLDER.WatchLater, 'all')).toBe(4);
    expect(previewStateIndex(LANDING_FOLDER.Tools, 'all')).toBe(-1);
  });

  it('keeps the toast for All links › All only', () => {
    expect(LANDING_PREVIEW_STATES.map(previewIsHome)).toEqual([true, false, false, false, false]);
  });
});
