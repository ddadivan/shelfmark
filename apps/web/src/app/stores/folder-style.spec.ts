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
    const same = {
      colour: 'sage',
      icon: folder.icon,
      highlighted: false,
      description: 'Hi',
      coverLinkId: null,
    } as const;
    expect(changedStyle({ ...same, icon: 'star' }, folder)).toEqual({ icon: 'star' });
    expect(changedStyle({ ...same, highlighted: true }, folder)).toEqual({ highlighted: true });
    expect(changedStyle(same, folder)).toEqual({});
  });
});
