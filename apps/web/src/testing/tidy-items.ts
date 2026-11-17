import {
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type LinkResponse,
  type LinkSuggestion,
  type TidyItem,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';

/** The unsorted fixture link (`MOCK_ID.LinkPasta`). */
export const TIDY_LINK = MOCK_LINKS[1] as LinkResponse;

function suggestion(id: string, kind: LinkSuggestion['kind'], name: string | null): LinkSuggestion {
  return {
    id,
    kind,
    state: SUGGESTION_STATE.Suggested,
    tagName: kind === SUGGESTION_KIND.Folder ? null : name,
    folderId: kind === SUGGESTION_KIND.Folder ? MOCK_ID.FolderReading : null,
  };
}

/**
 * A Tidy page of two links (spec helper): the pasta link with the folder Reading (`f1`) and the
 * tag docs (`t1`), and "Second" (`l2`) with the new tag pasta (`n2`).
 */
export function tidyItems(): TidyItem[] {
  return [
    {
      link: TIDY_LINK,
      suggestions: [
        suggestion('f1', SUGGESTION_KIND.Folder, null),
        suggestion('t1', SUGGESTION_KIND.Tag, 'docs'),
      ],
    },
    {
      link: { ...TIDY_LINK, id: 'l2', title: 'Second', url: 'https://second.example/' },
      suggestions: [suggestion('n2', SUGGESTION_KIND.NewTag, 'pasta')],
    },
  ];
}
