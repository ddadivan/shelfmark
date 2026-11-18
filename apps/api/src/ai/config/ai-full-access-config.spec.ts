import { readAiFullAccessEmails } from './ai-full-access-config';

describe('readAiFullAccessEmails', () => {
  it('is empty when unset, empty or only separators', () => {
    expect(readAiFullAccessEmails({}).size).toBe(0);
    expect(readAiFullAccessEmails({ AI_FULL_ACCESS_EMAILS: '' }).size).toBe(0);
    expect(readAiFullAccessEmails({ AI_FULL_ACCESS_EMAILS: ' , ,' }).size).toBe(0);
  });

  it('splits on commas, trims and lower-cases like ADMIN_EMAILS', () => {
    expect([...readAiFullAccessEmails({ AI_FULL_ACCESS_EMAILS: ' A@x.io ,B@Y.io' })]).toEqual([
      'a@x.io',
      'b@y.io',
    ]);
  });

  it('ignores a non-ASCII look-alike address', () => {
    expect(readAiFullAccessEmails({ AI_FULL_ACCESS_EMAILS: 'ａ@x.io,ok@x.io' })).toEqual(
      new Set(['ok@x.io']),
    );
  });

  it('does not read ADMIN_EMAILS', () => {
    expect(readAiFullAccessEmails({ ADMIN_EMAILS: 'a@x.io' }).size).toBe(0);
  });
});
