import { MOCK_TAGS } from '@shelfmark/contracts/testing';
import { TAG_OUTCOME } from '../../../stores/models/tag-outcome.const';
import { tagSaveError } from './tag-save-error';

describe('tagSaveError', () => {
  it('has no message when the tag was saved', () => {
    expect(tagSaveError({ outcome: TAG_OUTCOME.Done, tag: MOCK_TAGS[0] }, false, 'a')).toBeNull();
  });

  it('offers the merge instead of a message when a rename hits an existing tag', () => {
    expect(
      tagSaveError({ outcome: TAG_OUTCOME.Conflict, tag: MOCK_TAGS[0] }, true, 'a'),
    ).toBeNull();
  });

  it('says the name exists for a new tag, or a rename without the other tag', () => {
    const exists = { key: 'tags.name.exists', params: { name: 'a' } };

    expect(tagSaveError({ outcome: TAG_OUTCOME.Conflict, tag: MOCK_TAGS[0] }, false, 'a')).toEqual(
      exists,
    );
    expect(tagSaveError({ outcome: TAG_OUTCOME.Conflict }, true, 'a')).toEqual(exists);
  });

  it('reports the limit and a plain failure', () => {
    expect(tagSaveError({ outcome: TAG_OUTCOME.LimitReached }, false, 'a')?.key).toBe(
      'tags.add.limit',
    );
    expect(tagSaveError({ outcome: TAG_OUTCOME.Failed }, true, 'a')).toEqual({
      key: 'tags.rename.failed',
    });
    expect(tagSaveError({ outcome: TAG_OUTCOME.Failed }, false, 'a')).toEqual({
      key: 'tags.add.failed',
    });
  });
});
