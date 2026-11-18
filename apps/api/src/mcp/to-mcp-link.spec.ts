import type { McpLinkRow } from './models/mcp-link-row.type';
import { toMcpLink } from './to-mcp-link';

const ROW: McpLinkRow = {
  id: 'l1',
  url: 'https://Example.test./a?b=1',
  title: 'Title',
  folderId: 'f1',
  note: 'note',
  summary: null,
  summarySource: null,
  kind: 'video',
  isFavorite: true,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  lastOpenedAt: new Date('2026-11-02T00:00:00Z'),
  tags: [{ tag: { name: 'b' } }, { tag: { name: 'a' } }],
};
const PATHS = new Map([['f1', 'Top / Sub']]);

describe('toMcpLink', () => {
  it('maps the allow-listed fields only', () => {
    expect(toMcpLink(ROW, PATHS, false)).toEqual({
      id: 'l1',
      url: 'https://Example.test./a?b=1',
      title: 'Title',
      host: 'example.test',
      folderPath: 'Top / Sub',
      tags: ['a', 'b'],
      summary: null,
      summaryByAi: false,
      kind: 'video',
      isFavorite: true,
      savedAt: '2026-11-01T00:00:00.000Z',
      lastOpenedAt: '2026-11-02T00:00:00.000Z',
    });
  });

  it('adds the note only with includeNotes', () => {
    expect(toMcpLink(ROW, PATHS, true).note).toBe('note');
    expect(toMcpLink({ ...ROW, note: null }, PATHS, true)).toHaveProperty('note', null);
    expect(toMcpLink(ROW, PATHS, false)).not.toHaveProperty('note');
  });

  it('marks AI summaries and reads unknown values safely', () => {
    expect(toMcpLink({ ...ROW, summary: 'S', summarySource: 'ai' }, PATHS, false).summaryByAi).toBe(
      true,
    );
    expect(
      toMcpLink({ ...ROW, summary: 'S', summarySource: 'user' }, PATHS, false).summaryByAi,
    ).toBe(false);
    const odd = toMcpLink(
      { ...ROW, url: 'not a url', kind: 'weird', folderId: 'gone', lastOpenedAt: null },
      PATHS,
      false,
    );
    expect(odd).toMatchObject({ host: '', kind: 'other', folderPath: null, lastOpenedAt: null });
    expect(toMcpLink({ ...ROW, folderId: null }, PATHS, false).folderPath).toBeNull();
  });
});
