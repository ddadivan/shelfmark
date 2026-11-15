import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { changedStyle, pickStyle } from './folder-style';

describe('folder style helpers', () => {
  const folder = { ...MOCK_FOLDERS[0], colour: 'sage' as const, description: 'Hi' };

  it('picks the given fields only', () => {
    expect(pickStyle({ colour: 'rose', icon: 'star', description: null }, ['colour'])).toEqual({
      colour: 'rose',
    });
  });

  it('keeps what differs from the folder', () => {
    expect(
      changedStyle({ colour: 'sage', icon: 'star', description: 'Hi', coverLinkId: null }, folder),
    ).toEqual({ icon: 'star' });
    expect(
      changedStyle(
        { colour: 'sage', icon: folder.icon, description: 'Hi', coverLinkId: null },
        folder,
      ),
    ).toEqual({});
  });
});
