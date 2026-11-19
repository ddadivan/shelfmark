import { LinkRefs } from './link-refs';

describe('LinkRefs', () => {
  it('numbers links by first sight and keeps the number', () => {
    const refs = new LinkRefs();
    expect(refs.refFor('a')).toBe(1);
    expect(refs.refFor('b')).toBe(2);
    expect(refs.refFor('a')).toBe(1);
    expect(refs.size).toBe(2);
    expect(refs.idFor(2)).toBe('b');
  });

  it('resolves only refs it assigned', () => {
    const refs = new LinkRefs();
    refs.refFor('a');
    expect(refs.idFor(0)).toBeUndefined();
    expect(refs.idFor(2)).toBeUndefined();
    expect(refs.idFor(1.5)).toBeUndefined();
    expect(refs.has(1)).toBe(true);
    expect(refs.has(999)).toBe(false);
  });

  it('stops assigning at the ref cap', () => {
    const refs = new LinkRefs();
    for (let i = 0; i < 999; i += 1) refs.refFor(`id-${i}`);
    expect(refs.refFor('one-too-many')).toBeNull();
    expect(refs.refFor('id-0')).toBe(1);
  });
});
