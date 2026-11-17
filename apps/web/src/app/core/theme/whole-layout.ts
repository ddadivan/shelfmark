import type { LayoutSettings } from '@shelfmark/contracts';

/** The layout with exactly its own fields: anything else on the object (a retired key) is left out. */
export function wholeLayout(layout: LayoutSettings): LayoutSettings {
  return {
    textSize: layout.textSize,
    font: layout.font,
    density: layout.density,
    cardPreview: layout.cardPreview,
    cardSite: layout.cardSite,
    cardNotes: layout.cardNotes,
    cardTags: layout.cardTags,
  };
}
