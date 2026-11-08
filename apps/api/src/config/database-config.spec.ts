import { readDatabaseConfig } from './database-config';

const SECRET_URL = 'postgresql://user:hunter2@db.example.test:5432/app?sslmode=require';

describe('readDatabaseConfig', () => {
  it.each(['postgresql', 'postgres'])('accepts the %s protocol', (protocol) => {
    const url = `${protocol}://user:pw@localhost:5432/app`;
    expect(readDatabaseConfig({ DATABASE_URL: url })).toEqual({ connectionString: url });
  });

  it.each([undefined, ''])('requires DATABASE_URL (%j)', (value) => {
    expect(() => readDatabaseConfig({ DATABASE_URL: value })).toThrow(/DATABASE_URL is required/);
  });

  it('rejects a value that is not a URL without echoing it', () => {
    const attempt = () => readDatabaseConfig({ DATABASE_URL: 'hunter2-not-a-url' });
    expect(attempt).toThrow(/must be a valid URL/);
    expect(attempt).not.toThrow(/hunter2/);
  });

  it('rejects other protocols without echoing the URL', () => {
    const attempt = () =>
      readDatabaseConfig({ DATABASE_URL: SECRET_URL.replace('postgresql', 'mysql') });
    expect(attempt).toThrow(/postgres or postgresql protocol/);
    expect(attempt).not.toThrow(/hunter2|db\.example/);
  });
});
