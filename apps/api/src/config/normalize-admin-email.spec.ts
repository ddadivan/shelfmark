import { readAdminEmails } from './admin-config';
import { normalizeAdminEmail } from './normalize-admin-email';

describe('normalizeAdminEmail', () => {
  it('trims and lower-cases ASCII', () => {
    expect(normalizeAdminEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it.each([
    ['empty', ''],
    ['fullwidth letters', '\uff41da@example.com'],
    ['the Kelvin sign', 'ada@example.com\u212a'],
    ['a dotless i', '\u0131da@example.com'],
    ['a control character', 'ada@example.com\u0000'],
  ])('rejects %s', (_label, value) => {
    expect(normalizeAdminEmail(value)).toBeNull();
  });

  it('drops non-ASCII entries of the allow-list', () => {
    expect([...readAdminEmails({ ADMIN_EMAILS: '\uff41@x.io, b@x.io' })]).toEqual(['b@x.io']);
  });
});
