import { TAG_LIMIT } from '@shelfmark/contracts';
import { validateTagName } from './validate-tag-name';

describe('validateTagName', () => {
  it('accepts a normal name', () => {
    expect(validateTagName('winter', false, false)).toBeNull();
  });

  it('asks for a name when it is empty', () => {
    expect(validateTagName('', false, false)).toEqual({
      key: 'tags.name.required',
      params: { max: TAG_LIMIT.NameMax },
    });
  });

  it('refuses a name over the limit', () => {
    const name = 'a'.repeat(TAG_LIMIT.NameMax + 1);

    expect(validateTagName(name, false, false)?.key).toBe('tags.name.tooLong');
    expect(validateTagName('a'.repeat(TAG_LIMIT.NameMax), false, false)).toBeNull();
  });

  it('refuses a new tag at the per-user limit, but not a rename', () => {
    expect(validateTagName('winter', false, true)).toEqual({
      key: 'tags.add.limit',
      params: { max: TAG_LIMIT.PerUserMax },
    });
    expect(validateTagName('winter', true, true)).toBeNull();
  });
});
