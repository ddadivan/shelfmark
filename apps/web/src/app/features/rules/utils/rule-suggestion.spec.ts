import type { RuleResponse } from '@shelfmark/contracts';
import { applyRule, changedSomething, revertRule, stillInForm } from './rule-suggestion';

const rule: RuleResponse = {
  id: 'r',
  domain: 'youtube.com',
  folderId: 'videos',
  folderAvailable: true,
  tags: ['video', 'Clip'],
  createdAt: '2026-11-01T00:00:00.000Z',
};
const free = { folder: false, tags: false, folderKnown: true };

describe('applyRule / revertRule', () => {
  it('sets the folder and adds the missing tags, then takes them out again', () => {
    const { fields, applied } = applyRule({ folderId: 'inbox', tags: ['clip'] }, rule, free);
    expect(fields).toEqual({ folderId: 'videos', tags: ['clip', 'video'] });
    expect(applied).toEqual({
      ruleId: 'r',
      domain: 'youtube.com',
      folderId: 'videos',
      previousFolderId: 'inbox',
      tags: ['video'],
    });
    expect(changedSomething(applied)).toBe(true);
    expect(revertRule(fields, applied)).toEqual({ folderId: 'inbox', tags: ['clip'] });
  });

  it('leaves a chosen folder, chosen tags and an unknown or trashed folder alone', () => {
    const locked = applyRule({ folderId: 'mine', tags: ['x'] }, rule, {
      folder: true,
      tags: true,
      folderKnown: true,
    });
    expect(locked.fields).toEqual({ folderId: 'mine', tags: ['x'] });
    expect(changedSomething(locked.applied)).toBe(false);
    expect(
      applyRule({ folderId: null, tags: [] }, rule, { ...free, folderKnown: false }).fields,
    ).toEqual({ folderId: null, tags: ['video', 'Clip'] });
    expect(
      applyRule({ folderId: null, tags: [] }, { ...rule, folderAvailable: false }, free).fields
        .folderId,
    ).toBeNull();
  });

  it('keeps what the user changed after the rule applied', () => {
    const { applied } = applyRule({ folderId: null, tags: [] }, rule, free);
    expect(revertRule({ folderId: 'other', tags: ['video', 'mine'] }, applied)).toEqual({
      folderId: 'other',
      tags: ['mine'],
    });
    expect(changedSomething(null)).toBe(false);
  });

  it('keeps only what the form still shows: a folder picked afterwards wins', () => {
    const { applied } = applyRule({ folderId: null, tags: [] }, rule, free);
    expect(stillInForm(applied, { folderId: applied.folderId, tags: ['video', 'Clip'] })).toEqual(
      applied,
    );
    const picked = stillInForm(applied, { folderId: 'other', tags: ['VIDEO'] });
    expect(picked.folderId).toBeNull();
    expect(picked.tags).toEqual(['video']);
    expect(changedSomething(picked)).toBe(true);
    expect(changedSomething(stillInForm(applied, { folderId: 'other', tags: [] }))).toBe(false);
  });
});
