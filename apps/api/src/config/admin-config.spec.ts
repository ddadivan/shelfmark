import { readAdminEmails } from './admin-config';

describe('readAdminEmails', () => {
  it('is empty when unset, empty or only separators', () => {
    expect(readAdminEmails({}).size).toBe(0);
    expect(readAdminEmails({ ADMIN_EMAILS: '' }).size).toBe(0);
    expect(readAdminEmails({ ADMIN_EMAILS: ' , ,' }).size).toBe(0);
  });

  it('splits on commas, trims and lower-cases', () => {
    expect([...readAdminEmails({ ADMIN_EMAILS: ' A@x.io ,B@Y.io' })]).toEqual(['a@x.io', 'b@y.io']);
  });
});
