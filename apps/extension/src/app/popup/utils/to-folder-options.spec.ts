import { makeFolder } from '../../../testing/fixtures';
import { toFolderOptions } from './to-folder-options';

describe('toFolderOptions', () => {
  it('returns an empty list without folders', () => {
    expect(toFolderOptions([])).toEqual([]);
  });

  it('nests children under their parent and carries icon and colour', () => {
    const options = toFolderOptions([
      makeFolder({ id: 'child', parentId: 'root', name: 'Child', icon: 'star', colour: 'ocean' }),
      makeFolder({ id: 'root', name: 'Root' }),
    ]);
    expect(options).toEqual([
      {
        id: 'root',
        name: 'Root',
        icon: 'folder',
        colour: 'graphite',
        children: [{ id: 'child', name: 'Child', icon: 'star', colour: 'ocean' }],
      },
    ]);
  });

  it('sorts siblings by position, then by name', () => {
    const options = toFolderOptions([
      makeFolder({ id: 'c', name: 'Zed', position: 0 }),
      makeFolder({ id: 'a', name: 'Beta', position: 1 }),
      makeFolder({ id: 'b', name: 'Alpha', position: 1 }),
    ]);
    expect(options.map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });

  it('turns a folder with a missing parent into a root', () => {
    const options = toFolderOptions([makeFolder({ id: 'orphan', parentId: 'gone' })]);
    expect(options.map((o) => o.id)).toEqual(['orphan']);
  });

  it('cuts a cycle so every folder appears at most once', () => {
    const options = toFolderOptions([
      makeFolder({ id: 'root' }),
      makeFolder({ id: 'a', parentId: 'b' }),
      makeFolder({ id: 'b', parentId: 'a' }),
    ]);
    expect(options.map((o) => o.id)).toEqual(['root']);
  });
});
